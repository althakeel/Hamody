export function escapeRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Trim and normalize user search input (strip common SKU prefixes). */
export function normalizeSearchKeyword(value = '') {
  return String(value || '')
    .trim()
    .replace(/^(sku|item|product|code|#)\s*[:#]?\s*/i, '')
    .replace(/\s+/g, ' ');
}

/** Match SKUs even when dashes/spaces differ (WH-1000 vs WH1000). */
export function buildFlexibleSkuRegex(value = '') {
  const compact = String(value || '').replace(/[\s\-_./#]/g, '');
  if (!compact || compact.length < 2) return null;

  const alnum = compact.replace(/[^a-z0-9]/gi, '');
  if (alnum.length < 2) return null;

  const pattern = alnum
    .split('')
    .map((ch) => escapeRegex(ch))
    .join('[\\s\\-_.#/]*');

  return new RegExp(pattern, 'i');
}

/**
 * Title-focused matchers only.
 * Do not search description / SEO / tags — those pull unrelated products
 * whose displayed title does not match what the shopper typed.
 */
function buildSearchFieldMatchers(term = '') {
  const normalized = String(term || '').trim();
  if (!normalized) return [];

  const termRegex = new RegExp(escapeRegex(normalized), 'i');
  const skuFlexible = buildFlexibleSkuRegex(normalized);

  const matchers = [
    { name: termRegex },
    { nameAr: termRegex },
    { sku: termRegex },
    { slug: termRegex },
    { brand: termRegex },
    { brandAr: termRegex },
    { 'variants.sku': termRegex },
    { 'variants.name': termRegex },
    { 'variants.title': termRegex },
  ];

  if (skuFlexible) {
    matchers.push(
      { sku: skuFlexible },
      { 'variants.sku': skuFlexible },
    );
  }

  return matchers;
}

function applySearchStockAndPublish(filter, { includeOutOfStock = false } = {}) {
  if (!includeOutOfStock) {
    filter.inStock = true;
  }
  filter.published = { $ne: false };
  return filter;
}

export function significantSearchWords(keyword = '') {
  return normalizeSearchKeyword(keyword)
    .split(/\s+/)
    .map((word) => word.replace(/^['"]+|['"]+$/g, '').trim())
    .filter((word) => word.length > 1 || /\d/.test(word));
}

function escapePhraseWord(word = '') {
  return String(word || '')
    .split('-')
    .map((part) => escapeRegex(part).replace(/'/g, "['’]?"))
    .join('[\\s\\-]*');
}

/** Ordered words in one title field. "Women's Multi-Color Sneakers" stays one phrase. */
export function buildOrderedPhraseRegex(keyword = '') {
  const words = significantSearchWords(keyword);
  if (!words.length) return null;
  return new RegExp(words.map(escapePhraseWord).join('[\\s\\-\'’._]+'), 'i');
}

function buildWordFieldMatchers(term = '') {
  const normalized = String(term || '').trim();
  if (!normalized) return [];
  const wordRegex = new RegExp(escapeRegex(normalized), 'i');
  return [
    ...buildSearchFieldMatchers(normalized),
    ...buildCatalogFieldMatchers(normalized),
    { shortDescription: wordRegex },
    { shortDescriptionAr: wordRegex },
  ];
}

/** Every meaningful word must appear somewhere on the product. Filler words are skipped. */
function buildRequiredWordAndClause(keyword = '') {
  const distinctive = distinctiveSearchWords(keyword);
  const words = distinctive.length ? distinctive : significantSearchWords(keyword);
  if (words.length < 2) return null;
  return {
    $and: words.map((word) => ({ $or: buildWordFieldMatchers(word) })),
  };
}

export function isMultiWordSearch(keyword = '') {
  return normalizeSearchKeyword(keyword).split(/\s+/).filter(Boolean).length >= 2;
}

const GENERIC_BROWSE_WORDS = new Set([
  'accessories', 'accessory', 'items', 'item', 'products', 'product',
  'stuff', 'gear', 'parts', 'gadgets', 'gadget', 'and', 'for', 'the',
  'with',
]);

export function distinctiveSearchWords(keyword = '') {
  return significantSearchWords(keyword)
    .filter((word) => !GENERIC_BROWSE_WORDS.has(word.toLowerCase()));
}

/** Short shopper queries like "car accessories" — browse name, words, categories, tags. */
export function isBrowseStyleSearch(keyword = '') {
  const words = normalizeSearchKeyword(keyword).split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 3;
}

function buildCatalogFieldMatchers(term = '') {
  const normalized = String(term || '').trim();
  if (!normalized) return [];
  const termRegex = new RegExp(escapeRegex(normalized), 'i');
  return [
    { name: termRegex },
    { nameAr: termRegex },
    { brand: termRegex },
    { brandAr: termRegex },
    { sku: termRegex },
    { slug: termRegex },
    { seoTitle: termRegex },
    { seoH1: termRegex },
    { seoH1Ar: termRegex },
    { seoDescription: termRegex },
    { seoKeywords: termRegex },
    { tags: termRegex },
    { category: termRegex },
    { categories: termRegex },
    { description: termRegex },
    { descriptionAr: termRegex },
    { shortDescription: termRegex },
    { shortDescriptionAr: termRegex },
    { shortDescription2: termRegex },
    { 'variants.name': termRegex },
    { 'variants.title': termRegex },
    { 'variants.sku': termRegex },
  ];
}

export function buildCategoryNameSearch(keyword = '') {
  const terms = [
    normalizeSearchKeyword(keyword),
    ...distinctiveSearchWords(keyword),
  ].filter((term, index, list) => term && list.indexOf(term) === index);

  if (!terms.length) return null;
  return {
    $or: terms.flatMap((term) => {
      const termRegex = new RegExp(escapeRegex(term), 'i');
      return [
        { name: termRegex },
        { nameAr: termRegex },
        { slug: termRegex },
      ];
    }),
  };
}

/** Name + each word + tags + categories. Used for "car accessories" / "computer accessories". */
export function buildProductBrowseSearchFilter(keyword, {
  includeOutOfStock = false,
  categoryIds = [],
} = {}) {
  const normalized = normalizeSearchKeyword(keyword);
  if (!normalized) return null;

  const phraseRegex = buildOrderedPhraseRegex(normalized);
  const words = significantSearchWords(normalized);
  const distinctive = distinctiveSearchWords(normalized);
  const strategies = [];

  if (phraseRegex) {
    strategies.push({
      $or: [
        { name: phraseRegex },
        { nameAr: phraseRegex },
        { seoTitle: phraseRegex },
        { tags: phraseRegex },
        { category: phraseRegex },
        { categories: phraseRegex },
        { seoKeywords: phraseRegex },
      ],
    });
  }

  for (const word of (distinctive.length ? distinctive : words)) {
    strategies.push({ $or: buildWordFieldMatchers(word) });
  }

  if (words.length <= 1) {
    strategies.push({ $or: buildSearchFieldMatchers(normalized) });
  }

  const ids = [...new Set(
    (Array.isArray(categoryIds) ? categoryIds : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )];
  if (ids.length) {
    strategies.push({
      $or: [
        { category: { $in: ids } },
        { categories: { $in: ids } },
      ],
    });
  }

  const filter = strategies.length === 1
    ? strategies[0]
    : { $or: strategies };

  return applySearchStockAndPublish(filter, { includeOutOfStock });
}

/** Full-sentence match only — does not OR individual words across different fields. */
export function buildProductPhraseSearchFilter(keyword, { includeOutOfStock = false } = {}) {
  const phraseRegex = buildOrderedPhraseRegex(keyword);
  if (!phraseRegex) return null;

  return applySearchStockAndPublish({
    $or: [
      { name: phraseRegex },
      { nameAr: phraseRegex },
      { seoTitle: phraseRegex },
      { 'variants.name': phraseRegex },
      { 'variants.title': phraseRegex },
    ],
  }, { includeOutOfStock });
}

export function buildProductSearchFilter(keyword, { includeOutOfStock = false } = {}) {
  const normalized = normalizeSearchKeyword(keyword);
  if (!normalized) return null;

  const phraseRegex = buildOrderedPhraseRegex(normalized);
  const words = normalized.split(' ').filter(Boolean);
  const strategies = [];

  if (phraseRegex) {
    strategies.push({
      $or: [
        { name: phraseRegex },
        { nameAr: phraseRegex },
        { seoTitle: phraseRegex },
        { 'variants.name': phraseRegex },
        { 'variants.title': phraseRegex },
      ],
    });
  }

  const requiredWords = distinctiveSearchWords(normalized);
  const matchWords = requiredWords.length ? requiredWords : words;
  if (matchWords.length <= 1) {
    strategies.push({ $or: buildWordFieldMatchers(matchWords[0] || normalized) });
  } else {
    const wordAnd = buildRequiredWordAndClause(normalized);
    if (wordAnd) strategies.push(wordAnd);
  }

  const filter = strategies.length === 1
    ? strategies[0]
    : { $or: strategies };

  return applySearchStockAndPublish(filter, { includeOutOfStock });
}

/** Merge category slug/id/name matches into an existing search filter. */
export function mergeCategorySearchIntoFilter(filter, categoryValues = []) {
  const values = [...new Set(
    (Array.isArray(categoryValues) ? categoryValues : [])
      .map((value) => (value != null ? String(value).trim() : ''))
      .filter(Boolean),
  )];

  if (!values.length || !filter) return filter;

  const categoryClause = {
    $or: [
      { category: { $in: values } },
      { categories: { $in: values } },
    ],
  };

  if (filter.$or && Array.isArray(filter.$or)) {
    return { ...filter, $or: [...filter.$or, categoryClause] };
  }

  return { $or: [filter, categoryClause] };
}

export const PRODUCT_SEARCH_SELECT_FIELDS =
  '_id name nameAr slug images price mrp AED category categories tags inStock sku brand brandAr seoTitle variants stockQuantity fastDelivery imageBadgeIds createdAt';

/** True when the product title / brand / SKU actually contains the keyword. */
export function productTitleMatchesKeyword(product = {}, keyword = '') {
  const normalized = normalizeSearchKeyword(keyword).toLowerCase();
  if (!normalized) return false;

  const title = [product.name, product.nameAr]
    .map((value) => String(value || '').toLowerCase())
    .filter(Boolean)
    .join(' ');
  const haystack = [
    title,
    product.brand,
    product.brandAr,
    product.sku,
    product.slug,
    ...(Array.isArray(product.variants)
      ? product.variants.flatMap((variant) => [variant?.sku, variant?.name, variant?.title])
      : []),
  ]
    .map((value) => String(value || '').toLowerCase())
    .filter(Boolean)
    .join(' ');

  if (!haystack) return false;

  const catalog = [
    haystack,
    ...(Array.isArray(product.tags) ? product.tags : [product.tags]),
    product.category,
    ...(Array.isArray(product.categories) ? product.categories : []),
    ...(Array.isArray(product.seoKeywords) ? product.seoKeywords : []),
    product.seoTitle,
    product.seoH1,
    product.seoH1Ar,
    product.seoDescription,
    product.description,
    product.descriptionAr,
    product.shortDescription,
    product.shortDescriptionAr,
    product.shortDescription2,
  ]
    .map((value) => String(value || '').toLowerCase())
    .filter(Boolean)
    .join(' ');

  const phraseRegex = buildOrderedPhraseRegex(normalized);
  if (phraseRegex && title && phraseRegex.test(title)) return true;
  if (phraseRegex && catalog && phraseRegex.test(catalog)) return true;
  if (title.includes(normalized) || haystack.includes(normalized) || catalog.includes(normalized)) return true;

  if (isBrowseStyleSearch(normalized)) {
    const words = distinctiveSearchWords(normalized);
    const pool = `${title} ${catalog}`.trim();
    return Boolean(pool && words.length && words.every((word) => pool.includes(word.toLowerCase())));
  }

  if (isMultiWordSearch(normalized)) {
    const distinctive = distinctiveSearchWords(normalized);
    const required = distinctive.length ? distinctive : significantSearchWords(normalized);
    const pool = `${title} ${haystack} ${catalog}`.trim();
    return Boolean(pool && required.length > 1 && required.every((word) => pool.includes(word.toLowerCase())));
  }

  return catalog.includes(normalized) || haystack.includes(normalized);
}

/** Prefer products whose English/Arabic title starts with or contains the phrase. */
export function rankProductsByTitleMatch(products = [], keyword = '') {
  const normalized = normalizeSearchKeyword(keyword).toLowerCase();
  if (!normalized || !Array.isArray(products) || !products.length) return products;

  const words = normalized.split(' ').filter(Boolean);

  const score = (product) => {
    const name = String(product?.name || '').toLowerCase();
    const nameAr = String(product?.nameAr || '').toLowerCase();
    const brand = String(product?.brand || '').toLowerCase();
    const brandAr = String(product?.brandAr || '').toLowerCase();
    const sku = String(product?.sku || '').toLowerCase();
    const title = `${name} ${nameAr}`.trim();
    const catalog = [
      ...(Array.isArray(product?.tags) ? product.tags : []),
      product?.category,
      ...(Array.isArray(product?.categories) ? product.categories : []),
    ].map((value) => String(value || '').toLowerCase()).join(' ');

    if (name === normalized || nameAr === normalized || sku === normalized) return 0;
    if (name.startsWith(normalized) || nameAr.startsWith(normalized)) return 1;
    if (name.includes(normalized) || nameAr.includes(normalized)) return 2;
    if (words.length > 1 && (buildOrderedPhraseRegex(normalized)?.test(title))) return 3;
    if (catalog.includes(normalized) || (buildOrderedPhraseRegex(normalized)?.test(catalog))) return 4;
    if (words.length > 1 && words.every((word) => title.includes(word))) return 5;
    if (brand === normalized || brandAr === normalized || brand.startsWith(normalized)) return 6;
    if (sku.includes(normalized) || brand.includes(normalized) || catalog.includes(words[0] || '')) return 7;
    return 8;
  };

  return [...products].sort((left, right) => {
    const delta = score(left) - score(right);
    if (delta !== 0) return delta;
    return String(left?.name || '').localeCompare(String(right?.name || ''), undefined, { sensitivity: 'base' });
  });
}

export function mapSearchProduct(product) {
  return {
    _id: product._id,
    slug: product.slug,
    name: product.name,
    nameAr: product.nameAr || '',
    sku: product.sku || '',
    brand: product.brand || '',
    image: product.images?.[0] || '',
    images: product.images || [],
    price: product.price,
    mrp: product.mrp,
    AED: product.AED,
    category: product.category,
    categories: product.categories,
    inStock: product.inStock !== false,
    tags: product.tags || [],
    variants: product.variants || [],
    imageBadgeIds: Array.isArray(product.imageBadgeIds) ? product.imageBadgeIds : [],
  };
}
