import { STOREFRONT_IN_STOCK_FILTER, STOREFRONT_PUBLISHED_FILTER } from '@/lib/productVisibility';

export function isManualFeaturedSelection(sourceMode, productIds) {
  return sourceMode === 'manual' && Array.isArray(productIds) && productIds.length > 0;
}

export function normalizeManualRotateHours(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.min(168, Math.round(hours));
}

/** Page through a manual list. 5 × 2 rows means 10 products, then the next 10. */
export function manualFeaturedWindow(products, { rotateHours = 0, slotCount = 10, now = Date.now() } = {}) {
  const list = Array.isArray(products) ? products : [];
  const slots = Math.max(1, Math.min(40, Math.round(Number(slotCount) || 10)));
  const hours = normalizeManualRotateHours(rotateHours);
  const pageCount = Math.max(1, Math.ceil(list.length / slots) || 1);
  const page = hours > 0 && list.length > slots
    ? Math.floor(now / (hours * 60 * 60 * 1000)) % pageCount
    : 0;
  const start = page * slots;
  return {
    products: list.slice(start, start + slots),
    page,
    pageCount,
    start,
    slots,
    hours,
  };
}

const PUBLIC_STORE_CACHE_MS = 120000;
const PUBLIC_STORE_SELECT = [
  '_id',
  'userId',
  'featuredProductIds',
  'featuredProductsSource',
  'featuredProductsCategoryIds',
  'featuredProductsTags',
  'featuredManualRotateHours',
  'featuredSectionTitle',
  'featuredSectionDescription',
  'featuredSectionTitleAr',
  'featuredSectionDescriptionAr',
].join(' ');

let publicStoreCache = { at: 0, store: undefined };
let publicStoreInflight = null;

export function invalidatePublicFeaturedStoreCache() {
  publicStoreCache = { at: 0, store: undefined };
  publicStoreInflight = null;
}

async function loadPublicFeaturedStore(Store, Product) {
  try {
    const { resolveStorefrontOwnerId } = await import('@/lib/storefrontSettingsOwner');
    const ownerId = await resolveStorefrontOwnerId('');
    if (ownerId) {
      const ownerStore = await Store.findOne({ userId: ownerId, status: { $ne: 'rejected' } })
        .select(PUBLIC_STORE_SELECT)
        .lean()
        || await Store.findOne({ userId: ownerId }).select(PUBLIC_STORE_SELECT).lean();
      if (ownerStore) return ownerStore;
    }
  } catch {
    // Fall through to the store that listed the newest product.
  }

  const latestProduct = await Product.findOne({
    ...STOREFRONT_IN_STOCK_FILTER,
    ...STOREFRONT_PUBLISHED_FILTER,
  })
    .sort({ createdAt: -1 })
    .select('storeId')
    .lean();

  if (latestProduct?.storeId) {
    const ownerStore = await Store.findById(latestProduct.storeId).select(PUBLIC_STORE_SELECT).lean();
    if (ownerStore) return ownerStore;
  }

  return Store.findOne().sort({ updatedAt: -1 }).select(PUBLIC_STORE_SELECT).lean();
}

/**
 * Resolve which store's featured settings to use on the public storefront.
 * Prefer the approved store owner. Parallel home requests share one lookup.
 */
export async function resolvePublicFeaturedStore(Store, Product) {
  if (publicStoreCache.store !== undefined && Date.now() - publicStoreCache.at < PUBLIC_STORE_CACHE_MS) {
    return publicStoreCache.store;
  }
  if (!publicStoreInflight) {
    publicStoreInflight = loadPublicFeaturedStore(Store, Product)
      .then((store) => {
        publicStoreCache = { at: Date.now(), store: store || null };
        return publicStoreCache.store;
      })
      .finally(() => {
        publicStoreInflight = null;
      });
  }
  return publicStoreInflight;
}

/**
 * Build MongoDB query/sort for storefront featured products when not using a fixed manual ID list.
 * Uses marketplace-wide listing for "latest" and manual mode with no picks so new products appear immediately.
 */
export function buildFeaturedProductsListQuery({ sourceMode, productIds, categoryIds, tags, storeId }) {
  const query = {
    ...STOREFRONT_IN_STOCK_FILTER,
    ...STOREFRONT_PUBLISHED_FILTER,
  };
  const marketplaceWide =
    sourceMode === 'latest' ||
    (sourceMode === 'manual' && (!Array.isArray(productIds) || productIds.length === 0));

  if (!marketplaceWide && storeId) {
    query.storeId = String(storeId);
  }

  if (sourceMode === 'category' && Array.isArray(categoryIds) && categoryIds.length > 0) {
    query.$or = [
      { category: { $in: categoryIds } },
      { categories: { $in: categoryIds } },
    ];
  } else if (sourceMode === 'tag' && Array.isArray(tags) && tags.length > 0) {
    query.tags = { $in: tags };
  }

  const sort = sourceMode === 'latest' ? { createdAt: -1 } : { updatedAt: -1, createdAt: -1 };

  return { query, sort };
}
