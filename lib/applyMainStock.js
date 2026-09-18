import {
  getSharedBundleUnitStock,
  getSharedBundleUnitStockTotal,
  getVariantSelectionSignature,
  isBarePackTitle,
  isBundlePackVariant,
  stripPackLabelFromTitle,
} from './bundleSharedStock.js';
import { formatVariantOptionsLabel, getVariantStock } from './productVariantOptions.js';

function normalizeStock(value) {
  const qty = Math.floor(Number(value));
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

export function decodeProductName(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function productVariants(product = {}) {
  return Array.isArray(product?.variants) ? product.variants : [];
}

function currentStockOf(product = {}) {
  const variants = productVariants(product);
  if ((product?.hasVariants || variants.length) && variants.length) {
    if (variants.some(isBundlePackVariant)) {
      return getSharedBundleUnitStockTotal(product);
    }
    return variants.reduce((sum, variant) => sum + Math.max(0, Number(variant?.stock ?? 0)), 0);
  }
  return Math.max(0, Number(product?.stockQuantity ?? 0));
}

function deriveInStock(product = {}, stockQuantity, variants = productVariants(product)) {
  if (variants.length) {
    return variants.some((variant) => Number(variant?.stock ?? 0) > 0);
  }
  return Number(stockQuantity ?? product?.stockQuantity ?? 0) > 0;
}

export function getVariantFamilyLabel(options = {}) {
  const title = stripPackLabelFromTitle(options?.title);
  if (title && !isBarePackTitle(title)) return title;

  const parts = ['color', 'size', 'option', 'model']
    .map((key) => String(options?.[key] || '').trim())
    .filter(Boolean);
  return parts.join(' / ');
}

function packCount(units, bundleQty) {
  const qty = Math.max(1, Number(bundleQty) || 1);
  return Math.floor(Math.max(0, Number(units) || 0) / qty);
}

function buildVariantPreviewRow(product, variant, index, newUnits) {
  const bundleQty = Math.max(0, Number(variant?.options?.bundleQty) || 0);
  const isBundle = isBundlePackVariant(variant);
  const currentStock = getVariantStock(variant);
  const currentUnits = isBundle
    ? getSharedBundleUnitStock(product, variant.options)
    : currentStock;
  const familyLabel = getVariantFamilyLabel(variant?.options);

  return {
    index,
    indexes: [index],
    sku: String(variant?.sku || '').trim(),
    label: formatVariantOptionsLabel(variant?.options) || `Variant ${index + 1}`,
    familyKey: getVariantSelectionSignature(variant?.options),
    familyLabel,
    isBundle,
    isFamilyRow: false,
    bundleQty,
    currentStock,
    currentUnits,
    currentPacks: isBundle && bundleQty > 0 ? packCount(currentUnits, bundleQty) : currentStock,
    newStock: newUnits,
    newPacks: isBundle && bundleQty > 0 ? packCount(newUnits, bundleQty) : newUnits,
  };
}

function collapseVariantFamilies(rows, newUnits) {
  const hasNamedFamily = rows.some((row) => row.isBundle && row.familyLabel);
  if (!hasNamedFamily) return rows;

  const families = new Map();
  rows.forEach((row) => {
    if (!row.isBundle || !row.familyLabel) return;
    const existing = families.get(row.familyKey);
    if (existing) {
      existing.indexes.push(row.index);
      return;
    }
    families.set(row.familyKey, {
      ...row,
      isFamilyRow: true,
      indexes: [row.index],
      sku: row.sku,
      label: row.familyLabel,
      bundleQty: 0,
      currentStock: row.currentUnits,
      currentPacks: row.currentUnits,
      newStock: newUnits,
      newPacks: newUnits,
    });
  });

  const familyRows = [...families.values()];
  const otherRows = rows.filter((row) => !row.isBundle);
  return familyRows.length ? [...familyRows, ...otherRows] : rows;
}

export function buildMainStockVariantPreview(product = {}, stockQuantity) {
  const qty = normalizeStock(stockQuantity);
  const rows = productVariants(product).map((variant, index) => (
    buildVariantPreviewRow(product, variant, index, qty)
  ));
  return collapseVariantFamilies(rows, qty);
}

export function describeMainStockChange(product = {}, stockQuantity) {
  const qty = normalizeStock(stockQuantity);
  const variants = buildMainStockVariantPreview(product, qty);

  return {
    name: decodeProductName(product?.name),
    sku: String(product?.sku || '').trim(),
    hasVariants: variants.length > 0,
    hasBundle: variants.some((variant) => variant.isBundle),
    currentStock: currentStockOf(product),
    newStock: qty,
    variants,
  };
}

export function applyMainStockToProduct(product, stockQuantity) {
  const qty = normalizeStock(stockQuantity);
  const variants = productVariants(product);

  product.stockQuantity = qty;
  if (variants.length) {
    variants.forEach((variant) => {
      variant.stock = qty;
    });
    if (typeof product.markModified === 'function') {
      product.markModified('variants');
    }
  }
  product.inStock = deriveInStock(product, qty, product.variants);
  return product;
}

function previewRowMatches(variant, variantIndex) {
  if (variant.index === variantIndex) return true;
  return Array.isArray(variant.indexes) && variant.indexes.includes(variantIndex);
}

export function applyPreviewNewStock(row = {}, newUnitStock) {
  const qty = normalizeStock(newUnitStock);
  return {
    ...row,
    newStock: qty,
    variants: (Array.isArray(row.variants) ? row.variants : []).map((variant) => {
      if (variant.isFamilyRow || !variant.isBundle) {
        return { ...variant, newStock: qty, newPacks: qty };
      }
      return {
        ...variant,
        newStock: qty,
        newPacks: variant.bundleQty > 0 ? packCount(qty, variant.bundleQty) : qty,
      };
    }),
  };
}

export function applyPreviewVariantStock(row = {}, variantIndex, newStock) {
  const qty = normalizeStock(newStock);
  const variants = Array.isArray(row.variants) ? row.variants : [];
  const matched = variants.find((variant) => previewRowMatches(variant, variantIndex));
  if (!matched) return row;

  if (matched.isFamilyRow) {
    return {
      ...row,
      variants: variants.map((variant) => (
        previewRowMatches(variant, variantIndex)
          ? { ...variant, newStock: qty, newPacks: qty }
          : variant
      )),
    };
  }

  if (matched.isBundle) {
    const units = qty * Math.max(1, Number(matched.bundleQty) || 1);
    return {
      ...row,
      newStock: units,
      variants: variants.map((variant) => {
        if (variant.familyKey !== matched.familyKey) return variant;
        return {
          ...variant,
          newStock: units,
          newPacks: variant.bundleQty > 0 ? packCount(units, variant.bundleQty) : units,
        };
      }),
    };
  }

  return {
    ...row,
    variants: variants.map((variant) => (
      previewRowMatches(variant, variantIndex)
        ? { ...variant, newStock: qty, newPacks: qty }
        : variant
    )),
  };
}

export function applyStockUpdateToProduct(product, update = {}) {
  const qty = normalizeStock(update.stockQuantity);
  const variants = productVariants(product);
  const variantUpdates = Array.isArray(update.variants) ? update.variants : [];

  if (!variantUpdates.length) {
    return applyMainStockToProduct(product, qty);
  }

  const stockByIndex = new Map(
    variantUpdates.map((entry) => [Number(entry.index), normalizeStock(entry.stock)]),
  );
  variants.forEach((variant, index) => {
    if (stockByIndex.has(index)) {
      variant.stock = stockByIndex.get(index);
    }
  });
  product.stockQuantity = qty;
  if (typeof product.markModified === 'function') {
    product.markModified('variants');
  }
  product.inStock = deriveInStock(product, qty, product.variants);
  return product;
}
