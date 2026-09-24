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
  if (product.inStock === false) return false;
  if (product.stockQuantity != null && Number(product.stockQuantity) <= 0) return false;
  return true;
}

export function filterStorefrontInStockProducts(products = []) {
  return (Array.isArray(products) ? products : []).filter(isStorefrontProductInStock);
}

export function applyStorefrontPublishedFilter(filter = {}) {
  return { ...filter, ...STOREFRONT_PUBLISHED_FILTER };
}
