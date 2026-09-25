import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
import Category from '@/models/Category'
import Store from '@/models/Store'
import mongoose from 'mongoose'
import { getCachedData, setCachedData } from '@/lib/cache'
import { applyLargeBannerSliderDefaults } from '@/lib/shopShowcaseLargeBanners'
import { hasShowcaseBannerImage, serializeShowcaseImageFields } from '@/lib/showcaseBannerImages'
import { resolvePublicStorePreference } from '@/lib/storePreferencePublic'
import { STOREFRONT_IN_STOCK_FILTER, STOREFRONT_PUBLISHED_FILTER } from '@/lib/productVisibility'

const SHOWCASE_CACHE_KEY = 'public:shop-showcase:v23'

const DEFAULT_SHOWCASE = {
  enabled: true,
  featuredSectionTitle: 'Craziest sale of the year!',
  featuredSectionDescription: "Grab the best deals before they're gone!",
  mainBannerEnabled: false,
  topBannerEnabled: true,
  bottomBannerEnabled: true,
  fullWidthBannerEnabled: false,
  mainBannerImage: '',
  mainBannerTitle: '',
  mainBannerSubtitle: '',
  mainBannerCtaText: '',
  mainBannerLink: '/shop',
  mainBannerLeftColor: '#00112b',
  mainBannerRightColor: '#00112b',
  mainBannerTitleColor: '#ffffff',
  mainBannerSubtitleColor: '#e5e7eb',
  mainBannerCtaBgColor: '#ef2d2d',
  mainBannerCtaTextColor: '#ffffff',
  mainBannerDesktopHeight: 320,
  mainBannerMobileHeight: 100,
  sectionTitle: 'More Reasons to Shop',
  leftBlockBadgeText: '',
  leftBlockSource: 'category',
  dealsTitle: 'MEGA DEALS',
  countdownEnd: null,
  categoryIds: [],
  sectionProductIds: [],
  productIds: [],
  topBannerImage: '',
  topBannerTitle: 'SUPER SAVES FOR SUMMER',
  topBannerTitleEnabled: true,
  topBannerSubtitle: '',
  topBannerSubtitleEnabled: true,
  topBannerCtaText: 'Order now',
  topBannerCtaEnabled: true,
  topBannerCtaBgColor: '#ef2d2d',
  topBannerCtaTextColor: '#ffffff',
  topBannerLink: '/shop',
  bottomBannerImage: '',
  bottomBannerTitle: 'Shop Now. Pay Later. Ready for Summer.',
  bottomBannerTitleEnabled: true,
  bottomBannerSubtitle: '',
  bottomBannerSubtitleEnabled: true,
  bottomBannerCtaText: 'Shop Now',
  bottomBannerCtaEnabled: true,
  bottomBannerCtaBgColor: '#ef2d2d',
  bottomBannerCtaTextColor: '#ffffff',
  bottomBannerLink: '/shop',
  topBannerSliderEnabled: true,
  topBannerSliderInterval: 4000,
  topBannerSliderItems: [],
  bottomBannerSliderEnabled: true,
  bottomBannerSliderInterval: 4000,
  bottomBannerSliderItems: [],
  fullWidthBannerImage: '',
  fullWidthBannerTitle: '',
  fullWidthBannerTitleEnabled: false,
  fullWidthBannerSubtitle: '',
  fullWidthBannerSubtitleEnabled: false,
  fullWidthBannerCtaText: '',
  fullWidthBannerCtaEnabled: false,
  fullWidthBannerCtaBgColor: '#ef2d2d',
  fullWidthBannerCtaTextColor: '#ffffff',
  fullWidthBannerLink: '/shop',
  fullWidthBannerSliderEnabled: true,
  fullWidthBannerSliderInterval: 4000,
  fullWidthBannerDesktopHeight: 400,
  fullWidthBannerSliderItems: [],
  lowerFullWidthBannerEnabled: false,
  lowerFullWidthBannerImage: '',
  lowerFullWidthBannerTitle: '',
  lowerFullWidthBannerTitleEnabled: false,
  lowerFullWidthBannerSubtitle: '',
  lowerFullWidthBannerSubtitleEnabled: false,
  lowerFullWidthBannerCtaText: '',
  lowerFullWidthBannerCtaEnabled: false,
  lowerFullWidthBannerCtaBgColor: '#ef2d2d',
  lowerFullWidthBannerCtaTextColor: '#ffffff',
  lowerFullWidthBannerLink: '/shop',
  lowerFullWidthBannerSliderEnabled: true,
  lowerFullWidthBannerSliderInterval: 4000,
  lowerFullWidthBannerDesktopHeight: 200,
  fullWidthBannerGap: 12,
  lowerFullWidthBannerSliderItems: [],
  productBanners: [
    { image: '', title: 'Product Title', subtitle: 'Order now', buttonText: 'Order now', link: '/shop' },
    { image: '', title: 'Product Title', subtitle: 'Order now', buttonText: 'Order now', link: '/shop' },
    { image: '', title: 'Product Title', subtitle: 'Order now', buttonText: 'Order now', link: '/shop' },
    { image: '', title: 'Product Title', subtitle: 'Order now', buttonText: 'Order now', link: '/shop' },
  ],
  bannerSliderEnabled: true,
  bannerSliderDesktopInterval: 4000,
  bannerSliderMobileInterval: 3000,
  bannerSliderDesktopHeight: 220,
  bannerSliderMobileHeight: 120,
  bannerSliderItems: [
    { id: 'banner-slider-1', image: '', link: '/category/sofas', alt: 'Banner 1' },
    { id: 'banner-slider-2', image: '', link: '/category/beds', alt: 'Banner 2' }
  ],
  secondaryBannerSliderEnabled: true,
  secondaryBannerSliderDesktopInterval: 4000,
  secondaryBannerSliderMobileInterval: 3000,
  secondaryBannerSliderDesktopHeight: 220,
  secondaryBannerSliderMobileHeight: 120,
  secondaryBannerSliderPlacement: 'above_top_deals',
  secondaryBannerSliderItems: [
    { id: 'secondary-banner-slider-1', image: '', link: '/shop', alt: 'Lower Banner 1' },
    { id: 'secondary-banner-slider-2', image: '', link: '/shop', alt: 'Lower Banner 2' }
  ]
}

function normalizeBannerSliderHeight(value, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(600, Math.max(80, Math.round(numeric)))
}

function normalizeMainBannerHeight(value, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(700, Math.max(80, Math.round(numeric)))
}

function normalizeBannerSliderItems(items) {
  if (!Array.isArray(items)) return DEFAULT_SHOWCASE.bannerSliderItems

  const normalized = items
    .slice(0, 6)
    .map((item, index) => ({
      id: (item?.id || `banner-slider-${index + 1}`).toString().trim(),
      image: (item?.image || '').toString().trim(),
      link: (item?.link || '/shop').toString().trim(),
      alt: (item?.alt || `Banner ${index + 1}`).toString().trim()
    }))

  return normalized.length ? normalized : DEFAULT_SHOWCASE.bannerSliderItems
}

function normalizeSecondaryBannerSliderItems(items) {
  if (!Array.isArray(items)) return DEFAULT_SHOWCASE.secondaryBannerSliderItems

  const normalized = items
    .slice(0, 6)
    .map((item, index) => ({
      id: (item?.id || `secondary-banner-slider-${index + 1}`).toString().trim(),
      ...serializeShowcaseImageFields(item),
      link: (item?.link || '/shop').toString().trim(),
      linkType: ['category', 'product', 'custom'].includes(item?.linkType) ? item.linkType : '',
      targetBlank: Boolean(item?.targetBlank),
      alt: (item?.alt || `Lower Banner ${index + 1}`).toString().trim(),
    }))
    .filter((item) => hasShowcaseBannerImage(item))

  return normalized.length ? normalized : DEFAULT_SHOWCASE.secondaryBannerSliderItems
}

function normalizeSecondaryBannerSliderPlacement(value) {
  if (value === 'below_top_deals') return 'below_top_deals'
  if (value === 'below_small_banners') return 'below_small_banners'
  return 'above_top_deals'
}

function normalizeProductBanners(items) {
  if (!Array.isArray(items)) return DEFAULT_SHOWCASE.productBanners

  return items
    .slice(0, 4)
    .map((item) => ({
      ...serializeShowcaseImageFields(item),
      title: (item?.title || '').toString().trim(),
      subtitle: (item?.subtitle || '').toString().trim(),
      buttonText: (item?.buttonText || '').toString().trim(),
      link: (item?.link || '').toString().trim(),
      linkType: ['category', 'product', 'custom'].includes(item?.linkType) ? item.linkType : '',
      targetBlank: Boolean(item?.targetBlank),
    }))
    .filter((item) => hasShowcaseBannerImage(item))
}

function isStockMainBanner(data = {}) {
  const title = String(data.mainBannerTitle || '').trim().toLowerCase()
  return title.startsWith('power up instantly')
}

function normalize(data = {}) {
  const sliderDefaults = applyLargeBannerSliderDefaults(data)
  const fullWidthActive = data.fullWidthBannerEnabled === true
  return {
    ...DEFAULT_SHOWCASE,
    ...data,
    ...sliderDefaults,
    topBannerEnabled: data.topBannerEnabled === true,
    bottomBannerEnabled: data.bottomBannerEnabled === true,
    fullWidthBannerEnabled: fullWidthActive,
    mainBannerEnabled: fullWidthActive || data.fullWidthBannerEnabled === true || isStockMainBanner(data)
      ? false
      : data.mainBannerEnabled === true,
    mainBannerTitle: isStockMainBanner(data) ? '' : (data.mainBannerTitle || ''),
    mainBannerSubtitle: isStockMainBanner(data) ? '' : (data.mainBannerSubtitle || ''),
    mainBannerCtaText: isStockMainBanner(data) ? '' : (data.mainBannerCtaText || ''),
    lowerFullWidthBannerEnabled: data.lowerFullWidthBannerEnabled === true,
    leftBlockBadgeText: typeof data.leftBlockBadgeText === 'string' ? data.leftBlockBadgeText.trim().slice(0, 12) : DEFAULT_SHOWCASE.leftBlockBadgeText,
    leftBlockSource: data.leftBlockSource === 'product' ? 'product' : 'category',
    categoryIds: Array.isArray(data.categoryIds) ? data.categoryIds.slice(0, 4).map(String) : [],
    sectionProductIds: Array.isArray(data.sectionProductIds) ? data.sectionProductIds.slice(0, 4).map(String) : [],
    productIds: Array.isArray(data.productIds) ? data.productIds.slice(0, 20).map(String) : [],
    topBannerTitle: (data.topBannerTitle || '').toString().trim(),
    topBannerTitleEnabled: typeof data.topBannerTitleEnabled === 'boolean' ? data.topBannerTitleEnabled : DEFAULT_SHOWCASE.topBannerTitleEnabled,
    topBannerSubtitle: (data.topBannerSubtitle || '').toString().trim(),
    topBannerSubtitleEnabled: typeof data.topBannerSubtitleEnabled === 'boolean' ? data.topBannerSubtitleEnabled : DEFAULT_SHOWCASE.topBannerSubtitleEnabled,
    topBannerCtaText: (data.topBannerCtaText || '').toString().trim(),
    topBannerCtaEnabled: typeof data.topBannerCtaEnabled === 'boolean' ? data.topBannerCtaEnabled : DEFAULT_SHOWCASE.topBannerCtaEnabled,
    topBannerCtaBgColor: (data.topBannerCtaBgColor || DEFAULT_SHOWCASE.topBannerCtaBgColor).toString().trim(),
    topBannerCtaTextColor: (data.topBannerCtaTextColor || DEFAULT_SHOWCASE.topBannerCtaTextColor).toString().trim(),
    topBannerImage: (data.topBannerImage || '').toString().trim(),
    topBannerLink: (data.topBannerLink || '').toString().trim(),
    bottomBannerTitle: (data.bottomBannerTitle || '').toString().trim(),
    bottomBannerTitleEnabled: typeof data.bottomBannerTitleEnabled === 'boolean' ? data.bottomBannerTitleEnabled : DEFAULT_SHOWCASE.bottomBannerTitleEnabled,
    bottomBannerSubtitle: (data.bottomBannerSubtitle || '').toString().trim(),
    bottomBannerSubtitleEnabled: typeof data.bottomBannerSubtitleEnabled === 'boolean' ? data.bottomBannerSubtitleEnabled : DEFAULT_SHOWCASE.bottomBannerSubtitleEnabled,
    bottomBannerCtaText: (data.bottomBannerCtaText || '').toString().trim(),
    bottomBannerCtaEnabled: typeof data.bottomBannerCtaEnabled === 'boolean' ? data.bottomBannerCtaEnabled : DEFAULT_SHOWCASE.bottomBannerCtaEnabled,
    bottomBannerCtaBgColor: (data.bottomBannerCtaBgColor || DEFAULT_SHOWCASE.bottomBannerCtaBgColor).toString().trim(),
    bottomBannerCtaTextColor: (data.bottomBannerCtaTextColor || DEFAULT_SHOWCASE.bottomBannerCtaTextColor).toString().trim(),
    bottomBannerImage: (data.bottomBannerImage || '').toString().trim(),
    bottomBannerLink: (data.bottomBannerLink || '').toString().trim(),
    fullWidthBannerTitle: (data.fullWidthBannerTitle || '').toString().trim(),
    fullWidthBannerTitleEnabled: typeof data.fullWidthBannerTitleEnabled === 'boolean' ? data.fullWidthBannerTitleEnabled : DEFAULT_SHOWCASE.fullWidthBannerTitleEnabled,
    fullWidthBannerSubtitle: (data.fullWidthBannerSubtitle || '').toString().trim(),
    fullWidthBannerSubtitleEnabled: typeof data.fullWidthBannerSubtitleEnabled === 'boolean' ? data.fullWidthBannerSubtitleEnabled : DEFAULT_SHOWCASE.fullWidthBannerSubtitleEnabled,
    fullWidthBannerCtaText: (data.fullWidthBannerCtaText || '').toString().trim(),
    fullWidthBannerCtaEnabled: typeof data.fullWidthBannerCtaEnabled === 'boolean' ? data.fullWidthBannerCtaEnabled : DEFAULT_SHOWCASE.fullWidthBannerCtaEnabled,
    fullWidthBannerCtaBgColor: (data.fullWidthBannerCtaBgColor || DEFAULT_SHOWCASE.fullWidthBannerCtaBgColor).toString().trim(),
    fullWidthBannerCtaTextColor: (data.fullWidthBannerCtaTextColor || DEFAULT_SHOWCASE.fullWidthBannerCtaTextColor).toString().trim(),
    fullWidthBannerImage: (data.fullWidthBannerImage || '').toString().trim(),
    fullWidthBannerLink: (data.fullWidthBannerLink || '').toString().trim(),
    lowerFullWidthBannerTitle: (data.lowerFullWidthBannerTitle || '').toString().trim(),
    lowerFullWidthBannerTitleEnabled: data.lowerFullWidthBannerTitleEnabled === true,
    lowerFullWidthBannerSubtitle: (data.lowerFullWidthBannerSubtitle || '').toString().trim(),
    lowerFullWidthBannerSubtitleEnabled: data.lowerFullWidthBannerSubtitleEnabled === true,
    lowerFullWidthBannerCtaText: (data.lowerFullWidthBannerCtaText || '').toString().trim(),
    lowerFullWidthBannerCtaEnabled: data.lowerFullWidthBannerCtaEnabled === true,
    lowerFullWidthBannerCtaBgColor: (data.lowerFullWidthBannerCtaBgColor || DEFAULT_SHOWCASE.lowerFullWidthBannerCtaBgColor).toString().trim(),
    lowerFullWidthBannerCtaTextColor: (data.lowerFullWidthBannerCtaTextColor || DEFAULT_SHOWCASE.lowerFullWidthBannerCtaTextColor).toString().trim(),
    lowerFullWidthBannerImage: (data.lowerFullWidthBannerImage || '').toString().trim(),
    lowerFullWidthBannerLink: (data.lowerFullWidthBannerLink || '').toString().trim(),
    ...applyLargeBannerSliderDefaults(data),
    productBanners: normalizeProductBanners(data.productBanners),
    mainBannerDesktopHeight: normalizeMainBannerHeight(data.mainBannerDesktopHeight, DEFAULT_SHOWCASE.mainBannerDesktopHeight),
    mainBannerMobileHeight: normalizeMainBannerHeight(data.mainBannerMobileHeight, DEFAULT_SHOWCASE.mainBannerMobileHeight),
    bannerSliderEnabled: typeof data.bannerSliderEnabled === 'boolean' ? data.bannerSliderEnabled : DEFAULT_SHOWCASE.bannerSliderEnabled,
    bannerSliderDesktopInterval: Math.max(1500, Number(data.bannerSliderDesktopInterval) || DEFAULT_SHOWCASE.bannerSliderDesktopInterval),
    bannerSliderMobileInterval: Math.max(1500, Number(data.bannerSliderMobileInterval) || DEFAULT_SHOWCASE.bannerSliderMobileInterval),
    bannerSliderDesktopHeight: normalizeBannerSliderHeight(data.bannerSliderDesktopHeight, DEFAULT_SHOWCASE.bannerSliderDesktopHeight),
    bannerSliderMobileHeight: normalizeBannerSliderHeight(data.bannerSliderMobileHeight, DEFAULT_SHOWCASE.bannerSliderMobileHeight),
    bannerSliderItems: normalizeBannerSliderItems(data.bannerSliderItems),
    secondaryBannerSliderEnabled: typeof data.secondaryBannerSliderEnabled === 'boolean' ? data.secondaryBannerSliderEnabled : DEFAULT_SHOWCASE.secondaryBannerSliderEnabled,
    secondaryBannerSliderDesktopInterval: Math.max(1500, Number(data.secondaryBannerSliderDesktopInterval) || DEFAULT_SHOWCASE.secondaryBannerSliderDesktopInterval),
    secondaryBannerSliderMobileInterval: Math.max(1500, Number(data.secondaryBannerSliderMobileInterval) || DEFAULT_SHOWCASE.secondaryBannerSliderMobileInterval),
    secondaryBannerSliderDesktopHeight: normalizeBannerSliderHeight(data.secondaryBannerSliderDesktopHeight, DEFAULT_SHOWCASE.secondaryBannerSliderDesktopHeight),
    secondaryBannerSliderMobileHeight: normalizeBannerSliderHeight(data.secondaryBannerSliderMobileHeight, DEFAULT_SHOWCASE.secondaryBannerSliderMobileHeight),
    secondaryBannerSliderPlacement: normalizeSecondaryBannerSliderPlacement(data.secondaryBannerSliderPlacement),
    secondaryBannerSliderItems: normalizeSecondaryBannerSliderItems(data.secondaryBannerSliderItems)
  }
}

function orderByIds(items, ids) {
  const orderMap = new Map(ids.map((id, index) => [String(id), index]))
  return [...items].sort((first, second) => {
    const firstOrder = orderMap.get(String(first._id))
    const secondOrder = orderMap.get(String(second._id))
    return (firstOrder ?? Number.MAX_SAFE_INTEGER) - (secondOrder ?? Number.MAX_SAFE_INTEGER)
  })
}

export async function GET() {
  try {
    const cached = getCachedData(SHOWCASE_CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Cache': 'HIT',
        },
      })
    }

    await connectDB()

    const preference = await resolvePublicStorePreference(Store, Product)

    const config = normalize(preference?.shopShowcase || DEFAULT_SHOWCASE)

    const validSectionProductIds = (config.sectionProductIds || []).filter((id) => mongoose.Types.ObjectId.isValid(id))
    const validProductIds = (config.productIds || []).filter((id) => mongoose.Types.ObjectId.isValid(id))
    const validCategoryIds = (config.categoryIds || []).filter((id) => mongoose.Types.ObjectId.isValid(id))
    const shouldFallbackToCategories = validCategoryIds.length === 0

    const [sectionProducts, products, categories] = await Promise.all([
      validSectionProductIds.length
        ? Product.find({
            _id: { $in: validSectionProductIds },
            ...STOREFRONT_PUBLISHED_FILTER,
            ...STOREFRONT_IN_STOCK_FILTER,
          })
            .select('_id name slug images price AED inStock stockQuantity')
            .lean()
        : Promise.resolve([]),
      validProductIds.length
        ? Product.find({
            _id: { $in: validProductIds },
            ...STOREFRONT_PUBLISHED_FILTER,
            ...STOREFRONT_IN_STOCK_FILTER,
          })
            .select('_id name slug images price AED inStock stockQuantity')
            .lean()
        : Promise.resolve([]),
      validCategoryIds.length
        ? Category.find({ _id: { $in: validCategoryIds } })
            .select('_id name slug image')
            .lean()
        : shouldFallbackToCategories
          ? Category.find({ $or: [{ parentId: null }, { parentId: '' }] })
            .sort({ createdAt: 1, name: 1 })
            .select('_id name slug image')
            .limit(9)
            .lean()
          : Promise.resolve([])
    ])

    const payload = {
      config,
      sectionProducts: orderByIds(sectionProducts, validSectionProductIds),
      products: orderByIds(products, validProductIds),
      categories: orderByIds(categories, validCategoryIds)
    }

    setCachedData(SHOWCASE_CACHE_KEY, payload, 60)

    return NextResponse.json(
      payload,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Cache': 'MISS',
        }
      }
    )
  } catch (error) {
    console.error('[public shop-showcase GET] error:', error)
    return NextResponse.json(
      { config: DEFAULT_SHOWCASE, sectionProducts: [], products: [], categories: [] },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    )
  }
}
