/** Storefront listings hide products with published === false. Missing field = online. */
export const STOREFRONT_PUBLISHED_FILTER = { published: { $ne: false } };

/** Hide flagged OOS and quantity 0. Missing stockQuantity stays visible if inStock is not false. */
export const STOREFRONT_IN_STOCK_FILTER = {
  inStock: { $ne: false },
  stockQuantity: { $not: { $lte: 0 } },
};

export function isProductPublished(product) {
  return product?.published !== false;
}

export function isStorefrontProductInStock(product) {
  if (!product) return false;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if ((product.hasVariants || variants.length > 0) && variants.length > 0) {
    return variants.some((variant) => Number(variant?.stock) > 0);
  }
  // Color and pack products keep quantity on each variant. The card only
  // receives inStock plus the parent quantity, and that parent quantity is
  // often 0 while the variants still have stock.
  if (product.inStock === true) return true;
  if (product.inStock === false) return false;
  if (product.stockQuantity != null && Number(product.stockQuantity) <= 0) return false;
  return true;
}

export function filterStorefrontInStockProducts(products = []) {
  return (Array.isArray(products) ? products : []).filter(isStorefrontProductInStock);
}

/** Keep the current order inside each group, with out-of-stock rows after in-stock rows. */
export function sortOutOfStockLast(products = []) {
  const inStock = [];
  const outOfStock = [];
  for (const product of products) {
    if (isStorefrontProductInStock(product)) inStock.push(product);
    else outOfStock.push(product);
  }
  return [...inStock, ...outOfStock];
}

export function applyStorefrontPublishedFilter(filter = {}) {
  return { ...filter, ...STOREFRONT_PUBLISHED_FILTER };
}
