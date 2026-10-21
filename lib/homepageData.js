import connectDB from '@/lib/mongodb';
import { getCachedData, setCachedData } from '@/lib/cache';
import { HOMEPAGE_CACHE_KEY } from '@/lib/categorySliderCache';
import StorePreference from '@/models/StorePreference';
import HomeSection from '@/models/HomeSection';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Store from '@/models/Store';
import { findSharedNavbarSettings, resolveStorefrontOwnerId } from '@/lib/storefrontSettingsOwner';
import mongoose from 'mongoose';
import { resolveStoreNavMenuItems } from '@/lib/categoryNavigation';
import { buildFeaturedProductsListQuery, isManualFeaturedSelection, manualFeaturedWindow, normalizeManualRotateHours, resolvePublicFeaturedStore } from '@/lib/featuredProducts';
import { resolvePublicStorePreference } from '@/lib/storePreferencePublic';
import { dedupeProductsBySku } from '@/lib/productSkuDedupe';
import { STOREFRONT_IN_STOCK_FILTER, STOREFRONT_PUBLISHED_FILTER, filterStorefrontInStockProducts, isProductPublished } from '@/lib/productVisibility';
import { attachProductRatings } from '@/lib/attachProductRatings';
import { findTopDealsSection, isTopDealsVisibleOnWebsite, TOP_DEALS_SECTION_KEYS } from '@/lib/homeTopDeals';
import { getPublicFeaturedSections } from '@/lib/publicFeaturedSections';
import { applyLargeBannerSliderDefaults } from '@/lib/shopShowcaseLargeBanners';

const HOMEPAGE_CACHE_KEY_LOCAL = HOMEPAGE_CACHE_KEY;
const HOMEPAGE_TTL = 60;

function isStockMainBanner(data = {}) {
  const title = String(data.mainBannerTitle || '').trim().toLowerCase();
  return title.startsWith('power up instantly');
}

function serializeClientPayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

const PRODUCT_SELECT =
  'name nameAr slug sku price mrp AED images category categories tags inStock stockQuantity fastDelivery freeShippingEligible useProductsPath imageAspectRatio imageBadgeIds legacySourceId createdAt updatedAt shortDescription shortDescriptionAr specTableRows';

function trimListingProduct(product) {
  if (!product || typeof product !== 'object') return product;
  return {
    ...product,
    images: Array.isArray(product.images) ? product.images.slice(0, 4) : product.images,
  };
}

function orderByIds(items, ids) {
  const orderMap = new Map(ids.map((id, index) => [String(id), index]));
  return [...items].sort((a, b) => {
    const aOrder = orderMap.get(String(a._id));
    const bOrder = orderMap.get(String(b._id));
    return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER);
  });
}

async function fetchShopShowcase() {
  const cacheKey = 'public:shop-showcase:v24';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const preference = await resolvePublicStorePreference(Store, Product);

  const raw = preference?.shopShowcase || {};
  const sliderDefaults = applyLargeBannerSliderDefaults(raw);
  const fullWidthActive = raw.fullWidthBannerEnabled === true;
  const config = {
    ...raw,
    ...sliderDefaults,
    fullWidthBannerEnabled: fullWidthActive,
    mainBannerEnabled: fullWidthActive || raw.fullWidthBannerEnabled === true || isStockMainBanner(raw)
      ? false
      : raw.mainBannerEnabled === true,
    mainBannerTitle: isStockMainBanner(raw) ? '' : (raw.mainBannerTitle || ''),
    mainBannerSubtitle: isStockMainBanner(raw) ? '' : (raw.mainBannerSubtitle || ''),
    mainBannerCtaText: isStockMainBanner(raw) ? '' : (raw.mainBannerCtaText || ''),
    topBannerEnabled: raw.topBannerEnabled === true,
    bottomBannerEnabled: raw.bottomBannerEnabled === true,
    lowerFullWidthBannerEnabled: raw.lowerFullWidthBannerEnabled === true,
  };
  const validSectionProductIds = (raw.sectionProductIds || []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  const validProductIds = (raw.productIds || []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  const validCategoryIds = (raw.categoryIds || []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  const shouldFallbackToCategories = validCategoryIds.length === 0;

  const [sectionProducts, products, categories] = await Promise.all([
    validSectionProductIds.length
        ? Product.find({
          _id: { $in: validSectionProductIds },
          ...STOREFRONT_PUBLISHED_FILTER,
          ...STOREFRONT_IN_STOCK_FILTER,
        }).select('_id name nameAr slug images price AED inStock stockQuantity').lean()
      : [],
    validProductIds.length
      ? Product.find({
          _id: { $in: validProductIds },
          ...STOREFRONT_PUBLISHED_FILTER,
          ...STOREFRONT_IN_STOCK_FILTER,
        }).select('_id name nameAr slug images price AED inStock stockQuantity').lean()
      : [],
    validCategoryIds.length
      ? Category.find({ _id: { $in: validCategoryIds } }).select('_id name nameAr slug image').lean()
      : shouldFallbackToCategories
        ? Category.find({ $or: [{ parentId: null }, { parentId: '' }] })
            .sort({ createdAt: 1, name: 1 })
            .select('_id name nameAr slug image')
            .limit(9)
            .lean()
        : [],
  ]);

  const payload = {
    config,
    sectionProducts: orderByIds(sectionProducts, validSectionProductIds).map(trimListingProduct),
    products: orderByIds(products, validProductIds).map(trimListingProduct),
    categories: orderByIds(categories, validCategoryIds),
  };

  setCachedData(cacheKey, payload, 60);
  return payload;
}

async function fetchHomeSections() {
  const sections = await HomeSection.find(
    {
      $or: [
        { isActive: { $ne: false } },
        { section: { $in: TOP_DEALS_SECTION_KEYS } },
      ],
    },
    {
      section: 1,
      sectionType: 1,
      category: 1,
      tag: 1,
      productIds: 1,
      title: 1,
      titleAr: 1,
      subtitle: 1,
      subtitleAr: 1,
      slides: 1,
      slidesData: 1,
      bannerCtaText: 1,
      bannerCtaTextAr: 1,
      bannerCtaLink: 1,
      layout: 1,
      isActive: 1,
      sortOrder: 1,
    }
  )
    .sort({ sortOrder: 1 })
    .lean();

  return sections;
}

async function fetchTopDealsProducts(homeSections = []) {
  const section = findTopDealsSection(homeSections);
  if (!isTopDealsVisibleOnWebsite(section)) return [];

  const ids = Array.isArray(section.productIds)
    ? section.productIds.map((id) => String(id || '').trim()).filter((id) => mongoose.Types.ObjectId.isValid(id)).slice(0, 12)
    : [];

  if (section.sectionType === 'manual' && ids.length > 0) {
    const products = await Product.find({
      _id: { $in: ids },
      ...STOREFRONT_PUBLISHED_FILTER,
      ...STOREFRONT_IN_STOCK_FILTER,
    }).select(PRODUCT_SELECT).lean();
    return orderByIds(products, ids).map(trimListingProduct);
  }

  const categoryId = String(section.category || '').trim();
  if (!mongoose.Types.ObjectId.isValid(categoryId)) return [];

  const products = await Product.find({
    $or: [{ category: categoryId }, { categories: categoryId }],
    ...STOREFRONT_PUBLISHED_FILTER,
    ...STOREFRONT_IN_STOCK_FILTER,
  }).select(PRODUCT_SELECT).sort({ createdAt: -1 }).limit(12).lean();

  return products.map(trimListingProduct);
}

function featuredSlotCount(menu = {}) {
  const perRow = Math.max(1, Math.min(10, Math.round(Number(menu.itemsPerRow) || 5)));
  const rows = menu.style === 'carousel' || menu.style === 'horizontal'
    ? 1
    : Math.max(1, Math.min(6, Math.round(Number(menu.rows) || 2)));
  return Math.max(1, Math.min(40, perRow * rows));
}

async function fetchFeaturedProducts(limit = 12) {
  let store = await resolvePublicFeaturedStore(Store, Product);

  const sourceMode = store?.featuredProductsSource === 'category' || store?.featuredProductsSource === 'tag' || store?.featuredProductsSource === 'latest'
    ? store.featuredProductsSource
    : 'manual';
  const productIds = Array.isArray(store?.featuredProductIds)
    ? [...new Set(store.featuredProductIds.map((id) => String(id || '').trim()).filter(Boolean))]
    : [];
  const rotateHours = normalizeManualRotateHours(store?.featuredManualRotateHours);
  const preference = await StorePreference.findOne({})
    .sort({ updatedAt: -1 })
    .select('appearanceSections.homeMenuCategories')
    .lean();
  const slots = featuredSlotCount(preference?.appearanceSections?.homeMenuCategories);
  const rotateWindow = rotateHours > 0
    ? Math.floor(Date.now() / (rotateHours * 60 * 60 * 1000))
    : 0;
  const cacheKey = `public:featured-products:v10:${sourceMode}:${slots}:${rotateHours}:${rotateWindow}:${limit}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  let products = [];

  if (isManualFeaturedSelection(sourceMode, productIds)) {
    const raw = await Product.find({
      _id: { $in: productIds },
      ...STOREFRONT_PUBLISHED_FILTER,
      ...STOREFRONT_IN_STOCK_FILTER,
    }).select(PRODUCT_SELECT).lean();
    const map = new Map(raw.map((p) => [String(p._id), p]));
    products = productIds
      .map((id) => map.get(String(id)))
      .filter((product) => product && isProductPublished(product));
  } else {
    const { query, sort } = buildFeaturedProductsListQuery({
      sourceMode,
      productIds,
      categoryIds: store?.featuredProductsCategoryIds,
      tags: store?.featuredProductsTags,
      storeId: store?._id,
    });
    products = dedupeProductsBySku(
      await Product.find(query).sort(sort).select(PRODUCT_SELECT).limit(limit > 0 ? limit : 40).lean(),
    );
  }

  products = filterStorefrontInStockProducts(products);
  if (isManualFeaturedSelection(sourceMode, productIds)) {
    products = manualFeaturedWindow(products, {
      rotateHours,
      slotCount: slots || limit || 10,
    }).products;
  } else if (limit > 0) {
    products = products.slice(0, limit);
  }
  products = (await attachProductRatings(products)).map(trimListingProduct);

  const sectionTitleEn = store?.featuredSectionTitle || 'Craziest sale of the year!';
  const sectionDescriptionEn = store?.featuredSectionDescription || "Grab the best deals before they're gone!";
  const sectionTitleAr = String(store?.featuredSectionTitleAr || '').trim();
  const sectionDescriptionAr = String(store?.featuredSectionDescriptionAr || '').trim();

  const payload = {
    products,
    // Keep English in sectionTitle/sectionDescription; client picks AR when language is Arabic.
    sectionTitle: sectionTitleEn,
    sectionDescription: sectionDescriptionEn,
    sectionTitleEn,
    sectionDescriptionEn,
    sectionTitleAr,
    sectionDescriptionAr,
    productIds: products.map((p) => String(p._id)),
  };

  setCachedData(cacheKey, payload, 120);
  return payload;
}

async function fetchAppearance() {
  const cacheKey = 'public:appearance-sections:v1';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const preference = await StorePreference.findOne({}).sort({ updatedAt: -1 }).select('appearanceSections').lean();
  const homeMenuCategories = preference?.appearanceSections?.homeMenuCategories || {
    enabled: true,
    style: 'grid',
    itemsPerRow: 6,
    rows: 2,
  };

  const payload = { homeMenuCategories };
  setCachedData(cacheKey, payload, 120);
  return payload;
}

async function fetchStoreMenuSettings() {
  const ownerId = await resolveStorefrontOwnerId('');
  const doc = await findSharedNavbarSettings(ownerId);
  const navMenuUseParentCategories = Boolean(doc?.navMenuUseParentCategories);
  const navMenuItems = Array.isArray(doc?.navMenuItems) ? doc.navMenuItems : [];
  const navMenuStyle = doc?.navMenuStyle && typeof doc.navMenuStyle === 'object' ? doc.navMenuStyle : {};

  const catalogCategories = await Category.find({ isActive: { $ne: false } })
    .select('name nameAr slug image parentId legacySourceId')
    .sort({ name: 1 })
    .lean();
  const resolvedNavMenuItems = resolveStoreNavMenuItems(
    { navMenuUseParentCategories, navMenuItems },
    catalogCategories,
  );

  return {
    navMenuItems,
    navMenuUseParentCategories,
    navMenuStyle,
    resolvedNavMenuItems,
  };
}

export async function getHomepageData() {
  const cacheKey = `${HOMEPAGE_CACHE_KEY_LOCAL}:i18n`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  await connectDB();

  const homeSectionsPromise = fetchHomeSections();

  const [shopShowcase, homeSections, featuredSections, featuredProducts, appearance, storeSettings] = await Promise.all([
    fetchShopShowcase(),
    homeSectionsPromise,
    getPublicFeaturedSections().catch(() => ({ sections: [] })),
    fetchFeaturedProducts(12),
    fetchAppearance(),
    fetchStoreMenuSettings(),
  ]);
  const topDealsProducts = await fetchTopDealsProducts(homeSections);

  const payload = serializeClientPayload({
    shopShowcase,
    homeSections,
    featuredSections: Array.isArray(featuredSections?.sections) ? featuredSections.sections : [],
    featuredSectionsCount: Array.isArray(featuredSections?.sections) ? featuredSections.sections.length : 0,
    featuredProducts,
    topDealsProducts,
    appearance,
    storeSettings,
  });

  setCachedData(cacheKey, payload, HOMEPAGE_TTL);
  return payload;
}
