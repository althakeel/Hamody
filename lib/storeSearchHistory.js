export const STORE_SEARCH_QUERY_MAX = 80;
export const STORE_SEARCH_DEDUPE_MS = 5 * 60 * 1000;
export const MANUAL_SEARCH_SOURCES = ['navbar'];

export function isManualSearchSource(source = '') {
  return MANUAL_SEARCH_SOURCES.includes(String(source || '').trim().toLowerCase());
}

export function normalizeStoreSearchQuery(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, STORE_SEARCH_QUERY_MAX);
}

export function canRecordStoreSearchQuery(value = '') {
  const query = normalizeStoreSearchQuery(value);
  if (query.length < 2) return false;
  if (query.includes('@')) return false;
  if (/^\+?\d[\d\s-]{6,}$/.test(query)) return false;
  return true;
}

export function getSearchHistoryRangeStart(range = 'week') {
  const now = Date.now();
  if (range === 'today') return new Date(now - 24 * 60 * 60 * 1000);
  if (range === 'month') return new Date(now - 30 * 24 * 60 * 60 * 1000);
  if (range === 'quarter') return new Date(now - 90 * 24 * 60 * 60 * 1000);
  if (range === 'all') return null;
  return new Date(now - 7 * 24 * 60 * 60 * 1000);
}
