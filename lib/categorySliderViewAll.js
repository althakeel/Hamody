import { toPublicCategoryPath } from '@/lib/categorySlug';
import { BOTTOM_NAV_PAGE_OPTIONS } from '@/lib/bottomNavLinkChoices';

export const CATEGORY_SLIDER_VIEW_ALL_TARGETS = ['default', 'category', 'landing', 'page', 'custom'];

const PAGE_PATHS = new Set(BOTTOM_NAV_PAGE_OPTIONS.map((page) => page.value));

function clip(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

export function normalizeCategorySliderViewAll(source = {}) {
  const target = CATEGORY_SLIDER_VIEW_ALL_TARGETS.includes(source?.viewAllTarget)
    ? source.viewAllTarget
    : 'default';
  let value = clip(source?.viewAllValue);
  if (target === 'default') value = '';
  if (target === 'page' && value && !PAGE_PATHS.has(value)) value = '';
  if (target === 'custom') value = safeCustomUrl(value);
  if (target === 'landing') {
    value = value.replace(/^\/c\//, '').replace(/^\//, '').replace(/\/$/, '');
  }
  if (target === 'category') value = value.replace(/^\/category\//, '').replace(/\/$/, '');
  return {
    viewAllEnabled: source?.viewAllEnabled === true || source?.viewAllEnabled === 'true',
    viewAllTarget: target,
    viewAllValue: value,
  };
}

function safeCustomUrl(value) {
  const raw = clip(value);
  if (!raw || /^(javascript|data|vbscript):/i.test(raw)) return '';
  if (raw.startsWith('/')) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return '';
}

export function categorySliderDefaultPath(slug) {
  const raw = String(slug || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)) return '';
  return `/slider/${raw}`;
}

export function resolveCategorySliderViewAllHref(slider = {}) {
  const viewAll = normalizeCategorySliderViewAll(slider);
  if (!viewAll.viewAllEnabled) return '';
  if (viewAll.viewAllTarget === 'default') {
    return categorySliderDefaultPath(slider.slug);
  }
  if (!viewAll.viewAllValue) return '';
  if (viewAll.viewAllTarget === 'category') return toPublicCategoryPath(viewAll.viewAllValue);
  if (viewAll.viewAllTarget === 'landing') {
    return viewAll.viewAllValue.startsWith('pages/')
      ? `/${viewAll.viewAllValue}`
      : `/c/${viewAll.viewAllValue}`;
  }
  if (viewAll.viewAllTarget === 'page') return viewAll.viewAllValue;
  return viewAll.viewAllValue;
}

export function serializeCategorySliderViewAll(slider = {}) {
  const viewAll = normalizeCategorySliderViewAll(slider);
  const slug = String(slider.slug || '').trim();
  return {
    slug,
    ...viewAll,
    pagePath: categorySliderDefaultPath(slug),
    viewAllHref: resolveCategorySliderViewAllHref({ ...slider, slug, ...viewAll }),
  };
}
