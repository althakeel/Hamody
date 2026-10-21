const MAX_MARQUEE_ITEMS = 12;

const DEFAULT_ITEMS = [
  { text: 'Cash On Delivery', textAr: 'الدفع عند الاستلام' },
  { text: 'tamara', textAr: 'تمارا' },
  { text: 'Deliver within 48 Hours', textAr: 'التوصيل خلال 48 ساعة' },
];

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

function backgroundModeOf(value) {
  const mode = String(value || '').toLowerCase();
  if (mode === 'gradient' || mode === 'media') return mode;
  return 'color';
}

function mediaKindOf(value) {
  return String(value || '').toLowerCase() === 'video' ? 'video' : 'image';
}

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 500) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return '';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
}

function newItemId() {
  return `nav-line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeSearch(input, fallback) {
  const source = input && typeof input === 'object' ? input : {};
  const base = fallback.search;
  return {
    enabled: source.enabled !== false,
    placeholder: String(source.placeholder ?? base.placeholder).trim().slice(0, 40),
    placeholderAr: String(source.placeholderAr ?? base.placeholderAr).trim().slice(0, 40),
    backgroundColor: cleanHex(source.backgroundColor, base.backgroundColor),
    textColor: cleanHex(source.textColor, base.textColor),
    menuButtonColor: cleanHex(source.menuButtonColor, base.menuButtonColor),
    menuButtonRadius: clampInt(source.menuButtonRadius, 0, 24, base.menuButtonRadius),
    dividerColor: cleanHex(source.dividerColor, base.dividerColor),
    menuIconUrl: cleanUrl(source.menuIconUrl),
    searchIconUrl: cleanUrl(source.searchIconUrl),
    cameraIconUrl: cleanUrl(source.cameraIconUrl),
    heightPx: clampInt(source.heightPx, 36, 80, base.heightPx),
    marginTopPx: clampInt(source.marginTopPx, 0, 80, base.marginTopPx),
    marginBottomPx: clampInt(source.marginBottomPx, 0, 80, base.marginBottomPx),
    paddingX: clampInt(source.paddingX, 0, 40, base.paddingX),
    radiusPx: clampInt(source.radiusPx, 0, 40, base.radiusPx),
    iconSizePx: clampInt(source.iconSizePx, 12, 28, base.iconSizePx),
  };
}

function normalizeItem(item, index) {
  const source = item && typeof item === 'object' ? item : {};
  return {
    id: String(source.id || `nav-line-${index + 1}`).trim().slice(0, 80),
    enabled: source.enabled !== false,
    iconUrl: cleanUrl(source.iconUrl),
    text: String(source.text || '').trim().slice(0, 80),
    textAr: String(source.textAr || '').trim().slice(0, 80),
    color: cleanHex(source.color, ''),
  };
}

export function createEmptyMarqueeItem() {
  return {
    id: newItemId(),
    enabled: true,
    iconUrl: '',
    text: '',
    textAr: '',
    color: '',
  };
}

export function defaultPageNavbar() {
  return {
    enabled: true,
    backgroundColor: '#f6f5fb',
    iconColor: '#6b4ce6',
    backEnabled: true,
    heartEnabled: true,
    searchEnabled: true,
    placeholder: 'Search',
    searchBackground: '#ffffff',
    searchBorderColor: '#ddd6fe',
    searchTextColor: '#6b4ce6',
    backgroundMode: 'color',
    gradientFrom: '#8b5cf6',
    gradientTo: '#5b21b6',
    gradientPosition: 100,
    gradientAngle: 180,
    backgroundMediaUrl: '',
    backgroundMediaKind: 'image',
    heightPx: 56,
    paddingX: 12,
    searchRadiusPx: 22,
    iconSizePx: 22,
    backIconUrl: '',
    searchIconUrl: '',
    heartIconUrl: '',
  };
}

export function normalizePageNavbar(input) {
  const source = input && typeof input === 'object' ? input : {};
  const base = defaultPageNavbar();
  return {
    enabled: source.enabled !== false,
    backgroundColor: cleanHex(source.backgroundColor, base.backgroundColor),
    iconColor: cleanHex(source.iconColor, base.iconColor),
    backEnabled: source.backEnabled !== false,
    heartEnabled: source.heartEnabled !== false,
    searchEnabled: source.searchEnabled !== false,
    placeholder: String(source.placeholder ?? base.placeholder).trim().slice(0, 40) || base.placeholder,
    searchBackground: cleanHex(source.searchBackground, base.searchBackground),
    searchBorderColor: cleanHex(source.searchBorderColor, base.searchBorderColor),
    searchTextColor: cleanHex(source.searchTextColor, base.searchTextColor),
    backgroundMode: backgroundModeOf(source.backgroundMode),
    gradientFrom: cleanHex(source.gradientFrom, base.gradientFrom),
    gradientTo: cleanHex(source.gradientTo, base.gradientTo),
    gradientPosition: clampInt(source.gradientPosition, 1, 100, base.gradientPosition),
    gradientAngle: clampInt(source.gradientAngle, 0, 360, base.gradientAngle),
    backgroundMediaUrl: cleanUrl(source.backgroundMediaUrl),
    backgroundMediaKind: mediaKindOf(source.backgroundMediaKind),
    heightPx: clampInt(source.heightPx, 44, 96, base.heightPx),
    paddingX: clampInt(source.paddingX, 0, 32, base.paddingX),
    searchRadiusPx: clampInt(source.searchRadiusPx, 0, 40, base.searchRadiusPx),
    iconSizePx: clampInt(source.iconSizePx, 14, 32, base.iconSizePx),
    backIconUrl: cleanUrl(source.backIconUrl),
    searchIconUrl: cleanUrl(source.searchIconUrl),
    heartIconUrl: cleanUrl(source.heartIconUrl),
  };
}

export function defaultAppNavbar() {
  return {
    enabled: true,
    backgroundMode: 'color',
    backgroundColor: '#6d35e8',
    gradientFrom: '#8b5cf6',
    gradientTo: '#5b21b6',
    gradientPosition: 100,
    gradientAngle: 180,
    backgroundMediaUrl: '',
    backgroundMediaKind: 'image',
    heightPx: 176,
    radiusTopLeft: 0,
    radiusTopRight: 0,
    radiusBottomLeft: 28,
    radiusBottomRight: 28,
    logoUrl: '',
    search: {
      enabled: true,
      placeholder: 'Search',
      placeholderAr: 'بحث',
      backgroundColor: '#ffffff',
      textColor: '#b7b6f2',
      menuButtonColor: '#eceefe',
      menuButtonRadius: 16,
      dividerColor: '#c9caf6',
      menuIconUrl: '',
      searchIconUrl: '',
      cameraIconUrl: '',
      heightPx: 48,
      marginTopPx: 8,
      marginBottomPx: 12,
      paddingX: 12,
      radiusPx: 32,
      iconSizePx: 18,
    },
    marqueeEnabled: true,
    marqueeHeightPx: 36,
    marqueeMarginTopPx: 8,
    marqueeMarginBottomPx: 0,
    marqueePaddingX: 0,
    logoRowHeightPx: 72,
    logoRowMarginTopPx: 8,
    logoRowMarginBottomPx: 0,
    logoRowPaddingX: 16,
    locationColor: '#ffffff',
    languageColor: '#ffffff',
    marqueeSpeedSeconds: 16,
    marqueeTextColor: '#ffffff',
    marqueeGapPx: 28,
    marqueeIconSizePx: 18,
    marqueeFontSizePx: 13,
    items: DEFAULT_ITEMS.map((item, index) => normalizeItem({ ...item, id: `nav-line-${index + 1}` }, index)),
    pageNavbar: defaultPageNavbar(),
  };
}

export function normalizeAppNavbar(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return defaultAppNavbar();
  }
  const fallback = defaultAppNavbar();
  const mode = backgroundModeOf(input.backgroundMode);
  const rawItems = Array.isArray(input.items) ? input.items : fallback.items;
  return {
    enabled: input.enabled !== false,
    backgroundMode: mode,
    backgroundColor: cleanHex(input.backgroundColor, fallback.backgroundColor),
    gradientFrom: cleanHex(input.gradientFrom, fallback.gradientFrom),
    gradientTo: cleanHex(input.gradientTo, fallback.gradientTo),
    gradientPosition: clampInt(input.gradientPosition, 1, 100, fallback.gradientPosition),
    gradientAngle: clampInt(input.gradientAngle, 0, 360, fallback.gradientAngle),
    backgroundMediaUrl: cleanUrl(input.backgroundMediaUrl),
    backgroundMediaKind: mediaKindOf(input.backgroundMediaKind),
    heightPx: clampInt(input.heightPx, 120, 320, fallback.heightPx),
    radiusTopLeft: clampInt(input.radiusTopLeft, 0, 80, fallback.radiusTopLeft),
    radiusTopRight: clampInt(input.radiusTopRight, 0, 80, fallback.radiusTopRight),
    radiusBottomLeft: clampInt(input.radiusBottomLeft, 0, 80, fallback.radiusBottomLeft),
    radiusBottomRight: clampInt(input.radiusBottomRight, 0, 80, fallback.radiusBottomRight),
    logoUrl: cleanUrl(input.logoUrl),
    search: normalizeSearch(input.search, fallback),
    marqueeEnabled: input.marqueeEnabled !== false,
    marqueeHeightPx: clampInt(input.marqueeHeightPx, 24, 120, fallback.marqueeHeightPx),
    marqueeMarginTopPx: clampInt(input.marqueeMarginTopPx, 0, 80, fallback.marqueeMarginTopPx),
    marqueeMarginBottomPx: clampInt(input.marqueeMarginBottomPx, 0, 80, fallback.marqueeMarginBottomPx),
    marqueePaddingX: clampInt(input.marqueePaddingX, 0, 40, fallback.marqueePaddingX),
    logoRowHeightPx: clampInt(input.logoRowHeightPx, 40, 160, fallback.logoRowHeightPx),
    logoRowMarginTopPx: clampInt(input.logoRowMarginTopPx, 0, 80, fallback.logoRowMarginTopPx),
    logoRowMarginBottomPx: clampInt(input.logoRowMarginBottomPx, 0, 80, fallback.logoRowMarginBottomPx),
    logoRowPaddingX: clampInt(input.logoRowPaddingX, 0, 40, fallback.logoRowPaddingX),
    locationColor: cleanHex(input.locationColor, fallback.locationColor),
    languageColor: cleanHex(input.languageColor, fallback.languageColor),
    marqueeSpeedSeconds: clampInt(input.marqueeSpeedSeconds, 4, 60, fallback.marqueeSpeedSeconds),
    marqueeTextColor: cleanHex(input.marqueeTextColor, fallback.marqueeTextColor),
    marqueeGapPx: clampInt(input.marqueeGapPx, 8, 80, fallback.marqueeGapPx),
    marqueeIconSizePx: clampInt(input.marqueeIconSizePx, 12, 36, fallback.marqueeIconSizePx),
    marqueeFontSizePx: clampInt(input.marqueeFontSizePx, 10, 22, fallback.marqueeFontSizePx),
    items: rawItems.slice(0, MAX_MARQUEE_ITEMS).map(normalizeItem),
    pageNavbar: normalizePageNavbar(input.pageNavbar),
  };
}

export function appNavbarBackground(navbar) {
  const config = normalizeAppNavbar(navbar);
  if (config.backgroundMode === 'gradient') {
    const angle = Number(config.gradientAngle);
    const degrees = Number.isFinite(angle) ? angle : 180;
    return `linear-gradient(${degrees}deg, ${config.gradientFrom} 0%, ${config.gradientTo} ${config.gradientPosition}%)`;
  }
  return config.backgroundColor;
}

export function toPublicAppNavbar(input) {
  const config = normalizeAppNavbar(input);
  const items = config.marqueeEnabled
    ? config.items
      .filter((item) => item.enabled && (item.iconUrl || item.text || item.textAr))
      .map((item) => ({
        id: item.id,
        ...(item.iconUrl ? { iconUrl: item.iconUrl } : {}),
        ...(item.text ? { text: item.text } : {}),
        ...(item.textAr ? { textAr: item.textAr } : {}),
        color: item.color || config.marqueeTextColor,
      }))
    : [];

  return {
    enabled: config.enabled,
    heightPx: (
      config.marqueeMarginTopPx + config.marqueeHeightPx + config.marqueeMarginBottomPx
      + config.logoRowMarginTopPx + config.logoRowHeightPx + config.logoRowMarginBottomPx
      + config.search.marginTopPx + config.search.heightPx + config.search.marginBottomPx
    ),
    radius: {
      topLeft: config.radiusTopLeft,
      topRight: config.radiusTopRight,
      bottomLeft: config.radiusBottomLeft,
      bottomRight: config.radiusBottomRight,
    },
    background: {
      mode: config.backgroundMode,
      color: config.backgroundColor,
      gradientFrom: config.gradientFrom,
      gradientTo: config.gradientTo,
      gradientPosition: config.gradientPosition,
      gradientAngle: config.gradientAngle,
      ...(config.backgroundMediaUrl
        ? { mediaUrl: config.backgroundMediaUrl, mediaKind: config.backgroundMediaKind }
        : {}),
    },
    ...(config.logoUrl ? { logoUrl: config.logoUrl } : {}),
    logoRow: {
      heightPx: config.logoRowHeightPx,
      marginTopPx: config.logoRowMarginTopPx,
      marginBottomPx: config.logoRowMarginBottomPx,
      paddingX: config.logoRowPaddingX,
      locationColor: config.locationColor,
      languageColor: config.languageColor,
    },
    search: {
      enabled: config.search.enabled,
      placeholder: config.search.placeholder,
      placeholderAr: config.search.placeholderAr,
      backgroundColor: config.search.backgroundColor,
      textColor: config.search.textColor,
      menuButtonColor: config.search.menuButtonColor,
      menuButtonRadius: config.search.menuButtonRadius,
      dividerColor: config.search.dividerColor,
      heightPx: config.search.heightPx,
      marginTopPx: config.search.marginTopPx,
      marginBottomPx: config.search.marginBottomPx,
      paddingX: config.search.paddingX,
      radiusPx: config.search.radiusPx,
      iconSizePx: config.search.iconSizePx,
      ...(config.search.menuIconUrl ? { menuIconUrl: config.search.menuIconUrl } : {}),
      ...(config.search.searchIconUrl ? { searchIconUrl: config.search.searchIconUrl } : {}),
      ...(config.search.cameraIconUrl ? { cameraIconUrl: config.search.cameraIconUrl } : {}),
    },
    pageNavbar: normalizePageNavbar(config.pageNavbar),
    marquee: {
      enabled: config.marqueeEnabled && items.length > 0,
      heightPx: config.marqueeHeightPx,
      marginTopPx: config.marqueeMarginTopPx,
      marginBottomPx: config.marqueeMarginBottomPx,
      paddingX: config.marqueePaddingX,
      speedSeconds: config.marqueeSpeedSeconds,
      textColor: config.marqueeTextColor,
      gapPx: config.marqueeGapPx,
      iconSizePx: config.marqueeIconSizePx,
      fontSizePx: config.marqueeFontSizePx,
      items,
    },
  };
}

export { MAX_MARQUEE_ITEMS };
