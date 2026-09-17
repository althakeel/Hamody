import { createHash } from 'crypto';

export const VISUAL_MATCH_MIN_SCORE = 0.70;
export const VISUAL_RELATED_MIN_SCORE = 0.80;
export const VISUAL_EXACT_MIN_SCORE = 0.86;
export const VISUAL_NEAR_DUP_SCORE = 0.93;

const PRODUCT_FAMILIES = [
  { id: 'oud-burner', hints: ['oud', 'bukhoor', 'bakhoor', 'incense', 'diffuser', 'humidifier', 'aroma', 'bukhoor burner', 'electronic burner', 'عود', 'بخور'] },
  { id: 'air-pump', hints: ['air pump', 'inflator', 'compressor', 'tyre pump', 'tire pump', 'nano pump', 'مضخة هواء'] },
  { id: 'shower-pump', hints: ['shower pump', 'shower'] },
  { id: 'coffee', hints: ['coffee', 'grinder', 'espresso', 'قهوة'] },
  { id: 'lint', hints: ['lint', 'fabric shaver'] },
  { id: 'bowl', hints: ['bowl', 'dish', 'plate', 'salad bowl', 'وعاء', 'طبق'] },
  { id: 'luggage-tag', hints: ['luggage tag', 'bag tag', 'suitcase tag'] },
  { id: 'kick-scooter', hints: ['kick scooter', 'manual scooter', 'push scooter'] },
  { id: 'electric-scooter', hints: ['electric scooter', 'e scooter', 'escooter'] },
  { id: 'desk-stand', hints: ['desk stand', 'magsafe', 'magnetic stand'] },
  { id: 'car-mount', hints: ['car mount', 'cup holder', 'suction'] },
];

export function inferProductFamily(value = '') {
  const text = normalizeMatchText(value);
  if (!text) return '';
  if (PRODUCT_FAMILIES[0].hints.some((hint) => text.includes(hint))) return 'oud-burner';
  if (text.includes('shower') && text.includes('pump')) return 'shower-pump';
  if (text.includes('pump') || PRODUCT_FAMILIES[1].hints.some((hint) => text.includes(hint))) return 'air-pump';
  for (const family of PRODUCT_FAMILIES.slice(2)) {
    if (family.hints.some((hint) => text.includes(hint))) return family.id;
  }
  if (text.includes('scooter') && (text.includes('electric') || text.includes('e scooter'))) return 'electric-scooter';
  if (text.includes('scooter')) return 'kick-scooter';
  return '';
}

export function hashImageSource(value = '') {
  return createHash('sha256').update(String(value || '').trim()).digest('hex');
}

export function normalizeMatchText(value = '') {
  return String(value || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeEmbedding(values = []) {
  const vector = (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (!vector.length) return [];
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return vector;
  return vector.map((value) => value / magnitude);
}

export function cosineSimilarity(left = [], right = []) {
  if (!left.length || left.length !== right.length) return 0;
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    sum += left[index] * right[index];
  }
  return sum;
}

export function collectRowEmbeddings(row = {}) {
  const embeddings = [];
  if (Array.isArray(row.images)) {
    for (const image of row.images) {
      if (Array.isArray(image?.embedding) && image.embedding.length) embeddings.push(image.embedding);
    }
  }
  if (Array.isArray(row.embedding) && row.embedding.length) embeddings.push(row.embedding);
  return embeddings;
}

export function bestImageScore(queryEmbedding, embeddings = []) {
  const query = normalizeEmbedding(queryEmbedding);
  let best = 0;
  for (const embedding of embeddings) {
    const score = cosineSimilarity(query, normalizeEmbedding(embedding));
    if (score > best) best = score;
  }
  return best;
}

export function rankVisualMatches(queryEmbedding, rows = [], { limit = 24, minScore = VISUAL_MATCH_MIN_SCORE } = {}) {
  const query = normalizeEmbedding(queryEmbedding);
  if (!query.length) return [];
  return rows
    .map((row) => ({
      ...row,
      score: bestImageScore(query, collectRowEmbeddings(row)),
    }))
    .filter((row) => row.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function applyVisionPrior(score, title = '', visionText = '') {
  const productTitle = normalizeMatchText(title);
  const vision = normalizeMatchText(visionText);
  let next = Number(score) || 0;
  const visionFamily = inferProductFamily(vision);
  const titleFamily = inferProductFamily(productTitle);

  if (visionFamily && titleFamily && visionFamily !== titleFamily) next *= 0.62;
  if (visionFamily && titleFamily && visionFamily === titleFamily) next = Math.min(1, next + 0.04);

  if (vision.includes('kick') && vision.includes('scooter')) {
    if (productTitle.includes('electric') || productTitle.includes('e scooter')) next *= 0.84;
    else if (productTitle.includes('kick') || productTitle.includes('scooter')) next = Math.min(1, next + 0.03);
  }

  if (vision.includes('electric') && vision.includes('scooter') && productTitle.includes('kick')) {
    next *= 0.88;
  }

  if ((vision.includes('desk') || (vision.includes('magnetic') && vision.includes('stand')))
    && (productTitle.includes('car') || productTitle.includes('cup holder') || productTitle.includes('suction'))) {
    next *= 0.78;
  }

  if (vision.includes('scooter') && !productTitle.includes('scooter')) next *= 0.7;
  if (vision.includes('scooter') && (productTitle.includes('basket') || productTitle.includes('table') || productTitle.includes('ladder'))) {
    next *= 0.45;
  }

  return next;
}

function rowTitle(row = {}) {
  return row.title || row.product?.name || row.product?.nameAr || '';
}

function rowId(row = {}) {
  return String(row.productId || row.product?._id || '');
}

export function splitExactAndRelated(rows = [], {
  exactMin = VISUAL_EXACT_MIN_SCORE,
  relatedMin = VISUAL_RELATED_MIN_SCORE,
  exactGap = 0.05,
  visionText = '',
} = {}) {
  const titled = rows.map((row) => ({
    ...row,
    title: rowTitle(row),
    family: inferProductFamily(`${rowTitle(row)} ${row.product?.nameAr || ''}`),
  }));
  const top = titled[0];
  if (!top) return { exact: [], related: [] };

  const visionFamily = inferProductFamily(visionText);
  const close = titled.filter((row) => row.score >= top.score - 0.1 && row.score >= relatedMin);
  const closeFamilies = new Set(close.map((row) => row.family).filter(Boolean));
  const ambiguous = closeFamilies.size >= 2 && top.score < VISUAL_NEAR_DUP_SCORE;
  const familyHits = visionFamily
    ? titled.filter((row) => row.family === visionFamily && row.score >= relatedMin)
    : [];

  let exact = [];
  if (familyHits.length && (ambiguous || (top.family && top.family !== visionFamily))) {
    exact = familyHits.filter((row) => row.score >= exactMin);
  } else if (visionFamily && !ambiguous && top.score >= exactMin && (!top.family || top.family === visionFamily)) {
    const exactCutoff = Math.max(exactMin, top.score - exactGap);
    exact = titled.filter((row) => (
      row.score >= exactCutoff
      && (!row.family || row.family === visionFamily)
    ));
  } else if (!visionFamily && top.score >= VISUAL_NEAR_DUP_SCORE && !ambiguous) {
    exact = titled.filter((row) => row.score >= VISUAL_NEAR_DUP_SCORE);
  }

  const exactIds = new Set(exact.map(rowId).filter(Boolean));
  const related = titled.filter((row) => {
    const id = rowId(row);
    if (id && exactIds.has(id)) return false;
    if (row.score < relatedMin) return false;
    if (visionFamily && row.family && row.family !== visionFamily) return false;
    if (!visionFamily && row.score < 0.88) return false;
    return true;
  });
  return { exact, related };
}

export function mergeVisualAndKeywordProducts(visualProducts = [], keywordProducts = [], limit = 24) {
  const seen = new Set();
  const merged = [];
  for (const product of [...visualProducts, ...keywordProducts]) {
    const id = String(product?._id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(product);
    if (merged.length >= limit) break;
  }
  return merged;
}
