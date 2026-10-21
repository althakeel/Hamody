const SOURCES = new Set(['category', 'brand', 'manual']);

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanHex(value, fallback) {
  const raw = String(value || '').trim();
  const match = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return fallback;
  if (match[1].length === 3) {
    const [r, g, b] = match[1];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return `#${match[1].toLowerCase()}`;
}

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 500) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return '';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
}

function cleanPath(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 500) return fallback;
  if (/^javascript:/i.test(raw)) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function cleanId(value) {
  const id = String(value || '').trim();
  return /^[a-fA-F0-9]{24}$/.test(id) ? id : '';
}

export function defaultOffersSection() {
  return {
    enabled: true,
    iconUrl: '',
    title: 'Flash offer',
    subtitle: 'Fresh deals every week',
    viewAllEnabled: true,
    viewAllText: 'View all deals',
    viewAllPath: '/offers',
    viewAllRadiusPx: 14,
    viewAllArrow: true,
    backgroundColor: '#6d4aff',
    titleColor: '#ffffff',
    subtitleColor: '#efeaff',
    buttonColor: '#f6c445',
    buttonTextColor: '#3b2a00',
    cardButtonColor: '#6d4aff',
    productSource: 'manual',
    categoryId: '',
    brandName: '',
    productIds: [],
    limit: 8,
  };
}

export function normalizeOffersSection(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const base = defaultOffersSection();
  const productSource = SOURCES.has(source.productSource) ? source.productSource : base.productSource;
  const productIds = Array.isArray(source.productIds)
    ? [...new Set(source.productIds.map(cleanId).filter(Boolean))].slice(0, 24)
    : [];
  return {
    enabled: source.enabled !== false,
    iconUrl: cleanUrl(source.iconUrl),
    title: String(source.title ?? base.title).trim().slice(0, 40) || base.title,
    subtitle: String(source.subtitle ?? base.subtitle).trim().slice(0, 80),
    viewAllEnabled: source.viewAllEnabled !== false,
    viewAllText: String(source.viewAllText ?? base.viewAllText).trim().slice(0, 32) || base.viewAllText,
    viewAllPath: cleanPath(source.viewAllPath, base.viewAllPath),
    viewAllRadiusPx: clampInt(source.viewAllRadiusPx, 0, 40, base.viewAllRadiusPx),
    viewAllArrow: source.viewAllArrow !== false,
    backgroundColor: cleanHex(source.backgroundColor, base.backgroundColor),
    titleColor: cleanHex(source.titleColor, base.titleColor),
    subtitleColor: cleanHex(source.subtitleColor, base.subtitleColor),
    buttonColor: cleanHex(source.buttonColor, base.buttonColor),
    buttonTextColor: cleanHex(source.buttonTextColor, base.buttonTextColor),
    cardButtonColor: cleanHex(source.cardButtonColor, base.cardButtonColor),
    productSource,
    categoryId: cleanId(source.categoryId),
    brandName: String(source.brandName || '').trim().slice(0, 80),
    productIds,
    limit: clampInt(source.limit, 2, 20, base.limit),
  };
}

export function toPublicOffersSection(input = {}) {
  const section = normalizeOffersSection(input);
  if (!section.enabled) return { enabled: false };
  return section;
}
