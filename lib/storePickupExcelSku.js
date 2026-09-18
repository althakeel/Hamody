import { getOrderLineProduct } from './orderDisplay.js';
import { isBulkBundleVariantOption, matchVariantByOptions } from './productVariantOptions.js';

function pickSku(...candidates) {
  for (const candidate of candidates) {
    const sku = String(candidate ?? '').trim();
    if (!sku) continue;
    if (/^[a-fA-F0-9]{24}$/.test(sku)) continue;
    return sku;
  }
  return '';
}

export function resolveLineSku(item = {}) {
  const product = getOrderLineProduct(item);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const matchedVariant = matchVariantByOptions(variants, item?.variantOptions || {});
  const isBundle = Boolean(
    item.isBulkBundle
    || Number(item.bundleUnits) > 1
    || Number(item?.variantOptions?.bundleQty) > 1
    || isBulkBundleVariantOption(matchedVariant)
  );
  const regularVariantSkus = variants
    .filter((variant) => !isBulkBundleVariantOption(variant))
    .map((variant) => variant?.sku);

  return pickSku(
    isBundle ? '' : matchedVariant?.sku,
    item.sku,
    item.variantSku,
    item.SKU,
    product?.sku,
    product?.zoho?.sku,
    item.productId?.sku,
    item.product?.sku,
    ...regularVariantSkus,
    matchedVariant?.sku,
    ...variants.map((variant) => variant?.sku),
  );
}
