/** Shared clamps + link/path helpers for mobile app home banners. */

export const MOBILE_BANNER_SECTIONS = {
  bannerSlider: {
    key: 'bannerSlider',
    apiPath: 'mobile-banner-slider',
    listKey: 'slides',
    label: 'Banner 1',
    description: 'Main hero at the top of the app home screen.',
    frameWidth: 376,
    frameHeight: 156,
    maxItems: 8,
    defaultHeightPx: 156,
    minHeightPx: 100,
    maxHeightPx: 520,
    defaultIntervalSeconds: 4,
    supportsInterval: true,
    supportsHeight: true,
    supportsAdBadge: false,
    isTiles: false,
  },
  smallBanners: {
    key: 'smallBanners',
    apiPath: 'mobile-small-banners',
    listKey: 'slides',
    label: 'Banner 2',
    description: 'Second banner, lower on the app home screen.',
    frameWidth: 376,
    frameHeight: 110,
    maxItems: 12,
    defaultHeightPx: 110,
    minHeightPx: 40,
    maxHeightPx: 200,
    defaultIntervalSeconds: 4,
    supportsInterval: true,
    supportsHeight: true,
    supportsAdBadge: false,
    isTiles: false,
  },
  promoCards: {
    key: 'promoCards',
    apiPath: 'mobile-promo-cards',
    listKey: 'slides',
    label: 'Banner 3',
    description: 'Third banner, further down the app home screen.',
    frameWidth: 376,
    frameHeight: 110,
    maxItems: 8,
    defaultHeightPx: 110,
    minHeightPx: 80,
    maxHeightPx: 300,
    defaultIntervalSeconds: 4,
    supportsInterval: true,
    supportsHeight: true,
    supportsAdBadge: true,
    isTiles: false,
  },
  fourthBanners: {
    key: 'fourthBanners',
    apiPath: 'mobile-fourth-banners',
    listKey: 'slides',
    label: 'Banner 4',
    description: 'Fourth banner, lowest of the home banners.',
    frameWidth: 376,
    frameHeight: 110,
    maxItems: 8,
    defaultHeightPx: 110,
    minHeightPx: 40,
    maxHeightPx: 200,
    defaultIntervalSeconds: 4,
    supportsInterval: true,
    supportsHeight: true,
    supportsAdBadge: false,
    isTiles: false,
  },
  tileBanners: {
    key: 'tileBanners',
    apiPath: 'mobile-tile-banners',
    listKey: 'tiles',
    label: 'Category Tile Banners',
    description: 'Two-column category tiles (fixed layout — no height control).',
    maxItems: 12,
    defaultHeightPx: null,
    minHeightPx: null,
    maxHeightPx: null,
    defaultIntervalSeconds: null,
    supportsInterval: false,
    supportsHeight: false,
    supportsAdBadge: false,
    isTiles: true,
  },
};

export const BANNER_HOME_SLOTS = [
  { key: 'bannerSlider', label: 'Banner 1', href: '/store/mobile-features/banners' },
  { key: 'smallBanners', label: 'Banner 2', href: '/store/mobile-features/small-banners' },
  { key: 'promoCards', label: 'Banner 3', href: '/store/mobile-features/promo-cards' },
  { key: 'fourthBanners', label: 'Banner 4', href: '/store/mobile-features/fourth-banners' },
];

const HERO_BANNER_KEYS = new Set(['bannerSlider', 'smallBanners', 'promoCards', 'fourthBanners']);

export function isHeroBannerSection(sectionKey) {
  return HERO_BANNER_KEYS.has(sectionKey);
}

export function clampHeightPx(value, { min, max, fallback }) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

export function clampSlideIntervalSeconds(value, fallback = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(30, Math.max(2, Math.round(numeric)));
}

/**
 * Normalize tap destination for mobile apps.
 * - empty → /shop
 * - http(s) absolute URLs kept
 * - relative paths get a leading /
 */
export function normalizeBannerLink(raw, fallback = '/shop') {
  const value = String(raw || '').trim();
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  const withSlash = value.startsWith('/') ? value : `/${value}`;
  if (withSlash.length > 1 && withSlash.endsWith('/')) {
    return withSlash.replace(/\/+$/, '');
  }
  return withSlash || fallback;
}

export function createBannerItemId(prefix = 'slide') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptySlide(overrides = {}) {
  const link = normalizeBannerLink(overrides.link || overrides.path || '/shop');
  return {
    id: createBannerItemId('slide'),
    image: '',
    link,
    path: link,
    title: '',
    alt: '',
    enabled: true,
    showAdBadge: false,
    ...overrides,
    link: normalizeBannerLink(overrides.link || overrides.path || link),
    path: normalizeBannerLink(overrides.path || overrides.link || link),
  };
}

export function createEmptyTile(overrides = {}) {
  const link = normalizeBannerLink(overrides.link || overrides.path || '/shop');
  return {
    id: createBannerItemId('tile'),
    image: '',
    link,
    path: link,
    title: '',
    subtitle: '',
    buttonText: 'Shop',
    enabled: true,
    ...overrides,
    link: normalizeBannerLink(overrides.link || overrides.path || link),
    path: normalizeBannerLink(overrides.path || overrides.link || link),
  };
}

const HERO_FONTS = ['inherit', 'poppins', 'montserrat', 'arial', 'georgia'];
const HERO_HOVER = ['none', 'lift', 'scale', 'fade', 'glow'];

function pickOne(value, allowed, fallback) {
  const raw = String(value || '').trim();
  return allowed.includes(raw) ? raw : fallback;
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

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanMediaUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 500) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return '';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
}

function heroSlideFields(item = {}) {
  const buttonPath = String(item.buttonPath || '').trim();
  return {
    video: cleanMediaUrl(item.video),
    mediaType: item.mediaType === 'video' ? 'video' : 'image',
    subtitle: String(item.subtitle || '').trim().slice(0, 180),
    contentPosition: pickOne(item.contentPosition, ['left', 'center', 'right'], 'left'),
    contentVertical: pickOne(item.contentVertical, ['top', 'center', 'bottom'], 'center'),
    textAlign: pickOne(item.textAlign, ['left', 'center', 'right'], 'left'),
    titleColor: cleanHex(item.titleColor, '#ffffff'),
    subtitleColor: cleanHex(item.subtitleColor, '#e2e8f0'),
    titleSizePx: clampInt(item.titleSizePx, 16, 64, 32),
    subtitleSizePx: clampInt(item.subtitleSizePx, 10, 32, 15),
    fontFamily: pickOne(item.fontFamily, HERO_FONTS, 'inherit'),
    buttonEnabled: item.buttonEnabled === true,
    buttonText: String(item.buttonText || 'Shop now').trim().slice(0, 32) || 'Shop now',
    buttonPath: buttonPath ? normalizeBannerLink(buttonPath, '') : '',
    buttonAlign: pickOne(item.buttonAlign, ['left', 'right'], 'left'),
    buttonColor: cleanHex(item.buttonColor, '#f97316'),
    buttonTextColor: cleanHex(item.buttonTextColor, '#ffffff'),
    buttonRadiusPx: clampInt(item.buttonRadiusPx, 0, 40, 8),
    hoverAnimation: pickOne(item.hoverAnimation, HERO_HOVER, 'none'),
    topBackgroundMode: ['gradient', 'media'].includes(item.topBackgroundMode) ? item.topBackgroundMode : 'color',
    topBackgroundColor: cleanHex(item.topBackgroundColor, ''),
    topGradientFrom: cleanHex(item.topGradientFrom, '#8b5cf6'),
    topGradientTo: cleanHex(item.topGradientTo, '#5b21b6'),
    topGradientAngle: clampInt(item.topGradientAngle, 0, 360, 180),
    topGradientPosition: clampInt(item.topGradientPosition, 1, 100, 100),
    topBackgroundMediaUrl: cleanMediaUrl(item.topBackgroundMediaUrl),
    topBackgroundMediaKind: item.topBackgroundMediaKind === 'video' ? 'video' : 'image',
    fontColor: cleanHex(item.fontColor, ''),
  };
}

export const HERO_FONT_OPTIONS = [
  { id: 'inherit', label: 'Default' },
  { id: 'poppins', label: 'Poppins' },
  { id: 'montserrat', label: 'Montserrat' },
  { id: 'arial', label: 'Arial' },
  { id: 'georgia', label: 'Georgia' },
];

export const HERO_HOVER_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'lift', label: 'Lift' },
  { id: 'scale', label: 'Scale' },
  { id: 'fade', label: 'Fade' },
  { id: 'glow', label: 'Glow' },
];

export function heroFontFamily(id) {
  if (id === 'poppins') return 'var(--font-poppins), Poppins, system-ui, sans-serif';
  if (id === 'montserrat') return 'var(--font-montserrat), Montserrat, system-ui, sans-serif';
  if (id === 'arial') return 'Arial, Helvetica, sans-serif';
  if (id === 'georgia') return 'Georgia, serif';
  return 'inherit';
}

function normalizeSlide(item = {}, index = 0, { supportsAdBadge = false, hero = false } = {}) {
  const link = normalizeBannerLink(item.link || item.path || '/shop');
  const image = cleanMediaUrl(item.image) || String(item.image || '').trim();
  return {
    id: String(item.id || '').trim() || `slide-${index + 1}`,
    image,
    link,
    path: normalizeBannerLink(item.path || item.link || link),
    title: String(item.title || '').trim().slice(0, 120),
    alt: String(item.alt || item.title || '').trim(),
    enabled: item.enabled !== false,
    ...(supportsAdBadge ? { showAdBadge: Boolean(item.showAdBadge) } : {}),
    ...(hero ? heroSlideFields(item) : {}),
  };
}

function normalizeTile(item = {}, index = 0) {
  const link = normalizeBannerLink(item.link || item.path || '/shop');
  return {
    id: String(item.id || '').trim() || `tile-${index + 1}`,
    image: String(item.image || '').trim(),
    link,
    path: normalizeBannerLink(item.path || item.link || link),
    title: String(item.title || '').trim(),
    subtitle: String(item.subtitle || '').trim(),
    buttonText: String(item.buttonText || 'Shop').trim() || 'Shop',
    enabled: item.enabled !== false,
  };
}

export function normalizeBannerSection(sectionKey, input = {}) {
  const meta = MOBILE_BANNER_SECTIONS[sectionKey];
  if (!meta) {
    throw new Error(`Unknown mobile banner section: ${sectionKey}`);
  }

  const source = input && typeof input === 'object' ? input : {};
  const rawItems = Array.isArray(source[meta.listKey])
    ? source[meta.listKey]
    : (Array.isArray(source.slides) ? source.slides : (Array.isArray(source.tiles) ? source.tiles : []));

  const items = rawItems
    .map((item, index) => (
      meta.isTiles
        ? normalizeTile(item, index)
        : normalizeSlide(item, index, {
            supportsAdBadge: meta.supportsAdBadge,
            hero: isHeroBannerSection(sectionKey),
          })
    ))
    .filter((item) => item.image || item.video || item.title || item.link)
    .slice(0, meta.maxItems);

  const section = {
    enabled: source.enabled !== false,
    [meta.listKey]: items,
  };

  if (sectionKey === 'bannerSlider') {
    const hasImages = items.some((item) => item.image);
    section.useWebsiteHomeBanners = typeof source.useWebsiteHomeBanners === 'boolean'
      ? source.useWebsiteHomeBanners
      : !hasImages;
  }

  if (meta.supportsInterval) {
    section.slideIntervalSeconds = clampSlideIntervalSeconds(
      source.slideIntervalSeconds ?? (Number(source.autoplayInterval) > 100
        ? Number(source.autoplayInterval) / 1000
        : source.autoplayInterval),
      meta.defaultIntervalSeconds,
    );
  }

  if (meta.supportsHeight) {
    section.heightPx = clampHeightPx(source.heightPx, {
      min: meta.minHeightPx,
      max: meta.maxHeightPx,
      fallback: meta.defaultHeightPx,
    });
  }

  return section;
}

/** Public payload: hide disabled section or empty lists; only enabled items with images. */
export function toPublicBannerSection(sectionKey, input = {}) {
  const normalized = normalizeBannerSection(sectionKey, input);
  const meta = MOBILE_BANNER_SECTIONS[sectionKey];
  const list = Array.isArray(normalized[meta.listKey]) ? normalized[meta.listKey] : [];
  const visible = normalized.enabled
    ? list.filter((item) => item.enabled !== false && (item.image || item.video))
    : [];

  const payload = {
    enabled: Boolean(normalized.enabled) && visible.length > 0,
    [meta.listKey]: visible.map((item) => {
      if (meta.isTiles) {
        return {
          title: item.title,
          subtitle: item.subtitle,
          buttonText: item.buttonText,
          image: item.image,
          link: item.link,
          path: item.path,
        };
      }
      const slide = {
        image: item.image,
        link: item.link,
        path: item.path,
        title: item.title,
      };
      if (meta.supportsAdBadge) slide.showAdBadge = Boolean(item.showAdBadge);
      if (isHeroBannerSection(sectionKey)) {
        slide.video = item.video || '';
        slide.mediaType = item.mediaType === 'video' && item.video ? 'video' : 'image';
        slide.subtitle = item.subtitle || '';
        slide.contentPosition = item.contentPosition;
        slide.contentVertical = item.contentVertical;
        slide.textAlign = item.textAlign;
        slide.titleColor = item.titleColor;
        slide.subtitleColor = item.subtitleColor;
        slide.titleSizePx = item.titleSizePx;
        slide.subtitleSizePx = item.subtitleSizePx;
        slide.fontFamily = item.fontFamily;
        slide.buttonEnabled = item.buttonEnabled === true;
        slide.buttonText = item.buttonText;
        slide.buttonPath = item.buttonPath || item.path;
        slide.buttonAlign = item.buttonAlign;
        slide.buttonColor = item.buttonColor;
        slide.buttonTextColor = item.buttonTextColor;
        slide.buttonRadiusPx = item.buttonRadiusPx;
        slide.hoverAnimation = item.hoverAnimation;
        if (sectionKey === 'bannerSlider') {
          slide.topBackground = {
            mode: item.topBackgroundMode || 'color',
            ...(item.topBackgroundColor ? { color: item.topBackgroundColor } : {}),
            gradientFrom: item.topGradientFrom,
            gradientTo: item.topGradientTo,
            gradientAngle: item.topGradientAngle,
            gradientPosition: item.topGradientPosition,
            ...(item.topBackgroundMediaUrl
              ? { mediaUrl: item.topBackgroundMediaUrl, mediaKind: item.topBackgroundMediaKind }
              : {}),
          };
          if (item.fontColor) slide.fontColor = item.fontColor;
        }
      }
      return slide;
    }),
  };

  if (meta.supportsInterval) {
    payload.slideIntervalSeconds = normalized.slideIntervalSeconds;
  }
  if (meta.supportsHeight) {
    payload.heightPx = normalized.heightPx;
  }

  return payload;
}

export function emptyBannerSection(sectionKey) {
  return normalizeBannerSection(sectionKey, {
    enabled: true,
    slides: [],
    tiles: [],
  });
}
