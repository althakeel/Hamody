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
  if (!raw) return fallback;
  if (raw.length > 500) return fallback;
  const lower = raw.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return fallback;
  if (raw.startsWith('/') || raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return fallback;
}

/** The bar is fixed over the page, inset from both sides. These are not seller settings. */
export const APP_FOOTER_SIDE_INSET_PX = 16;
export const APP_FOOTER_CONTENT_PADDING_X = 8;

export const FOOTER_CLICK_ANIMATIONS = [
  { id: 'none', label: 'None' },
  { id: 'scale', label: 'Scale' },
  { id: 'lift', label: 'Lift' },
  { id: 'pop', label: 'Pop' },
  { id: 'fade', label: 'Fade' },
  { id: 'bounce', label: 'Bounce' },
];

const CLICK_ANIMATION_IDS = new Set(FOOTER_CLICK_ANIMATIONS.map((option) => option.id));

function hexToRgba(hex, alpha) {
  const raw = cleanHex(hex, '#000000').slice(1);
  const n = parseInt(raw, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function appFooterFrameStyle(input = {}) {
  const footer = normalizeAppFooter(input);
  return {
    boxShadow: footer.shadowEnabled
      ? `0 ${footer.shadowYPx}px ${footer.shadowBlurPx}px ${hexToRgba(footer.shadowColor, footer.shadowOpacity / 100)}`
      : 'none',
    borderWidth: footer.borderEnabled ? footer.borderWidthPx : 0,
    borderStyle: 'solid',
    borderColor: footer.borderEnabled ? footer.borderColor : 'transparent',
  };
}

function cleanClickAnimation(value) {
  const id = String(value || '').trim();
  return CLICK_ANIMATION_IDS.has(id) ? id : 'scale';
}

const DEFAULT_ITEMS = [
  { id: 'home', label: 'Home', labelAr: 'الرئيسية', path: '/' },
  { id: 'categories', label: 'Categories', labelAr: 'الفئات', path: '/categories' },
  { id: 'cart', label: 'Cart', labelAr: 'السلة', path: '/cart' },
  { id: 'support', label: 'Support', labelAr: 'الدعم', path: '/support' },
  { id: 'account', label: 'Account', labelAr: 'الحساب', path: '/dashboard/profile' },
];

export function defaultAppFooter() {
  return {
    enabled: true,
    backgroundColor: '#f4f2ff',
    inactiveColor: '#c5c2f6',
    activeColor: '#5b35e6',
    radiusPx: 40,
    heightPx: 74,
    iconWidthPx: 16,
    iconHeightPx: 16,
    labelWidthPx: 48,
    labelHeightPx: 9,
    bottomSpacePx: 12,
    hideOnScroll: false,
    clickAnimation: 'scale',
    shadowEnabled: true,
    shadowColor: '#5b35e6',
    shadowOpacity: 18,
    shadowBlurPx: 24,
    shadowYPx: 10,
    borderEnabled: false,
    borderColor: '#ddd8ff',
    borderWidthPx: 1,
    items: DEFAULT_ITEMS.map((item) => ({
      ...item,
      enabled: true,
      iconUrl: '',
      activeIconUrl: '',
    })),
  };
}

function normalizeItem(input, fallback) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    id: fallback.id,
    enabled: source.enabled !== false,
    label: String(source.label ?? fallback.label).trim().slice(0, 24) || fallback.label,
    labelAr: String(source.labelAr ?? fallback.labelAr).trim().slice(0, 24),
    path: cleanPath(source.path, fallback.path),
    iconUrl: cleanUrl(source.iconUrl),
    activeIconUrl: cleanUrl(source.activeIconUrl),
  };
}

export function normalizeAppFooter(input = {}) {
  const base = defaultAppFooter();
  const source = input && typeof input === 'object' ? input : {};
  const incoming = Array.isArray(source.items) ? source.items : [];
  const byId = new Map(incoming.map((item) => [String(item?.id || ''), item]));

  return {
    enabled: source.enabled !== false,
    backgroundColor: cleanHex(source.backgroundColor, base.backgroundColor),
    inactiveColor: cleanHex(source.inactiveColor, base.inactiveColor),
    activeColor: cleanHex(source.activeColor, base.activeColor),
    radiusPx: clampInt(source.radiusPx, 0, 48, base.radiusPx),
    heightPx: clampInt(source.heightPx, 56, 120, base.heightPx),
    iconWidthPx: clampInt(source.iconWidthPx, 10, 40, base.iconWidthPx),
    iconHeightPx: clampInt(source.iconHeightPx, 10, 40, base.iconHeightPx),
    labelWidthPx: clampInt(source.labelWidthPx, 24, 96, base.labelWidthPx),
    labelHeightPx: clampInt(source.labelHeightPx, 8, 16, base.labelHeightPx),
    bottomSpacePx: clampInt(source.bottomSpacePx, 0, 80, base.bottomSpacePx),
    hideOnScroll: source.hideOnScroll === true,
    clickAnimation: cleanClickAnimation(source.clickAnimation),
    shadowEnabled: source.shadowEnabled !== false,
    shadowColor: cleanHex(source.shadowColor, base.shadowColor),
    shadowOpacity: clampInt(source.shadowOpacity, 0, 100, base.shadowOpacity),
    shadowBlurPx: clampInt(source.shadowBlurPx, 0, 60, base.shadowBlurPx),
    shadowYPx: clampInt(source.shadowYPx, 0, 40, base.shadowYPx),
    borderEnabled: source.borderEnabled === true,
    borderColor: cleanHex(source.borderColor, base.borderColor),
    borderWidthPx: clampInt(source.borderWidthPx, 0, 8, base.borderWidthPx),
    items: base.items.map((fallback) => normalizeItem(byId.get(fallback.id), fallback)),
  };
}

export function toPublicAppFooter(input = {}) {
  const footer = normalizeAppFooter(input);
  return {
    enabled: footer.enabled,
    placement: 'fixed',
    sideInsetPx: APP_FOOTER_SIDE_INSET_PX,
    contentPaddingX: APP_FOOTER_CONTENT_PADDING_X,
    backgroundColor: footer.backgroundColor,
    inactiveColor: footer.inactiveColor,
    activeColor: footer.activeColor,
    radiusPx: footer.radiusPx,
    heightPx: footer.heightPx,
    iconWidthPx: footer.iconWidthPx,
    iconHeightPx: footer.iconHeightPx,
    labelWidthPx: footer.labelWidthPx,
    labelHeightPx: footer.labelHeightPx,
    bottomSpacePx: footer.bottomSpacePx,
    hideOnScroll: footer.hideOnScroll,
    clickAnimation: footer.clickAnimation,
    shadowEnabled: footer.shadowEnabled,
    shadowColor: footer.shadowColor,
    shadowOpacity: footer.shadowOpacity,
    shadowBlurPx: footer.shadowBlurPx,
    shadowYPx: footer.shadowYPx,
    borderEnabled: footer.borderEnabled,
    borderColor: footer.borderColor,
    borderWidthPx: footer.borderWidthPx,
    items: footer.items
      .filter((item) => item.enabled)
      .map((item) => {
        const row = {
          id: item.id,
          label: item.label,
          labelAr: item.labelAr,
          path: item.path,
        };
        if (item.iconUrl) row.iconUrl = item.iconUrl;
        if (item.activeIconUrl) row.activeIconUrl = item.activeIconUrl;
        return row;
      }),
  };
}
