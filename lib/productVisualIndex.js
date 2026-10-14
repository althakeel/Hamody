import { isGeminiConfigured } from '@/configs/gemini';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { normalizeImageForAi } from '@/lib/normalizeImageForAi';
import {
  mapSearchProduct,
  PRODUCT_SEARCH_SELECT_FIELDS,
} from '@/lib/productSearch';
import { STOREFRONT_PUBLISHED_FILTER } from '@/lib/productVisibility';
import { getImageUrlAt, isVideoSource, normalizeProductImages } from '@/lib/productMedia';
import {
  applyVisionPrior,
  cosineSimilarity,
  hashImageSource,
  normalizeEmbedding,
  rankVisualMatches,
  splitExactAndRelated,
  VISUAL_EXACT_MIN_SCORE,
  VISUAL_MATCH_MIN_SCORE,
  VISUAL_RELATED_MIN_SCORE,
} from '@/lib/productVisualMath';

export {
  applyVisionPrior,
  inferProductFamily,
  hashImageSource,
  mergeVisualAndKeywordProducts,
  normalizeEmbedding,
  rankVisualMatches,
  splitExactAndRelated,
  VISUAL_EXACT_MIN_SCORE,
  VISUAL_MATCH_MIN_SCORE,
  VISUAL_RELATED_MIN_SCORE,
} from '@/lib/productVisualMath';

export const VISUAL_EMBEDDING_DIMENSIONS = 768;
export const VISUAL_EMBEDDING_MODELS = [
  process.env.GEMINI_IMAGE_EMBEDDING_MODEL,
  'gemini-embedding-2',
  'gemini-embedding-2-preview',
].filter(Boolean).filter((model, index, list) => list.indexOf(model) === index);

export function getPrimaryProductImageUrl(product = {}) {
  return getProductIndexImageUrls(product)[0] || '';
}

export function getProductIndexImageUrls(product = {}, limit = 3) {
  const urls = [];
  const images = normalizeProductImages(product.images);
  for (let index = 0; index < images.length && urls.length < limit; index += 1) {
    const url = getImageUrlAt(images, index, index === 0 ? product.image : '');
    if (!url || isVideoSource(url) || !/^https?:\/\//i.test(url)) continue;
    if (!urls.includes(url)) urls.push(url);
  }
  if (!urls.length) {
    const fallback = getProductThumbnailUrl(product, { fallback: '' });
    if (fallback && /^https?:\/\//i.test(fallback) && !isVideoSource(fallback)) urls.push(fallback);
  }
  return urls;
}

function extractEmbeddingValues(payload) {
  const values = payload?.embedding?.values
    || payload?.embeddings?.[0]?.values
    || payload?.data?.[0]?.embedding?.values;
  return Array.isArray(values) ? values : [];
}

async function prepareImageBase64(buffer, mimeType) {
  const prepared = await normalizeImageForAi({
    base64Image: Buffer.from(buffer).toString('base64'),
    mimeType: mimeType || 'image/jpeg',
  });
  const mime = prepared.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  if (prepared.mimeType === 'image/png' || prepared.mimeType === 'image/jpeg') {
    return { base64: prepared.base64Image, mimeType: mime };
  }
  return { base64: prepared.base64Image, mimeType: 'image/jpeg' };
}

export async function embedImageBuffer(buffer, mimeType = 'image/jpeg') {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || !buffer?.length) return [];

  const { base64, mimeType: mime } = await prepareImageBase64(buffer, mimeType);
  let lastError = null;

  for (const model of VISUAL_EMBEDDING_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${model}`,
            content: {
              parts: [{
                inline_data: {
                  mime_type: mime,
                  data: base64,
                },
              }],
            },
            outputDimensionality: VISUAL_EMBEDDING_DIMENSIONS,
          }),
          signal: AbortSignal.timeout(12000),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || `Embedding failed (${response.status})`);
      }
      const embedding = normalizeEmbedding(extractEmbeddingValues(payload));
      if (!embedding.length) throw new Error('Empty embedding');
      return embedding;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) console.warn('[productVisualIndex] embed failed:', lastError.message);
  return [];
}

export async function fetchImageBuffer(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Could not download product image (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('Product image is empty');
  const mimeType = String(response.headers.get('content-type') || 'image/jpeg').split(';')[0];
  return { buffer, mimeType };
}

export async function indexProductVisual(product, ProductVisualIndex) {
  const imageUrls = getProductIndexImageUrls(product, 3);
  if (!imageUrls.length) return { skipped: true, reason: 'no-image' };

  const existing = await ProductVisualIndex.findOne({ productId: product._id }).lean();
  const existingByHash = new Map(
    (existing?.images || []).map((image) => [image.hash, image]),
  );
  if (existing?.imageHash && existing?.embedding?.length) {
    existingByHash.set(existing.imageHash, {
      url: existing.imageUrl,
      hash: existing.imageHash,
      embedding: existing.embedding,
    });
  }

  const neededHashes = imageUrls.map((url) => hashImageSource(url));
  if (neededHashes.every((hash) => existingByHash.get(hash)?.embedding?.length)) {
    return { skipped: true, reason: 'fresh' };
  }

  const nextImages = [];
  for (const imageUrl of imageUrls) {
    const imageHash = hashImageSource(imageUrl);
    const cached = existingByHash.get(imageHash);
    if (cached?.embedding?.length) {
      nextImages.push({ url: imageUrl, hash: imageHash, embedding: cached.embedding });
      continue;
    }
    const downloaded = await fetchImageBuffer(imageUrl);
    if (!downloaded) continue;
    const embedding = await embedImageBuffer(downloaded.buffer, downloaded.mimeType);
    if (!embedding.length) continue;
    nextImages.push({ url: imageUrl, hash: imageHash, embedding });
  }

  if (!nextImages.length) return { skipped: true, reason: 'embed-failed' };

  const primary = nextImages[0];
  await ProductVisualIndex.findOneAndUpdate(
    { productId: product._id },
    {
      productId: product._id,
      imageUrl: primary.url,
      imageHash: primary.hash,
      embedding: primary.embedding,
      images: nextImages,
      indexedAt: new Date(),
    },
    { upsert: true, new: true },
  );
  clearVisualIndexCache();
  return { skipped: false, productId: String(product._id), imageCount: nextImages.length };
}

export function scheduleProductVisualIndex(product, ProductVisualIndex) {
  if (!product?._id || !ProductVisualIndex || !isGeminiConfigured()) return;
  void indexProductVisual(product, ProductVisualIndex).catch((error) => {
    console.warn('[productVisualIndex] schedule failed:', error.message);
  });
}

export async function removeProductVisualIndex(productId, ProductVisualIndex) {
  if (!productId) return;
  await ProductVisualIndex.deleteOne({ productId });
  clearVisualIndexCache();
}

const VISUAL_INDEX_CACHE_MS = 45 * 1000;
let visualIndexCache = { rows: null, at: 0 };

function clearVisualIndexCache() {
  visualIndexCache = { rows: null, at: 0 };
}

async function loadVisualIndexRows(ProductVisualIndex) {
  const now = Date.now();
  if (visualIndexCache.rows && now - visualIndexCache.at < VISUAL_INDEX_CACHE_MS) {
    return visualIndexCache.rows;
  }

  const rows = await ProductVisualIndex.find({
    $or: [
      { embedding: { $exists: true, $ne: [] } },
      { 'images.0.embedding.0': { $exists: true } },
    ],
  })
    .select('productId embedding images')
    .limit(12000)
    .lean();

  visualIndexCache = { rows, at: now };
  return rows;
}

function candidateImageUrl(product = {}) {
  const image = product.image || product.images?.[0];
  if (typeof image === 'string' && /^https?:\/\//i.test(image)) return image;
  const url = image?.url || image?.src || '';
  return /^https?:\/\//i.test(url) ? url : '';
}

export async function rankProductsByQueryImage(queryEmbedding, products = [], { limit = 6 } = {}) {
  const query = normalizeEmbedding(queryEmbedding);
  if (!query.length) return products.slice(0, limit).map((product) => ({ product, score: 0 }));

  const scored = await Promise.all(products.slice(0, limit).map(async (product) => {
    const url = candidateImageUrl(product);
    if (!url) return { product, score: 0 };
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return { product, score: 0 };
      const embedding = await embedImageBuffer(
        Buffer.from(await response.arrayBuffer()),
        response.headers.get('content-type') || 'image/jpeg',
      );
      return {
        product,
        score: cosineSimilarity(query, normalizeEmbedding(embedding)),
      };
    } catch (error) {
      console.warn('[search-by-image] candidate image:', error.message);
      return { product, score: 0 };
    }
  }));

  return scored.sort((left, right) => right.score - left.score);
}

export async function findProductsByVisualEmbedding(Product, ProductVisualIndex, queryEmbedding, {
  limit = 36,
  minScore = VISUAL_MATCH_MIN_SCORE,
  visionText = '',
  lenient = false,
  includeOutOfStock = false,
} = {}) {
  const query = normalizeEmbedding(queryEmbedding);
  if (!query.length) return { products: [], relatedProducts: [], scores: [] };

  const rows = await loadVisualIndexRows(ProductVisualIndex);
  const ranked = rankVisualMatches(query, rows, {
    limit: Math.max(limit * 2, 48),
    minScore: Math.min(minScore, 0.58),
  });
  if (!ranked.length) return { products: [], relatedProducts: [], scores: [] };

  const ids = ranked.map((row) => row.productId);
  const products = await Product.find({
    _id: { $in: ids },
    ...(includeOutOfStock ? {} : { inStock: true }),
    ...STOREFRONT_PUBLISHED_FILTER,
  })
    .select(PRODUCT_SEARCH_SELECT_FIELDS)
    .lean();

  const byId = new Map(products.map((product) => [String(product._id), product]));
  const scored = ranked
    .map((row) => {
      const product = byId.get(String(row.productId));
      if (!product) return null;
      return {
        product: mapSearchProduct(product),
        title: `${product.name} ${product.nameAr || ''}`,
        score: applyVisionPrior(row.score, `${product.name} ${product.nameAr || ''}`, visionText),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);

  const { exact, related } = splitExactAndRelated(scored, {
    exactMin: lenient ? 0.68 : VISUAL_EXACT_MIN_SCORE,
    relatedMin: lenient ? 0.62 : VISUAL_RELATED_MIN_SCORE,
    visionText,
    lenient,
  });

  return {
    products: exact.slice(0, limit).map((item) => item.product),
    relatedProducts: related.slice(0, 16).map((item) => item.product),
    candidates: scored.slice(0, 12).map((item) => item.product),
    scores: scored.slice(0, limit).map((item) => ({
      productId: String(item.product._id),
      score: item.score,
    })),
  };
}

export async function getVisualIndexStatus(Product, ProductVisualIndex) {
  const [totalWithImages, indexes] = await Promise.all([
    Product.countDocuments({
      ...STOREFRONT_PUBLISHED_FILTER,
      images: { $exists: true, $not: { $size: 0 } },
    }),
    ProductVisualIndex.find().select('productId imageHash images.hash indexedAt').lean(),
  ]);

  const products = await Product.find({
    ...STOREFRONT_PUBLISHED_FILTER,
    images: { $exists: true, $not: { $size: 0 } },
  })
    .select('_id images image')
    .lean();

  const indexByProduct = new Map(indexes.map((row) => [String(row.productId), row]));
  let indexed = 0;
  const missingIds = [];
  for (const product of products) {
    const imageUrls = getProductIndexImageUrls(product, 3);
    const current = indexByProduct.get(String(product._id));
    const currentHashes = new Set([
      current?.imageHash,
      ...((current?.images || []).map((image) => image.hash)),
    ].filter(Boolean));
    const trained = imageUrls.length > 0 && imageUrls.every((url) => currentHashes.has(hashImageSource(url)));
    if (trained) indexed += 1;
    else missingIds.push(String(product._id));
  }

  const lastIndexedAt = indexes.reduce((latest, row) => {
    const at = row.indexedAt || row.updatedAt;
    if (!at) return latest;
    return !latest || new Date(at) > new Date(latest) ? at : latest;
  }, null);

  return {
    totalWithImages,
    indexed,
    missing: missingIds.length,
    missingIds,
    lastIndexedAt,
    ready: Boolean(indexed),
  };
}
