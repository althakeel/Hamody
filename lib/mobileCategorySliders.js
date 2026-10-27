import {
  buildCategoryAncestorChain,
  buildCategoryIdAliases,
  flattenCategoryList,
  normalizeCategoryParentIds,
  resolveCategoryHref,
} from '@/lib/categoryTreeUtils';

export const MIN_CATEGORY_SLIDER_ITEMS = 3;
export const MAX_CATEGORY_SLIDER_ITEMS = 12;
const MAX_CHILDREN = 40;

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 500) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return '';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
}

function cleanPath(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 500 || /^javascript:/i.test(raw)) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function cleanId(value) {
  const id = String(value || '').trim();
  return /^[a-fA-F0-9]{24}$/.test(id) ? id : '';
}

function newItemId() {
  return `cat-slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyCategorySliderItem(overrides = {}) {
  return {
    id: newItemId(),
    source: 'manual',
    categoryId: '',
    title: '',
    titleAr: '',
    image: '',
    path: '',
    ...overrides,
  };
}

function normalizeItem(item, index) {
  const source = item && typeof item === 'object' ? item : {};
  const mode = source.source === 'parent' ? 'parent' : 'manual';
  return {
    id: String(source.id || `cat-slide-${index + 1}`).trim().slice(0, 80),
    source: mode,
    categoryId: cleanId(source.categoryId),
    title: String(source.title || '').trim().slice(0, 80),
    titleAr: String(source.titleAr || '').trim().slice(0, 80),
    image: cleanUrl(source.image),
    path: cleanPath(source.path),
  };
}

export function defaultCategoryMobileSliders() {
  return {
    enabled: true,
    items: Array.from({ length: MIN_CATEGORY_SLIDER_ITEMS }, (_, index) => normalizeItem({
      id: `cat-slide-${index + 1}`,
      source: 'manual',
    }, index)),
  };
}

export function normalizeCategoryMobileSliders(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const base = defaultCategoryMobileSliders();
  const raw = Array.isArray(source.items) ? source.items : [];
  const items = raw
    .slice(0, MAX_CATEGORY_SLIDER_ITEMS)
    .map(normalizeItem);
  while (items.length < MIN_CATEGORY_SLIDER_ITEMS) {
    items.push(normalizeItem({ id: `cat-slide-${items.length + 1}` }, items.length));
  }
  return {
    enabled: source.enabled !== false,
    items,
  };
}

function categoryPath(categories, category) {
  if (!category) return '';
  const chain = buildCategoryAncestorChain(categories, category);
  if (!chain.length) return '';
  return resolveCategoryHref(chain.slice(0, -1), category);
}

function chipFromCategory(categories, category, source) {
  const title = String(category?.name || '').trim().slice(0, 80);
  const titleAr = String(category?.nameAr || '').trim().slice(0, 80);
  const image = cleanUrl(category?.image);
  const path = categoryPath(categories, category) || '/shop';
  if (!title && !image) return null;
  return {
    categoryId: String(category?._id || ''),
    title,
    ...(titleAr ? { titleAr } : {}),
    ...(image ? { image } : {}),
    path,
    source,
  };
}

/**
 * Chips the app draws. A parent choice becomes that category's direct children.
 * A manual choice uses the title, image, and path saved on the dashboard.
 */
function uniqueCategories(categories = []) {
  const aliases = buildCategoryIdAliases(categories);
  const seen = new Set();
  const unique = [];
  for (const category of flattenCategoryList(categories)) {
    const id = String(category?._id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(category);
  }
  return normalizeCategoryParentIds(unique, aliases);
}

export function expandCategoryMobileSliders(input = {}, categories = []) {
  const section = normalizeCategoryMobileSliders(input);
  if (!section.enabled) return { enabled: false, items: [] };

  const list = uniqueCategories(categories);
  const byId = new Map(list.map((category) => [String(category?._id || ''), category]));
  const chips = [];

  for (const item of section.items) {
    if (item.source === 'parent') {
      if (!item.categoryId) continue;
      const children = list
        .filter((category) => String(category?.parentId || '') === item.categoryId)
        .sort((first, second) => (Number(first?.sortOrder) || 0) - (Number(second?.sortOrder) || 0)
          || String(first?.name || '').localeCompare(String(second?.name || '')))
        .slice(0, MAX_CHILDREN);
      for (const child of children) {
        const chip = chipFromCategory(list, child, 'parent');
        if (chip) chips.push(chip);
      }
      continue;
    }

    const category = item.categoryId ? byId.get(item.categoryId) : null;
    const title = item.title || String(category?.name || '').trim().slice(0, 80);
    const titleAr = item.titleAr || String(category?.nameAr || '').trim().slice(0, 80);
    const image = item.image || cleanUrl(category?.image);
    const path = item.path || categoryPath(list, category) || '';
    if (!title && !image) continue;
    chips.push({
      ...(item.categoryId ? { categoryId: item.categoryId } : {}),
      title,
      ...(titleAr ? { titleAr } : {}),
      ...(image ? { image } : {}),
      path: path || '/shop',
      source: 'manual',
    });
  }

  return { enabled: chips.length > 0, items: chips };
}
