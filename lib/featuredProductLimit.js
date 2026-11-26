export const FEATURED_PRODUCT_MAX = 18;
export const BRANDS_BANNER_PRODUCT_MAX = 200;
export const DEFAULT_FEATURED_COLUMNS = 5;
export const DEFAULT_FEATURED_ROWS = 2;

export function clampFeaturedColumns(value, fallback = DEFAULT_FEATURED_COLUMNS) {
  const count = Number(value);
  if (!Number.isFinite(count)) return fallback;
  return Math.max(2, Math.min(6, Math.round(count)));
}

export function clampFeaturedRows(value, fallback = DEFAULT_FEATURED_ROWS) {
  const count = Number(value);
  if (!Number.isFinite(count)) return fallback;
  return Math.max(1, Math.min(4, Math.round(count)));
}

export function featuredVisibleCount(columns, rows) {
  return Math.min(
    FEATURED_PRODUCT_MAX,
    clampFeaturedColumns(columns) * clampFeaturedRows(rows),
  );
}
