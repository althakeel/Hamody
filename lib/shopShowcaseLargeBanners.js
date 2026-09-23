import { hasShowcaseBannerImage, serializeShowcaseImageFields } from '@/lib/showcaseBannerImages';

export function createLargeBannerSlide(overrides = {}) {
  return {
    id: overrides.id || `large-banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...serializeShowcaseImageFields(overrides),
    link: String(overrides.link || '/shop').trim(),
    linkType: ['category', 'product', 'custom'].includes(overrides.linkType)
      ? overrides.linkType
      : '',
    targetBlank: Boolean(overrides.targetBlank),
    alt: String(overrides.alt || '').trim(),
  };
}

export function normalizeLargeBannerSliderItems(items = [], legacyImage = '', legacyLink = '/shop', prefix = 'large-banner') {
  const normalized = (Array.isArray(items) ? items : [])
    .slice(0, 8)
    .map((item, index) => createLargeBannerSlide({
      id: item?.id || `${prefix}-${index + 1}`,
      ...item,
      link: item?.link || legacyLink || '/shop',
      alt: item?.alt || `Banner ${index + 1}`,
    }))
    .filter((item) => hasShowcaseBannerImage(item));

  if (normalized.length) return normalized;

  const legacy = String(legacyImage || '').trim();
  if (!legacy) return [];

  return [createLargeBannerSlide({
    id: `${prefix}-1`,
    image: legacy,
    link: legacyLink || '/shop',
    alt: 'Banner 1',
  })];
}

/** Keeps empty slides so the admin editor does not drop in-progress slides after save. */
export function normalizeLargeBannerSliderItemsForEditor(
  items = [],
  legacyImage = '',
  legacyLink = '/shop',
  prefix = 'large-banner',
) {
  const rawItems = Array.isArray(items) ? items : [];

  if (rawItems.length) {
    return rawItems.slice(0, 8).map((item, index) => createLargeBannerSlide({
      id: item?.id || `${prefix}-${index + 1}`,
      ...item,
      link: item?.link || legacyLink || '/shop',
      alt: item?.alt || `Banner ${index + 1}`,
    }));
  }

  const legacy = String(legacyImage || '').trim();
  if (!legacy) {
    return [createLargeBannerSlide({ id: `${prefix}-1`, alt: 'Banner 1' })];
  }

  return [createLargeBannerSlide({
    id: `${prefix}-1`,
    image: legacy,
    link: legacyLink || '/shop',
    alt: 'Banner 1',
  })];
}

const LARGE_BANNER_PREFIXES = {
  top: 'top',
  bottom: 'bottom',
  fullWidth: 'fullWidth',
  lowerFullWidth: 'lowerFullWidth',
};

export function getLargeBannerPrefix(type = 'top') {
  return LARGE_BANNER_PREFIXES[type] || 'top';
}

export function getLargeBannerSlides(config = {}, type = 'top') {
  const prefix = getLargeBannerPrefix(type);
  const enabledKey = `${prefix}BannerSliderEnabled`;
  const itemsKey = `${prefix}BannerSliderItems`;
  const imageKey = `${prefix}BannerImage`;
  const linkKey = `${prefix}BannerLink`;

  const slides = normalizeLargeBannerSliderItems(
    config?.[itemsKey],
    config?.[imageKey],
    config?.[linkKey] || '/shop',
    `${prefix}-large-banner`,
  );

  if (config?.[enabledKey] === false && slides.length > 1) {
    return slides.slice(0, 1);
  }

  return slides;
}

export function hasFullWidthBannerImage(config = {}) {
  const slides = getLargeBannerSlides(config, 'fullWidth')
  return slides.length > 0 || Boolean(String(config?.fullWidthBannerImage || '').trim())
}

export function isFullWidthBannerActive(config = {}) {
  if (!hasFullWidthBannerImage(config)) return false
  if (config?.fullWidthBannerEnabled === true) return true
  // Uploaded store art should still show when the old main hero is off.
  return config?.mainBannerEnabled === false
}

export const FULL_WIDTH_BANNER_HEIGHT_MIN = 350;
export const FULL_WIDTH_BANNER_HEIGHT_MAX = 500;
export const FULL_WIDTH_BANNER_HEIGHT_DEFAULT = 400;

export function normalizeBannerHeight(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

export function normalizeFullWidthBannerHeight(value, fallback = FULL_WIDTH_BANNER_HEIGHT_DEFAULT) {
  return normalizeBannerHeight(
    value,
    FULL_WIDTH_BANNER_HEIGHT_MIN,
    FULL_WIDTH_BANNER_HEIGHT_MAX,
    fallback,
  );
}

export const LOWER_FULL_WIDTH_BANNER_HEIGHT_MIN = 80;
export const LOWER_FULL_WIDTH_BANNER_HEIGHT_MAX = 300;
export const LOWER_FULL_WIDTH_BANNER_HEIGHT_DEFAULT = 200;

export function normalizeLowerFullWidthBannerHeight(
  value,
  fallback = LOWER_FULL_WIDTH_BANNER_HEIGHT_DEFAULT,
) {
  return normalizeBannerHeight(
    value,
    LOWER_FULL_WIDTH_BANNER_HEIGHT_MIN,
    LOWER_FULL_WIDTH_BANNER_HEIGHT_MAX,
    fallback,
  );
}

export const FULL_WIDTH_BANNER_GAP_MIN = 0;
export const FULL_WIDTH_BANNER_GAP_MAX = 80;
export const FULL_WIDTH_BANNER_GAP_DEFAULT = 12;

export function normalizeFullWidthBannerGap(value, fallback = FULL_WIDTH_BANNER_GAP_DEFAULT) {
  return normalizeBannerHeight(
    value,
    FULL_WIDTH_BANNER_GAP_MIN,
    FULL_WIDTH_BANNER_GAP_MAX,
    fallback,
  );
}

export const DEFAULT_LARGE_BANNER_SLIDER = {
  topBannerSliderEnabled: true,
  topBannerSliderInterval: 4000,
  topBannerSliderItems: [],
  bottomBannerSliderEnabled: true,
  bottomBannerSliderInterval: 4000,
  bottomBannerSliderItems: [],
  fullWidthBannerSliderEnabled: true,
  fullWidthBannerSliderInterval: 4000,
  fullWidthBannerSliderItems: [],
  lowerFullWidthBannerSliderEnabled: true,
  lowerFullWidthBannerSliderInterval: 4000,
  lowerFullWidthBannerSliderItems: [],
};

export function serializeLargeBannerSliderItems(
  items = [],
  legacyLink = '/shop',
  prefix = 'large-banner',
) {
  if (!Array.isArray(items)) return []

  return items
    .slice(0, 8)
    .map((item, index) => createLargeBannerSlide({
      id: item?.id || `${prefix}-${index + 1}`,
      ...item,
      link: item?.link || legacyLink || '/shop',
      alt: item?.alt || `Banner ${index + 1}`,
    }))
    .filter((item) => hasShowcaseBannerImage(item))
}

function normalizeSliderInterval(value, fallback) {
  return Math.max(2000, Math.min(15000, Number(value) || fallback));
}

export function applyLargeBannerSliderDefaults(data = {}) {
  const topBannerSliderItems = normalizeLargeBannerSliderItems(
    data.topBannerSliderItems,
    data.topBannerImage,
    data.topBannerLink || '/shop',
    'top-large-banner',
  );
  const bottomBannerSliderItems = normalizeLargeBannerSliderItems(
    data.bottomBannerSliderItems,
    data.bottomBannerImage,
    data.bottomBannerLink || '/shop',
    'bottom-large-banner',
  );
  const fullWidthBannerSliderItems = normalizeLargeBannerSliderItems(
    data.fullWidthBannerSliderItems,
    data.fullWidthBannerImage,
    data.fullWidthBannerLink || '/shop',
    'full-width-large-banner',
  );
  const lowerFullWidthBannerSliderItems = normalizeLargeBannerSliderItems(
    data.lowerFullWidthBannerSliderItems,
    data.lowerFullWidthBannerImage,
    data.lowerFullWidthBannerLink || '/shop',
    'lower-full-width-large-banner',
  );

  return {
    topBannerSliderEnabled: typeof data.topBannerSliderEnabled === 'boolean'
      ? data.topBannerSliderEnabled
      : DEFAULT_LARGE_BANNER_SLIDER.topBannerSliderEnabled,
    topBannerSliderInterval: normalizeSliderInterval(
      data.topBannerSliderInterval,
      DEFAULT_LARGE_BANNER_SLIDER.topBannerSliderInterval,
    ),
    topBannerSliderItems,
    topBannerImage: topBannerSliderItems[0]?.image || String(data.topBannerImage || '').trim(),
    bottomBannerSliderEnabled: typeof data.bottomBannerSliderEnabled === 'boolean'
      ? data.bottomBannerSliderEnabled
      : DEFAULT_LARGE_BANNER_SLIDER.bottomBannerSliderEnabled,
    bottomBannerSliderInterval: normalizeSliderInterval(
      data.bottomBannerSliderInterval,
      DEFAULT_LARGE_BANNER_SLIDER.bottomBannerSliderInterval,
    ),
    bottomBannerSliderItems,
    bottomBannerImage: bottomBannerSliderItems[0]?.image || String(data.bottomBannerImage || '').trim(),
    fullWidthBannerSliderEnabled: typeof data.fullWidthBannerSliderEnabled === 'boolean'
      ? data.fullWidthBannerSliderEnabled
      : DEFAULT_LARGE_BANNER_SLIDER.fullWidthBannerSliderEnabled,
    fullWidthBannerSliderInterval: normalizeSliderInterval(
      data.fullWidthBannerSliderInterval,
      DEFAULT_LARGE_BANNER_SLIDER.fullWidthBannerSliderInterval,
    ),
    fullWidthBannerSliderItems,
    fullWidthBannerImage: fullWidthBannerSliderItems[0]?.image || String(data.fullWidthBannerImage || '').trim(),
    fullWidthBannerDesktopHeight: normalizeFullWidthBannerHeight(data.fullWidthBannerDesktopHeight),
    lowerFullWidthBannerSliderEnabled: typeof data.lowerFullWidthBannerSliderEnabled === 'boolean'
      ? data.lowerFullWidthBannerSliderEnabled
      : DEFAULT_LARGE_BANNER_SLIDER.lowerFullWidthBannerSliderEnabled,
    lowerFullWidthBannerSliderInterval: normalizeSliderInterval(
      data.lowerFullWidthBannerSliderInterval,
      DEFAULT_LARGE_BANNER_SLIDER.lowerFullWidthBannerSliderInterval,
    ),
    lowerFullWidthBannerSliderItems,
    lowerFullWidthBannerImage: lowerFullWidthBannerSliderItems[0]?.image || String(data.lowerFullWidthBannerImage || '').trim(),
    lowerFullWidthBannerDesktopHeight: normalizeLowerFullWidthBannerHeight(data.lowerFullWidthBannerDesktopHeight),
    fullWidthBannerGap: normalizeFullWidthBannerGap(data.fullWidthBannerGap),
  };
}
