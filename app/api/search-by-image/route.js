import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import ProductVisualIndex from '@/models/ProductVisualIndex';
import { shrinkImageForVision } from '@/lib/normalizeImageForAi';
import {
  describeShopperImage,
  extractFilenameKeywords,
  findCategoryProductsForImage,
  findProductsForImageKeywords,
  imageQueryFamilyTerm,
  productIsRelatedToImageQuery,
  uniqueSearchTerms,
} from '@/lib/imageSearch';
import { isSameCatalogPhoto, rankProductsByCatalogPhoto } from '@/lib/catalogPhotoMatch';
import {
  embedImageBuffer,
  findProductsByVisualEmbedding,
  mergeVisualAndKeywordProducts,
} from '@/lib/productVisualIndex';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let visualIndexProbe = { at: 0, ready: false };

async function visualIndexReady() {
  const now = Date.now();
  if (now - visualIndexProbe.at < 60_000) return visualIndexProbe.ready;
  const count = await ProductVisualIndex.estimatedDocumentCount();
  visualIndexProbe = { at: now, ready: count > 0 };
  return visualIndexProbe.ready;
}

function emptyVisual() {
  return { products: [], relatedProducts: [], candidates: [], scores: [], best: null };
}

function sameProduct(left, right) {
  return String(left?._id || '') === String(right?._id || '');
}

function withoutProducts(list = [], removed = []) {
  return list.filter((product) => !removed.some((row) => sameProduct(row, product)));
}

function catalogPhotoMatch(score, nextScore) {
  const top = Number(score) || 0;
  const next = Number(nextScore) || 0;
  return top >= 0.93 && top - next >= 0.02;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    if (!image || typeof image.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await image.arrayBuffer());
    if (!rawBuffer.length) {
      return NextResponse.json({ error: 'Image is empty' }, { status: 400 });
    }

    const startedAt = Date.now();
    const shrunk = await shrinkImageForVision(rawBuffer, image.type || 'image/jpeg', {
      maxSize: 512,
      quality: 68,
    });
    const buffer = shrunk.buffer;
    const mimeType = shrunk.mimeType;

    await dbConnect();
    const indexReady = await visualIndexReady();
    const [queryEmbedding, vision] = await Promise.all([
      indexReady ? embedImageBuffer(buffer, mimeType) : [],
      describeShopperImage(buffer, mimeType),
    ]);
    const visual = indexReady && queryEmbedding.length
      ? await findProductsByVisualEmbedding(Product, ProductVisualIndex, queryEmbedding, {
        limit: 16,
        lenient: true,
        includeOutOfStock: true,
        minScore: 0.6,
      })
      : emptyVisual();
    const topScore = Number(visual.best?.score ?? visual.scores?.[0]?.score) || 0;
    const nextScore = Number(visual.scores?.[1]?.score) || 0;
    const identifyMs = Date.now() - startedAt;

    const visualProducts = visual.products || [];
    const visualRelated = visual.relatedProducts || [];
    const catalogMatch = visual.best?.product
      || visualProducts[0]
      || visual.candidates?.[0]
      || null;
    if (catalogMatch && catalogPhotoMatch(topScore, nextScore)) {
      const products = [catalogMatch];
      const relatedProducts = withoutProducts(
        [...visualProducts, ...visualRelated, ...(visual.candidates || [])],
        products,
      ).slice(0, 12);
      return NextResponse.json({
        keyword: vision?.name || products[0]?.name || '',
        keywords: uniqueSearchTerms([vision?.name, vision?.type, ...(vision?.keywords || [])]),
        products,
        relatedProducts,
        recommendedProducts: relatedProducts,
        resultCount: products.length,
        searchMethod: 'visual',
        message: 'Found the catalog photo',
      });
    }

    const filenameKeywords = extractFilenameKeywords(image.name);
    const keywords = uniqueSearchTerms([
      vision?.name,
      vision?.type,
      vision?.category,
      ...(vision?.keywords || []),
      ...filenameKeywords,
    ]);

    const [keywordResult, categoryProducts] = await Promise.all([
      keywords.length
        ? findProductsForImageKeywords(Product, {
          keywords,
          name: vision?.name || keywords[0] || '',
          type: vision?.type || '',
          category: vision?.category || '',
          exclude: vision?.exclude || [],
          limit: 8,
        })
        : { products: [], relatedProducts: [], keyword: '', keywords: [] },
      vision
        ? findCategoryProductsForImage(Product, Category, {
          name: vision?.name || '',
          type: vision?.type || '',
          category: vision?.category || '',
          keywords,
        }, { limit: 48 })
        : [],
    ]);

    const family = imageQueryFamilyTerm({
      name: vision?.name || '',
      type: vision?.type || '',
      category: vision?.category || '',
      keywords,
    });
    const photoPool = mergeVisualAndKeywordProducts(
      categoryProducts,
      keywordResult.products || [],
      48,
    );
    const photoRank = await rankProductsByCatalogPhoto(buffer, photoPool);
    if (photoRank.length && isSameCatalogPhoto(photoRank[0].distance, photoRank[1]?.distance)) {
      const products = [photoRank[0].product];
      const relatedProducts = withoutProducts([
        ...photoRank.slice(1).map((row) => row.product),
        ...categoryProducts,
        ...(keywordResult.relatedProducts || []).filter((product) => (
          !family || productIsRelatedToImageQuery(product, family)
        )),
      ], products).slice(0, 12);
      return NextResponse.json({
        keyword: vision?.name || products[0]?.name || '',
        keywords: uniqueSearchTerms([vision?.name, vision?.type, ...(vision?.keywords || [])]),
        products,
        relatedProducts,
        recommendedProducts: relatedProducts,
        resultCount: products.length,
        searchMethod: 'catalog-photo',
        message: 'Found the catalog photo',
      });
    }

    const inFamily = (product) => !family || productIsRelatedToImageQuery(product, family);
    const relatedProducts = withoutProducts([
      ...photoRank.map((row) => row.product),
      ...categoryProducts,
      ...(keywordResult.relatedProducts || []),
      ...(keywordResult.products || []),
    ].filter(inFamily), []).slice(0, 12);

    console.info('[search-by-image]', {
      providers: vision?.providers || [],
      vision: vision?.name || '',
      type: vision?.type || '',
      exact: [],
      related: relatedProducts.map((product) => product.name).slice(0, 8),
      photoDistances: photoRank.slice(0, 4).map((row) => ({
        name: row.product.name,
        distance: row.distance,
      })),
      ms: { identify: identifyMs, total: Date.now() - startedAt },
    });

    return NextResponse.json({
      keyword: vision?.name || keywordResult.keyword || keywords[0] || '',
      keywords: keywordResult.keywords || keywords,
      products: [],
      relatedProducts,
      recommendedProducts: relatedProducts,
      resultCount: 0,
      searchMethod: relatedProducts.length ? 'related' : 'none',
      message: relatedProducts.length
        ? 'No exact match. Showing related products.'
        : 'No related products for this photo.',
    });
  } catch (error) {
    console.error('[search-by-image POST]', error);
    return NextResponse.json({ error: error.message || 'Image search failed' }, { status: 500 });
  }
}
