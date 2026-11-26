export const DEFAULT_CATEGORY_SLIDER_BACKGROUND = '#f3f0ff';

export const CATEGORY_SLIDER_BACKGROUND_PRESETS = [
  { label: 'Lavender', value: '#f3f0ff' },
  { label: 'Soft Blue', value: '#eef6ff' },
  { label: 'Mint', value: '#ecfdf5' },
  { label: 'Peach', value: '#fff7ed' },
  { label: 'Rose', value: '#fff1f2' },
  { label: 'Light Gray', value: '#f8fafc' },
  { label: 'White', value: '#ffffff' },
];

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Valid hex only. Empty string when the value is still being typed. */
export function tryNormalizeCategorySliderBackground(value) {
  const raw = String(value || '').trim();
  if (!HEX_COLOR_RE.test(raw)) return '';
  if (raw.length === 4) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return raw.toLowerCase();
}

export function normalizeCategorySliderBackground(value) {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_CATEGORY_SLIDER_BACKGROUND;
  return tryNormalizeCategorySliderBackground(raw) || DEFAULT_CATEGORY_SLIDER_BACKGROUND;
}

export function normalizeCategorySliderSideImagePosition(value) {
  return String(value || '').trim().toLowerCase() === 'right' ? 'right' : 'left';
}

export function normalizeCategorySliderAutoSlide(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export const DEFAULT_CATEGORY_SLIDER_AUTO_SLIDE_INTERVAL_MS = 4000;

export const CATEGORY_SLIDER_AUTO_SLIDE_SPEED_PRESETS = [
  { label: 'Fast (2s)', value: 2000 },
  { label: 'Normal (4s)', value: 4000 },
  { label: 'Slow (6s)', value: 6000 },
  { label: 'Very slow (8s)', value: 8000 },
];

const AUTO_SLIDE_INTERVAL_MIN_MS = 2000;
const AUTO_SLIDE_INTERVAL_MAX_MS = 12000;

export function normalizeCategorySliderAutoSlideInterval(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CATEGORY_SLIDER_AUTO_SLIDE_INTERVAL_MS;
  return Math.min(AUTO_SLIDE_INTERVAL_MAX_MS, Math.max(AUTO_SLIDE_INTERVAL_MIN_MS, Math.round(parsed)));
}

export const CATEGORY_SLIDER_MOBILE_IMAGE_RATIOS = [
  { value: '3:4', width: 3, height: 4 },
  { value: '2:4', width: 2, height: 4 },
  { value: '4:5', width: 4, height: 5 },
  { value: '1:1', width: 1, height: 1 },
  { value: '9:16', width: 9, height: 16 },
];

export const DEFAULT_CATEGORY_SLIDER_MOBILE_IMAGE_RATIO = '3:4';

export function normalizeCategorySliderMobileImageRatio(value) {
  const raw = String(value || '').trim().replace(/\s+/g, '');
  const match = CATEGORY_SLIDER_MOBILE_IMAGE_RATIOS.find((item) => item.value === raw);
  return match ? match.value : DEFAULT_CATEGORY_SLIDER_MOBILE_IMAGE_RATIO;
}

export function categorySliderMobileImageRatioParts(value) {
  const ratio = normalizeCategorySliderMobileImageRatio(value);
  return CATEGORY_SLIDER_MOBILE_IMAGE_RATIOS.find((item) => item.value === ratio);
}

export function serializeCategorySliderMobileImageRatio(value) {
  const parts = categorySliderMobileImageRatioParts(value);
  return {
    mobileImageRatio: parts.value,
    mobileImageWidth: parts.width,
    mobileImageHeight: parts.height,
  };
}

export function normalizeCategorySliderShowOutOfStock(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function isCategorySliderProductInStock(product = {}) {
  if (product?.inStock === false) return false;
  if (product?.stockQuantity != null && Number(product.stockQuantity) <= 0) return false;
  return true;
}

export function filterCategorySliderProducts(products = [], showOutOfStock = false) {
  if (!Array.isArray(products)) return [];
  if (normalizeCategorySliderShowOutOfStock(showOutOfStock)) return products;
  return products.filter(isCategorySliderProductInStock);
}
