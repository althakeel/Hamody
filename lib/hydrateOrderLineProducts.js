import Product from '@/models/Product';
import { getOrderLineProduct } from '@/lib/orderDisplay';

export const ORDER_LINE_PRODUCT_SELECT = 'name slug images sku variants price salePrice';

function lineProductId(item = {}) {
  const raw = item?.productId;
  if (raw && typeof raw === 'object') {
    return String(raw._id || raw.id || '').trim();
  }
  return String(raw || '').trim();
}

function lineNeedsCatalog(item = {}) {
  const product = getOrderLineProduct(item);
  const hasSku = Boolean(String(product?.sku || item?.sku || '').trim())
    || (Array.isArray(product?.variants)
      && product.variants.some((variant) => String(variant?.sku || '').trim()));
  const hasName = Boolean(String(product?.name || item?.name || '').trim());
  return !hasSku || !hasName || !Array.isArray(product?.variants);
}

function attachProduct(item = {}, productById) {
  const id = lineProductId(item);
  const hydrated = productById.get(id);
  if (!hydrated) return item;

  const sku = String(item.sku || hydrated.sku || '').trim();
  const nextItem = sku && !item.sku ? { ...item, sku } : { ...item };

  if (typeof item.productId === 'object' && item.productId) {
    return { ...nextItem, productId: { ...item.productId, ...hydrated } };
  }
  return { ...nextItem, productId: hydrated };
}

/** Attach catalog name / SKU / variants onto order lines (pickup + export). */
export async function hydrateOrderLineProducts(orders = [], {
  select = ORDER_LINE_PRODUCT_SELECT,
} = {}) {
  const list = Array.isArray(orders) ? orders : [];
  if (!list.length) return list;

  const missingIds = new Set();
  for (const order of list) {
    for (const item of [...(order.orderItems || []), ...(Array.isArray(order.items) ? order.items : [])]) {
      if (!lineNeedsCatalog(item)) continue;
      const id = lineProductId(item);
      if (id) missingIds.add(id);
    }
  }

  if (!missingIds.size) return list;

  const products = await Product.find({ _id: { $in: [...missingIds] } })
    .select(select)
    .lean();
  const productById = new Map(products.map((product) => [String(product._id), product]));

  return list.map((order) => ({
    ...order,
    orderItems: (order.orderItems || []).map((item) => attachProduct(item, productById)),
    items: Array.isArray(order.items)
      ? order.items.map((item) => attachProduct(item, productById))
      : order.items,
  }));
}
