import Product from '@/models/Product';

function hexId(value = '') {
  const id = String(value || '').trim();
  return /^[a-fA-F0-9]{24}$/.test(id) ? id : '';
}

/**
 * Some imported products keep `_id` as a 24-character string.
 * Mongoose casts a normal `_id` query to ObjectId and misses those rows.
 */
export function ownedProductFilter(storeId, productId) {
  const id = hexId(productId);
  const storeKey = String(storeId || '').trim();
  if (!id || !storeKey) return null;
  return {
    storeId: storeKey,
    $expr: { $eq: [{ $toString: '$_id' }, id] },
  };
}

export async function findOwnedProduct(storeId, productId, select = '') {
  const filter = ownedProductFilter(storeId, productId);
  if (!filter) return null;
  const query = Product.findOne(filter);
  if (select) query.select(select);
  return query.lean();
}
