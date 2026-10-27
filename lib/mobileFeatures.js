/** Mobile-app-only home banner config (four sections). Website is unchanged. */

import {
  MOBILE_BANNER_SECTIONS,
  emptyBannerSection,
  normalizeBannerSection,
  toPublicBannerSection,
  createEmptySlide,
  createEmptyTile,
} from '@/lib/mobileBannerLayout';
import {
  defaultMobileHomeLayout,
  mapShopShowcaseToMobileBannerSlider,
  normalizeMobileHomeLayout,
  toPublicMobileHomeLayout,
} from '@/lib/mobileHomeApis';
import { normalizeSplashScreens, toPublicSplashScreens } from '@/lib/mobileSplashScreens';
import { normalizeBottomIcons, toPublicBottomIcons } from '@/lib/mobileBottomIcons';
import { normalizeAppIcon, toPublicAppIcon } from '@/lib/mobileAppIcon';
import { normalizeAppNavbar, toPublicAppNavbar } from '@/lib/mobileAppNavbar';
import { normalizeAppFooter, toPublicAppFooter } from '@/lib/mobileAppFooter';
import { normalizeAppLoader, toPublicAppLoader } from '@/lib/mobileAppLoader';
import { normalizeOffersSection, toPublicOffersSection } from '@/lib/mobileOffersSection';
import { normalizeShopBlocks, toPublicShopBlocks } from '@/lib/mobileShopBlocks';
import { normalizeDealBar, toPublicDealBar } from '@/lib/mobileDealBar';
import { normalizeCouponBanner, toPublicCouponBanner } from '@/lib/mobileCouponBanner';
import { expandCategoryMobileSliders, normalizeCategoryMobileSliders } from '@/lib/mobileCategorySliders';

export const MOBILE_FEATURES_CACHE_KEY = 'public:mobile-features:v31';
export { MOBILE_BANNER_SECTIONS, createEmptySlide, createEmptyTile };

/** @deprecated Use section maxItems from MOBILE_BANNER_SECTIONS */
export const MAX_MOBILE_HOME_BANNERS = MOBILE_BANNER_SECTIONS.bannerSlider.maxItems;

export const DEFAULT_MOBILE_FEATURES = {
  bannerSlider: emptyBannerSection('bannerSlider'),
  smallBanners: emptyBannerSection('smallBanners'),
  promoCards: emptyBannerSection('promoCards'),
  fourthBanners: emptyBannerSection('fourthBanners'),
  tileBanners: emptyBannerSection('tileBanners'),
  homeLayout: defaultMobileHomeLayout(),
  splashScreens: normalizeSplashScreens(),
  bottomIcons: normalizeBottomIcons(),
  appIcon: normalizeAppIcon(),
  appNavbar: normalizeAppNavbar(),
  appFooter: normalizeAppFooter(),
    appLoader: normalizeAppLoader(),
  offersSection: normalizeOffersSection(),
  shopBlocks: normalizeShopBlocks(),
  dealBar: normalizeDealBar(),
  couponBanner: normalizeCouponBanner(),
  categoryMobileSliders: normalizeCategoryMobileSliders(),
};

/** @deprecated Prefer createEmptySlide */
export function createEmptyMobileBanner(overrides = {}) {
  return createEmptySlide(overrides);
}

function migrateLegacyBanners(source = {}) {
  const legacy = source.banners && typeof source.banners === 'object' ? source.banners : null;
  if (!legacy) return null;

  const homeBanners = Array.isArray(legacy.homeBanners) ? legacy.homeBanners : [];
  const intervalMs = Number(legacy.autoplayInterval);
  const slideIntervalSeconds = Number.isFinite(intervalMs) && intervalMs > 100
    ? Math.round(intervalMs / 1000)
    : 4;

  return normalizeBannerSection('bannerSlider', {
    enabled: legacy.enabled !== false,
    slideIntervalSeconds,
    heightPx: legacy.heightPx,
    slides: homeBanners.map((item) => ({
      ...item,
      path: item.path || item.link,
    })),
  });
}

export function normalizeMobileFeatures(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const legacySlider = migrateLegacyBanners(source);

  return {
    bannerSlider: normalizeBannerSection(
      'bannerSlider',
      source.bannerSlider || legacySlider || DEFAULT_MOBILE_FEATURES.bannerSlider,
    ),
    smallBanners: normalizeBannerSection(
      'smallBanners',
      source.smallBanners || DEFAULT_MOBILE_FEATURES.smallBanners,
    ),
    promoCards: normalizeBannerSection(
      'promoCards',
      source.promoCards || DEFAULT_MOBILE_FEATURES.promoCards,
    ),
    fourthBanners: normalizeBannerSection(
      'fourthBanners',
      source.fourthBanners || DEFAULT_MOBILE_FEATURES.fourthBanners,
    ),
    tileBanners: normalizeBannerSection(
      'tileBanners',
      source.tileBanners || DEFAULT_MOBILE_FEATURES.tileBanners,
    ),
    homeLayout: normalizeMobileHomeLayout(
      source.homeLayout || DEFAULT_MOBILE_FEATURES.homeLayout,
    ),
    splashScreens: normalizeSplashScreens(source.splashScreens),
    bottomIcons: normalizeBottomIcons(source.bottomIcons),
    appIcon: normalizeAppIcon(source.appIcon),
    appNavbar: normalizeAppNavbar(source.appNavbar),
    appFooter: normalizeAppFooter(source.appFooter),
    appLoader: normalizeAppLoader(source.appLoader),
    offersSection: normalizeOffersSection(source.offersSection),
    shopBlocks: normalizeShopBlocks(source.shopBlocks),
    dealBar: normalizeDealBar(source.dealBar),
    couponBanner: normalizeCouponBanner(source.couponBanner),
    categoryMobileSliders: normalizeCategoryMobileSliders(source.categoryMobileSliders),
  };
}

/** Full public bag for GET /api/public/mobile-features */
export function toPublicMobileFeatures(input = {}, shopShowcase = null) {
  const normalized = normalizeMobileFeatures(input);
  return {
    bannerSlider: resolveBannerSliderPublic(normalized, shopShowcase),
    smallBanners: toPublicBannerSection('smallBanners', normalized.smallBanners),
    promoCards: toPublicBannerSection('promoCards', normalized.promoCards),
    fourthBanners: toPublicBannerSection('fourthBanners', normalized.fourthBanners),
    tileBanners: toPublicBannerSection('tileBanners', normalized.tileBanners),
    homeLayout: toPublicMobileHomeLayout(normalized.homeLayout),
    splashScreens: toPublicSplashScreens(normalized.splashScreens),
    appIcon: toPublicAppIcon(normalized.appIcon),
    appNavbar: toPublicAppNavbar(normalized.appNavbar),
    appFooter: toPublicAppFooter(normalized.appFooter),
    appLoader: toPublicAppLoader(normalized.appLoader),
    offersSection: toPublicOffersSection(normalized.offersSection),
    shopBlocks: toPublicShopBlocks(normalized.shopBlocks),
    dealBar: toPublicDealBar(normalized.dealBar),
    couponBanner: toPublicCouponBanner(normalized.couponBanner),
    categoryMobileSliders: expandCategoryMobileSliders(normalized.categoryMobileSliders, []),
  };
}

/** Resolve large hero: website shop-showcase when flagged / empty, else mobile-features. */
export function resolveBannerSliderPublic(mobileFeaturesOrNormalized = {}, shopShowcase = null) {
  const normalized = mobileFeaturesOrNormalized?.bannerSlider
    ? mobileFeaturesOrNormalized
    : normalizeMobileFeatures(mobileFeaturesOrNormalized);
  const section = normalized.bannerSlider || {};
  const dedicated = toPublicBannerSection('bannerSlider', section);

  if (section.useWebsiteHomeBanners) {
    const fromWebsite = mapShopShowcaseToMobileBannerSlider(shopShowcase || {});
    if (fromWebsite.enabled) return fromWebsite;
    // Editor/preview: imported slides live on the section when showcase is not loaded yet
    if (dedicated.enabled) {
      return { ...dedicated, source: 'website-shop-showcase-mirror' };
    }
    return fromWebsite;
  }

  if (dedicated.enabled) {
    return { ...dedicated, source: 'mobile-features' };
  }

  const fromWebsite = mapShopShowcaseToMobileBannerSlider(shopShowcase || {});
  if (fromWebsite.enabled) return fromWebsite;

  return { ...dedicated, source: 'mobile-features' };
}

/** Dashboard preview: always prefer in-editor slides so the phone matches what you see. */
export function toPreviewMobileFeatures(input = {}, shopShowcase = null) {
  const normalized = normalizeMobileFeatures(input);
  return {
    bannerSlider: resolveBannerSliderPublic(normalized, shopShowcase),
    smallBanners: toPublicBannerSection('smallBanners', normalized.smallBanners),
    promoCards: toPublicBannerSection('promoCards', normalized.promoCards),
    fourthBanners: toPublicBannerSection('fourthBanners', normalized.fourthBanners),
    tileBanners: toPublicBannerSection('tileBanners', normalized.tileBanners),
    homeLayout: toPublicMobileHomeLayout(normalized.homeLayout),
    splashScreens: toPublicSplashScreens(normalized.splashScreens),
    bottomIcons: toPublicBottomIcons(normalized.bottomIcons),
    appIcon: toPublicAppIcon(normalized.appIcon),
    appNavbar: toPublicAppNavbar(normalized.appNavbar),
    appFooter: toPublicAppFooter(normalized.appFooter),
    appLoader: toPublicAppLoader(normalized.appLoader),
    offersSection: toPublicOffersSection(normalized.offersSection),
    shopBlocks: toPublicShopBlocks(normalized.shopBlocks),
    dealBar: toPublicDealBar(normalized.dealBar),
    couponBanner: toPublicCouponBanner(normalized.couponBanner),
    categoryMobileSliders: expandCategoryMobileSliders(normalized.categoryMobileSliders, []),
  };
}

export function getSectionPublicPayload(sectionKey, mobileFeatures = {}, shopShowcase = null) {
  const normalized = normalizeMobileFeatures(mobileFeatures);
  if (sectionKey === 'bannerSlider') {
    return resolveBannerSliderPublic(normalized, shopShowcase);
  }
  return toPublicBannerSection(sectionKey, normalized[sectionKey] || {});
}

export function mergeSectionIntoMobileFeatures(existing = {}, sectionKey, sectionValue = {}) {
  const current = normalizeMobileFeatures(existing);
  if (!MOBILE_BANNER_SECTIONS[sectionKey]) {
    throw new Error(`Unknown section: ${sectionKey}`);
  }
  return normalizeMobileFeatures({
    ...current,
    [sectionKey]: sectionValue,
  });
}

/** Merge a partial dashboard update without wiping other sections. */
export function mergeMobileFeaturesUpdate(existing = {}, incoming = {}) {
  const current = normalizeMobileFeatures(existing);
  const source = incoming && typeof incoming === 'object' ? incoming : {};
  const next = { ...current };

  for (const key of Object.keys(MOBILE_BANNER_SECTIONS)) {
    if (source[key] != null) {
      next[key] = source[key];
    }
  }

  if (source.homeLayout != null) {
    next.homeLayout = source.homeLayout;
  }

  if (source.splashScreens != null) {
    next.splashScreens = source.splashScreens;
  }

  if (source.bottomIcons != null) {
    next.bottomIcons = source.bottomIcons;
  }

  if (source.appIcon != null) {
    next.appIcon = source.appIcon;
  }

  if (source.appNavbar != null) {
    next.appNavbar = source.appNavbar;
  }

  if (source.appFooter != null) {
    next.appFooter = source.appFooter;
  }

  if (source.appLoader != null) {
    next.appLoader = source.appLoader;
  }

  if (source.offersSection != null) {
    next.offersSection = source.offersSection;
  }

  if (source.shopBlocks != null) {
    next.shopBlocks = source.shopBlocks;
  }

  if (source.dealBar != null) {
    next.dealBar = source.dealBar;
  }

  if (source.couponBanner != null) {
    next.couponBanner = source.couponBanner;
  }

  if (source.categoryMobileSliders != null) {
    next.categoryMobileSliders = source.categoryMobileSliders;
  }

  if (source.banners != null && source.bannerSlider == null) {
    const migrated = migrateLegacyBanners({ banners: source.banners });
    if (migrated) next.bannerSlider = migrated;
  }

  return normalizeMobileFeatures(next);
}
