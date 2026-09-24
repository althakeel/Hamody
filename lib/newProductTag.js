export const MAX_PRODUCT_IMAGE_BADGES = 3;

export const BADGE_FONT_OPTIONS = [
  { id: 'sans', label: 'Sans', family: 'inherit' },
  { id: 'serif', label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  { id: 'display', label: 'Display', family: 'Poppins, ui-sans-serif, system-ui, sans-serif' },
  { id: 'mono', label: 'Mono', family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  { id: 'script', label: 'Script', family: 'var(--font-shadows-into-light), "Segoe Script", cursive' },
];

export const BADGE_PLACEMENT_OPTIONS = [
  { id: 'top-left', label: 'Top left' },
  { id: 'top-center', label: 'Top center' },
  { id: 'top-right', label: 'Top right' },
  { id: 'middle-left', label: 'Middle left' },
  { id: 'middle-right', label: 'Middle right' },
  { id: 'bottom-left', label: 'Bottom left' },
  { id: 'bottom-center', label: 'Bottom center' },
  { id: 'bottom-right', label: 'Bottom right' },
];

export const BADGE_SHAPE_OPTIONS = [
  { id: 'pill', label: 'Pill' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'square', label: 'Square' },
  { id: 'tag', label: 'Tag' },
  { id: 'circle', label: 'Circle' },
];

export const BADGE_SIZE_OPTIONS = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

export const BADGE_SHADOW_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'soft', label: 'Soft' },
  { id: 'strong', label: 'Strong' },
];

export const BADGE_OFFSET_OPTIONS = [
  { id: 'tight', label: 'Tight' },
  { id: 'normal', label: 'Normal' },
  { id: 'loose', label: 'Away from edge' },
];

export const BADGE_LETTER_SPACING_OPTIONS = [
  { id: 'tight', label: 'Tight' },
  { id: 'normal', label: 'Normal' },
  { id: 'wide', label: 'Wide' },
];

export const BADGE_TEXT_TRANSFORM_OPTIONS = [
  { id: 'uppercase', label: 'UPPERCASE' },
  { id: 'capitalize', label: 'Capitalize' },
  { id: 'lowercase', label: 'lowercase' },
  { id: 'none', label: 'As typed' },
];

export const BADGE_CONDITION_OPTIONS = [
  { id: 'new', label: 'New product', hint: 'Shows while the product is within the days set above.' },
  { id: 'on-sale', label: 'On sale', hint: 'Shows when the sale price is lower than the original price.' },
  { id: 'out-of-stock', label: 'Out of stock', hint: 'Shows when the product is out of stock.' },
  { id: 'low-stock', label: 'Low stock', hint: 'Shows when remaining quantity is at or below the threshold.' },
  { id: 'fast-delivery', label: 'Fast delivery', hint: 'Shows on products marked for fast delivery.' },
  { id: 'free-shipping', label: 'Free shipping', hint: 'Shows on products eligible for free shipping.' },
  { id: 'always', label: 'Always', hint: 'Shows on every product while this badge is enabled.' },
];

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const DEFAULT_NEW_BADGE = {
  id: 'badge-1',
  enabled: true,
  label: 'New',
  labelAr: 'جديد',
  position: 'left',
  backgroundColor: '#E52D27',
  textColor: '#FFFFFF',
  borderColor: '#E52D27',
  borderWidth: 0,
  fontFamily: 'sans',
  fontWeight: '700',
  textTransform: 'uppercase',
  shape: 'pill',
  placement: 'top-left',
  size: 'medium',
  shadow: 'soft',
  offset: 'normal',
  opacity: 100,
  letterSpacing: 'normal',
  condition: 'new',
  conditionValue: 5,
};

export const DEFAULT_SECOND_BADGE = {
  id: 'badge-2',
  enabled: true,
  label: 'New',
  labelAr: 'جديد',
  position: 'right',
  backgroundColor: '#FFFFFF',
  textColor: '#E52D27',
  borderColor: '#E52D27',
  borderWidth: 2,
  fontFamily: 'sans',
  fontWeight: '800',
  textTransform: 'uppercase',
  shape: 'pill',
  placement: 'top-right',
  size: 'medium',
  shadow: 'soft',
  offset: 'normal',
  opacity: 100,
  letterSpacing: 'normal',
  condition: 'new',
  conditionValue: 5,
};

export const DEFAULT_NEW_TAG_SETTINGS = {
  enabled: true,
  label: DEFAULT_NEW_BADGE.label,
  labelAr: DEFAULT_NEW_BADGE.labelAr,
  displayDays: 14,
  showOnImageOverlay: true,
  badges: [DEFAULT_NEW_BADGE],
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function sanitizeHex(value, fallback) {
  const raw = String(value || '').trim();
  if (HEX_COLOR.test(raw)) {
    return raw.length === 4
      ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase()
      : raw.toUpperCase();
  }
  return fallback;
}

function sanitizeColor(value, fallback, { allowTransparent = false } = {}) {
  const raw = String(value || '').trim();
  if (allowTransparent && raw.toLowerCase() === 'transparent') return 'transparent';
  const hexFallback = fallback === 'transparent' ? '#FFFFFF' : fallback;
  return sanitizeHex(raw, hexFallback);
}

export function oppositeBadgePosition(position) {
  return position === 'right' ? 'left' : 'right';
}

export function oppositeBadgePlacement(placement = 'top-left') {
  const map = {
    'top-left': 'top-right',
    'top-center': 'top-left',
    'top-right': 'top-left',
    'middle-left': 'middle-right',
    'middle-right': 'middle-left',
    'bottom-left': 'bottom-right',
    'bottom-center': 'bottom-left',
    'bottom-right': 'bottom-left',
  };
  return map[placement] || 'top-right';
}

export function nextAvailableBadgePlacement(existingBadges = []) {
  const usedPlacements = new Set(
    existingBadges.map((badge) => badge.placement || normalizeBadgePlacement(badge)),
  );
  if (usedPlacements.size === 0) return 'top-left';
  const preferred = oppositeBadgePlacement(
    existingBadges[0]?.placement || normalizeBadgePlacement(existingBadges[0] || {}),
  );
  if (!usedPlacements.has(preferred)) return preferred;
  return BADGE_PLACEMENT_OPTIONS.find((option) => !usedPlacements.has(option.id))?.id || preferred;
}

function pickOption(options, value, fallback) {
  return options.some((option) => option.id === value) ? value : fallback;
}

export function normalizeBadgePlacement(raw = {}, fallbackPlacement = 'top-left') {
  const source = raw && typeof raw === 'object' ? raw : {};
  if (BADGE_PLACEMENT_OPTIONS.some((option) => option.id === source.placement)) {
    return source.placement;
  }
  if (source.position === 'right') return 'top-right';
  if (source.position === 'left') return 'top-left';
  return fallbackPlacement;
}

export function getBadgeFontFamily(fontFamily) {
  return BADGE_FONT_OPTIONS.find((option) => option.id === fontFamily)?.family
    || BADGE_FONT_OPTIONS[0].family;
}

export function createProductImageBadge(overrides = {}, existingBadges = []) {
  const nextPlacement = nextAvailableBadgePlacement(existingBadges);
  const base = existingBadges.length === 0
    ? DEFAULT_NEW_BADGE
    : existingBadges.length === 1
      ? DEFAULT_SECOND_BADGE
      : {
          ...DEFAULT_SECOND_BADGE,
          backgroundColor: '#111827',
          textColor: '#FFFFFF',
          borderColor: '#111827',
          borderWidth: 0,
          shape: 'rounded',
        };
  return normalizeProductImageBadge({
    ...base,
    id: `badge-${Date.now().toString(36)}`,
    placement: nextPlacement,
    position: nextPlacement.includes('right') ? 'right' : 'left',
    ...overrides,
  });
}

export function normalizeProductImageBadge(raw = {}, fallback = DEFAULT_NEW_BADGE) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const placement = normalizeBadgePlacement(source, fallback.placement || 'top-left');
  const position = placement.includes('right') ? 'right' : 'left';
  const fontFamily = pickOption(BADGE_FONT_OPTIONS, source.fontFamily, fallback.fontFamily);
  const fontWeight = ['400', '500', '600', '700', '800'].includes(String(source.fontWeight))
    ? String(source.fontWeight)
    : fallback.fontWeight;
  const textTransform = pickOption(BADGE_TEXT_TRANSFORM_OPTIONS, source.textTransform, 'uppercase');
  const shape = pickOption(BADGE_SHAPE_OPTIONS, source.shape, fallback.shape || 'pill');
  const size = pickOption(BADGE_SIZE_OPTIONS, source.size, fallback.size || 'medium');
  const shadow = pickOption(BADGE_SHADOW_OPTIONS, source.shadow, fallback.shadow || 'soft');
  const offset = pickOption(BADGE_OFFSET_OPTIONS, source.offset, fallback.offset || 'normal');
  const letterSpacing = pickOption(BADGE_LETTER_SPACING_OPTIONS, source.letterSpacing, fallback.letterSpacing || 'normal');
  const condition = pickOption(BADGE_CONDITION_OPTIONS, source.condition, fallback.condition || 'new');
  const conditionValueRaw = Number(source.conditionValue);
  const conditionValue = Number.isFinite(conditionValueRaw)
    ? Math.max(1, Math.min(50, Math.round(conditionValueRaw)))
    : (fallback.conditionValue || 5);
  const opacityRaw = Number(source.opacity);
  const opacity = Number.isFinite(opacityRaw) ? Math.max(50, Math.min(100, Math.round(opacityRaw))) : (fallback.opacity || 100);
  const borderWidth = Number(source.borderWidth);
  const label = String(source.label ?? fallback.label).trim();
  const labelAr = String(source.labelAr ?? fallback.labelAr).trim();

  return {
    id: String(source.id || fallback.id || 'badge-1'),
    enabled: source.enabled !== false,
    label: label || fallback.label,
    labelAr: labelAr || fallback.labelAr,
    position,
    placement,
    backgroundColor: sanitizeColor(source.backgroundColor, fallback.backgroundColor, { allowTransparent: true }),
    textColor: sanitizeHex(source.textColor, fallback.textColor),
    borderColor: sanitizeColor(source.borderColor, fallback.borderColor, { allowTransparent: true }),
    borderWidth: Number.isFinite(borderWidth) ? Math.max(0, Math.min(8, Math.round(borderWidth))) : fallback.borderWidth,
    fontFamily,
    fontWeight,
    textTransform,
    shape,
    size,
    shadow,
    offset,
    opacity,
    letterSpacing,
    condition,
    conditionValue,
  };
}

function migrateLegacyBadges(source) {
  if (Array.isArray(source.badges) && source.badges.length > 0) {
    return source.badges;
  }

  return [{
    ...DEFAULT_NEW_BADGE,
    label: source.label || DEFAULT_NEW_BADGE.label,
    labelAr: source.labelAr || DEFAULT_NEW_BADGE.labelAr,
  }];
}

function assignOppositePositions(badges) {
  if (badges.length < 2) return badges;
  const seen = new Set();
  return badges.map((badge, index) => {
    const requested = badge.placement || (badge.position === 'right' ? 'top-right' : 'top-left');
    if (!seen.has(requested) || index === 0) {
      seen.add(requested);
      return { ...badge, placement: requested };
    }
    const nextPlacement = nextAvailableBadgePlacement(
      [...seen].map((placement) => ({ placement })),
    );
    seen.add(nextPlacement);
    return {
      ...badge,
      placement: nextPlacement,
      position: nextPlacement.includes('right') ? 'right' : 'left',
    };
  });
}

export function normalizeNewTagSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const days = Number(source.displayDays);
  const badges = assignOppositePositions(
    migrateLegacyBadges(source)
      .slice(0, MAX_PRODUCT_IMAGE_BADGES)
      .map((badge, index) => normalizeProductImageBadge(
        badge,
        index === 0 ? DEFAULT_NEW_BADGE : DEFAULT_SECOND_BADGE,
      )),
  );
  const primary = badges[0] || DEFAULT_NEW_BADGE;

  return {
    enabled: source.enabled !== false,
    label: primary.label,
    labelAr: primary.labelAr,
    displayDays: Number.isFinite(days)
      ? Math.max(1, Math.min(365, Math.round(days)))
      : DEFAULT_NEW_TAG_SETTINGS.displayDays,
    showOnImageOverlay: source.showOnImageOverlay !== false,
    badges,
  };
}

export function getNewTagLabel(settings = DEFAULT_NEW_TAG_SETTINGS, language = 'en') {
  const normalized = normalizeNewTagSettings(settings);
  const badge = normalized.badges.find((item) => item.enabled) || normalized.badges[0] || DEFAULT_NEW_BADGE;
  if (language === 'ar') return badge.labelAr;
  return badge.label;
}

export function getVisibleNewProductBadges(settings = DEFAULT_NEW_TAG_SETTINGS, language = 'en', product = null, now = Date.now()) {
  const normalized = normalizeNewTagSettings(settings);
  if (!normalized.enabled) return [];
  return normalized.badges
    .filter((badge) => badge.enabled)
    .filter((badge) => product == null || productMatchesBadgeCondition(product, badge, normalized, now))
    .map((badge) => ({
      ...badge,
      label: language === 'ar' ? badge.labelAr : badge.label,
    }));
}

export function getProductCreatedAt(product = {}) {
  return product?.createdAt || product?.created_at || product?.publishedAt || null;
}

export function isProductWithinNewWindow(product, settings = DEFAULT_NEW_TAG_SETTINGS, now = Date.now()) {
  const normalized = normalizeNewTagSettings(settings);
  if (!normalized.enabled) return false;

  const created = getProductCreatedAt(product);
  if (!created) return false;

  const createdMs = new Date(created).getTime();
  if (!Number.isFinite(createdMs)) return false;

  const ageMs = Number(now) - createdMs;
  if (ageMs < 0) return true;
  return ageMs <= normalized.displayDays * MS_PER_DAY;
}

function parseProductAmount(value) {
  const num = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

export function productHasDiscount(product = {}) {
  const sale = parseProductAmount(
    product.price
    ?? product.salePrice
    ?? product.sale_price
    ?? product.discountedPrice
    ?? product.discounted_price
    ?? product.offerPrice
    ?? product.offer_price,
  );
  const regular = parseProductAmount(
    product.AED
    ?? product.compareAtPrice
    ?? product.compare_at_price
    ?? product.originalPrice
    ?? product.mrp
    ?? product.regularPrice,
  );
  const explicit = parseProductAmount(
    product.discountPercent
    ?? product.discount_percent
    ?? product.discountPercentage
    ?? product.discount,
  );
  if (regular > sale && sale > 0) return true;
  return explicit > 0;
}

export function isProductOutOfStock(product = {}) {
  if (product.inStock === false) return true;
  if (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0) return true;
  return false;
}

export function isProductLowStock(product = {}, threshold = 5) {
  if (isProductOutOfStock(product)) return false;
  const qty = Number(product.stockQuantity);
  return Number.isFinite(qty) && qty > 0 && qty <= threshold;
}

export function productMatchesBadgeCondition(product, badge, settings = DEFAULT_NEW_TAG_SETTINGS, now = Date.now()) {
  const condition = badge?.condition || 'new';
  if (condition === 'always') return true;
  if (condition === 'on-sale') return productHasDiscount(product);
  if (condition === 'out-of-stock') return isProductOutOfStock(product);
  if (condition === 'low-stock') return isProductLowStock(product, badge?.conditionValue || 5);
  if (condition === 'fast-delivery') return Boolean(product?.fastDelivery);
  if (condition === 'free-shipping') return Boolean(product?.freeShippingEligible);
  return isProductWithinNewWindow(product, settings, now);
}

export function shouldShowNewProductTag(product, settings = DEFAULT_NEW_TAG_SETTINGS, now = Date.now()) {
  return getVisibleNewProductBadges(settings, 'en', product, now).length > 0;
}

export function getBadgePlacementClass(badge, size = 'card') {
  const placement = badge.placement || (badge.position === 'right' ? 'top-right' : 'top-left');
  const offsetKey = badge.offset === 'tight' || badge.offset === 'loose' ? badge.offset : 'normal';
  const scale = size === 'thumb' ? 'thumb' : size === 'detail' ? 'detail' : 'card';
  const inset = {
    thumb: {
      tight: { t: 'top-0.5', b: 'bottom-0.5', l: 'left-0.5', r: 'right-0.5' },
      normal: { t: 'top-1', b: 'bottom-1', l: 'left-1', r: 'right-1' },
      loose: { t: 'top-1.5', b: 'bottom-1.5', l: 'left-1.5', r: 'right-1.5' },
    },
    card: {
      tight: { t: 'top-1', b: 'bottom-1', l: 'left-1', r: 'right-1' },
      normal: { t: 'top-2', b: 'bottom-2', l: 'left-2', r: 'right-2' },
      loose: { t: 'top-3', b: 'bottom-3', l: 'left-3', r: 'right-3' },
    },
    detail: {
      tight: { t: 'top-2', b: 'bottom-2', l: 'left-2', r: 'right-2' },
      normal: { t: 'top-3', b: 'bottom-3', l: 'left-3', r: 'right-3' },
      loose: { t: 'top-5', b: 'bottom-5', l: 'left-5', r: 'right-5' },
    },
  }[scale][offsetKey];

  const placements = {
    'top-left': `${inset.t} ${inset.l}`,
    'top-center': `${inset.t} left-1/2 -translate-x-1/2`,
    'top-right': `${inset.t} ${inset.r}`,
    'middle-left': `top-1/2 ${inset.l} -translate-y-1/2`,
    'middle-right': `top-1/2 ${inset.r} -translate-y-1/2`,
    'bottom-left': `${inset.b} ${inset.l}`,
    'bottom-center': `${inset.b} left-1/2 -translate-x-1/2`,
    'bottom-right': `${inset.b} ${inset.r}`,
  };

  return placements[placement] || placements['top-left'];
}

export function getBadgeSizeClass(badge, size = 'card') {
  const badgeSize = badge.size === 'small' || badge.size === 'large' ? badge.size : 'medium';
  if (size === 'thumb') {
    return badgeSize === 'large' ? 'px-1.5 py-0.5 text-[9px]' : 'px-1 py-px text-[8px]';
  }
  if (size === 'detail') {
    if (badgeSize === 'small') return 'px-2 py-0.5 text-[11px]';
    if (badgeSize === 'large') return 'px-3.5 py-1.5 text-sm';
    return 'px-2.5 py-1 text-xs';
  }
  if (badgeSize === 'small') return 'px-1 py-px text-[9px]';
  if (badgeSize === 'large') return 'px-2.5 py-1 text-xs';
  return 'px-1.5 py-0.5 text-[10px]';
}

export function getBadgeShadowClass(badge) {
  if (badge.shadow === 'none') return '';
  if (badge.shadow === 'strong') return 'shadow-md';
  return 'shadow-sm';
}

export function getNewBadgeStyle(badge, compact = true) {
  const radius = {
    pill: 999,
    rounded: compact ? 6 : 8,
    square: compact ? 2 : 3,
    tag: compact ? 4 : 6,
    circle: 999,
  }[badge.shape] ?? 999;
  const letterSpacing = badge.letterSpacing === 'tight'
    ? '-0.02em'
    : badge.letterSpacing === 'wide'
      ? '0.14em'
      : '0.02em';
  const opacity = Number(badge.opacity || 100) / 100;

  return {
    backgroundColor: badge.backgroundColor === 'transparent' ? 'transparent' : badge.backgroundColor,
    color: badge.textColor,
    borderColor: badge.borderColor === 'transparent' ? 'transparent' : badge.borderColor,
    borderWidth: Number(badge.borderWidth) || 0,
    borderStyle: Number(badge.borderWidth) > 0 ? 'solid' : 'none',
    fontFamily: getBadgeFontFamily(badge.fontFamily),
    fontWeight: badge.fontWeight,
    textTransform: badge.textTransform,
    borderRadius: radius,
    letterSpacing,
    opacity,
    minWidth: badge.shape === 'circle' ? (compact ? 22 : 28) : undefined,
    minHeight: badge.shape === 'circle' ? (compact ? 22 : 28) : undefined,
    display: badge.shape === 'circle' ? 'inline-flex' : undefined,
    alignItems: badge.shape === 'circle' ? 'center' : undefined,
    justifyContent: badge.shape === 'circle' ? 'center' : undefined,
    clipPath: badge.shape === 'tag'
      ? 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)'
      : undefined,
    paddingRight: badge.shape === 'tag' ? (compact ? 10 : 14) : undefined,
  };
}
