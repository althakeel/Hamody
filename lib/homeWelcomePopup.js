export const HOME_POPUP_LAYOUTS = ['classic', 'image-top', 'split', 'image-only'];

export const HOME_POPUP_PAGE_OPTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'shop', label: 'Shop' },
  { id: 'category', label: 'Category pages' },
  { id: 'product', label: 'Product pages' },
  { id: 'cart', label: 'Cart' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'offers', label: 'Offers' },
  { id: 'blogs', label: 'Blogs' },
  { id: 'search', label: 'Search' },
  { id: 'all', label: 'All store pages' },
];

export const HOME_POPUP_BLOCK_TYPES = ['gift', 'heading', 'offer', 'body', 'coupon', 'email', 'button'];

export const HOME_POPUP_BLOCK_LABELS = {
  gift: 'Gift or icon',
  heading: 'Heading',
  offer: 'Offer line',
  body: 'Description',
  coupon: 'Coupon code',
  email: 'Email signup',
  button: 'Button',
};

const DEFAULT_POPUP_STATS = { views: 0, emails: 0, copies: 0, clicks: 0 };

export const DEFAULT_HOME_WELCOME_POPUP = {
  enabled: false,
  layout: 'classic',
  imageSide: 'left',
  corner: 'soft',
  headerColor: '#e10600',
  accentColor: '#e10600',
  cardColor: '#fff7f7',
  textColor: '#0f172a',
  buttonTextColor: '#ffffff',
  logoUrl: '',
  iconUrl: '',
  imageUrl: '',
  showHeader: true,
  showGift: true,
  showEmail: true,
  showButton: true,
  buttonLink: '',
  delaySeconds: 0,
  maxWidth: 420,
  pages: ['home'],
  dismissFor: 'day',
  heading: 'WELCOME TO STORE1920',
  headingAr: '',
  offerLead: 'Get',
  offerLeadAr: '',
  offerHighlight: '10% OFF',
  offerHighlightAr: '',
  offerTail: 'your first purchase',
  offerTailAr: '',
  body: 'Join thousands of shoppers receiving exclusive deals and early access to offers.',
  bodyAr: '',
  emailPlaceholder: 'Your email',
  emailPlaceholderAr: '',
  buttonText: 'Get my offer',
  buttonTextAr: '',
  successText: 'You are in. Watch your inbox for the offer.',
  successTextAr: '',
  couponCode: '',
  couponLabel: 'Use code',
  couponLabelAr: '',
  blocks: [
    { type: 'gift', enabled: true },
    { type: 'heading', enabled: true },
    { type: 'offer', enabled: true },
    { type: 'body', enabled: true },
    { type: 'coupon', enabled: false },
    { type: 'email', enabled: true },
    { type: 'button', enabled: true },
  ],
  stats: { ...DEFAULT_POPUP_STATS },
};

function text(value, fallback, max = 180) {
  const next = String(value ?? '').trim();
  return (next || fallback).slice(0, max);
}

function optionalText(value, max = 180) {
  return String(value ?? '').trim().slice(0, max);
}

function color(value, fallback) {
  const raw = String(value || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : fallback;
}

function normalizePopupPages(value) {
  const allowed = new Set(HOME_POPUP_PAGE_OPTIONS.map((page) => page.id));
  const pages = Array.isArray(value)
    ? Array.from(new Set(value.map((item) => String(item || '').trim()).filter((id) => allowed.has(id))))
    : ['home'];
  if (pages.includes('all')) return ['all'];
  return pages.length ? pages : ['home'];
}

export function popupMatchesPath(settings = {}, pathname = '/') {
  const pages = normalizePopupPages(settings.pages);
  const path = String(pathname || '/').split('?')[0].split('#')[0] || '/';
  if (path.startsWith('/store') || path.startsWith('/dashboard')) return false;
  if (pages.includes('all')) return true;
  return pages.some((id) => {
    if (id === 'home') return path === '/';
    if (id === 'shop') return path === '/shop' || path.startsWith('/shop/');
    if (id === 'category') return path.startsWith('/category');
    if (id === 'product') return path.startsWith('/product/') || path.startsWith('/products/');
    if (id === 'cart') return path === '/cart';
    if (id === 'checkout') return path === '/checkout' || path.startsWith('/checkout/');
    if (id === 'offers') return path === '/offers' || path.startsWith('/offer/');
    if (id === 'blogs') return path === '/blogs' || path.startsWith('/blogs/');
    if (id === 'search') return path.startsWith('/search');
    return false;
  });
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function normalizeStats(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    views: clamp(source.views, 0, 100000000, 0),
    emails: clamp(source.emails, 0, 100000000, 0),
    copies: clamp(source.copies, 0, 100000000, 0),
    clicks: clamp(source.clicks, 0, 100000000, 0),
  };
}

function normalizeBlocks(value, source = {}) {
  const defaults = DEFAULT_HOME_WELCOME_POPUP.blocks;
  const incoming = Array.isArray(value) ? value : [];
  const byType = new Map();
  incoming.forEach((block) => {
    const type = String(block?.type || '');
    if (!HOME_POPUP_BLOCK_TYPES.includes(type) || byType.has(type)) return;
    byType.set(type, block?.enabled !== false);
  });
  if (!byType.size) {
    byType.set('gift', source.showGift !== false);
    byType.set('heading', true);
    byType.set('offer', true);
    byType.set('body', true);
    byType.set('coupon', false);
    byType.set('email', source.showEmail !== false);
    byType.set('button', source.showButton !== false);
  }
  const ordered = [];
  incoming.forEach((block) => {
    const type = String(block?.type || '');
    if (!byType.has(type) || ordered.some((item) => item.type === type)) return;
    ordered.push({ type, enabled: byType.get(type) === true });
  });
  defaults.forEach((block) => {
    if (ordered.some((item) => item.type === block.type)) return;
    ordered.push({ type: block.type, enabled: byType.has(block.type) ? byType.get(block.type) === true : block.enabled });
  });
  return ordered;
}

export function normalizeHomePopupTemplate(value = {}, index = 0) {
  const source = value && typeof value === 'object' ? value : {};
  const defaults = DEFAULT_HOME_WELCOME_POPUP;
  const blocks = normalizeBlocks(source.blocks, source);
  const blockOn = (type) => blocks.find((block) => block.type === type)?.enabled === true;
  const id = optionalText(source.id, 40) || `popup-${index + 1}`;
  return {
    id,
    name: text(source.name, `Template ${index + 1}`, 60),
    layout: HOME_POPUP_LAYOUTS.includes(source.layout) ? source.layout : defaults.layout,
    imageSide: source.imageSide === 'right' ? 'right' : 'left',
    corner: source.corner === 'sharp' || source.corner === 'round' ? source.corner : 'soft',
    headerColor: color(source.headerColor, defaults.headerColor),
    accentColor: color(source.accentColor, defaults.accentColor),
    cardColor: color(source.cardColor, defaults.cardColor),
    textColor: color(source.textColor, defaults.textColor),
    buttonTextColor: color(source.buttonTextColor, defaults.buttonTextColor),
    logoUrl: optionalText(source.logoUrl, 500),
    iconUrl: optionalText(source.iconUrl, 500),
    imageUrl: optionalText(source.imageUrl, 500),
    showHeader: source.showHeader !== false,
    showGift: blockOn('gift'),
    showEmail: blockOn('email'),
    showButton: blockOn('button'),
    buttonLink: optionalText(source.buttonLink, 300),
    delaySeconds: clamp(source.delaySeconds, 0, 120, 0),
    maxWidth: clamp(source.maxWidth, 280, 960, defaults.maxWidth),
    pages: normalizePopupPages(source.pages),
    dismissFor: ['visit', 'session', 'hour', 'twoHours', 'day', 'week'].includes(source.dismissFor)
      ? source.dismissFor
      : 'day',
    heading: text(source.heading, defaults.heading, 80),
    headingAr: optionalText(source.headingAr, 80),
    offerLead: text(source.offerLead, defaults.offerLead, 40),
    offerLeadAr: optionalText(source.offerLeadAr, 40),
    offerHighlight: text(source.offerHighlight, defaults.offerHighlight, 40),
    offerHighlightAr: optionalText(source.offerHighlightAr, 40),
    offerTail: text(source.offerTail, defaults.offerTail, 80),
    offerTailAr: optionalText(source.offerTailAr, 80),
    body: text(source.body, defaults.body, 280),
    bodyAr: optionalText(source.bodyAr, 280),
    emailPlaceholder: text(source.emailPlaceholder, defaults.emailPlaceholder, 60),
    emailPlaceholderAr: optionalText(source.emailPlaceholderAr, 60),
    buttonText: text(source.buttonText, defaults.buttonText, 40),
    buttonTextAr: optionalText(source.buttonTextAr, 40),
    successText: text(source.successText, defaults.successText, 160),
    successTextAr: optionalText(source.successTextAr, 160),
    couponCode: optionalText(source.couponCode, 40).toUpperCase(),
    couponLabel: text(source.couponLabel, defaults.couponLabel, 40),
    couponLabelAr: optionalText(source.couponLabelAr, 40),
    blocks,
    stats: normalizeStats(source.stats),
  };
}

export function createHomePopupTemplate(overrides = {}, index = 0) {
  return normalizeHomePopupTemplate({
    ...DEFAULT_HOME_WELCOME_POPUP,
    ...overrides,
    id: overrides.id || `popup-${Date.now().toString(36)}-${index}`,
    stats: { ...DEFAULT_POPUP_STATS },
  }, index);
}

export function normalizeHomeWelcomePopup(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const rawTemplates = Array.isArray(source.templates) && source.templates.length
    ? source.templates
    : [source];
  const seen = new Set();
  const templates = rawTemplates.slice(0, 12).map((template, index) => {
    const next = normalizeHomePopupTemplate(template, index);
    if (seen.has(next.id)) next.id = `${next.id}-${index + 1}`;
    seen.add(next.id);
    return next;
  });
  const activeTemplateId = templates.some((template) => template.id === source.activeTemplateId)
    ? source.activeTemplateId
    : templates[0].id;
  return {
    enabled: source.enabled === true,
    activeTemplateId,
    templates,
  };
}

export function getLiveHomePopup(value = {}) {
  const bundle = normalizeHomeWelcomePopup(value);
  const template = bundle.templates.find((item) => item.id === bundle.activeTemplateId) || bundle.templates[0];
  return { ...template, enabled: bundle.enabled };
}

export function mergeHomePopupStats(previous, next) {
  const saved = normalizeHomeWelcomePopup(previous);
  const savedById = new Map(saved.templates.map((template) => [template.id, template.stats]));
  return {
    ...next,
    templates: next.templates.map((template) => ({
      ...template,
      stats: savedById.get(template.id) || template.stats,
    })),
  };
}

export function sumHomePopupStats(templates = []) {
  return templates.reduce((total, template) => {
    const stats = template?.stats || DEFAULT_POPUP_STATS;
    total.views += Number(stats.views) || 0;
    total.emails += Number(stats.emails) || 0;
    total.copies += Number(stats.copies) || 0;
    total.clicks += Number(stats.clicks) || 0;
    return total;
  }, { views: 0, emails: 0, copies: 0, clicks: 0 });
}

export function homeWelcomePopupCopy(settings = {}, isArabic = false) {
  const popup = Array.isArray(settings?.templates)
    ? getLiveHomePopup(settings)
    : normalizeHomePopupTemplate(settings);
  const pick = (english, arabic) => (isArabic && arabic ? arabic : english);
  return {
    ...popup,
    heading: pick(popup.heading, popup.headingAr),
    offerLead: pick(popup.offerLead, popup.offerLeadAr),
    offerHighlight: pick(popup.offerHighlight, popup.offerHighlightAr),
    offerTail: pick(popup.offerTail, popup.offerTailAr),
    body: pick(popup.body, popup.bodyAr),
    emailPlaceholder: pick(popup.emailPlaceholder, popup.emailPlaceholderAr),
    buttonText: pick(popup.buttonText, popup.buttonTextAr),
    successText: pick(popup.successText, popup.successTextAr),
    couponLabel: pick(popup.couponLabel, popup.couponLabelAr),
  };
}

export function homePopupRadiusClass(corner = 'soft') {
  if (corner === 'sharp') return 'rounded-md';
  if (corner === 'round') return 'rounded-[28px]';
  return 'rounded-2xl';
}
