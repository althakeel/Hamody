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

function cleanPath(value, fallback = '/offers') {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 500 || /^javascript:/i.test(raw)) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function defaultDealBar() {
  return {
    enabled: true,
    iconUrl: '',
    iconBackground: '#ece8ff',
    title: 'Exclusive Deals for You!',
    subtitle: 'Save more on top-rated gadgets handpicked just for you.',
    titleColor: '#ffffff',
    subtitleColor: '#e4dcff',
    backgroundColor: '#5b4dff',
    buttonEnabled: true,
    buttonText: 'Shop Deals',
    buttonPath: '/offers',
    buttonColor: '#ffffff',
    buttonTextColor: '#3a2bb5',
    buttonRadiusPx: 12,
    buttonArrow: true,
  };
}

export function normalizeDealBar(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const base = defaultDealBar();
  return {
    enabled: source.enabled !== false,
    iconUrl: cleanUrl(source.iconUrl),
    iconBackground: cleanHex(source.iconBackground, base.iconBackground),
    title: String(source.title ?? base.title).trim().slice(0, 60) || base.title,
    subtitle: String(source.subtitle ?? base.subtitle).trim().slice(0, 140),
    titleColor: cleanHex(source.titleColor, base.titleColor),
    subtitleColor: cleanHex(source.subtitleColor, base.subtitleColor),
    backgroundColor: cleanHex(source.backgroundColor, base.backgroundColor),
    buttonEnabled: source.buttonEnabled !== false,
    buttonText: String(source.buttonText ?? base.buttonText).trim().slice(0, 32) || base.buttonText,
    buttonPath: cleanPath(source.buttonPath, base.buttonPath),
    buttonColor: cleanHex(source.buttonColor, base.buttonColor),
    buttonTextColor: cleanHex(source.buttonTextColor, base.buttonTextColor),
    buttonRadiusPx: clampInt(source.buttonRadiusPx, 0, 40, base.buttonRadiusPx),
    buttonArrow: source.buttonArrow !== false,
  };
}

export function toPublicDealBar(input = {}) {
  const section = normalizeDealBar(input);
  if (!section.enabled) return { enabled: false };
  return section;
}
