import { getVariantSelectionKeys, getVariantStock } from './productVariantOptions.js';

function positiveNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

const PACK_LABEL_TITLE = /^(buy\s*)?\d+$|^(bundle(\s+of)?|qty)\s*\d+$/i;
const PACK_LABEL_SUFFIX = /\s*[·|/\-–—]\s*(bundle(\s+of)?\s*\d+|buy\s*\d+|qty\s*\d+)\s*$/i;
const PACK_LABEL_TRAILING = /\s+(bundle(\s+of)?\s*\d+|buy\s*\d+|qty\s*\d+)\s*$/i;

export function stripPackLabelFromTitle(title = '') {
  return String(title || '')
    .replace(PACK_LABEL_SUFFIX, '')
    .replace(PACK_LABEL_TRAILING, '')
    .trim();
}

export function isBarePackTitle(title = '') {
  const text = String(title || '').trim();
  return Boolean(text) && PACK_LABEL_TITLE.test(text);
}

function titleForSelectionSignature(options = {}) {
  const stripped = stripPackLabelFromTitle(options?.title);
  if (stripped && !isBarePackTitle(stripped)) return stripped;
  return '';
}

/** Same color/size/option family, ignoring pack size and Buy 1 / Bundle of N labels. */
export function getVariantSelectionSignature(options = {}) {
  const normalized = {
    ...options,
    title: titleForSelectionSignature(options),
  };
  return getVariantSelectionKeys(normalized)
    .sort()
    .map((key) => `${key}:${String(normalized?.[key] ?? '').trim()}`)
    .join('|');
}

export function isBundlePackVariant(variant) {
  return positiveNumber(variant?.options?.bundleQty) > 0;
}

/** All pack sizes that share one physical inventory pool. */
export function getBundleSiblingIndexes(variants = [], matchedIndex = -1) {
  const list = Array.isArray(variants) ? variants : [];
  const matched = list[matchedIndex];
  if (!matched || !isBundlePackVariant(matched)) {
    return matchedIndex >= 0 ? [matchedIndex] : [];
  }

  const signature = getVariantSelectionSignature(matched.options);
  const indexes = [];
  list.forEach((variant, index) => {
    if (!isBundlePackVariant(variant)) return;
    if (getVariantSelectionSignature(variant.options) === signature) {
      indexes.push(index);
    }
  });
  return indexes.length ? indexes : [matchedIndex];
}

export function getBundleSiblingVariants(variants = [], options = {}) {
  const list = Array.isArray(variants) ? variants : [];
  const hasPack = positiveNumber(options?.bundleQty) > 0
    || list.some((variant) => isBundlePackVariant(variant));
  if (!hasPack) return [];

  const signature = getVariantSelectionSignature(options);
  return list.filter((variant) => (
    isBundlePackVariant(variant)
    && getVariantSelectionSignature(variant.options) === signature
  ));
}

/** Buy 1 / Bundle of 2 / Bundle of 3 with no separate color or size. One dashboard Stock Qty. */
export function isSingleSharedPackPool(product = {}) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const packVariants = variants.filter(isBundlePackVariant);
  if (!packVariants.length) return false;
  const signatures = new Set(
    packVariants.map((variant) => getVariantSelectionSignature(variant.options)),
  );
  return signatures.size === 1;
}

/**
 * Physical units on the shelf for one option (or the whole product for Buy 1 / Bundle of 3).
 * Pack rows do not have their own stock — they share the dashboard Stock Qty.
 */
export function getSharedBundleUnitStock(product = {}, options = {}) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const productStock = Number(product?.stockQuantity);
  const hasProductStock = Number.isFinite(productStock);

  // Seller edits one Stock Qty (including 0). Pack rows can be left behind with stale stock.
  if (isSingleSharedPackPool(product) && hasProductStock) {
    return Math.max(0, productStock);
  }

  if (product?.inStock === false && hasProductStock && productStock <= 0) {
    return 0;
  }

  const siblings = getBundleSiblingVariants(variants, options);
  if (siblings.length) {
    const unitStocks = siblings
      .map((variant) => getVariantStock(variant))
      .filter((amount) => Number.isFinite(amount));
    if (unitStocks.length) {
      return Math.max(0, Math.min(...unitStocks));
    }
  }

  return hasProductStock ? Math.max(0, productStock) : 0;
}

/** How many packs of this size can still be sold from the shared unit pool. */
export function getAvailableBundlePacks(product = {}, options = {}, bundleQty = 1) {
  const units = getSharedBundleUnitStock(product, options);
  const qty = Math.max(1, Number(bundleQty) || 1);
  return Math.floor(units / qty);
}

/** Unique physical units across pack families (do not count Buy 1 + Bundle of 3 twice). */
export function getSharedBundleUnitStockTotal(product = {}) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const packVariants = variants.filter(isBundlePackVariant);
  if (!packVariants.length) {
    const productStock = Number(product?.stockQuantity);
    return Number.isFinite(productStock) ? Math.max(0, productStock) : 0;
  }

  const seen = new Set();
  let total = 0;
  packVariants.forEach((variant) => {
    const signature = getVariantSelectionSignature(variant.options);
    if (seen.has(signature)) return;
    seen.add(signature);
    total += getSharedBundleUnitStock(product, variant.options);
  });
  return total;
}
