export function collectProductCategoryIds(product = {}) {
  const ids = new Set();

  if (product?.category) {
    ids.add(String(product.category));
  }

  if (Array.isArray(product?.categories)) {
    product.categories.forEach((categoryId) => {
      if (categoryId) ids.add(String(categoryId));
    });
  }

  return ids;
}

/** Products tagged directly on each category ID (no children). */
export function buildCategoryProductCounts(products = []) {
  const counts = {};

  products.forEach((product) => {
    collectProductCategoryIds(product).forEach((categoryId) => {
      counts[categoryId] = (counts[categoryId] || 0) + 1;
    });
  });

  return counts;
}

export function collectCategoryBranchIds(categories = [], rootId = '') {
  const childrenByParent = new Map();
  for (const category of categories) {
    const id = String(category?._id || '').trim();
    const parentId = String(category?.parentId || '').trim();
    if (!id || !parentId) continue;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(id);
  }
  return collectDescendantIds(childrenByParent, rootId);
}

function collectDescendantIds(childrenByParent, rootId) {
  const root = String(rootId || '').trim();
  if (!root) return [];

  const ids = [root];
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    const children = childrenByParent.get(current) || [];
    for (const childId of children) {
      if (ids.includes(childId)) continue;
      ids.push(childId);
      queue.push(childId);
    }
  }
  return ids;
}

/**
 * Counts like the storefront: products tagged on this category OR any subcategory.
 * Matches /category/... and /shop category expansion.
 */
export function buildInclusiveCategoryProductCounts(products = [], categories = []) {
  const childrenByParent = new Map();
  const allIds = [];

  for (const category of categories) {
    const id = String(category?._id || '').trim();
    if (!id) continue;
    allIds.push(id);
    const parentId = String(category?.parentId || '').trim();
    if (!parentId) continue;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(id);
  }

  const descendantSets = new Map();
  for (const id of allIds) {
    descendantSets.set(id, new Set(collectDescendantIds(childrenByParent, id)));
  }

  const counts = {};
  for (const id of allIds) counts[id] = 0;

  for (const product of products) {
    const productCats = collectProductCategoryIds(product);
    if (!productCats.size) continue;

    for (const [categoryId, descSet] of descendantSets.entries()) {
      let hit = false;
      for (const productCatId of productCats) {
        if (descSet.has(productCatId)) {
          hit = true;
          break;
        }
      }
      if (hit) counts[categoryId] += 1;
    }
  }

  return counts;
}

/**
 * Distinct published SKUs on a category or any subcategory.
 * Matches the category page "N products available" count.
 */
export function buildInclusiveDistinctSkuCounts(products = [], categories = []) {
  const parentById = new Map();
  const allIds = [];

  for (const category of categories) {
    const id = String(category?._id || '').trim();
    if (!id) continue;
    allIds.push(id);
    parentById.set(id, String(category?.parentId || '').trim());
  }

  const skuSets = new Map(allIds.map((id) => [id, new Set()]));

  for (const product of products) {
    const skuKey = String(product?.__skuDedupeKey || '').trim();
    if (!skuKey) continue;
    for (const startId of collectProductCategoryIds(product)) {
      let current = startId;
      const seen = new Set();
      while (current && skuSets.has(current) && !seen.has(current)) {
        seen.add(current);
        skuSets.get(current).add(skuKey);
        current = parentById.get(current) || '';
      }
    }
  }

  const counts = {};
  for (const id of allIds) counts[id] = skuSets.get(id)?.size || 0;
  return counts;
}

export function categoryProductCount(counts, categoryId) {
  return Number(counts?.[String(categoryId || '')] || 0);
}

/** Missing productCount stays visible so older payloads and the seller dashboard do not go blank. */
export function isStockedCategory(category) {
  if (category?.productCount == null) return true;
  return Number(category.productCount) > 0;
}
