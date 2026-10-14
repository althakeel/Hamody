function clip(value, max = 80) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanIds(value) {
  const list = Array.isArray(value) ? value : [];
  return Array.from(new Set(list.map((id) => String(id || '').trim()).filter((id) => /^[a-fA-F0-9]{24}$/i.test(id)))).slice(0, 200);
}

function newRuleId() {
  return `tb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONTS = ['sans', 'serif'];
const SHAPES = ['pill', 'rounded', 'square'];
const WEIGHTS = ['500', '600', '700', '800'];
const ICONS = ['lightning', 'plus', 'none'];

export function timeBadgeLookDefaults(style) {
  if (style === 'express') {
    return {
      backgroundColor: '#111111',
      textColor: '#ffffff',
      accentColor: '#ffe14a',
      accentTextColor: '#111111',
      fontFamily: 'serif',
      fontWeight: '600',
      fontSize: 12,
      italic: true,
      uppercase: false,
      shape: 'pill',
      icon: 'none',
      arrow: false,
    };
  }
  return {
    backgroundColor: '#2f5bff',
    textColor: '#ffffff',
    accentColor: '#2f5bff',
    accentTextColor: '#ffffff',
      fontFamily: 'sans',
      fontWeight: '800',
      fontSize: 10,
    italic: false,
    uppercase: true,
    shape: 'pill',
    icon: 'lightning',
    arrow: true,
  };
}

function fontSizePx(value, fallback) {
  const named = { sm: 10, md: 12, lg: 14 };
  const raw = named[value] ?? Number(value);
  const size = Number.isFinite(raw) ? Math.round(raw) : fallback;
  return Math.max(8, Math.min(28, size));
}

function color(value, fallback) {
  const raw = String(value || '').trim();
  if (!HEX_COLOR.test(raw)) return fallback;
  if (raw.length === 4) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return raw.toLowerCase();
}

function look(source = {}, style) {
  const defaults = timeBadgeLookDefaults(style);
  return {
    backgroundColor: color(source.backgroundColor, defaults.backgroundColor),
    textColor: color(source.textColor, defaults.textColor),
    accentColor: color(source.accentColor, defaults.accentColor),
    accentTextColor: color(source.accentTextColor, defaults.accentTextColor),
    fontFamily: FONTS.includes(source.fontFamily) ? source.fontFamily : defaults.fontFamily,
    fontWeight: WEIGHTS.includes(String(source.fontWeight || '')) ? String(source.fontWeight) : defaults.fontWeight,
    fontSize: fontSizePx(source.fontSize, defaults.fontSize),
    italic: typeof source.italic === 'boolean' ? source.italic : defaults.italic,
    uppercase: typeof source.uppercase === 'boolean' ? source.uppercase : defaults.uppercase,
    shape: SHAPES.includes(source.shape) ? source.shape : defaults.shape,
    icon: ICONS.includes(source.icon) ? source.icon : defaults.icon,
    arrow: typeof source.arrow === 'boolean' ? source.arrow : defaults.arrow,
  };
}

const BADGE_MOTIONS = ['none', 'lift', 'brighten', 'grow', 'glow', 'pulse', 'float'];

function cleanMotion(value) {
  const motion = String(value || '').trim();
  return BADGE_MOTIONS.includes(motion) ? motion : '';
}
const BADGE_STYLES = ['countdown', 'express', 'pill'];
export const STORE_TIME_ZONE = 'Asia/Dubai';

function pickStyle(value, fallback) {
  return BADGE_STYLES.includes(value) ? value : fallback;
}

function cleanDate(value) {
  const date = String(value || '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function normalizeCutoff(value, fallback = '20:00') {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return fallback;
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2])));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const LEGACY_WORDS = {
  'Today delivery': 'Today',
  'Tomorrow delivery': 'Tomorrow',
  'توصيل اليوم': 'اليوم',
  'توصيل غداً': 'غداً',
};

function word(value, fallback, max = 80) {
  const text = clip(value ?? fallback, max);
  return LEGACY_WORDS[text] || text;
}

function logoUrl(value) {
  const raw = clip(value, 500);
  if (!raw) return '';
  if (raw.startsWith('/') || /^https?:\/\//i.test(raw)) return raw;
  return '';
}

function group(source = {}, fallback = {}, { withCutoff = false } = {}) {
  const next = {
    enabled: source.enabled !== false,
    style: pickStyle(source.style, fallback.style || 'pill'),
    prefix: clip(source.prefix ?? fallback.prefix, 24),
    prefixAr: clip(source.prefixAr ?? fallback.prefixAr, 24),
    label: word(source.label, fallback.label),
    labelAr: word(source.labelAr, fallback.labelAr),
    logo: logoUrl(source.logo ?? fallback.logo),
    productIds: cleanIds(source.productIds ?? fallback.productIds),
    animation: cleanMotion(source.animation ?? fallback.animation),
    ...look(source, pickStyle(source.style, fallback.style || 'pill')),
  };
  if (withCutoff) next.cutoff = normalizeCutoff(source.cutoff, fallback.cutoff || '20:00');
  return next;
}

export const TIME_BADGE_PAGES = [
  { id: 'home', label: 'Home', hint: 'Product cards on the home page, under the price.' },
  { id: 'shop', label: 'Shop', hint: 'Product cards on the shop page.' },
  { id: 'category', label: 'Category pages', hint: 'Product cards on every category page.' },
  { id: 'brand', label: 'Brand pages', hint: 'Product cards on every brand page.' },
  { id: 'search', label: 'Search', hint: 'Product cards in search results.' },
  { id: 'new', label: 'New arrivals', hint: 'Product cards on the new arrivals page.' },
  { id: 'bestSellers', label: 'Best sellers', hint: 'Product cards on best sellers and top selling.' },
  { id: 'offers', label: 'Offers', hint: 'Product cards on offers, clearance, and deal pages.' },
  { id: 'landing', label: 'Landing pages', hint: 'Product cards on landing pages.' },
  { id: 'slider', label: 'Slider pages', hint: 'Product cards on a slider view-all page.' },
  { id: 'related', label: 'Related products', hint: 'Product cards under a product, including related items.' },
  { id: 'cart', label: 'Cart', hint: 'Product cards on the cart page.' },
  { id: 'other', label: 'Other product cards', hint: 'Product cards on every other page.' },
  { id: 'productPage', label: 'Product page', hint: 'The product detail page, under the product title.' },
];

const CARD_PAGE_IDS = TIME_BADGE_PAGES.filter((page) => page.id !== 'productPage').map((page) => page.id);

export function timeBadgePageFromPath(pathname) {
  const path = String(pathname || '');
  if (path === '/') return 'home';
  if (path.startsWith('/shop')) return 'shop';
  if (path.startsWith('/category') || path.startsWith('/categories')) return 'category';
  if (path.startsWith('/brand')) return 'brand';
  if (path.startsWith('/search')) return 'search';
  if (path.startsWith('/new')) return 'new';
  if (path.startsWith('/best-sellers') || path.startsWith('/top-selling')) return 'bestSellers';
  if (path.startsWith('/offers') || path.startsWith('/clearance') || path.startsWith('/under-') || path.startsWith('/trending')) return 'offers';
  if (path.startsWith('/c/')) return 'landing';
  if (path.startsWith('/slider/')) return 'slider';
  if (path.startsWith('/product/') || path.startsWith('/products/')) return 'related';
  if (path.startsWith('/cart')) return 'cart';
  return 'other';
}

function commonSettings(source = {}) {
  const raw = source?.common && typeof source.common === 'object' ? source.common : {};
  const seconds = Math.round(Number(raw.rotateSeconds));
  const hover = ['none', 'lift', 'brighten', 'grow', 'glow', 'pulse', 'float'].includes(raw.hover) ? raw.hover : 'none';
  return {
    rotate: raw.rotate !== false,
    rotateSeconds: Number.isFinite(seconds) ? Math.max(1, Math.min(30, seconds)) : 3,
    hover,
  };
}

function placements(source = {}) {
  const raw = source?.placements && typeof source.placements === 'object' ? source.placements : {};
  const allCards = raw.allCards !== false && raw.cards !== false;
  const picked = Array.isArray(raw.pages) ? raw.pages.filter((id) => CARD_PAGE_IDS.includes(id)) : CARD_PAGE_IDS;
  return {
    allCards,
    cards: allCards,
    productPage: raw.productPage === true,
    pages: allCards ? CARD_PAGE_IDS : picked,
  };
}

export const DEFAULT_TIME_BADGES = {
  today: {
    enabled: true,
    style: 'countdown',
    prefix: 'GET IN',
    prefixAr: 'خلال',
    label: 'Today',
    labelAr: 'اليوم',
    cutoff: '20:00',
    productIds: [],
  },
  tomorrow: {
    enabled: true,
    style: 'express',
    prefix: 'express',
    prefixAr: 'إكسبريس',
    label: 'Tomorrow',
    labelAr: 'غداً',
    productIds: [],
  },
  standard: {
    enabled: true,
    style: 'express',
    prefix: 'Standard',
    prefixAr: 'عادي',
    label: '',
    labelAr: '',
    date: '',
    time: '',
    productIds: [],
  },
  customDates: [],
  dayRanges: [],
  customBadges: [],
  placements: { allCards: true, cards: true, productPage: false, pages: [] },
  common: { rotate: true, rotateSeconds: 3, hover: 'none' },
};

export function normalizeTimeBadges(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const customDates = (Array.isArray(source.customDates) ? source.customDates : [])
    .slice(0, 8)
    .map((item) => {
      const date = String(item?.date || '').trim().slice(0, 10);
      return {
        id: clip(item?.id, 40) || newRuleId(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
        ...group(item, { label: '', labelAr: '' }),
      };
    })
    .filter((item) => item.date);

  const customBadges = (Array.isArray(source.customBadges) ? source.customBadges : [])
    .slice(0, 8)
    .map((item) => ({
      id: clip(item?.id, 40) || newRuleId(),
      name: clip(item?.name, 40) || 'Custom badge',
      date: cleanDate(item?.date),
      time: normalizeCutoff(item?.time, ''),
      ...group(item, { style: 'pill', prefix: '', prefixAr: '', label: '', labelAr: '' }),
    }));

  const dayRanges = (Array.isArray(source.dayRanges) ? source.dayRanges : [])
    .slice(0, 8)
    .map((item) => {
      const minDays = Math.max(1, Math.min(60, Number(item?.minDays) || 2));
      const maxDays = Math.max(minDays, Math.min(60, Number(item?.maxDays) || minDays));
      return {
        id: clip(item?.id, 40) || newRuleId(),
        minDays,
        maxDays,
        ...group(item, { label: '', labelAr: '' }),
      };
    });

  return {
    today: group(source.today, DEFAULT_TIME_BADGES.today, { withCutoff: true }),
    tomorrow: group(source.tomorrow, DEFAULT_TIME_BADGES.tomorrow),
    standard: {
      ...group(source.standard, DEFAULT_TIME_BADGES.standard),
      date: cleanDate(source.standard?.date),
      time: normalizeCutoff(source.standard?.time, ''),
    },
    customDates,
    dayRanges,
    customBadges,
    placements: placements(source),
    common: commonSettings(source),
  };
}

export function createCustomBadgeRule() {
  return {
    id: newRuleId(),
    enabled: true,
    name: 'Custom badge',
    style: 'pill',
    prefix: '',
    prefixAr: '',
    label: '',
    labelAr: '',
    date: '',
    time: '',
    productIds: [],
    ...timeBadgeLookDefaults('pill'),
  };
}

export function createStandardBadgeRule() {
  return {
    id: newRuleId(),
    enabled: true,
    name: 'Standard delivery',
    style: 'express',
    prefix: 'Standard',
    prefixAr: 'عادي',
    label: '',
    labelAr: '',
    date: '',
    time: '',
    productIds: [],
    ...timeBadgeLookDefaults('express'),
  };
}

export function formatDeliveryMoment(date, time, arabic = false) {
  const clean = cleanDate(date);
  if (!clean) return '';
  const [year, month, day] = clean.split('-').map(Number);
  const clock = normalizeCutoff(time, '');
  const [hour = 0, minute = 0] = clock ? clock.split(':').map(Number) : [];
  const stamp = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const dayLabel = stamp.toLocaleDateString(arabic ? 'ar' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  if (!clock) return dayLabel;
  const timeLabel = stamp.toLocaleTimeString(arabic ? 'ar' : 'en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${dayLabel}, ${timeLabel}`;
}

export function createCustomDateRule() {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  return {
    id: newRuleId(),
    enabled: true,
    date: iso,
    style: 'pill',
    prefix: '',
    prefixAr: '',
    label: '',
    labelAr: '',
    productIds: [],
  };
}

export function createDayRangeRule(minDays = 2, maxDays = 5) {
  const min = Math.max(1, Math.min(60, Number(minDays) || 2));
  const max = Math.max(min, Math.min(60, Number(maxDays) || min));
  return {
    id: newRuleId(),
    enabled: true,
    minDays: min,
    maxDays: max,
    style: 'pill',
    prefix: '',
    prefixAr: '',
    label: '',
    labelAr: '',
    productIds: [],
  };
}

export function minutesUntilCutoff(cutoff, now = new Date()) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(cutoff || ''));
  if (!match) return 0;
  const cutoffMinutes = Number(match[1]) * 60 + Number(match[2]);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: STORE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return cutoffMinutes - (hour * 60 + minute);
}

export function formatCountdown(minutes, arabic = false) {
  const left = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(left / 60);
  const mins = left % 60;
  if (arabic) {
    if (hours > 0 && mins > 0) return `${hours} س ${mins} د`;
    if (hours > 0) return `${hours} س`;
    return `${mins} د`;
  }
  if (hours > 0 && mins > 0) return `${hours} HR ${mins} MIN`;
  if (hours > 0) return `${hours} HR`;
  return `${mins} MIN`;
}

function formatDateLabel(date, arabic) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(arabic ? 'ar' : 'en-GB', { day: 'numeric', month: 'short' });
}

function words(item, arabic, fallbackPrefix, fallbackLabel) {
  const prefix = arabic
    ? (item.prefixAr || item.prefix || fallbackPrefix)
    : (item.prefix ?? fallbackPrefix);
  const label = arabic
    ? (item.labelAr || item.label || fallbackLabel)
    : (item.label ?? fallbackLabel);
  return { prefix, label };
}

function present(item, arabic, fallbackPrefix, fallbackLabel, extra = {}) {
  return {
    style: item.style || 'pill',
    ...words(item, arabic, fallbackPrefix, fallbackLabel),
    backgroundColor: item.backgroundColor,
    textColor: item.textColor,
    accentColor: item.accentColor,
    accentTextColor: item.accentTextColor,
    fontFamily: item.fontFamily,
    fontWeight: item.fontWeight,
    fontSize: item.fontSize,
    italic: item.italic,
    uppercase: item.uppercase,
    shape: item.shape,
    icon: item.icon,
    arrow: item.arrow,
    logo: item.logo || '',
    animation: cleanMotion(item.animation),
    ...extra,
  };
}

function badgeHasText(badge) {
  return Boolean(String(badge?.prefix || '').trim() || String(badge?.label || '').trim() || badge?.style === 'countdown');
}

export function resolveTimeBadges(productId, settings, { arabic = false } = {}) {
  const id = String(productId || '').trim();
  if (!id) return [];
  const config = normalizeTimeBadges(settings);
  const key = id.toLowerCase();
  const has = (groupItem) => groupItem.enabled && groupItem.productIds.some((item) => item.toLowerCase() === key);
  const tomorrowView = present(config.tomorrow, arabic, arabic ? 'إكسبريس' : 'express', arabic ? 'غداً' : 'Tomorrow');
  const tomorrowMark = tomorrowView.style === 'countdown' ? { ...tomorrowView, style: 'express' } : tomorrowView;
  const badges = [];

  if (has(config.today)) {
    const today = present(config.today, arabic, arabic ? 'خلال' : 'GET IN', '', { cutoff: config.today.cutoff });
    if (today.style === 'countdown') {
      badges.push({ ...today, rollover: has(config.tomorrow) ? null : tomorrowMark });
    } else {
      badges.push(today);
    }
  }
  if (has(config.tomorrow)) badges.push(tomorrowView);

  if (has(config.standard)) {
    const when = formatDeliveryMoment(config.standard.date, config.standard.time, arabic);
    badges.push(present({
      ...config.standard,
      label: config.standard.label || when,
      labelAr: config.standard.labelAr || when,
    }, arabic, arabic ? 'عادي' : 'Standard', when || (arabic ? 'توصيل' : 'Delivery')));
  }

  (config.customBadges || []).forEach((extra) => {
    if (!has(extra)) return;
    const when = formatDeliveryMoment(extra.date, extra.time, arabic);
    badges.push(present({
      ...extra,
      label: extra.label || when,
      labelAr: extra.labelAr || when,
    }, arabic, '', when));
  });

  config.customDates.forEach((dated) => {
    if (!has(dated)) return;
    const formatted = formatDateLabel(dated.date, arabic);
    badges.push(present(dated, arabic, '', arabic ? `توصيل ${formatted}` : `${formatted} delivery`));
  });

  config.dayRanges.forEach((range) => {
    if (!has(range)) return;
    const fallback = arabic
      ? `${range.minDays}-${range.maxDays} أيام`
      : `${range.minDays}-${range.maxDays} DAYS`;
    badges.push(present(range, arabic, '', fallback));
  });

  return badges.filter(badgeHasText);
}

export function resolveTimeBadge(productId, settings, options) {
  return resolveTimeBadges(productId, settings, options)[0] || null;
}
