export function appendCatalogFilters(params, filters = {}, preset = {}) {
  const categories = Array.isArray(filters.categories) ? filters.categories.filter(Boolean) : [];
  if (categories.length) params.set('categories', categories.join(','));

  const min = filters.priceRange?.min;
  if (min !== '' && min != null && Number(min) > 0) {
    params.set('minPrice', String(min));
  }

  let max = filters.priceRange?.max;
  if (max === '' || max == null || Number(max) >= 100000) max = null;
  if (preset.maxPrice != null && Number(preset.maxPrice) < 100000) {
    max = max == null ? Number(preset.maxPrice) : Math.min(Number(max), Number(preset.maxPrice));
  }
  if (max != null && Number.isFinite(Number(max))) {
    params.set('maxPrice', String(max));
  }

  const rating = Math.max(Number(preset.minRating) || 0, Number(filters.rating) || 0);
  if (rating > 0) params.set('minRating', String(rating));
  if (filters.inStock) params.set('inStockOnly', 'true');
  else params.set('includeOutOfStock', 'true');
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (preset.badge) params.set('badge', preset.badge);
  if (preset.tag) params.set('tag', preset.tag);
  if (preset.ids?.length) params.set('ids', preset.ids.join(','));
}

export function readCatalogQuery(searchParams) {
  const categories = String(searchParams.get('categories') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    categories,
    minPrice: String(searchParams.get('minPrice') || '').trim(),
    maxPrice: String(searchParams.get('maxPrice') || '').trim(),
    minRating: Number(searchParams.get('minRating') || 0),
    inStockOnly: searchParams.get('inStockOnly') === 'true',
    sortBy: String(searchParams.get('sortBy') || searchParams.get('sort') || '').trim(),
  };
}

function categoryTokens(product) {
  const values = [
    product?.category,
    ...(Array.isArray(product?.categories) ? product.categories : []),
  ];
  return values.flatMap((value) => {
    if (!value) return [];
    if (typeof value === 'object') {
      return [value.name, value.nameAr, value.slug, value._id].filter(Boolean).map(String);
    }
    return [String(value)];
  });
}

export function productMatchesCatalogQuery(product, query) {
  if (!query) return true;
  if (query.inStockOnly && product?.inStock === false) return false;

  if (query.categories?.length) {
    const wanted = new Set(query.categories.map(String));
    if (!categoryTokens(product).some((token) => wanted.has(token))) return false;
  }

  const price = Number(product?.price) || Number(product?.AED) || 0;
  const min = Number(query.minPrice);
  const max = Number(query.maxPrice);
  if (query.minPrice !== '' && Number.isFinite(min) && price < min) return false;
  if (query.maxPrice !== '' && Number.isFinite(max) && price > max) return false;
  if (query.minRating > 0 && (Number(product?.averageRating) || 0) < query.minRating) return false;
  return true;
}

export function sortCatalogProducts(products, sortBy) {
  const sorted = [...(products || [])];
  switch (sortBy) {
    case 'price-low-high':
    case 'priceLowToHigh':
      return sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    case 'price-high-low':
    case 'priceHighToLow':
      return sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    case 'rating':
      return sorted.sort((a, b) => (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0));
    case 'discount':
      return sorted.sort((a, b) => {
        const discount = (product) => (
          product.AED > product.price ? ((product.AED - product.price) / product.AED) * 100 : 0
        );
        return discount(b) - discount(a);
      });
    default:
      return sorted;
  }
}
