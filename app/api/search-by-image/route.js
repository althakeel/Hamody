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
  uniqueSearchTerms,
} from '@/lib/imageSearch';
import {
  embedImageBuffer,
  findProductsByVisualEmbedding,
  mergeVisualAndKeywordProducts,
  rankProductsByQueryImage,
} from '@/lib/productVisualIndex';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VISUAL_SURE_SCORE = 0.9;
let visualIndexProbe = { at: 0, ready: false };

async function visualIndexReady() {
  const now = Date.now();
  if (now - visualIndexProbe.at < 60_000) return visualIndexProbe.ready;
  const count = await ProductVisualIndex.estimatedDocumentCount();
  visualIndexProbe = { at: now, ready: count > 0 };
  return visualIndexProbe.ready;
}

function emptyVisual() {
  return { products: [], relatedProducts: [], candidates: [], scores: [] };
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
      embedImageBuffer(buffer, mimeType),
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
    const topScore = Number(visual.scores?.[0]?.score) || 0;
    const identifyMs = Date.now() - startedAt;

    if (topScore >= VISUAL_SURE_SCORE && visual.products.length && !vision?.name) {
      return NextResponse.json({
        keyword: visual.products[0]?.name || '',
        keywords: [],
        products: visual.products.slice(0, 8),
        relatedProducts: visual.relatedProducts.slice(0, 12),
        recommendedProducts: visual.relatedProducts.slice(0, 12),
        resultCount: Math.min(visual.products.length, 8),
        searchMethod: 'visual',
        message: `Found ${Math.min(visual.products.length, 8)} product${visual.products.length === 1 ? '' : 's'}`,
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
        }, { limit: 12 })
        : [],
    ]);

    const textProducts = keywordResult.products.slice(0, 8);
    const textRelated = mergeVisualAndKeywordProducts(
      keywordResult.relatedProducts,
      [...categoryProducts, ...(visual.relatedProducts || [])],
      12,
    ).filter((product) => !textProducts.some((row) => String(row._id) === String(product._id)));
    const pool = mergeVisualAndKeywordProducts(textProducts, textRelated, 6);
    const visualRank = queryEmbedding.length && pool.length > 1
      ? await rankProductsByQueryImage(queryEmbedding, pool)
      : [];
    const topVisual = visualRank[0]?.score || 0;
    const nextVisual = visualRank[1]?.score || 0;
    const visualWins = topVisual >= 0.5 && topVisual - nextVisual >= 0.015;
    const products = visualWins
      ? [visualRank[0].product]
      : (visualRank.length ? visualRank.map((row) => row.product) : textProducts);
    const relatedProducts = (visualWins ? visualRank.slice(1).map((row) => row.product) : textRelated)
      .filter((product) => !products.some((row) => String(row._id) === String(product._id)));

    console.info('[search-by-image]', {
      providers: vision?.providers || [],
      vision: vision?.name || '',
      type: vision?.type || '',
      exact: products.map((product) => product.name),
      related: relatedProducts.map((product) => product.name).slice(0, 8),
      photoScores: visualRank.slice(0, 4).map((row) => ({
        name: row.product.name,
        score: Number(row.score.toFixed(3)),
      })),
      ms: { identify: identifyMs, total: Date.now() - startedAt },
    });

    return NextResponse.json({
      keyword: vision?.name || keywordResult.keyword || keywords[0] || '',
      keywords: keywordResult.keywords || keywords,
      products,
      relatedProducts,
      recommendedProducts: relatedProducts,
      resultCount: products.length,
      searchMethod: products.length
        ? ((vision?.providers || []).join('+') || 'catalog')
        : (relatedProducts.length ? 'related' : 'none'),
      message: products.length
        ? `Found ${products.length} product${products.length === 1 ? '' : 's'}`
        : (relatedProducts.length
          ? 'No exact match. Showing related products.'
          : 'No related products for this photo.'),
    });
  } catch (error) {
    console.error('[search-by-image POST]', error);
    return NextResponse.json({ error: error.message || 'Image search failed' }, { status: 500 });
  }
}
