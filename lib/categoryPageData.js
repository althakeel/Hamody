import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';
import Rating from '@/models/Rating';
import { attachProductRatings } from '@/lib/attachProductRatings';
import { STOREFRONT_PUBLISHED_FILTER } from '@/lib/productVisibility';
import { parseCategoryPathSegments } from '@/lib/categorySlug';
import { deleteCacheKey, getCachedData, setCachedData } from '@/lib/cache';
import {
  buildCategoryIdAliases,
  findCategoryByPathSegments,
  normalizeCategoryParentIds,
} from '@/lib/categoryTreeUtils';
import {
  buildSkuDedupeKeyAddFieldsStage,
  countProductsDedupedBySku,
  fetchProductsDedupedBySku,
  STOREFRONT_CARD_FIELDS,
} from '@/lib/productSkuDedupe';
import { buildCategoryIdMatch, buildCategoryIdsMatch } from '@/lib/productCategoryRefs';
import { buildInclusiveDistinctSkuCounts } from '@/lib/categoryProductStats';

const CATEGORY_CACHE_KEY = 'public:categories:tree:v7';
const CATEGORY_PRODUCT_COUNTS_KEY = 'public:category-product-counts:v1';
const CATEGORY_PRODUCTS_FETCH_ALL_CAP = 500;
export const CATEGORY_PRODUCTS_PAGE_SIZE = 100;
const MERCHANDISE_CAP = 500;

export function normalizeMerchandisedProductIds(ids = []) {
  const seen = new Set();
  const next = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    const value = String(id || '').trim();
    if (!/^[a-fA-F0-9]{24}$/.test(value) || seen.has(value)) continue;
    seen.add(value);
    next.push(value);
    if (next.length >= MERCHANDISE_CAP) break;
  }
  return next;
}

async function loadMerchandisedCategoryPage(match, pinnedIds, { page, limit, fetchAll }) {
  const objectIds = pinnedIds.map((id) => new mongoose.Types.ObjectId(id));
  const pinnedRaw = await fetchProductsDedupedBySku(Product, {
    $and: [match, { _id: { $in: objectIds } }],
  }, {
    sort: { createdAt: -1 },
    limit: pinnedIds.length,
    fields: STOREFRONT_CARD_FIELDS,
  });
  const byId = new Map(pinnedRaw.map((product) => [String(product._id), product]));
  const pinnedOrdered = pinnedIds
    .map((id, index) => {
      const product = byId.get(id);
      if (!product) return null;
      return { ...product, merchandiseRank: index };
    })
    .filter(Boolean);

  if (!pinnedOrdered.length) return null;

  const restMatch = {
    $and: [
      match,
      { _id: { $nin: pinnedOrdered.map((product) => product._id) } },
    ],
  };
  const pinnedCount = pinnedOrdered.length;
  const effectiveLimit = fetchAll ? CATEGORY_PRODUCTS_FETCH_ALL_CAP : limit;
  const skip = fetchAll ? 0 : Math.max(0, (page - 1) * limit);

  if (fetchAll) {
    const rest = await fetchProductsDedupedBySku(Product, restMatch, {
      sort: { createdAt: -1 },
      limit: Math.max(0, effectiveLimit - pinnedCount),
      fields: STOREFRONT_CARD_FIELDS,
    });
    return [...pinnedOrdered, ...rest].slice(0, effectiveLimit);
  }

  if (skip < pinnedCount) {
    const pageProducts = pinnedOrdered.slice(skip, skip + effectiveLimit);
    const need = effectiveLimit - pageProducts.length;
    if (need <= 0) return pageProducts;
    const rest = await fetchProductsDedupedBySku(Product, restMatch, {
      sort: { createdAt: -1 },
      skip: 0,
      limit: need,
      fields: STOREFRONT_CARD_FIELDS,
    });
    return [...pageProducts, ...rest];
  }

  return fetchProductsDedupedBySku(Product, restMatch, {
    sort: { createdAt: -1 },
    skip: skip - pinnedCount,
    limit: effectiveLimit,
    fields: STOREFRONT_CARD_FIELDS,
  });
}

function serializeClientPayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

export async function getAllActiveCategories() {
  const cached = getCachedData(CATEGORY_CACHE_KEY);
  if (cached) return cached;

  await connectDB();
  const raw = await Category.find({ isActive: { $ne: false } })
    .select('name nameAr slug image bannerEn bannerAr bannerTabletEn bannerTabletAr bannerMobileEn bannerMobileAr parentId description descriptionAr level metaTitle metaDescription sortOrder url legacySourceId')
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .lean();

  const aliases = buildCategoryIdAliases(raw);
  const categories = normalizeCategoryParentIds(raw, aliases);
  setCachedData(CATEGORY_CACHE_KEY, categories, 120);
  return categories;
}

export async function resolveCategoryByPathSegments(pathSegments = []) {
  const segments = parseCategoryPathSegments(pathSegments.join('/'));
  if (!segments.length) return null;

  await connectDB();
  const all = await getAllActiveCategories();
  const resolved = findCategoryByPathSegments(all, segments);
  if (!resolved) return null;

  return { ...resolved, all };
}

function collectCategoryAndDescendantIds(allCategories = [], rootId) {
  const root = String(rootId || '').trim();
  if (!root) return [];

  const childrenByParent = new Map();
  for (const category of allCategories) {
    const parentId = String(category?.parentId || '').trim();
    if (!parentId) continue;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(String(category._id));
  }

  const ids = [root];
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    const children = childrenByParent.get(current) || [];
    for (const childId of children) {
      if (ids.includes(childId)) continue;
      ids.push(childId);
      queue.push(childId);
    }
  }

  return ids;
}

function buildCategoryScopeMatch(categoryId, allCategories = []) {
  const descendantIds = collectCategoryAndDescendantIds(allCategories, categoryId);
  if (descendantIds.length > 1) {
    return buildCategoryIdsMatch(descendantIds);
  }
  return buildCategoryIdMatch(categoryId);
}

export async function getCategoryProducts(categoryId, { limit = 48, page = 1, fetchAll = false, allCategories = [] } = {}) {
  await connectDB();
  const category = await Category.findById(categoryId).select('_id slug name merchandisedProductIds').lean();
  if (!category) return { products: [], total: 0 };

  const categoryMatch = buildCategoryScopeMatch(category._id, allCategories);
  if (!categoryMatch) return { products: [], total: 0 };

  const match = {
    $and: [
      STOREFRONT_PUBLISHED_FILTER,
      categoryMatch,
    ],
  };

  const effectiveLimit = fetchAll ? CATEGORY_PRODUCTS_FETCH_ALL_CAP : limit;
  const skip = fetchAll ? 0 : Math.max(0, (page - 1) * limit);
  const pinnedIds = normalizeMerchandisedProductIds(category.merchandisedProductIds);
  const [merchandisedPage, total] = await Promise.all([
    pinnedIds.length
      ? loadMerchandisedCategoryPage(match, pinnedIds, { page, limit, fetchAll })
      : Promise.resolve(null),
    countProductsDedupedBySku(Product, match),
  ]);
  const rawProducts = merchandisedPage || await fetchProductsDedupedBySku(Product, match, {
    sort: { createdAt: -1 },
    skip,
    limit: effectiveLimit,
    fields: STOREFRONT_CARD_FIELDS,
  });

  const productsWithRatings = await attachProductRatings(rawProducts);

  return {
    products: serializeClientPayload(productsWithRatings),
    total,
    page: fetchAll ? 1 : page,
    limit: effectiveLimit,
    fetchAll,
  };
}

export function invalidateCategoryPageCaches() {
  deleteCacheKey(CATEGORY_CACHE_KEY);
  deleteCacheKey(CATEGORY_PRODUCT_COUNTS_KEY);
}

/** Inclusive published product counts for every active category. Cached until products change. */
export async function getPublishedCategoryProductCounts() {
  const cached = getCachedData(CATEGORY_PRODUCT_COUNTS_KEY);
  if (cached) return cached;

  await connectDB();
  const [categories, products] = await Promise.all([
    getAllActiveCategories(),
    Product.aggregate([
      { $match: STOREFRONT_PUBLISHED_FILTER },
      buildSkuDedupeKeyAddFieldsStage(),
      { $project: { category: 1, categories: 1, __skuDedupeKey: 1 } },
    ]),
  ]);

  const counts = buildInclusiveDistinctSkuCounts(products, categories);
  setCachedData(CATEGORY_PRODUCT_COUNTS_KEY, counts, 120);
  return counts;
}

export async function getCategoryHeaderStats(categoryId, { allCategories = [] } = {}) {
  await connectDB();

  const categoryMatch = buildCategoryScopeMatch(categoryId, allCategories);
  if (!categoryMatch) {
    return { productCount: 0, fastDeliveryCount: 0, fastDeliveryPercent: 0, averageRating: 0, reviewCount: 0 };
  }

  const match = {
    $and: [STOREFRONT_PUBLISHED_FILTER, categoryMatch],
  };

  const [summary, productCount] = await Promise.all([
    Product.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          fastDeliveryCount: {
            $sum: { $cond: [{ $eq: ['$fastDelivery', true] }, 1, 0] },
          },
          productIds: { $push: { $toString: '$_id' } },
        },
      },
    ]),
    countProductsDedupedBySku(Product, match),
  ]);
  const productIds = summary?.[0]?.productIds || [];
  const fastDeliveryCount = Number(summary?.[0]?.fastDeliveryCount) || 0;
  const fastDeliveryPercent = productCount > 0
    ? Math.round((fastDeliveryCount / productCount) * 100)
    : 0;

  let reviewCount = 0;
  let averageRating = 0;

  if (productIds.length) {
    try {
      const [ratingAgg] = await Rating.aggregate([
        {
          $match: {
            productId: { $in: productIds },
            approved: true,
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            sum: { $sum: '$rating' },
          },
        },
      ]);

      reviewCount = Number(ratingAgg?.count) || 0;
      averageRating = reviewCount > 0
        ? Math.round((Number(ratingAgg.sum) / reviewCount) * 10) / 10
        : 0;
    } catch (error) {
      console.error('Category header ratings error:', error);
    }
  }

  return {
    productCount,
    fastDeliveryCount,
    fastDeliveryPercent,
    averageRating,
    reviewCount,
  };
}
