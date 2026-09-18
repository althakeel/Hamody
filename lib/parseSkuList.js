/** Split pasted SKUs: commas, spaces, newlines, or semicolons. */
export function parseSkuList(value = '') {
  return [...new Set(
    String(value || '')
      .split(/[\s,;|]+/)
      .map((sku) => sku.trim())
      .filter(Boolean),
  )];
}
