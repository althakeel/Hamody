import { escapeRegex } from '@/lib/productSearch';

export function parseSkuList(value) {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '');
  return [...new Set(
    raw
      .split(/[\n,;]+/)
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  )];
}

export async function findStoreProductsBySkus(Product, storeId, skus) {
  const list = parseSkuList(skus);
  if (!list.length) {
    return { products: [], missing: [], productIds: [] };
  }

  const regexes = list.map((sku) => new RegExp(`^${escapeRegex(sku)}$`, 'i'));
  const found = await Product.find({
    storeId: String(storeId || '').trim(),
    $or: [
      { sku: { $in: regexes } },
      { 'variants.sku': { $in: regexes } },
    ],
  })
    .select('_id name sku variants.sku')
    .limit(500)
    .lean();

  const bySku = new Map();
  found.forEach((product) => {
    const main = String(product.sku || '').trim().toLowerCase();
    if (main) bySku.set(main, product);
    (Array.isArray(product.variants) ? product.variants : []).forEach((variant) => {
      const variantSku = String(variant?.sku || '').trim().toLowerCase();
      if (variantSku && !bySku.has(variantSku)) {
        bySku.set(variantSku, product);
      }
    });
  });

  const products = [];
  const seen = new Set();
  const missing = [];
  list.forEach((sku) => {
    const match = bySku.get(sku.toLowerCase());
    if (!match) {
      missing.push(sku);
      return;
    }
    const id = String(match._id);
    if (seen.has(id)) return;
    seen.add(id);
    products.push({
      id,
      _id: id,
      name: String(match.name || ''),
      sku: String(match.sku || sku),
    });
  });

  return {
    products,
    missing,
    productIds: products.map((product) => product.id),
  };
}

export async function assignProductSkus(Product, storeId, productIds = [], skuList = []) {
  const ids = [...new Set((Array.isArray(productIds) ? productIds : []).map((id) => String(id || '').trim()).filter(Boolean))];
  const skus = parseSkuList(skuList);
  if (!ids.length || !skus.length) return 0;

  if (skus.length !== 1 && skus.length !== ids.length) {
    const error = new Error('SKU list must have one SKU, or one SKU per product in the same order.');
    error.statusCode = 400;
    throw error;
  }

  await Promise.all(ids.map((productId, index) => {
    const nextSku = skus.length === 1 ? skus[0] : skus[index];
    return Product.updateOne(
      { _id: productId },
      { $set: { sku: nextSku } },
    );
  }));

  return ids.length;
}
