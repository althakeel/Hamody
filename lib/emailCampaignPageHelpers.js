import { getCustomerSiteUrl } from '@/lib/appUrl';

export const EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS = 500;
export const EMAIL_CAMPAIGN_BANNER_MAX_WIDTH = 1400;
export const EMAIL_CAMPAIGN_BANNER_DEVICES = ['desktop', 'tablet', 'mobile'];
export const DEFAULT_CAMPAIGN_PAGE_DESIGN = {
  titleAlignment: 'left',
  titleSize: 'medium',
  titleColor: '#0f172a',
  gridColumns: 4,
  tabletGridColumns: 3,
  mobileGridColumns: 2,
  gridGap: 12,
};
export const MAX_CAMPAIGN_PAGE_SECTIONS = 12;
export const MAX_CAMPAIGN_BANNER_SLIDES = 12;
export const CAMPAIGN_PAGE_SECTION_TYPES = [
  'bannerSlider',
  'productGrid',
  'textBlock',
  'image',
  'button',
  'video',
  'spacer',
];

export const EMPTY_CAMPAIGN_PAGE_BANNERS = {
  desktop: { en: '', ar: '' },
  tablet: { en: '', ar: '' },
  mobile: { en: '', ar: '' },
};

function cleanBannerUrl(value = '') {
  return String(value || '').trim();
}

function safeCampaignMediaUrl(value = '') {
  const url = cleanBannerUrl(value);
  if (url.startsWith('/') && !url.startsWith('//')) return url.slice(0, 2048);
  if (/^https?:\/\//i.test(url)) return url.slice(0, 2048);
  return '';
}

export function normalizeCampaignPageBanners(raw = {}, fallbackHero = '') {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const next = {
    desktop: {
      en: cleanBannerUrl(source.desktop?.en || source.desktopEn || fallbackHero),
      ar: cleanBannerUrl(source.desktop?.ar || source.desktopAr),
    },
    tablet: {
      en: cleanBannerUrl(source.tablet?.en || source.tabletEn),
      ar: cleanBannerUrl(source.tablet?.ar || source.tabletAr),
    },
    mobile: {
      en: cleanBannerUrl(source.mobile?.en || source.mobileEn),
      ar: cleanBannerUrl(source.mobile?.ar || source.mobileAr),
    },
  };
  if (!next.desktop.en && fallbackHero) next.desktop.en = cleanBannerUrl(fallbackHero);
  return next;
}

export function campaignPageHasBanner(banners = {}, heroImage = '') {
  const normalized = normalizeCampaignPageBanners(banners, heroImage);
  return EMAIL_CAMPAIGN_BANNER_DEVICES.some((device) => (
    normalized[device].en || normalized[device].ar
  ));
}

export function normalizeCampaignPageDesign(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const alignment = ['left', 'center', 'right'].includes(raw.titleAlignment)
    ? raw.titleAlignment
    : DEFAULT_CAMPAIGN_PAGE_DESIGN.titleAlignment;
  const titleSize = ['small', 'medium', 'large'].includes(raw.titleSize)
    ? raw.titleSize
    : DEFAULT_CAMPAIGN_PAGE_DESIGN.titleSize;
  const titleColor = /^#[0-9a-f]{6}$/i.test(String(raw.titleColor || ''))
    ? String(raw.titleColor)
    : DEFAULT_CAMPAIGN_PAGE_DESIGN.titleColor;
  const gridColumns = Number(raw.gridColumns);
  const tabletGridColumns = Number(raw.tabletGridColumns);
  const mobileGridColumns = Number(raw.mobileGridColumns);
  const gridGap = Number(raw.gridGap);
  return {
    titleAlignment: alignment,
    titleSize,
    titleColor,
    gridColumns: Number.isInteger(gridColumns) ? Math.min(6, Math.max(2, gridColumns)) : DEFAULT_CAMPAIGN_PAGE_DESIGN.gridColumns,
    tabletGridColumns: Number.isInteger(tabletGridColumns) ? Math.min(6, Math.max(1, tabletGridColumns)) : DEFAULT_CAMPAIGN_PAGE_DESIGN.tabletGridColumns,
    mobileGridColumns: Number.isInteger(mobileGridColumns) ? Math.min(3, Math.max(1, mobileGridColumns)) : DEFAULT_CAMPAIGN_PAGE_DESIGN.mobileGridColumns,
    gridGap: [8, 12, 16, 24].includes(gridGap) ? gridGap : DEFAULT_CAMPAIGN_PAGE_DESIGN.gridGap,
  };
}

function normalizeCampaignSectionStyle(raw = {}) {
  const style = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const color = (value, fallback = '') => /^#[0-9a-f]{6}$/i.test(String(value || ''))
    ? String(value)
    : fallback;
  const alignment = ['left', 'center', 'right'].includes(style.alignment) ? style.alignment : 'left';
  const padding = Number(style.padding);
  const contentWidth = ['narrow', 'normal', 'wide', 'full'].includes(style.contentWidth)
    ? style.contentWidth
    : 'full';
  return {
    backgroundColor: color(style.backgroundColor),
    textColor: color(style.textColor),
    alignment,
    padding: [0, 8, 16, 24, 32, 48].includes(padding) ? padding : 0,
    contentWidth,
  };
}

function normalizeCampaignButtonUrl(value = '') {
  const url = String(value || '').trim();
  if ((url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url)) return url.slice(0, 2048);
  return '';
}

function normalizeCampaignVideoUrl(value = '') {
  const rawUrl = String(value || '').trim();
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const id = url.searchParams.get('v')
        || url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1]
        || '';
      return /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean).pop() || '';
      return /^\d{1,15}$/.test(id) ? `https://player.vimeo.com/video/${id}` : '';
    }
  } catch {
    return '';
  }
  return '';
}

export function normalizeCampaignPageSections(raw) {
  if (!Array.isArray(raw)) return null;
  return raw.slice(0, MAX_CAMPAIGN_PAGE_SECTIONS).flatMap((section, index) => {
    if (!section || typeof section !== 'object') return [];
    const type = CAMPAIGN_PAGE_SECTION_TYPES.includes(section.type) ? section.type : '';
    if (!type) return [];
    const id = String(section.id || `section-${index + 1}`).trim().slice(0, 80);
    const style = normalizeCampaignSectionStyle(section.style);
    if (type === 'bannerSlider') {
      const slides = (Array.isArray(section.slides) ? section.slides : [])
        .slice(0, MAX_CAMPAIGN_BANNER_SLIDES)
        .flatMap((slide, slideIndex) => {
          if (!slide || typeof slide !== 'object') return [];
          const imageUrl = safeCampaignMediaUrl(slide.imageUrl);
          if (!imageUrl) return [];
          return [{
            id: String(slide.id || `${id}-slide-${slideIndex + 1}`).trim().slice(0, 80),
            imageUrl,
            linkUrl: safeCampaignMediaUrl(slide.linkUrl),
            alt: String(slide.alt || '').trim().slice(0, 200),
          }];
        });
      return [{ id, type, style, slides }];
    }
    if (type === 'productGrid') {
      const normalizeColumns = (value, fallback, min = 1, max = 6) => {
        const numeric = Number(value);
        return Number.isInteger(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
      };
      return [{
        id,
        type,
        style,
        title: String(section.title || '').trim().slice(0, 120),
        productIds: normalizeCampaignPageProductIds(section.productIds),
        gridColumns: normalizeColumns(section.gridColumns, 4, 2),
        tabletGridColumns: normalizeColumns(section.tabletGridColumns, 3),
        mobileGridColumns: normalizeColumns(section.mobileGridColumns, 2, 1, 3),
        gridGap: [8, 12, 16, 24].includes(Number(section.gridGap)) ? Number(section.gridGap) : 12,
      }];
    }
    if (type === 'textBlock') {
      return [{
        id,
        type,
        style,
        heading: String(section.heading || '').trim().slice(0, 160),
        content: String(section.content || '').slice(0, 10000),
        textSize: ['small', 'medium', 'large'].includes(section.textSize) ? section.textSize : 'medium',
      }];
    }
    if (type === 'image') {
      const imageUrl = safeCampaignMediaUrl(section.imageUrl);
      return [{
        id,
        type,
        style,
        imageUrl,
        linkUrl: normalizeCampaignButtonUrl(section.linkUrl),
        alt: String(section.alt || '').trim().slice(0, 200),
        imageFit: section.imageFit === 'contain' ? 'contain' : 'cover',
      }];
    }
    if (type === 'button') {
      const label = String(section.label || '').trim().slice(0, 120);
      const url = normalizeCampaignButtonUrl(section.url);
      return [{
        id,
        type,
        style,
        label,
        url,
        variant: section.variant === 'outline' ? 'outline' : 'solid',
        size: ['small', 'large'].includes(section.size) ? section.size : 'medium',
      }];
    }
    if (type === 'video') {
      const videoUrl = normalizeCampaignVideoUrl(section.videoUrl);
      return [{
        id,
        type,
        style,
        videoUrl,
        caption: String(section.caption || '').trim().slice(0, 300),
      }];
    }
    const height = Number(section.height);
    return [{
      id,
      type,
      style,
      height: [16, 24, 32, 48, 64, 96, 128].includes(height) ? height : 48,
    }];
  });
}

export function getCampaignPageSectionProductIds(sections = []) {
  return normalizeCampaignPageProductIds(
    (Array.isArray(sections) ? sections : [])
      .filter((section) => section?.type === 'productGrid')
      .flatMap((section) => Array.isArray(section.productIds) ? section.productIds : []),
  );
}

export function resolveCampaignPageBannerSources(page = {}, language = 'en') {
  const banners = normalizeCampaignPageBanners(page.banners, page.heroImage);
  const preferAr = String(language || '').toLowerCase().startsWith('ar');
  const pick = (device) => {
    const slot = banners[device] || {};
    if (preferAr) return slot.ar || slot.en || '';
    return slot.en || slot.ar || '';
  };
  const desktop = pick('desktop');
  const tablet = pick('tablet');
  const mobile = pick('mobile');
  return {
    desktop,
    tablet,
    mobile,
    fallback: mobile || tablet || desktop || cleanBannerUrl(page.heroImage),
  };
}

function looksLikeObjectId(value = '') {
  return /^[a-f0-9]{24}$/i.test(String(value || '').trim());
}

export function slugifyCampaignPageTitle(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'campaign';
}

export async function ensureUniqueCampaignPageSlug(Model, storeId, desiredSlug, excludeId = null) {
  const base = slugifyCampaignPageTitle(desiredSlug);
  let slug = base;
  let attempt = 1;
  while (attempt < 50) {
    const filter = { storeId, slug };
    if (excludeId && looksLikeObjectId(excludeId)) {
      filter._id = { $ne: excludeId };
    }
    // eslint-disable-next-line no-await-in-loop
    const exists = await Model.exists(filter);
    if (!exists) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function normalizeCampaignPageProductIds(ids = []) {
  return Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    ),
  ).slice(0, EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS);
}

export function campaignPagePublicPath(slug = '', urlPrefix = 'c') {
  const clean = slugifyCampaignPageTitle(slug);
  const prefix = urlPrefix === 'pages' ? 'pages' : 'c';
  return `/${prefix}/${clean}`;
}

export function campaignPageAbsoluteUrl(slug = '', urlPrefix = 'c') {
  const base = getCustomerSiteUrl().replace(/\/$/, '');
  return `${base}${campaignPagePublicPath(slug, urlPrefix)}`;
}

export function toStoreCampaignPage(doc = {}) {
  const id = String(doc._id || doc.id || '');
  const slug = String(doc.slug || '').trim();
  const urlPrefix = doc.urlPrefix === 'pages' ? 'pages' : 'c';
  const productIds = normalizeCampaignPageProductIds(doc.productIds);
  return {
    id,
    _id: id,
    title: String(doc.title || ''),
    titleAr: String(doc.titleAr || ''),
    slug,
    urlPrefix,
    design: normalizeCampaignPageDesign(doc.design),
    sections: normalizeCampaignPageSections(doc.sections),
    subtitle: String(doc.subtitle || ''),
    subtitleAr: String(doc.subtitleAr || ''),
    heroImage: String(doc.heroImage || ''),
    banners: normalizeCampaignPageBanners(doc.banners, doc.heroImage),
    productIds,
    productCount: productIds.length,
    ctaLabel: String(doc.ctaLabel || ''),
    ctaUrl: String(doc.ctaUrl || ''),
    backgroundColor: String(doc.backgroundColor || '#f8fafc'),
    accentColor: String(doc.accentColor || '#0f766e'),
    status: doc.status === 'published' ? 'published' : 'draft',
    publishedAt: doc.publishedAt || null,
    seoTitle: String(doc.seoTitle || ''),
    seoDescription: String(doc.seoDescription || ''),
    publicPath: campaignPagePublicPath(slug, urlPrefix),
    publicUrl: campaignPageAbsoluteUrl(slug, urlPrefix),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

/** Keep as plain string — mongoose casts ObjectId fields on query/save. */
export function resolveStoreObjectId(storeId) {
  return String(storeId || '').trim();
}
