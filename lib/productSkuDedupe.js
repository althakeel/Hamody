/**
 * Storefront listings should show one product per SKU.
 * When duplicates exist, keep the best candidate (in stock, newest).
 */

export function normalizeProductSku(sku) {
  return String(sku || '').trim().toLowerCase();
}

export function getProductSkuDedupeKey(product) {
  const sku = normalizeProductSku(product?.sku);
  if (sku) return sku;
  const id = String(product?._id || product?.id || '').trim();
  return id ? `id:${id}` : '';
}

function productDedupeScore(product) {
  let score = 0;
  if (product?.inStock !== false && !(product?.stockQuantity != null && Number(product.stockQuantity) <= 0)) {
    score += 1_000_000;
  }
  if (product?.published !== false) score += 100_000;
  const imageCount = Array.isArray(product?.images) ? product.images.length : 0;
  score += Math.min(imageCount, 10) * 1_000;
  const createdAt = new Date(product?.createdAt || 0).getTime();
  if (Number.isFinite(createdAt)) score += createdAt / 1_000_000;
  return score;
}

export function dedupeProductsBySku(products = []) {
  const bestByKey = new Map();

  for (const product of products) {
    if (!product) continue;
    const key = getProductSkuDedupeKey(product);
    if (!key) continue;

    const existing = bestByKey.get(key);
    if (!existing || productDedupeScore(product) > productDedupeScore(existing)) {
      bestByKey.set(key, product);
    }
  }

  const deduped = Array.from(bestByKey.values());
  const order = new Map(products.map((product, index) => [String(product?._id || product?.id || ''), index]));

  return deduped.sort((left, right) => {
    const leftIndex = order.get(String(left?._id || left?.id || '')) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = order.get(String(right?._id || right?.id || '')) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

export function buildSkuDedupeKeyAddFieldsStage() {
  return {
    $addFields: {
      __skuDedupeKey: {
        $let: {
          vars: {
            trimmed: {
              $trim: {
                input: { $ifNull: ['$sku', ''] },
              },
            },
          },
          in: {
            $cond: [
              { $gt: [{ $strLenCP: '$$trimmed' }, 0] },
              { $toLower: '$$trimmed' },
              { $concat: ['id:', { $toString: '$_id' }] },
            ],
          },
        },
      },
    },
  };
}

function buildStorefrontStockRankStage() {
  return {
    $addFields: {
      __storefrontInStock: {
        $cond: [
          {
            $or: [
              { $eq: ['$inStock', false] },
              { $lte: [{ $ifNull: ['$stockQuantity', 1] }, 0] },
            ],
          },
          0,
          1,
        ],
      },
    },
  };
}

function buildPreGroupSortStage(sort = { createdAt: -1 }) {
  return {
    $sort: {
      __storefrontInStock: -1,
      ...sort,
      _id: -1,
    },
  };
}

export async function countProductsDedupedBySku(Product, matchStage = {}) {
  const result = await Product.aggregate([
    { $match: matchStage },
    buildSkuDedupeKeyAddFieldsStage(),
    { $group: { _id: '$__skuDedupeKey' } },
    { $count: 'total' },
  ]);

  return Number(result?.[0]?.total) || 0;
}

export const STOREFRONT_CARD_FIELDS =
  'name nameAr slug sku price mrp AED images category categories tags inStock stockQuantity fastDelivery freeShippingEligible useProductsPath imageAspectRatio imageBadgeIds legacySourceId createdAt updatedAt cardVideoPreviewEnabled cardVideoPreviewDelaySec published brand brandAr';

export function buildListingProject(fields, sort = {}, imageLimit = 4) {
  const project = { _id: 1, sku: 1, inStock: 1, stockQuantity: 1 };
  String(fields || '')
    .split(/\s+/)
    .map((field) => field.trim())
    .filter(Boolean)
    .forEach((field) => {
      if (field !== '_id') project[field] = 1;
    });
  Object.keys(sort || {}).forEach((key) => {
    if (!key.startsWith('$') && project[key] == null) project[key] = 1;
  });
  if (project.images) {
    project.images = { $slice: [{ $ifNull: ['$images', []] }, imageLimit] };
  }
  return project;
}

export async function fetchProductsDedupedBySku(Product, matchStage = {}, options = {}) {
  const {
    sort = { createdAt: -1 },
    skip = 0,
    limit = null,
    fields = '',
  } = options;

  const pipeline = [
    { $match: matchStage },
  ];
  if (fields) {
    pipeline.push({ $project: buildListingProject(fields, sort) });
  }
  pipeline.push(
    buildStorefrontStockRankStage(),
    buildSkuDedupeKeyAddFieldsStage(),
    buildPreGroupSortStage(sort),
    {
      $group: {
        _id: '$__skuDedupeKey',
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { __storefrontInStock: -1, ...sort, _id: -1 } },
    { $unset: ['__skuDedupeKey', '__storefrontInStock'] },
  );

  if (skip > 0) pipeline.push({ $skip: skip });
  if (limit != null && Number.isFinite(limit)) pipeline.push({ $limit: limit });

  return Product.aggregate(pipeline);
}
