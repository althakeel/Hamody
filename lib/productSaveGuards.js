/**
 * Product save rules:
 * - If the main sale price is blank/0 and variants have prices, use the lowest positive variant price
 * - Do not overwrite an explicit positive main price with min(variant)
 * - Never silently clear bundles/variants after save
 * - Store owner can always change prices
 * - Team members need the Team Access checkbox "Change product prices"
 */

/** Lowest positive sale price across variant/pack rows. */
export function getMinPositiveVariantPrice(variants = [], fields = ['price', 'salePrice', 'AED']) {
  const prices = (Array.isArray(variants) ? variants : [])
    .map((variant) => {
      for (const field of fields) {
        const value = Number(variant?.[field]);
        if (Number.isFinite(value) && value > 0) return value;
      }
      return 0;
    })
    .filter((value) => value > 0);
  return prices.length ? Math.min(...prices) : 0;
}

export function canChangeProductPricing(access = {}) {
  if (access?.isOwner || access?.accessRole === 'owner') return true;
  return access?.permissions?.changePricing === true;
}

export function canBulkEditProducts(access = {}) {
  if (access?.isOwner || access?.accessRole === 'owner') return true;
  return access?.permissions?.bulkEditProducts === true;
}

/**
 * A blank variant stock can inherit the product quantity.
 * A typed 0 is a real quantity and must not be replaced.
 */
export function explicitVariantStock(value, fallback = 0) {
  const inherited = Number(fallback);
  const safeFallback = Number.isFinite(inherited) ? Math.max(0, inherited) : 0;
  if (value === undefined || value === null || value === '') return safeFallback;
  const stock = Number(value);
  return Number.isFinite(stock) ? Math.max(0, stock) : safeFallback;
}

function fillMissingVariantStock(variants, stockFallback) {
  const fallback = explicitVariantStock('', stockFallback);
  if (!(fallback > 0)) return variants;
  return variants.map((variant) => {
    const raw = variant?.stock;
    if (raw === undefined || raw === null || raw === '') {
      return { ...variant, stock: fallback };
    }
    return Number.isFinite(Number(raw)) ? variant : { ...variant, stock: fallback };
  });
}

/** Stock Qty 0 means every pack/variant row is also 0 (out of stock). */
function zeroAllVariantStock(variants = []) {
  return (Array.isArray(variants) ? variants : []).map((variant) => ({
    ...variant,
    stock: 0,
  }));
}

function syncVariantsToStockQty(variants, stockQty, stockWasProvided) {
  if (!stockWasProvided) return variants;
  const qty = Math.max(0, Number(stockQty) || 0);
  if (qty <= 0) return zeroAllVariantStock(variants);
  return fillMissingVariantStock(variants, qty);
}

function numbersDiffer(a, b) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) && !Number.isFinite(right)) return false;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return true;
  return Math.abs(left - right) > 0.0001;
}

function normalizeVariantOptionKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

/** Removes auto pack suffixes added on each save: -p, -p-p, -P2, -P2-P2. */
export function stripAutoPackSku(sku) {
  return String(sku || '').trim().replace(/(?:-p\d*-?)+$/i, '');
}

function variantHasOwnOption(variant = {}) {
  const opts = variant?.options && typeof variant.options === 'object' ? variant.options : {};
  return ['color', 'size', 'option'].some((key) => String(opts[key] || '').trim());
}

function variantIsBundle(variant = {}) {
  const raw = variant?.options?.bundleQty;
  return raw != null && String(raw).trim() !== '';
}

/**
 * Bundle packs do not get their own SKU.
 * A pack with no color/size uses the product SKU.
 * A pack of a variant uses that variant SKU, with any auto -p suffix removed.
 */
export function normalizeVariantSku(variant = {}, productSku = '') {
  const product = stripAutoPackSku(productSku);
  const cleaned = stripAutoPackSku(variant?.sku);
  if (variantIsBundle(variant) && !variantHasOwnOption(variant)) {
    return { ...variant, sku: product || cleaned };
  }
  if (cleaned !== String(variant?.sku || '').trim()) {
    return { ...variant, sku: cleaned };
  }
  return variant;
}

/** Stable key so we can restore SKUs when the editor re-saves blank variant SKU fields. */
export function getVariantSkuMatchKey(variant = {}) {
  const opts = variant?.options && typeof variant.options === 'object' ? variant.options : {};
  const bundleRaw = opts.bundleQty;
  const bundleQty = bundleRaw === undefined || bundleRaw === null || bundleRaw === ''
    ? ''
    : String(Number(bundleRaw) || bundleRaw);
  return [
    normalizeVariantOptionKey(opts.color),
    normalizeVariantOptionKey(opts.size),
    normalizeVariantOptionKey(opts.option),
    normalizeVariantOptionKey(opts.optionLabel),
    normalizeVariantOptionKey(opts.title),
    bundleQty,
  ].join('|');
}

/**
 * Keep existing variant SKUs when the editor sends blank SKU fields
 * (matrix collapse/expand and partial forms used to wipe them).
 */
export function preserveIncomingVariantSkus(existingVariants = [], incomingVariants = []) {
  const incoming = Array.isArray(incomingVariants) ? incomingVariants : [];
  const existing = Array.isArray(existingVariants) ? existingVariants : [];
  if (!incoming.length || !existing.length) return incoming;

  const skuByKey = new Map();
  existing.forEach((variant) => {
    const sku = String(variant?.sku || '').trim();
    if (!sku) return;
    skuByKey.set(getVariantSkuMatchKey(variant), sku);
  });

  return incoming.map((variant) => {
    const incomingSku = String(variant?.sku || '').trim();
    if (incomingSku) return variant;
    const preserved = skuByKey.get(getVariantSkuMatchKey(variant));
    if (!preserved) return variant;
    return { ...variant, sku: preserved };
  });
}

function variantPriceSignature(variants = []) {
  return (Array.isArray(variants) ? variants : []).map((v) => ({
    price: Number(v?.price),
    AED: Number(v?.AED ?? v?.price),
  }));
}

export function productPricingWouldChange(existing = {}, next = {}) {
  if (numbersDiffer(existing.price, next.price)) return true;
  if (numbersDiffer(existing.AED, next.AED)) return true;

  const prevVariants = Array.isArray(existing.variants) ? existing.variants : [];
  const nextVariants = Array.isArray(next.variants) ? next.variants : prevVariants;
  if (prevVariants.length !== nextVariants.length) {
    // Structural change may include prices; treat as pricing change if any price present differs
    const prevSig = variantPriceSignature(prevVariants);
    const nextSig = variantPriceSignature(nextVariants);
    if (JSON.stringify(prevSig) !== JSON.stringify(nextSig)) return true;
  } else {
    for (let i = 0; i < prevVariants.length; i += 1) {
      if (numbersDiffer(prevVariants[i]?.price, nextVariants[i]?.price)) return true;
      if (numbersDiffer(prevVariants[i]?.AED ?? prevVariants[i]?.price, nextVariants[i]?.AED ?? nextVariants[i]?.price)) {
        return true;
      }
    }
  }
  return false;
}

function resolveVariantType(body = {}, existing = {}) {
  const fromBody = String(body?.attributes?.variantType || '').trim();
  if (fromBody) return fromBody;
  return String(existing?.attributes?.variantType || '').trim();
}

/**
 * Resolve variants + product price for UPDATE without automatic mutations.
 */
export function resolveProductUpdatePricing({
  existing = {},
  body = {},
  canChangePrice = false,
} = {}) {
  const existingVariants = Array.isArray(existing.variants) ? existing.variants : [];
  const existingHasVariants = Boolean(existing.hasVariants) && existingVariants.length > 0;
  const variantType = resolveVariantType(body, existing);
  const explicitSimple = variantType === 'simple';
  const requestedHasVariants = body.hasVariants !== undefined
    ? Boolean(body.hasVariants)
    : existingHasVariants;
  let incomingVariants = Array.isArray(body.variants) ? body.variants : null;

  // Bundles / matrix / variants must never save empty packs silently.
  if (requestedHasVariants) {
    if (!incomingVariants || incomingVariants.length === 0) {
      throw Object.assign(
        new Error('Cannot save with empty packs/variants. Add pack prices or keep the current pricing mode.'),
        { statusCode: 400, code: 'EMPTY_VARIANTS' },
      );
    }
  }

  // Clearing an existing bundle/variants requires an explicit Simple mode.
  if (existingHasVariants && (!requestedHasVariants || (incomingVariants && incomingVariants.length === 0))) {
    if (!explicitSimple) {
      throw Object.assign(
        new Error('Switch pricing mode to "Simple product" before removing packs/bundles. Automatic clearing is blocked.'),
        { statusCode: 400, code: 'VARIANT_CLEAR_BLOCKED' },
      );
    }
    if (!canChangePrice) {
      throw Object.assign(
        new Error('You do not have permission to change prices. Ask the store owner to enable Change product prices in Team Access.'),
        { statusCode: 403, code: 'PRICE_ADMIN_ONLY' },
      );
    }
  }

  let hasVariants = requestedHasVariants;
  let variants = existingVariants;

  if (explicitSimple && !requestedHasVariants) {
    hasVariants = false;
    variants = [];
  } else if (requestedHasVariants && incomingVariants) {
    hasVariants = true;
    variants = preserveIncomingVariantSkus(existingVariants, incomingVariants);
  } else if (!requestedHasVariants && !existingHasVariants) {
    hasVariants = false;
    variants = [];
  } else {
    // Keep existing structure — do not auto-change after save.
    hasVariants = existingHasVariants;
    variants = existingVariants;
  }

  const stockWasProvided = body.stockQuantity !== undefined
    && body.stockQuantity !== null
    && body.stockQuantity !== '';
  const stockFallback = stockWasProvided
    ? Number(body.stockQuantity) || 0
    : Number(existing.stockQuantity) || 0;

  if (hasVariants) {
    variants = syncVariantsToStockQty(variants, stockFallback, stockWasProvided);
  }

  const productSku = body.sku !== undefined && body.sku !== null && String(body.sku).trim() !== ''
    ? body.sku
    : existing.sku;
  variants = variants.map((variant) => normalizeVariantSku(variant, productSku));

  // Price: keep an explicit positive main price; if blank/0, fill from the cheapest variant.
  let finalPrice = existing.price;
  let finalAED = existing.AED;

  const bodyPriceProvided = body.price !== undefined && body.price !== null && body.price !== '';
  const bodyAedProvided = body.AED !== undefined && body.AED !== null && body.AED !== '';

  if (canChangePrice) {
    if (bodyPriceProvided) finalPrice = Number(body.price);
    if (bodyAedProvided) finalAED = Number(body.AED);

    if (hasVariants && variants.length) {
      const minSale = getMinPositiveVariantPrice(variants, ['price', 'salePrice']);
      const minAed = getMinPositiveVariantPrice(variants, ['AED', 'price', 'salePrice']);
      if ((!Number.isFinite(Number(finalPrice)) || Number(finalPrice) <= 0) && minSale > 0) {
        finalPrice = minSale;
      }
      if ((!Number.isFinite(Number(finalAED)) || Number(finalAED) <= 0) && minAed > 0) {
        finalAED = minAed;
      }
    }
  } else {
    // Non-admin: keep all prices; allow non-price variant option edits by overlaying options/stock/sku only.
    if (hasVariants && incomingVariants && incomingVariants.length === existingVariants.length) {
      variants = preserveIncomingVariantSkus(
        existingVariants,
        incomingVariants.map((incoming, index) => {
          const prev = existingVariants[index] || {};
          return {
            ...incoming,
            price: prev.price,
            AED: prev.AED ?? prev.price,
          };
        }),
      );
    } else if (hasVariants && incomingVariants && incomingVariants.length !== existingVariants.length) {
      throw Object.assign(
        new Error('You do not have permission to change prices. Ask the store owner to enable Change product prices in Team Access.'),
        { statusCode: 403, code: 'PRICE_ADMIN_ONLY' },
      );
    }
    finalPrice = existing.price;
    finalAED = existing.AED;
  }

  const stocks = hasVariants
    ? variants.map((v) => Number(v.stock ?? 0)).filter((n) => Number.isFinite(n))
    : [];
  // Qty 0 always means out of stock. Otherwise derive from stock / variant rows.
  const inStock = stockWasProvided
    ? stockFallback > 0
    : hasVariants
      ? (stocks.some((s) => s > 0) || stockFallback > 0)
      : Boolean(existing.inStock);

  if (!hasVariants) {
    if (!Number.isFinite(Number(finalPrice)) || !Number.isFinite(Number(finalAED))) {
      throw Object.assign(new Error('Price and AED are required'), { statusCode: 400 });
    }
  }

  return {
    hasVariants,
    variants: hasVariants ? variants : [],
    finalPrice: Number(finalPrice),
    finalAED: Number(finalAED),
    inStock,
    stockQuantity: stockWasProvided ? Math.max(0, stockFallback) : undefined,
  };
}

/**
 * Create path: keep an explicit positive price; if blank/0, use the cheapest variant/pack price.
 */
export function resolveProductCreatePricing(body = {}) {
  const hasVariants = Boolean(body.hasVariants);
  let variants = Array.isArray(body.variants) ? body.variants : [];
  const productStockFallback = Number(body.stockQuantity) || 0;

  if (hasVariants) {
    if (!variants.length) {
      throw Object.assign(
        new Error('Add at least one pack/variant with Qty and Price before saving.'),
        { statusCode: 400, code: 'EMPTY_VARIANTS' },
      );
    }
    variants = syncVariantsToStockQty(
      variants,
      productStockFallback,
      body.stockQuantity !== undefined && body.stockQuantity !== null && body.stockQuantity !== '',
    );
  }

  let finalPrice = Number(body.price);
  let finalAED = Number(body.AED);

  if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
    const minSale = getMinPositiveVariantPrice(variants, ['price', 'salePrice']);
    if (minSale > 0) finalPrice = minSale;
  }
  if (!Number.isFinite(finalAED) || finalAED <= 0) {
    const minAed = getMinPositiveVariantPrice(variants, ['AED', 'price', 'salePrice']);
    if (minAed > 0) finalAED = minAed;
  }

  if (!Number.isFinite(finalPrice) || finalPrice <= 0 || !Number.isFinite(finalAED) || finalAED <= 0) {
    throw Object.assign(
      new Error('Sale price and AED must be greater than 0. Enter a price, or add a pack/variant with a price.'),
      { statusCode: 400, code: 'PRICE_REQUIRED' },
    );
  }

  variants = variants.map((variant) => normalizeVariantSku(variant, body.sku));

  const stocks = hasVariants
    ? variants.map((v) => Number(v.stock ?? 0)).filter((n) => Number.isFinite(n))
    : [];
  const stockWasProvided = body.stockQuantity !== undefined
    && body.stockQuantity !== null
    && body.stockQuantity !== '';
  // Explicit Stock Qty 0 → out of stock. Otherwise any positive shelf/variant qty counts.
  const inStock = stockWasProvided
    ? productStockFallback > 0
    : (hasVariants ? stocks.some((s) => s > 0) || productStockFallback > 0 : productStockFallback > 0);

  return {
    hasVariants,
    variants: hasVariants ? variants : [],
    finalPrice,
    finalAED,
    inStock,
  };
}
