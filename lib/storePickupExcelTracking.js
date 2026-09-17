import { getDisplayOrderNumber } from './orderDisplay.js';
import { getEmxTrackingNumber } from './waslahTracking.js';

/** Store order number for the pickup sheet (never Mongo _id). */
export function getPickupOrderId(order = {}) {
  return getDisplayOrderNumber(order);
}

/**
 * Courier Reference on the pickup sheet is the EMX barcode (1000…).
 * Waslah 62… platform numbers are not the carrier AWB — leave blank until
 * Waslah assigns the EMX number (often a few minutes after send).
 */
export function resolvePickupTracking(order = {}) {
  return String(getEmxTrackingNumber(order) || '').trim();
}

export function ordersMissingEmxAwb(orders = []) {
  return (Array.isArray(orders) ? orders : []).filter((order) => {
    if (resolvePickupTracking(order)) return false;
    return Boolean(String(order?.waslah?.orderId || '').trim());
  });
}

/** Merge live Waslah/EMX patches onto the in-memory pickup orders. */
export function applyWaslahTrackingPatches(orders = [], patches = []) {
  const byId = new Map();
  for (const patch of Array.isArray(patches) ? patches : []) {
    const id = String(patch?._id || '').trim();
    if (id) byId.set(id, patch);
  }
  if (!byId.size) return Array.isArray(orders) ? orders : [];

  return (Array.isArray(orders) ? orders : []).map((order) => {
    const patch = byId.get(String(order?._id || ''));
    if (!patch) return order;
    return {
      ...order,
      trackingId: patch.trackingId ?? order.trackingId,
      trackingUrl: patch.trackingUrl ?? order.trackingUrl,
      courier: patch.courier ?? order.courier,
      waslah: {
        ...(order.waslah || {}),
        ...(patch.waslah || {}),
      },
    };
  });
}
