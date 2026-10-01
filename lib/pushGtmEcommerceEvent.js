import { hasTrackedOnce, markTrackedOnce } from '@/lib/trackingDedupe';
import { productToGa4Item } from '@/lib/ga4Item';

export function toGtmItem(item, overrides = {}) {
  return productToGa4Item(item, overrides);
}

const TOP_LEVEL_KEYS = new Set([
  'event_id',
  'eventID',
  'meta_browser_purchase',
  'skip_meta_purchase',
  'order_id',
  'page_path',
  'page_location',
]);

function definedEntries(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ''),
  );
}

function amountFromItems(items = []) {
  const total = (Array.isArray(items) ? items : []).reduce((sum, item) => (
    sum + (Number(item?.price || 0) * Number(item?.quantity || 1))
  ), 0);
  return Number.isFinite(total) ? Number(total.toFixed(2)) : 0;
}

/** Google Ads and Meta tags read value/currency on the event, not only inside ecommerce. */
function withEventAmount(ecommerce = {}) {
  const next = { ...ecommerce };
  const direct = Number(next.value);
  const fromItems = amountFromItems(next.items);
  const amount = Number.isFinite(direct) && direct > 0
    ? Number(direct.toFixed(2))
    : fromItems;
  if (Number.isFinite(amount) && amount >= 0 && (amount > 0 || Number.isFinite(direct))) {
    next.value = amount;
  }
  if (!next.currency) next.currency = 'AED';
  return next;
}

export function splitGa4EcommercePayload(ecommerce = {}, extras = {}) {
  const clean = {};
  const top = { ...extras };
  Object.entries(ecommerce || {}).forEach(([key, value]) => {
    if (TOP_LEVEL_KEYS.has(key)) {
      if (top[key] == null) top[key] = value;
      return;
    }
    clean[key] = value;
  });
  return { ecommerce: clean, extras: definedEntries(top) };
}

function pushToDataLayer(payload) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export function pushGtmEcommerceEvent(event, ecommerce = {}, dedupeKey = null, extras = {}) {
  if (typeof window === 'undefined' || !event) return false;
  if (dedupeKey && hasTrackedOnce(dedupeKey)) return false;

  const split = splitGa4EcommercePayload(ecommerce, extras);
  const priced = withEventAmount(split.ecommerce);
  const amount = Number(priced.value);
  const currency = priced.currency || 'AED';
  pushToDataLayer({ ecommerce: null });
  pushToDataLayer({
    event,
    ecommerce: priced,
    ...split.extras,
    ...(Number.isFinite(amount) ? { value: amount, currency } : {}),
  });

  if (dedupeKey) {
    markTrackedOnce(dedupeKey);
  }

  return true;
}

export function pushGtmEvent(event, params = {}, dedupeKey = null) {
  if (typeof window === 'undefined' || !event) return false;
  if (dedupeKey && hasTrackedOnce(dedupeKey)) return false;

  pushToDataLayer({ event, ...params });

  if (dedupeKey) {
    markTrackedOnce(dedupeKey);
  }

  return true;
}
