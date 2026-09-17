import { parseAutofillJson } from './productAiAutofill.js';
import {
  buildProductSearchFilter,
  escapeRegex,
  mapSearchProduct,
  PRODUCT_SEARCH_SELECT_FIELDS,
  rankProductsByTitleMatch,
} from './productSearch.js';
import { STOREFRONT_PUBLISHED_FILTER } from './productVisibility.js';

const GEMINI_MODELS = [
  process.env.GEMINI_PRODUCT_VISION_MODEL,
  process.env.GEMINI_PRODUCT_AUTOFILL_MODEL,
  'gemini-2.5-flash',
  'gemini-flash-latest',
].filter(Boolean).filter((model, index, list) => list.indexOf(model) === index);

const STOP_WORDS = new Set([
  'img', 'image', 'photo', 'picture', 'screenshot', 'download', 'file', 'upload',
  'the', 'and', 'for', 'with',
]);

export const GENERIC_IMAGE_TERMS = new Set([
  'phone', 'holder', 'mount', 'stand', 'charger', 'wireless', 'magnetic',
  'product', 'accessory', 'electronics', 'gadget', 'black', 'white',
  'folding', 'foldable', 'portable', 'compact', 'aluminum', 'adult', 'kids',
  'handle', 'table', 'basket', 'ladder',
]);

const DESK_HINTS = ['desk', 'table', 'desktop', 'puck', 'magsafe', 'mag safe', 'ring stand'];
const CAR_HINTS = ['car', 'cup', 'suction', 'vent', 'dashboard', 'windshield', 'headrest'];
const KICK_SCOOTER_HINTS = ['kick', 'manual scooter', 'push scooter', 'foot scooter', 'kick scooter'];
const ELECTRIC_SCOOTER_HINTS = ['electric', 'e scooter', 'escooter', 'e-scooter', 'motor'];

function normalizeMatchText(value = '') {
  return String(value || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractFilenameKeywords(filename = '') {
  const nameWithoutExt = String(filename || '')
    .toLowerCase()
    .replace(/\.[^/.]+$/, '');
  if (!nameWithoutExt || /^[a-f0-9]{8,}$/i.test(nameWithoutExt)) return [];
  return nameWithoutExt
    .split(/[-_\s.]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !/^\d+$/.test(word) && !STOP_WORDS.has(word));
}

export function uniqueSearchTerms(values = []) {
  const seen = new Set();
  const terms = [];
  for (const value of values) {
    const term = String(value || '').replace(/\s+/g, ' ').trim();
    if (term.length < 2) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms.slice(0, 8);
}

export function isGenericImageTerm(term = '') {
  const words = String(term || '').toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((word) => GENERIC_IMAGE_TERMS.has(word) || word.length < 3);
}

export function inferImageExcludes({ name = '', type = '', exclude = [] } = {}) {
  const text = normalizeMatchText(`${name} ${type}`);
  const isCar = CAR_HINTS.some((hint) => text.includes(hint));
  const isDesk = DESK_HINTS.some((hint) => text.includes(hint))
    || (/\bmagnetic\b/.test(text) && /\b(stand|puck|ring)\b/.test(text));
  const isKickScooter = text.includes('scooter')
    && KICK_SCOOTER_HINTS.some((hint) => text.includes(hint))
    && !ELECTRIC_SCOOTER_HINTS.some((hint) => text.includes(hint));
  const extras = [];
  if (isDesk && !isCar) {
    extras.push('car', 'cup', 'suction', 'vent', 'dashboard', 'windshield', 'headrest');
  }
  if (isKickScooter) {
    extras.push('electric', 'e-scooter', 'e scooter', 'escooter', 'motor');
  }
  const isOud = /(oud|bukhoor|bakhoor|humidifier|diffuser|incense|burner)/.test(text);
  const isAirPump = /(air pump|inflator|compressor|tyre pump|tire pump)/.test(text)
    || (text.includes('pump') && !text.includes('shower') && !isOud);
  if (isOud) {
    extras.push('air pump', 'inflator', 'compressor', 'grinder', 'lint');
  }
  if (isAirPump) {
    extras.push('oud', 'bukhoor', 'burner', 'humidifier', 'diffuser', 'grinder');
  }
  return uniqueSearchTerms([...exclude, ...extras]);
}

export function expandImageSearchTerms({ name = '', type = '', keywords = [] } = {}) {
  const text = normalizeMatchText(`${name} ${type}`);
  const extras = [];
  if (text.includes('scooter') && KICK_SCOOTER_HINTS.some((hint) => text.includes(hint))) {
    extras.push('kick scooter', 'manual scooter');
  }
  if (/(oud|bukhoor|bakhoor)/.test(text)) {
    extras.push('oud burner', 'bukhoor', 'electronic burner');
  }
  return uniqueSearchTerms([name, ...extras, ...keywords])
    .filter((term, index) => {
      if (index === 0) return true;
      if (isGenericImageTerm(term)) return false;
      if (normalizeMatchText(term) === 'scooter') return false;
      return true;
    });
}

function productTitleText(product = {}) {
  return [product.name, product.nameAr].map((value) => String(value || '').toLowerCase()).join(' ');
}

const CATEGORY_SEARCH_TERMS = {
  'kick scooter': 'scooter',
  'electric scooter': 'scooter',
  'air pump': 'pump',
  'oud burner': 'oud',
  'humidifier': 'humidifier',
  'coffee grinder': 'grinder',
  'lint remover': 'lint',
  'shower pump': 'shower',
  'bowl': 'bowl',
  'luggage tag': 'luggage',
  'desk stand': 'stand',
  'car mount': 'mount',
  watch: 'watch',
  bag: 'bag',
  light: 'light',
  speaker: 'speaker',
  earbuds: 'earbuds',
  charger: 'charger',
};

const FAMILY_TERMS = [
  'scooter', 'watch', 'earbuds', 'speaker', 'bag', 'lamp', 'light',
  'charger', 'mount', 'stand', 'projector', 'camera', 'keyboard',
  'oud', 'bukhoor', 'humidifier', 'pump', 'grinder', 'lint', 'bowl',
  'luggage', 'shower',
];

export function imageQueryFamilyTerm({ name = '', type = '', category = '', keywords = [] } = {}) {
  const typeKey = normalizeMatchText(type);
  if (CATEGORY_SEARCH_TERMS[typeKey]) return CATEGORY_SEARCH_TERMS[typeKey];
  const text = normalizeMatchText([name, type, category, ...(keywords || [])].join(' '));
  return FAMILY_TERMS.find((term) => text.includes(term)) || '';
}

export function productIsRelatedToImageQuery(product, familyTerm = '') {
  const family = normalizeMatchText(familyTerm);
  if (!family) return false;
  return normalizeMatchText(productTitleText(product)).includes(family);
}

export function productMatchesImageQuery(product, { name = '', exclude = [] } = {}) {
  const title = normalizeMatchText(productTitleText(product));
  if (!title) return false;
  if (exclude.some((term) => title.includes(normalizeMatchText(term)))) return false;

  const words = normalizeMatchText(name)
    .split(/\s+/)
    .filter((word) => word.length > 2);
  if (words.length < 2) return true;
  const hits = words.filter((word) => title.includes(word)).length;
  if (hits >= Math.min(2, words.length)) return true;
  const nameText = normalizeMatchText(name);
  return nameText.includes('kick') && nameText.includes('scooter') && title.includes('scooter');
}

export async function findProductsForImageKeywords(Product, {
  keywords = [],
  name = '',
  type = '',
  category = '',
  exclude = [],
  limit = 24,
} = {}) {
  const specificName = String(name || keywords[0] || '').trim();
  const blocked = inferImageExcludes({ name: specificName, type, exclude });
  const terms = expandImageSearchTerms({
    name: specificName,
    type,
    keywords,
  });

  const found = new Map();
  const accept = (product) => productMatchesImageQuery(product, { name: specificName, exclude: blocked });

  for (const term of terms) {
    const filter = buildProductSearchFilter(term, { includeOutOfStock: false });
    if (!filter) continue;
    const rows = await Product.find({ ...filter, ...STOREFRONT_PUBLISHED_FILTER })
      .select(PRODUCT_SEARCH_SELECT_FIELDS)
      .limit(limit * 2)
      .lean();
    const ranked = rankProductsByTitleMatch(rows.filter(accept), term);
    for (const product of ranked) {
      const id = String(product._id);
      if (!found.has(id)) found.set(id, product);
    }
    if (found.size >= limit) break;
  }

  const products = [...found.values()].slice(0, limit);
  const familyTerm = imageQueryFamilyTerm({
    name: specificName,
    type,
    category,
    keywords: terms,
  });
  const related = [];
  const relatedTerm = familyTerm || category || specificName.split(/\s+/).filter((word) => word.length > 3 && !GENERIC_IMAGE_TERMS.has(word.toLowerCase()))[0] || '';

  if (relatedTerm) {
    const excludeIds = products.map((product) => product._id);
    const relatedFilter = buildProductSearchFilter(relatedTerm, { includeOutOfStock: false });
    if (relatedFilter) {
      const relatedRows = await Product.find({
        ...relatedFilter,
        ...STOREFRONT_PUBLISHED_FILTER,
        ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
      })
        .select(PRODUCT_SEARCH_SELECT_FIELDS)
        .limit(24)
        .lean();
      const rankedRelated = rankProductsByTitleMatch(
        relatedRows.filter((product) => (
          familyTerm
            ? productIsRelatedToImageQuery(product, familyTerm)
            : true
        )),
        relatedTerm,
      );
      related.push(...rankedRelated.slice(0, 16));
    }
  }

  return {
    products: products.map(mapSearchProduct),
    relatedProducts: related.map(mapSearchProduct),
    keyword: specificName || terms[0] || category || '',
    keywords: terms,
  };
}

export function pickBestAndRecommended(categoryProducts = [], verdict = null, { allowFallback = true } = {}) {
  const judged = verdict
    ? applyGeminiVerdict(categoryProducts, verdict)
    : { products: [], relatedProducts: [] };
  let products = judged.products;
  if (!products.length && allowFallback && categoryProducts.length) {
    products = [categoryProducts[0]];
  }
  const relatedProducts = mergeUniqueProducts(
    judged.relatedProducts,
    categoryProducts,
    16,
  ).filter((product) => !products.some((row) => String(row._id) === String(product._id)));
  return { products, relatedProducts };
}

function mergeUniqueProducts(primary = [], secondary = [], limit = 16) {
  const seen = new Set();
  const merged = [];
  for (const product of [...primary, ...secondary]) {
    const id = String(product?._id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(product);
    if (merged.length >= limit) break;
  }
  return merged;
}

export async function findCategoryProductsForImage(Product, Category, vision = {}, {
  limit = 24,
  excludeIds = [],
} = {}) {
  const familyTerm = imageQueryFamilyTerm({
    name: vision.name,
    type: vision.type,
    category: vision.category,
    keywords: vision.keywords || [],
  });
  if (!familyTerm) return [];

  const titleFilter = buildProductSearchFilter(familyTerm, { includeOutOfStock: false });
  const found = new Map();

  if (titleFilter) {
    const rows = await Product.find({
      ...titleFilter,
      ...STOREFRONT_PUBLISHED_FILTER,
      ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
    })
      .select(PRODUCT_SEARCH_SELECT_FIELDS)
      .limit(32)
      .lean();
    for (const product of rows) found.set(String(product._id), product);
  }

  if (Category) {
    const catRegex = new RegExp(escapeRegex(familyTerm), 'i');
    const categories = await Category.find({
      $or: [{ name: catRegex }, { nameAr: catRegex }, { slug: catRegex }],
    }).select('_id').limit(8).lean();
    const categoryIds = categories.map((category) => category._id);
    if (categoryIds.length) {
      const rows = await Product.find({
        inStock: true,
        ...STOREFRONT_PUBLISHED_FILTER,
        $or: [{ category: { $in: categoryIds } }, { categories: { $in: categoryIds } }],
        ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
      })
        .select(PRODUCT_SEARCH_SELECT_FIELDS)
        .limit(32)
        .lean();
      for (const product of rows) found.set(String(product._id), product);
    }
  }

  return rankProductsByTitleMatch(
    [...found.values()],
    vision.name || familyTerm,
  ).slice(0, limit).map(mapSearchProduct);
}

export async function findRecommendedCategoryProducts(Product, {
  name = '',
  type = '',
  category = '',
  excludeIds = [],
  limit = 16,
} = {}) {
  const familyTerm = imageQueryFamilyTerm({
    name,
    type,
    category,
    keywords: [type, category, name],
  });
  if (!familyTerm) return [];

  const filter = buildProductSearchFilter(familyTerm, { includeOutOfStock: false });
  if (!filter) return [];

  const rows = await Product.find({
    ...filter,
    ...STOREFRONT_PUBLISHED_FILTER,
    ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
  })
    .select(PRODUCT_SEARCH_SELECT_FIELDS)
    .limit(32)
    .lean();

  return rankProductsByTitleMatch(
    rows.filter((product) => productIsRelatedToImageQuery(product, familyTerm)),
    familyTerm,
  ).slice(0, limit).map(mapSearchProduct);
}

export function applyGeminiVerdict(candidates = [], verdict = {}) {
  const exactIds = new Set((verdict.exact || []).map((id) => String(id)));
  const relatedIds = new Set((verdict.related || []).map((id) => String(id)));
  const products = [];
  const relatedProducts = [];
  for (const product of candidates) {
    const id = String(product?._id || '');
    if (!id) continue;
    if (exactIds.has(id)) products.push(product);
    else if (relatedIds.has(id)) relatedProducts.push(product);
  }
  return { products, relatedProducts };
}

function resolveVerdictIds(values = [], candidates = []) {
  const byId = new Map(candidates.map((product) => [String(product._id), String(product._id)]));
  const byName = new Map(
    candidates.map((product) => [normalizeMatchText(product.name), String(product._id)]),
  );
  const ids = [];
  for (const value of values || []) {
    const raw = String(value || '').trim();
    if (!raw) continue;
    if (byId.has(raw)) {
      ids.push(raw);
      continue;
    }
    const named = byName.get(normalizeMatchText(raw));
    if (named) ids.push(named);
  }
  return [...new Set(ids)];
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => String(part?.text || '')).join('\n').trim();
}

export async function judgeImageSearchCandidates({
  buffer,
  mimeType = 'image/jpeg',
  vision = {},
  candidates = [],
} = {}) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  const rows = (candidates || []).slice(0, 12);
  if (!apiKey || !buffer?.length || !rows.length) return null;

  const list = rows
    .map((product, index) => `${index + 1}. ${product._id} | ${product.name}`)
    .join('\n');
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `The shopper photo is this product: "${vision?.name || ''}" (type: ${vision?.type || 'other'}).
Compare the photo to these catalog products and keep only true matches.
Candidates:
${list}
Return raw JSON only:
{"exact":[],"related":[]}
Rules:
- exact: one ID — the closest catalog product of the SAME type as the photo.
- If the photo is a scooter, pick the closest scooter as exact even if brand or color differs.
- related IDs are other products in that same type.
- Reject a different type. A bowl is not a luggage tag. An oud burner is not an air pump.
- If the list has the correct type, do not return empty exact.`,
                },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: Buffer.from(buffer).toString('base64'),
                  },
                },
              ],
            }],
            generationConfig: { temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(25000),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || `Gemini judge failed (${response.status})`);
      }
      const parsed = parseAutofillJson(extractGeminiText(payload));
      return {
        exact: resolveVerdictIds(parsed?.exact, rows),
        related: resolveVerdictIds(parsed?.related, rows),
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) console.warn('[search-by-image] gemini judge fallback:', lastError.message);
  return null;
}
