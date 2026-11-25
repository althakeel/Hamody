import Product from '@/models/Product';
import { isGeminiConfigured } from '@/configs/gemini';
import { ensureOpenAI, isOpenAIConfigured } from '@/configs/openai';

const ARABIC_SCRIPT = /[\u0600-\u06FF]/;
const GEMINI_MODELS = [
  process.env.GEMINI_PRODUCT_AUTOFILL_MODEL,
  'gemini-2.5-flash',
  'gemini-flash-latest',
].filter(Boolean).filter((model, index, list) => list.indexOf(model) === index);

function hasArabic(value = '') {
  return ARABIC_SCRIPT.test(String(value || ''));
}

function needsArabicName(product = {}) {
  const name = String(product.name || '').trim();
  if (!name) return false;
  return !hasArabic(product.nameAr);
}

function parseTranslationMap(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return {};
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function batchPrompt(items) {
  return `Translate each product title into everyday UAE Arabic for a shopping website.
Keep brand names and model codes in Latin letters.
Translate the product type into short Emirati and Gulf wording, not formal news Arabic.
Return JSON only. Keys are the ids. Values are the Arabic titles. No markdown.

${JSON.stringify(items)}`;
}

async function translateWithGemini(items) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('Gemini is not configured');
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: batchPrompt(items) }] }],
            generationConfig: { temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(45000),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || `Gemini request failed (${response.status})`);
      }
      const parts = payload?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts) ? parts.map((part) => String(part?.text || '')).join(' ') : '';
      return parseTranslationMap(text);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Gemini translation failed');
}

async function translateWithOpenAI(items) {
  const client = ensureOpenAI();
  const model = process.env.OPENAI_PRODUCT_AUTOFILL_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'Translate product titles into everyday UAE Arabic for a shopping website. Keep brand names and model codes in Latin letters. Return JSON only: an object whose keys are the ids and whose values are the Arabic titles.',
      },
      { role: 'user', content: batchPrompt(items) },
    ],
  });
  return parseTranslationMap(completion?.choices?.[0]?.message?.content || '');
}

async function translateProductNames(items) {
  let translated = {};
  if (isGeminiConfigured()) {
    try {
      translated = await translateWithGemini(items);
    } catch {
      translated = {};
    }
  }
  const missing = items.filter((item) => !hasArabic(translated[item.id]));
  if (missing.length && isOpenAIConfigured()) {
    try {
      translated = { ...translated, ...await translateWithOpenAI(missing) };
    } catch {
      // Keep whatever Gemini already returned.
    }
  }
  return translated;
}

export async function fillMissingProductArabicNames(products = []) {
  const pending = products.filter(needsArabicName).slice(0, 40);
  if (!pending.length) return 0;
  if (!isGeminiConfigured() && !isOpenAIConfigured()) return 0;

  const items = pending.map((product) => ({
    id: String(product._id),
    english: String(product.name || '').replace(/\s+/g, ' ').trim().slice(0, 180),
  })).filter((item) => item.english);
  if (!items.length) return 0;

  const translated = await translateProductNames(items);
  const writes = [];
  for (const product of pending) {
    const id = String(product._id);
    const arabic = String(translated[id] || '').replace(/\s+/g, ' ').trim();
    if (!hasArabic(arabic)) continue;
    product.nameAr = arabic;
    writes.push(Product.updateOne(
      { _id: product._id },
      { $set: { nameAr: arabic } },
    ));
  }
  if (writes.length) await Promise.all(writes);
  return writes.length;
}
