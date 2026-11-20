import { GA4_MEASUREMENT_ID } from '@/lib/gtm';
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

export function sanitizeGa4Items(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const itemId = String(item.item_id || '').trim();
      if (!itemId) return null;
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      const next = {
        ...item,
        item_id: itemId,
        item_name: String(item.item_name || 'Product').trim() || 'Product',
        price: Number.isFinite(price) ? Number(price.toFixed(2)) : 0,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      };
      const discount = Number(next.discount);
      if (Number.isFinite(discount) && discount > 0) {
        next.discount = Number(Math.min(next.price, discount).toFixed(2));
      } else {
        delete next.discount;
      }
      return next;
    })
    .filter(Boolean);
}

function amountFromItems(items = []) {
  const total = sanitizeGa4Items(items).reduce((sum, item) => (
    sum + (Number(item.price || 0) * Number(item.quantity || 1))
  ), 0);
  return Number.isFinite(total) ? Number(total.toFixed(2)) : 0;
}

/** Flat parameters the GA4 event tag reads from eventModel. */
export function buildGa4EventModel(ecommerce = {}) {
  const items = sanitizeGa4Items(ecommerce.items);
  const currency = String(ecommerce.currency || 'AED').trim().toUpperCase() || 'AED';
  const amount = Number(ecommerce.value);
  const model = { currency, items };
  if (Number.isFinite(amount)) model.value = Number(amount.toFixed(2));

  const transactionId = String(ecommerce.transaction_id || '').trim();
  if (transactionId) model.transaction_id = transactionId;

  ['shipping', 'tax'].forEach((key) => {
    const numeric = Number(ecommerce[key]);
    if (Number.isFinite(numeric) && numeric > 0) model[key] = Number(numeric.toFixed(2));
  });

  ['coupon', 'payment_type', 'shipping_tier', 'item_list_id', 'item_list_name'].forEach((key) => {
    const text = String(ecommerce[key] || '').trim();
    if (text) model[key] = text;
  });

  return model;
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

function sendHamodyGa4Event(event, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function' || !event) return;
  window.gtag('event', event, {
    ...params,
    send_to: GA4_MEASUREMENT_ID,
  });
}

export function pushGtmEcommerceEvent(event, ecommerce = {}, dedupeKey = null, extras = {}) {
  if (typeof window === 'undefined' || !event) return false;
  if (dedupeKey && hasTrackedOnce(dedupeKey)) return false;

  const split = splitGa4EcommercePayload(ecommerce, extras);
  const priced = withEventAmount({
    ...split.ecommerce,
    items: sanitizeGa4Items(split.ecommerce.items),
  });
  const amount = Number(priced.value);
  const currency = priced.currency || 'AED';
  const eventModel = buildGa4EventModel({
    ...priced,
    value: Number.isFinite(amount) ? amount : priced.value,
    currency,
  });
  pushToDataLayer({ ecommerce: null });
  pushToDataLayer({
    event,
    ecommerce: priced,
    // GA4 reads the flat event fields. Value and transaction_id must be
    // here, not only nested under ecommerce, or purchase revenue is blank.
    eventModel,
    ...split.extras,
    ...(Number.isFinite(eventModel.value) ? { value: eventModel.value } : {}),
    currency: eventModel.currency,
    ...(eventModel.transaction_id ? { transaction_id: eventModel.transaction_id } : {}),
  });
  sendHamodyGa4Event(event, eventModel);

  if (dedupeKey) {
    markTrackedOnce(dedupeKey);
  }

  return true;
}

export function pushGtmEvent(event, params = {}, dedupeKey = null) {
  if (typeof window === 'undefined' || !event) return false;
  if (dedupeKey && hasTrackedOnce(dedupeKey)) return false;

  pushToDataLayer({ event, ...params });
  sendHamodyGa4Event(event, params);

  if (dedupeKey) {
    markTrackedOnce(dedupeKey);
  }

  return true;
}
