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

function cleanPath(value, fallback = '/shop') {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 500 || /^javascript:/i.test(raw)) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function cleanTile(item = {}, index = 0) {
  return {
    id: String(item.id || '').trim() || `tile-${index + 1}`,
    image: cleanUrl(item.image),
    path: cleanPath(item.path, '/shop'),
  };
}

function cleanSlide(item = {}, index = 0) {
  return {
    id: String(item.id || '').trim() || `slide-${index + 1}`,
    image: cleanUrl(item.image),
    path: cleanPath(item.path, '/shop'),
  };
}

export function defaultShopBlocks() {
  return {
    enabled: true,
    gridTitle: 'Shop by Budget',
    gridTitleColor: '#5c3b16',
    gridTitleFont: 'inherit',
    gridTitleWeight: 'bold',
    gridTitleAlign: 'center',
    gridBackground: '#f6c445',
    tiles: [0, 1, 2, 3].map((index) => cleanTile({}, index)),
    slideIntervalSeconds: 4,
    slides: [cleanSlide({}, 0)],
  };
}

export function normalizeShopBlocks(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const base = defaultShopBlocks();
  const rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
  const tiles = [0, 1, 2, 3].map((index) => cleanTile(rawTiles[index] || {}, index));
  const slides = (Array.isArray(source.slides) ? source.slides : [])
    .slice(0, 8)
    .map((item, index) => cleanSlide(item, index));
  return {
    enabled: source.enabled !== false,
    gridTitle: String(source.gridTitle ?? base.gridTitle).trim().slice(0, 40) || base.gridTitle,
    gridTitleColor: cleanHex(source.gridTitleColor, base.gridTitleColor),
    gridTitleFont: ['inherit', 'poppins', 'montserrat', 'arial', 'georgia'].includes(source.gridTitleFont) ? source.gridTitleFont : base.gridTitleFont,
    gridTitleWeight: source.gridTitleWeight === 'regular' ? 'regular' : 'bold',
    gridTitleAlign: ['left', 'center', 'right'].includes(source.gridTitleAlign) ? source.gridTitleAlign : base.gridTitleAlign,
    gridBackground: cleanHex(source.gridBackground, base.gridBackground),
    tiles,
    slideIntervalSeconds: clampInt(source.slideIntervalSeconds, 2, 30, base.slideIntervalSeconds),
    slides: slides.length ? slides : [cleanSlide({}, 0)],
  };
}

export function toPublicShopBlocks(input = {}) {
  const section = normalizeShopBlocks(input);
  if (!section.enabled) return { enabled: false };
  return {
    ...section,
    tiles: section.tiles.filter((tile) => tile.image),
    slides: section.slides.filter((slide) => slide.image),
  };
}
