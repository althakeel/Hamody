import {
  resolveOrderLineItemId,
  resolveOrderLineName,
  resolveOrderLinePackQuantity,
  resolveOrderLinePrice,
  resolveOrderLineProduct,
} from '@/lib/gtmEcommerceHelpers';

export function getMetaOrderEventId(orderId) {
  return String(orderId || '').trim();
}

export function getMetaPurchaseDedupeKey(orderId) {
  const eventId = getMetaOrderEventId(orderId);
  return eventId ? `meta:Purchase:v2:${eventId}` : '';
}

/** Standard Purchase params Meta uses for conversion value (value + currency are required). */
export function toMetaPurchaseCustomData({
  value,
  currency = 'AED',
  contents = [],
  orderId = '',
} = {}) {
  const amount = Number(value);
  const numericValue = Number.isFinite(amount) && amount > 0
    ? Number(amount.toFixed(2))
    : 0;
  const currencyCode = String(currency || 'AED').trim().toUpperCase() || 'AED';

  const safeContents = (Array.isArray(contents) ? contents : [])
    .map((entry) => {
      const id = String(entry?.id || '').trim();
      if (!id) return null;
      const quantity = Number(entry.quantity);
      const itemPrice = Number(entry.item_price);
      return {
        id,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        item_price: Number.isFinite(itemPrice) && itemPrice >= 0
          ? Number(itemPrice.toFixed(2))
          : 0,
      };
    })
    .filter(Boolean);

  const data = {
    value: numericValue,
    currency: currencyCode,
    content_type: 'product',
    content_ids: safeContents.map((entry) => entry.id),
    contents: safeContents,
    num_items: safeContents.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
  };

  const id = String(orderId || '').trim();
  if (id) data.order_id = id;
  return data;
}

export function buildMetaPurchaseItems(orderItems = [], order = null) {
  return (Array.isArray(orderItems) ? orderItems : [])
    .map((item, index) => {
      if (!item) return null;

      const product = resolveOrderLineProduct(item);
      const id = resolveOrderLineItemId(item, index, product);
      const quantity = resolveOrderLinePackQuantity(item, product, order);
      const itemPrice = resolveOrderLinePrice(item);

      if (!id || quantity <= 0) return null;

      return {
        id,
        quantity,
        item_price: itemPrice,
        item_name: resolveOrderLineName(item, product),
      };
    })
    .filter(Boolean);
}
