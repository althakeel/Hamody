import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import UrlRedirect from '@/models/UrlRedirect';
import { buildCategoryAncestorChain, resolveCategoryHref } from '@/lib/categoryTreeUtils';

export const BATH_BODY_FROM = '/category/bath-body';
export const BATH_BODY_TO = '/category/beauty-personal-care';

const CACHE_TTL_MS = 15000;
const BLOCKED_PATHS = new Set(['/', '/shop', '/store', '/product', '/products', '/category', '/brand']);

let cache = { at: 0, map: null };

export function invalidateUrlRedirectCache() {
  cache = { at: 0, map: null };
}

export function normalizeRedirectPath(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutHost = raw.replace(/^https?:\/\/[^/]+/i, '');
  const pathOnly = withoutHost.split('?')[0].split('#')[0];
  if (!pathOnly) return '';
  const withSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const collapsed = withSlash.replace(/\/{2,}/g, '/');
  const trimmed = collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
  return trimmed.toLowerCase();
}

export function assertEditableRedirectPath(value = '') {
  const path = normalizeRedirectPath(value);
  if (!path || path.length < 2) {
    throw new Error('Enter a path such as /category/old-name.');
  }
  if (BLOCKED_PATHS.has(path) || path.startsWith('/store') || path.startsWith('/api') || path.startsWith('/_next')) {
    throw new Error('That path cannot be redirected.');
  }
  return path;
}

function categoryPublicPaths(category, allCategories) {
  const slug = String(category?.slug || '').trim().toLowerCase();
  const chain = buildCategoryAncestorChain(allCategories, category);
  const fullPath = chain.length ? resolveCategoryHref(chain) : '';
  const leafPath = slug ? `/category/${slug}` : '';
  return [...new Set([fullPath, leafPath].map((path) => normalizeRedirectPath(path)).filter(Boolean))];
}

function nearestSurvivingCategory(category, allCategories, skipIds) {
  const byId = new Map(allCategories.map((item) => [String(item._id), item]));
  let parentId = String(category?.parentId || '').trim();
  const guard = new Set();
  while (parentId && !guard.has(parentId)) {
    guard.add(parentId);
    if (!skipIds.has(parentId)) {
      return byId.get(parentId) || null;
    }
    parentId = String(byId.get(parentId)?.parentId || '').trim();
  }
  return null;
}

async function upsertRedirectRow({
  fromPath,
  toPath = '',
  statusCode = 301,
  source = 'manual',
  note = '',
  overwriteManual = false,
}) {
  const normalizedFrom = normalizeRedirectPath(fromPath);
  if (!normalizedFrom || BLOCKED_PATHS.has(normalizedFrom)) return null;
  const code = Number(statusCode) === 410 ? 410 : 301;
  const normalizedTo = code === 410 ? '' : normalizeRedirectPath(toPath);
  if (code === 301 && (!normalizedTo || normalizedTo === normalizedFrom)) return null;

  const existing = await UrlRedirect.findOne({ fromPath: normalizedFrom }).select('source').lean();
  if (existing && (existing.source === 'manual' || existing.source === 'seed') && !overwriteManual) {
    return existing;
  }

  await UrlRedirect.updateOne(
    { fromPath: normalizedFrom },
    {
      $set: {
        fromPath: normalizedFrom,
        toPath: normalizedTo,
        statusCode: code,
        source,
        note: String(note || '').slice(0, 240),
      },
    },
    { upsert: true },
  );
  return { fromPath: normalizedFrom, toPath: normalizedTo, statusCode: code };
}

async function ensureBuiltinRedirects() {
  await UrlRedirect.updateOne(
    { fromPath: BATH_BODY_FROM },
    {
      $setOnInsert: {
        fromPath: BATH_BODY_FROM,
        toPath: BATH_BODY_TO,
        statusCode: 301,
        source: 'seed',
        note: 'Retired Bath & Body. Sends visitors to Beauty & Personal Care.',
      },
    },
    { upsert: true },
  );
}

export async function getUrlRedirectMap() {
  if (cache.map && Date.now() - cache.at < CACHE_TTL_MS) return cache.map;
  await connectDB();
  await ensureBuiltinRedirects();
  const rows = await UrlRedirect.find({}).select('fromPath toPath statusCode').lean();
  const map = new Map();
  for (const row of rows) {
    const fromPath = normalizeRedirectPath(row.fromPath);
    if (!fromPath) continue;
    const statusCode = Number(row.statusCode) === 410 ? 410 : 301;
    const toPath = normalizeRedirectPath(row.toPath);
    if (statusCode === 301 && (!toPath || toPath === fromPath)) continue;
    map.set(fromPath, { statusCode, toPath });
  }
  cache = { at: Date.now(), map };
  return map;
}

export async function resolveRuntimeUrlRedirect(pathname = '') {
  try {
    const fromPath = normalizeRedirectPath(pathname);
    if (
      !fromPath
      || fromPath.startsWith('/api')
      || fromPath.startsWith('/store')
      || fromPath.startsWith('/_next')
    ) {
      return null;
    }
    const map = await getUrlRedirectMap();
    return map.get(fromPath) || null;
  } catch (error) {
    console.error('[url-redirects]', error?.message || error);
    return null;
  }
}

export async function redirectRetiredCategories(categories = [], deletedIds = new Set(), allCategories = null) {
  const list = Array.isArray(categories) ? categories.filter(Boolean) : [];
  if (!list.length) return;
  await connectDB();
  const catalog = allCategories || await Category.find({}).select('_id slug parentId name url').lean();
  const skipIds = deletedIds instanceof Set
    ? deletedIds
    : new Set((deletedIds || []).map((id) => String(id)));

  for (const category of list) {
    skipIds.add(String(category._id));
    const parent = nearestSurvivingCategory(category, catalog, skipIds);
    const toPath = parent
      ? resolveCategoryHref(buildCategoryAncestorChain(catalog, parent))
      : '/shop';
    const note = `Retired category ${category.name || category.slug || ''}`.trim();
    for (const fromPath of categoryPublicPaths(category, catalog)) {
      await upsertRedirectRow({
        fromPath,
        toPath,
        statusCode: 301,
        source: 'category',
        note,
      });
    }
  }
  invalidateUrlRedirectCache();
}

export async function redirectRetiredCategory(category) {
  if (!category?._id && !category?.slug) return;
  await redirectRetiredCategories([category], new Set([String(category._id || '')]));
}

function productPaths(slug = '') {
  const normalized = String(slug || '').trim().toLowerCase().replace(/^\/+/, '').replace(/^(product|products)\//, '');
  if (!normalized) return [];
  return [`/product/${normalized}`, `/products/${normalized}`];
}

export async function recordProductReplacement(oldSlug, newSlug) {
  const paths = productPaths(oldSlug);
  const nextSlug = String(newSlug || '').trim().toLowerCase().replace(/^\/+/, '').replace(/^(product|products)\//, '');
  if (!paths.length || !nextSlug) return;
  await connectDB();
  const toPath = `/product/${nextSlug}`;
  for (const fromPath of paths) {
    await upsertRedirectRow({
      fromPath,
      toPath,
      statusCode: 301,
      source: 'product',
      note: `Product slug changed to ${nextSlug}`,
    });
  }
  invalidateUrlRedirectCache();
}

export async function recordProductsGone(slugs = [], note = 'Product discontinued') {
  const unique = [...new Set(slugs.map((slug) => String(slug || '').trim()).filter(Boolean))];
  if (!unique.length) return;
  await connectDB();
  for (const slug of unique) {
    for (const fromPath of productPaths(slug)) {
      const existing = await UrlRedirect.findOne({ fromPath }).select('source statusCode toPath').lean();
      if (existing?.source === 'manual' && Number(existing.statusCode) === 301 && existing.toPath) {
        continue;
      }
      if (existing?.source === 'seed') continue;
      await upsertRedirectRow({
        fromPath,
        toPath: '',
        statusCode: 410,
        source: 'product',
        note,
        overwriteManual: existing?.source === 'manual' && Number(existing.statusCode) === 410,
      });
    }
  }
  invalidateUrlRedirectCache();
}

export async function recordProductGone(slug, note = 'Product discontinued') {
  await recordProductsGone([slug], note);
}

export async function clearProductGone(slug) {
  const paths = productPaths(slug);
  if (!paths.length) return;
  await connectDB();
  await UrlRedirect.deleteMany({
    fromPath: { $in: paths },
    statusCode: 410,
    source: 'product',
  });
  invalidateUrlRedirectCache();
}

export function serializeUrlRedirect(row) {
  return {
    id: String(row._id),
    fromPath: row.fromPath,
    toPath: row.toPath || '',
    statusCode: Number(row.statusCode) === 410 ? 410 : 301,
    source: row.source || 'manual',
    note: row.note || '',
    updatedAt: row.updatedAt || null,
  };
}

export async function listUrlRedirects() {
  await connectDB();
  await ensureBuiltinRedirects();
  invalidateUrlRedirectCache();
  const rows = await UrlRedirect.find({}).sort({ fromPath: 1 }).lean();
  return rows.map(serializeUrlRedirect);
}

export async function saveManualUrlRedirect({ id = '', fromPath, toPath = '', statusCode = 301, note = '' } = {}) {
  await connectDB();
  const normalizedFrom = assertEditableRedirectPath(fromPath);
  const code = Number(statusCode) === 410 ? 410 : 301;
  const normalizedTo = code === 410 ? '' : assertEditableRedirectPath(toPath);
  if (code === 301 && normalizedTo === normalizedFrom) {
    throw new Error('The new path must be different from the old path.');
  }

  const duplicate = await UrlRedirect.findOne({
    fromPath: normalizedFrom,
    ...(id ? { _id: { $ne: id } } : {}),
  }).select('_id').lean();
  if (duplicate) {
    throw new Error('A redirect for that old path already exists.');
  }

  const payload = {
    fromPath: normalizedFrom,
    toPath: normalizedTo,
    statusCode: code,
    source: 'manual',
    note: String(note || '').trim().slice(0, 240),
  };

  const saved = id
    ? await UrlRedirect.findByIdAndUpdate(id, payload, { new: true }).lean()
    : await UrlRedirect.findOneAndUpdate(
      { fromPath: normalizedFrom },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

  if (!saved) {
    throw new Error('Redirect not found.');
  }
  invalidateUrlRedirectCache();
  return serializeUrlRedirect(saved);
}

export async function deleteUrlRedirect(id) {
  await connectDB();
  const existing = await UrlRedirect.findById(id).lean();
  if (!existing) {
    throw new Error('Redirect not found.');
  }
  if (existing.fromPath === BATH_BODY_FROM) {
    throw new Error('The Bath & Body redirect is required. Edit the destination instead of deleting it.');
  }
  await UrlRedirect.findByIdAndDelete(id);
  invalidateUrlRedirectCache();
}
