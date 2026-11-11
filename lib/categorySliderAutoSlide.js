/** Cap homepage carousel DOM — Noon-like rows don't mount 100+ cards at once. */
export const HOMEPAGE_CAROUSEL_PRODUCT_CAP = 12;

export function capCarouselProducts(products = [], cap = HOMEPAGE_CAROUSEL_PRODUCT_CAP) {
  if (!Array.isArray(products) || products.length <= cap) return products;
  return products.slice(0, Math.max(1, Number(cap) || HOMEPAGE_CAROUSEL_PRODUCT_CAP));
}

/** Build a seamless loop track (two copies — enough for wrap without 3× DOM). */
export function buildAutoSlideLoopProducts(products = []) {
  if (!Array.isArray(products) || products.length <= 1) return products;
  const capped = capCarouselProducts(products);
  return [...capped, ...capped];
}

/** Measure the pixel width of one product set inside a horizontal flex row. */
export function measureAutoSlideLoopWidth(container, productCount) {
  if (!container || productCount <= 0) return 0;

  const styles = window.getComputedStyle(container);
  const gap = parseFloat(styles.columnGap || styles.gap || '12') || 12;
  const children = container.children;
  let width = 0;

  for (let index = 0; index < productCount && index < children.length; index += 1) {
    width += children[index].getBoundingClientRect().width;
    if (index < productCount - 1) width += gap;
  }

  return width > 0 ? width : 0;
}

/** Pixels moved per millisecond for one card step over the configured interval. */
export function getAutoSlidePixelsPerMs(stepPx, intervalMs) {
  const safeStep = Math.max(Number(stepPx) || 0, 1);
  const safeInterval = Math.max(Number(intervalMs) || 0, 500);
  return safeStep / safeInterval;
}

/** Wrap offset inside a seamless loop without visual jump. */
export function wrapAutoSlideOffset(offset, loopWidth) {
  if (!Number.isFinite(offset) || loopWidth <= 0) return 0;
  let wrapped = offset % loopWidth;
  if (wrapped < 0) wrapped += loopWidth;
  return wrapped;
}
