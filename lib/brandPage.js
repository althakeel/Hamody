import connectDB from '@/lib/mongodb';
import BrandPage from '@/models/BrandPage';
import Product from '@/models/Product';
import Rating from '@/models/Rating';
import { cleanDisplayText } from '@/lib/displayText';
import { slugifyCategory } from '@/lib/categorySlug';
import { isRetiredStoreMediaUrl } from '@/lib/mediaUrls';
import { readableUploadUrl } from '@/lib/readableUploadUrl';
import { escapeRegex } from '@/lib/productSearch';
import { attachProductRatings } from '@/lib/attachProductRatings';
import { STOREFRONT_PUBLISHED_FILTER } from '@/lib/productVisibility';
import { countProductsDedupedBySku, fetchProductsDedupedBySku, STOREFRONT_CARD_FIELDS } from '@/lib/productSkuDedupe';
import { invalidateCategorySliderCaches } from '@/lib/categorySliderCache';
import { revalidatePath } from 'next/cache';

export const BRAND_BANNER_KEYS = [
  'bannerEn',
  'bannerAr',
  'bannerTabletEn',
  'bannerTabletAr',
  'bannerMobileEn',
  'bannerMobileAr',
];

export const BRAND_PRODUCTS_PAGE_SIZE = 100;

export function brandPagePath(slug = '') {
  const safe = slugifyCategory(slug);
  return safe ? `/brand/${safe}` : '/brand';
}

function publicBrandAsset(url = '') {
  const value = String(url || '').trim();
  if (!value || isRetiredStoreMediaUrl(value)) return '';
  return readableUploadUrl(value);
}

/** Shopper payload: saved brand page, with no store id and no dead image host. */
export function serializePublicBrand(doc) {
  if (!doc) return null;
  const slug = slugifyCategory(doc.slug || doc.name || '');
  if (!slug) return null;
  const page = {
    id: doc._id ? String(doc._id) : '',
    slug,
    path: brandPagePath(slug),
    name: doc.name || '',
    nameAr: doc.nameAr || '',
    description: doc.description || '',
    descriptionAr: doc.descriptionAr || '',
    image: publicBrandAsset(doc.image),
    bannerEn: publicBrandAsset(doc.bannerEn),
    bannerAr: publicBrandAsset(doc.bannerAr),
    bannerTabletEn: publicBrandAsset(doc.bannerTabletEn),
    bannerTabletAr: publicBrandAsset(doc.bannerTabletAr),
    bannerMobileEn: publicBrandAsset(doc.bannerMobileEn),
    bannerMobileAr: publicBrandAsset(doc.bannerMobileAr),
    metaTitle: doc.metaTitle || '',
    metaDescription: doc.metaDescription || '',
  };
  return page;
}

function brandNameKey(value = '') {
  return String(value || '').trim().toLowerCase();
}

async function liveApprovedStoreId() {
  const Store = (await import('@/models/Store')).default;
  const approved = await Store.findOne({ status: 'approved' })
    .sort({ updatedAt: -1 })
    .select('_id')
    .lean();
  return approved?._id ? String(approved._id) : '';
}

/** Dashboard brands that have a logo. Same list and order as Store → Brands. */
export async function listPublicSavedBrands() {
  await connectDB();
  const storeId = await liveApprovedStoreId();
  const pages = await BrandPage.find({
    ...(storeId ? { storeId } : {}),
    slug: { $exists: true, $nin: ['', null] },
    image: { $type: 'string', $nin: ['', null] },
  }).lean();

  const counts = await Product.aggregate([
    { $match: { brand: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$brand', productCount: { $sum: 1 } } },
  ]);
  const countByName = new Map();
  for (const row of counts) {
    const key = brandNameKey(row?._id);
    if (!key) continue;
    countByName.set(key, (countByName.get(key) || 0) + Number(row.productCount || 0));
  }

  return pages
    .map((page) => serializePublicBrand(page))
    .filter((page) => page?.image && countByName.has(brandNameKey(page.name)))
    .sort((a, b) => {
      const countDiff = (countByName.get(brandNameKey(b.name)) || 0) - (countByName.get(brandNameKey(a.name)) || 0);
      if (countDiff) return countDiff;
      return a.name.localeCompare(b.name);
    });
}

export function serializeBrandPage(doc) {
  if (!doc) return null;
  const slug = String(doc.slug || '').trim();
  return {
    id: String(doc._id),
    slug,
    path: brandPagePath(slug),
    name: doc.name || '',
    nameAr: doc.nameAr || '',
    description: doc.description || '',
    descriptionAr: doc.descriptionAr || '',
    image: doc.image || '',
    imageUpdatedAt: doc.imageUpdatedAt ? new Date(doc.imageUpdatedAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    bannerEn: doc.bannerEn || '',
    bannerAr: doc.bannerAr || '',
    bannerTabletEn: doc.bannerTabletEn || '',
    bannerTabletAr: doc.bannerTabletAr || '',
    bannerMobileEn: doc.bannerMobileEn || '',
    bannerMobileAr: doc.bannerMobileAr || '',
    metaTitle: doc.metaTitle || '',
    metaDescription: doc.metaDescription || '',
  };
}

function brandNameMatch(name = '') {
  const label = String(name || '').trim();
  if (!label) return null;
  return { brand: { $regex: `^${escapeRegex(label)}$`, $options: 'i' } };
}

export async function loadStoreBrandPages(storeId) {
  await connectDB();
  if (!storeId) return [];
  return BrandPage.find({ storeId: String(storeId) }).lean();
}

export function matchStoreBrandPage(pages = [], brandName = '') {
  const name = String(brandName || '').trim().toLowerCase();
  const slug = slugifyCategory(brandName);
  if (!name && !slug) return null;
  return (pages || []).find((page) => {
    const pageName = String(page?.name || '').trim().toLowerCase();
    const pageSlug = String(page?.slug || '').trim().toLowerCase();
    return pageName === name || (slug && pageSlug === slug);
  }) || null;
}

export async function saveBrandPage(storeId, brandName, fields = {}) {
  const name = cleanDisplayText(brandName);
  const storeKey = String(storeId || '').trim();
  if (!storeKey) {
    const error = new Error('Store is required');
    error.status = 401;
    throw error;
  }
  if (!name) {
    const error = new Error('Brand name is required');
    error.status = 400;
    throw error;
  }

  await connectDB();
  const pages = await BrandPage.find({ storeId: storeKey }).lean();
  const existing = matchStoreBrandPage(pages, name);
  const slug = existing?.slug || slugifyCategory(name);
  if (!slug) {
    const error = new Error('Brand name is required');
    error.status = 400;
    throw error;
  }

  const nextImage = String(fields.image || '').trim();
  const previousImage = String(existing?.image || '').trim();
  const payload = {
    storeId: storeKey,
    name: existing?.name || name,
    slug,
    nameAr: cleanDisplayText(fields.nameAr || ''),
    description: cleanDisplayText(fields.description || ''),
    descriptionAr: cleanDisplayText(fields.descriptionAr || ''),
    image: nextImage,
    metaTitle: cleanDisplayText(fields.metaTitle || '').slice(0, 120),
    metaDescription: cleanDisplayText(fields.metaDescription || '').slice(0, 320),
  };
  if (nextImage !== previousImage) {
    payload.imageUpdatedAt = nextImage ? new Date() : null;
  }
  for (const key of BRAND_BANNER_KEYS) {
    payload[key] = String(fields[key] || '').trim();
  }

  const saved = existing?._id
    ? await BrandPage.findByIdAndUpdate(existing._id, payload, { new: true }).lean()
    : (await BrandPage.create(payload)).toObject();

  refreshBrandStorefront(slug);
  return serializeBrandPage(saved);
}

function refreshBrandStorefront(slug = '') {
  invalidateCategorySliderCaches();
  try {
    const path = brandPagePath(slug);
    if (path && path !== '/brand') revalidatePath(path);
    revalidatePath('/');
  } catch {
    // Safe when a save runs outside a Next.js request.
  }
}

export async function findPublicBrandPage(slug = '') {
  const safe = slugifyCategory(slug);
  if (!safe) return null;
  await connectDB();
  const storeId = await liveApprovedStoreId();
  const saved = storeId
    ? await BrandPage.findOne({ slug: safe, storeId }).sort({ updatedAt: -1 }).lean()
    : null;
  const page = saved || await BrandPage.findOne({ slug: safe }).sort({ updatedAt: -1 }).lean();
  if (page) {
    const publicPage = serializePublicBrand(page);
    if (publicPage) return publicPage;
  }

  const names = await Product.distinct('brand', {
    ...STOREFRONT_PUBLISHED_FILTER,
    brand: { $exists: true, $nin: [null, ''] },
  });
  const name = (names || []).find((value) => slugifyCategory(value) === safe);
  if (!name) return null;
  return {
    name: String(name).trim(),
    slug: safe,
    nameAr: '',
    description: '',
    descriptionAr: '',
    image: '',
    bannerEn: '',
    bannerAr: '',
    bannerTabletEn: '',
    bannerTabletAr: '',
    bannerMobileEn: '',
    bannerMobileAr: '',
    metaTitle: '',
    metaDescription: '',
  };
}

export async function getBrandProducts(brandName, { page = 1, limit = BRAND_PRODUCTS_PAGE_SIZE } = {}) {
  await connectDB();
  const nameMatch = brandNameMatch(brandName);
  if (!nameMatch) return { products: [], total: 0, page, limit };

  const match = { $and: [STOREFRONT_PUBLISHED_FILTER, nameMatch] };
  const safeLimit = Math.min(Math.max(1, limit), BRAND_PRODUCTS_PAGE_SIZE);
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeLimit;
  const [rawProducts, total] = await Promise.all([
    fetchProductsDedupedBySku(Product, match, { sort: { createdAt: -1 }, skip, limit: safeLimit, fields: STOREFRONT_CARD_FIELDS }),
    countProductsDedupedBySku(Product, match),
  ]);
  const products = await attachProductRatings(rawProducts);
  return {
    products: JSON.parse(JSON.stringify(products)),
    total,
    page: safePage,
    limit: safeLimit,
  };
}

export async function getBrandHeaderStats(brandName) {
  await connectDB();
  const nameMatch = brandNameMatch(brandName);
  if (!nameMatch) {
    return { productCount: 0, fastDeliveryPercent: 0, averageRating: 0, reviewCount: 0 };
  }

  const match = { $and: [STOREFRONT_PUBLISHED_FILTER, nameMatch] };
  const [products, productCount] = await Promise.all([
    Product.find(match).select('_id fastDelivery').lean(),
    countProductsDedupedBySku(Product, match),
  ]);
  const fastDeliveryCount = products.filter((product) => product.fastDelivery).length;
  const fastDeliveryPercent = productCount > 0
    ? Math.round((fastDeliveryCount / productCount) * 100)
    : 0;
  const productIds = products.map((product) => String(product._id));
  let reviewCount = 0;
  let averageRating = 0;
  if (productIds.length) {
    const [ratingAgg] = await Rating.aggregate([
      { $match: { productId: { $in: productIds }, approved: true } },
      { $group: { _id: null, count: { $sum: 1 }, sum: { $sum: '$rating' } } },
    ]);
    reviewCount = Number(ratingAgg?.count) || 0;
    averageRating = reviewCount > 0
      ? Math.round((Number(ratingAgg.sum) / reviewCount) * 10) / 10
      : 0;
  }
  return { productCount, fastDeliveryPercent, averageRating, reviewCount };
}
