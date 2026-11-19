/**
 * Deduped public storefront GETs so Navbar / TopBar / Showcase / Footer
 * do not hammer the same endpoints on first paint.
 */

const inflight = new Map();
const memory = new Map();

const DEFAULT_TTL_MS = 60_000;

function memoryGet(key) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.data;
}

function memorySet(key, data, ttlMs = DEFAULT_TTL_MS) {
  memory.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export async function fetchStorefrontJson(url, {
  ttlMs = DEFAULT_TTL_MS,
  cache = 'force-cache',
  signal,
  headers,
} = {}) {
  const key = String(url || '').split('?')[0];
  if (!key) throw new Error('url required');

  const cached = memoryGet(key);
  if (cached != null) return cached;

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const request = fetch(url, {
    cache,
    signal,
    headers: headers || undefined,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      memorySet(key, data, ttlMs);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

export function fetchStoreSettings(options) {
  return fetchStorefrontJson('/api/store/settings', { ...options, cache: 'default' });
}

export function fetchNavbarMenu(options) {
  return fetchStorefrontJson('/api/store/navbar-menu', { ...options, cache: 'no-store' });
}

export function fetchAppearanceSectionsPublic(options) {
  return fetchStorefrontJson('/api/store/appearance/sections/public', {
    ...options,
    cache: 'default',
  });
}

export function fetchCategories(options) {
  return fetchStorefrontJson('/api/categories', { ...options, cache: 'default', ttlMs: 120_000 });
}

export function fetchPublicShopShowcase(options) {
  return fetchStorefrontJson('/api/public/shop-showcase', {
    ...options,
    cache: 'default',
    ttlMs: 60_000,
  });
}

export function invalidateStorefrontPublicCache(pathname) {
  if (!pathname) {
    memory.clear();
    return;
  }
  memory.delete(String(pathname).split('?')[0]);
}
