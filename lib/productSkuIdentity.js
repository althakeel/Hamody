import Product from '@/models/Product';

const COLOR_BY_CODE = {
  bk: 'Black',
  bl: 'Blue',
  wh: 'White',
  pk: 'Pink',
  og: 'Orange',
  rd: 'Red',
  gr: 'Green',
  gy: 'Grey',
  gl: 'Gold',
  gd: 'Gold',
  sv: 'Silver',
  sl: 'Silver',
  pp: 'Purple',
  pr: 'Purple',
  bg: 'Beige',
  cm: 'Camo',
  ti: 'Titanium',
  nv: 'Navy',
  yl: 'Yellow',
  br: 'Brown',
  nb: 'Navy',
};

export function escapeSkuRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeProductTitle(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&amp;/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSku(value = '') {
  return String(value || '').trim().toLowerCase();
}

export function colorLabelFromSku(sku = '') {
  const code = normalizeSku(sku).slice(-2);
  return COLOR_BY_CODE[code] || '';
}

export function productSkus(product) {
  const values = [product?.sku];
  for (const variant of Array.isArray(product?.variants) ? product.variants : []) {
    values.push(variant?.sku);
  }
  return values.map(normalizeSku).filter(Boolean);
}

function skuPattern(sku) {
  return new RegExp(`^${escapeSkuRegex(String(sku || '').trim())}$`, 'i');
}

export async function findStoreProductBySku(storeId, sku) {
  const normalized = String(sku || '').trim();
  if (!storeId || !normalized) return null;
  const pattern = skuPattern(normalized);
  const published = { published: { $ne: false } };

  let product = await Product.findOne({ storeId, sku: pattern, ...published }).lean();
  if (!product) {
    product = await Product.findOne({ storeId, 'variants.sku': pattern, ...published }).lean();
  }
  if (!product) {
    product = await Product.findOne({ storeId, sku: pattern }).lean();
  }
  if (!product) {
    product = await Product.findOne({ storeId, 'variants.sku': pattern }).lean();
  }
  if (!product) return null;

  const variantIndex = (Array.isArray(product.variants) ? product.variants : [])
    .findIndex((variant) => normalizeSku(variant?.sku) === normalizeSku(normalized));
  return { product, variantIndex };
}

export function buildColorVariant(product, label, imageSlot = 1) {
  const stock = Number(product?.stockQuantity) || 0;
  const price = Number(product?.price) || 0;
  const image = Array.isArray(product?.images) ? String(product.images[0] || '') : '';
  return {
    options: {
      title: `${product?.name || 'Product'} - ${label}`,
      color: label,
      imageSlot: String(imageSlot),
      image,
    },
    price,
    AED: Number(product?.AED) || price,
    stock,
    stockQuantity: stock,
    sku: String(product?.sku || '').trim(),
    inStock: stock > 0 && product?.inStock !== false,
  };
}

export function uniqueColorLabel(variants, sku) {
  const base = colorLabelFromSku(sku) || String(sku || '').trim() || 'Option';
  const used = new Set(
    (Array.isArray(variants) ? variants : [])
      .map((variant) => String(variant?.options?.color || '').trim().toLowerCase())
      .filter(Boolean),
  );
  if (!used.has(base.toLowerCase())) return base;
  const withSku = `${base} (${String(sku || '').trim()})`;
  if (!used.has(withSku.toLowerCase())) return withSku;
  return `${withSku} ${used.size + 1}`;
}

export async function attachColorVariant(product, source) {
  const sku = String(source?.sku || '').trim();
  if (!product?._id || !sku) return product;
  if (productSkus(product).includes(normalizeSku(sku))) return product;

  const variants = Array.isArray(product.variants) ? [...product.variants] : [];
  if (!variants.length && String(product.sku || '').trim()) {
    variants.push(buildColorVariant(product, uniqueColorLabel(variants, product.sku), variants.length + 1));
  }
  const label = uniqueColorLabel(variants, sku);
  variants.push(buildColorVariant(
    {
      ...product,
      sku,
      price: source.price ?? product.price,
      AED: source.AED ?? product.AED,
      stockQuantity: source.stockQuantity ?? 0,
      inStock: source.inStock,
      images: source.images?.length ? source.images : product.images,
      name: product.name,
    },
    label,
    variants.length + 1,
  ));

  const stockQuantity = variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
  const images = [...new Set([
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(source.images) ? source.images : []),
  ])].filter(Boolean).slice(0, 16);
  const categories = [...new Set([
    ...(Array.isArray(product.categories) ? product.categories : []),
    product.category,
    ...(Array.isArray(source.categories) ? source.categories : []),
    source.category,
  ].filter(Boolean).map(String))];

  await Product.findByIdAndUpdate(product._id, {
    $set: {
      hasVariants: true,
      variants,
      stockQuantity,
      inStock: stockQuantity > 0,
      images: images.length ? images : product.images,
      ...(categories.length ? { categories, category: product.category || categories[0] } : {}),
      published: product.published === false && source.published !== false ? true : product.published,
    },
  });

  return Product.findById(product._id).lean();
}
