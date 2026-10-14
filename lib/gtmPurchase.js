import { GTM_EVENTS } from '@/lib/gtmEvents';
import { pushGtmEcommerceEvent } from '@/lib/pushGtmEcommerceEvent';
import { getMetaOrderEventId } from '@/lib/metaPurchase';
import { orderItemsToGtmItems, resolveCustomerOrderValue, resolveOrderLineItems, resolvePurchaseTransactionId } from '@/lib/gtmEcommerceHelpers';
import {
  GA4_CURRENCY,
  resolveGa4Tax,
  sumGa4ItemsValue,
  toGa4PaymentType,
} from '@/lib/ga4Item';
import { hasTrackedPersistently, markTrackedPersistently } from '@/lib/trackingDedupe';

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

/** Spread coupon and wallet discounts across items so item revenue matches the charge. */
export function alignGa4ItemsToChargedGoods(items = [], goodsCharged = 0) {
  const rows = (Array.isArray(items) ? items : []).map((item) => {
    const next = { ...item };
    delete next.discount;
    next.price = money(item?.price);
    next.quantity = Math.max(1, Number(item?.quantity) || 1);
    return next;
  });
  const gross = money(rows.reduce((sum, item) => sum + (item.price * item.quantity), 0));
  const target = money(goodsCharged);
  const discountTotal = money(gross - target);
  if (!(gross > 0) || discountTotal <= 0) return rows;

  let allocated = 0;
  return rows.map((item, index) => {
    const line = item.price * item.quantity;
    const share = index === rows.length - 1
      ? money(discountTotal - allocated)
      : money((discountTotal * line) / gross);
    allocated = money(allocated + share);
    const perUnit = item.quantity > 0 ? share / item.quantity : 0;
    const discount = money(Math.min(item.price, perUnit));
    return discount > 0 ? { ...item, discount } : item;
  });
}

/**
 * Push GTM `purchase` to dataLayer from a confirmed order (not cart).
 * Deduped by transaction_id in localStorage so refresh does not fire again.
 */
export function fireGtmPurchase(order) {
  if (typeof window === 'undefined') return false;

  const orderId = String(order?._id || order?.id || '').trim();
  if (!orderId) return false;

  const items = orderItemsToGtmItems(resolveOrderLineItems(order), order);
  const transactionId = resolvePurchaseTransactionId(order) || orderId;
  const persistKey = `ga4:purchase:${orderId}`;
  if (hasTrackedPersistently(persistKey) || hasTrackedPersistently(`ga4:purchase:${transactionId}`)) {
    return false;
  }

  const metaEventId = getMetaOrderEventId(orderId);
  const coupon = String(order.coupon?.code || order.couponCode || '').trim();
  const paymentType = toGa4PaymentType(order.paymentMethod);
  const shippingRaw = Number(order.shippingFee ?? order.shipping ?? 0);
  const shipping = Number.isFinite(shippingRaw) && shippingRaw > 0 ? money(shippingRaw) : 0;
  const itemsValue = items.length ? sumGa4ItemsValue(items) : 0;
  const orderTotal = resolveCustomerOrderValue(order);
  const value = orderTotal > 0 ? orderTotal : itemsValue;
  // A zero-value purchase is stored as "no purchase revenue" and then blocked
  // from retry. Wait until the charged total is known.
  if (!(value > 0)) return false;

  const tax = resolveGa4Tax(order);
  const chargedGoods = money(Math.max(0, value - shipping));
  const pricedItems = alignGa4ItemsToChargedGoods(items, chargedGoods).map((item) => (
    coupon ? { ...item, coupon } : item
  ));

  const ok = pushGtmEcommerceEvent(GTM_EVENTS.PURCHASE, {
    transaction_id: transactionId,
    value: money(value),
    currency: GA4_CURRENCY,
    shipping,
    ...(tax > 0 ? { tax } : {}),
    coupon,
    payment_type: paymentType,
    items: pricedItems,
  }, null, {
    event_id: metaEventId,
    meta_browser_purchase: 'handled',
    skip_meta_purchase: true,
  });

  if (ok) {
    markTrackedPersistently(persistKey);
    markTrackedPersistently(`ga4:purchase:${transactionId}`);
  }
  return ok;
}

export function hasGa4PurchaseTracked(order = {}) {
  const orderId = String(order?._id || order?.id || '').trim();
  const transactionId = resolvePurchaseTransactionId(order) || orderId;
  if (orderId && hasTrackedPersistently(`ga4:purchase:${orderId}`)) return true;
  if (transactionId && hasTrackedPersistently(`ga4:purchase:${transactionId}`)) return true;
  return false;
}
