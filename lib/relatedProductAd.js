export const RELATED_AD_MARKETPLACES = ['noon', 'jomla', 'amazon'];

export const DEFAULT_RELATED_PRODUCT_AD = {
  enabled: false,
  productId: '',
  headline: '',
  showOnAllProducts: true,
  marketplaces: [],
  noonUrl: '',
  jomlaUrl: '',
  amazonUrl: '',
};

function cleanMarketplaceUrl(value) {
  const raw = String(value || '').trim().slice(0, 500);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function normalizeRelatedProductAd(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const productId = String(source.productId || '').trim();
  return {
    enabled: source.enabled === true,
    productId: /^[a-fA-F0-9]{24}$/.test(productId) ? productId : '',
    headline: String(source.headline || '').trim().slice(0, 80),
    showOnAllProducts: source.showOnAllProducts !== false,
    marketplaces: [...new Set(
      (Array.isArray(source.marketplaces) ? source.marketplaces : [])
        .map((item) => String(item || '').trim().toLowerCase())
        .filter((item) => RELATED_AD_MARKETPLACES.includes(item)),
    )],
    noonUrl: cleanMarketplaceUrl(source.noonUrl),
    jomlaUrl: cleanMarketplaceUrl(source.jomlaUrl),
    amazonUrl: cleanMarketplaceUrl(source.amazonUrl),
  };
}

export function isRelatedProductAdActive(settings, currentProductId) {
  const next = normalizeRelatedProductAd(settings);
  if (!next.enabled || !next.productId) return false;
  if (next.showOnAllProducts) return true;
  return String(currentProductId || '') === next.productId;
}
