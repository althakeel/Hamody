import { toPublicCategoryPath, slugifyCategory } from '@/lib/categorySlug';
import { BOTTOM_NAV_PAGE_OPTIONS } from '@/lib/bottomNavLinkChoices';

function brandPagePath(slug = '') {
  const safe = slugifyCategory(slug);
  return safe ? `/brand/${safe}` : '/brand';
}

export const CATEGORY_SLIDER_SIDE_IMAGE_LINK_TARGETS = [
  'category',
  'brand',
  'landing',
  'page',
  'custom',
];

const PAGE_PATHS = new Set(BOTTOM_NAV_PAGE_OPTIONS.map((page) => page.value));

function clip(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function safeCustomUrl(value) {
  const raw = clip(value);
  if (!raw || /^(javascript|data|vbscript):/i.test(raw)) return '';
  if (raw.startsWith('/')) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return '';
}

export function normalizeCategorySliderSideImageLink(source = {}) {
  const target = CATEGORY_SLIDER_SIDE_IMAGE_LINK_TARGETS.includes(source?.sideImageLinkTarget)
    ? source.sideImageLinkTarget
    : 'category';
  let value = clip(source?.sideImageLinkValue);
  if (target === 'page' && value && !PAGE_PATHS.has(value)) value = '';
  if (target === 'custom') value = safeCustomUrl(value);
  if (target === 'landing') {
    value = value.replace(/^\/c\//, '').replace(/^\//, '').replace(/\/$/, '');
  }
  if (target === 'category') value = value.replace(/^\/category\//, '').replace(/\/$/, '');
  if (target === 'brand') {
    value = value.replace(/^\/brand\//, '').replace(/\/$/, '');
    value = slugifyCategory(value) || value;
  }
  return {
    sideImageLinkEnabled: source?.sideImageLinkEnabled === true || source?.sideImageLinkEnabled === 'true',
    sideImageLinkTarget: target,
    sideImageLinkValue: value,
  };
}

export function resolveCategorySliderSideImageHref(slider = {}) {
  const link = normalizeCategorySliderSideImageLink(slider);
  if (!link.sideImageLinkEnabled || !link.sideImageLinkValue) return '';
  if (link.sideImageLinkTarget === 'category') return toPublicCategoryPath(link.sideImageLinkValue);
  if (link.sideImageLinkTarget === 'brand') return brandPagePath(link.sideImageLinkValue);
  if (link.sideImageLinkTarget === 'landing') {
    return link.sideImageLinkValue.startsWith('pages/')
      ? `/${link.sideImageLinkValue}`
      : `/c/${link.sideImageLinkValue}`;
  }
  if (link.sideImageLinkTarget === 'page') return link.sideImageLinkValue;
  return link.sideImageLinkValue;
}

export function serializeCategorySliderSideImageLink(slider = {}) {
  const link = normalizeCategorySliderSideImageLink(slider);
  return {
    ...link,
    sideImageHref: resolveCategorySliderSideImageHref({ ...slider, ...link }),
  };
}
