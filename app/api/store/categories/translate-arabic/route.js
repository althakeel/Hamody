import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { isGeminiConfigured } from '@/configs/gemini';
import { ensureOpenAI, isOpenAIConfigured } from '@/configs/openai';
import { getAiErrorMessage } from '@/lib/aiProviderErrors';
import { suggestUaeArabicCategoryName } from '@/lib/categoryLocalization';

const MAX_LENGTH = 2000;
const GEMINI_MODELS = [
  process.env.GEMINI_PRODUCT_AUTOFILL_MODEL,
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
].filter(Boolean).filter((model, index, list) => list.indexOf(model) === index);

function trimText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH);
}

async function verifyStoreSeller(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const idToken = authHeader.split('Bearer ')[1];
  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(idToken);
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const storeId = await authSeller(decodedToken.uid, decodedToken.email);
  if (!storeId) {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 401 }) };
  }

  return { userId: decodedToken.uid };
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => String(part?.text || '')).join(' ').trim();
}

function translationPrompt(english, kind) {
  if (kind === 'name') {
    return `Translate this store category name into short everyday UAE Arabic, the wording used on shopping sites in the Emirates.
Prefer Emirati and Gulf words over formal Modern Standard Arabic.
Return the Arabic name only. No description, quotes, markdown, or extra words.

English:
${english}`;
  }

  return `Translate this ecommerce category description into natural UAE / GCC Arabic.
Return Arabic text only. No quotes, markdown, or extra explanation.

English:
${english}`;
}

async function translateWithGemini(english, kind) {
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
            contents: [{
              parts: [{
                text: translationPrompt(english, kind),
              }],
            }],
            generationConfig: { temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || `Gemini request failed (${response.status})`);
      }

      const translated = trimText(extractGeminiText(payload));
      if (translated) return translated;
      lastError = new Error('Gemini returned empty translation');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Gemini translation failed');
}

async function translateWithOpenAI(english, kind) {
  const client = ensureOpenAI();
  const model = process.env.OPENAI_PRODUCT_AUTOFILL_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: kind === 'name'
          ? 'Translate store category names into short everyday UAE Arabic, the wording used on shopping sites in the Emirates. Prefer Emirati and Gulf words over formal Modern Standard Arabic. Return the Arabic name only.'
          : 'Translate ecommerce category descriptions into natural UAE / GCC Arabic. Return Arabic text only.',
      },
      { role: 'user', content: english },
    ],
  });

  const translated = trimText(completion?.choices?.[0]?.message?.content || '');
  if (!translated) throw new Error('OpenAI returned empty translation');
  return translated;
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
  return `Translate each store category name into a short everyday UAE Arabic label, the wording used on shopping sites in the Emirates.
Prefer Emirati and Gulf words over formal Modern Standard Arabic.
Return JSON only. Keys are the ids. Values are the Arabic labels. No markdown.

${JSON.stringify(items.map((item) => ({ id: item.id, english: item.text })))}`;
}

async function translateBatchWithGemini(items) {
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
      return parseTranslationMap(extractGeminiText(payload));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Gemini translation failed');
}

async function translateBatchWithOpenAI(items) {
  const client = ensureOpenAI();
  const model = process.env.OPENAI_PRODUCT_AUTOFILL_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'Translate store category names into short everyday UAE Arabic, the wording used on shopping sites in the Emirates. Prefer Emirati and Gulf words over formal Modern Standard Arabic. Return JSON only: an object whose keys are the ids and whose values are the Arabic labels.',
      },
      { role: 'user', content: batchPrompt(items) },
    ],
  });
  return parseTranslationMap(completion?.choices?.[0]?.message?.content || '');
}

async function translateNames(items) {
  const resolved = items.map((item) => ({
    id: item.id,
    text: item.text,
    nameAr: suggestUaeArabicCategoryName(item.text, item.slug),
  }));
  const missing = resolved.filter((item) => !item.nameAr);
  if (!missing.length) return resolved;

  const errors = [];
  let translated = {};
  if (isGeminiConfigured()) {
    try {
      translated = await translateBatchWithGemini(missing);
    } catch (error) {
      errors.push(error);
    }
  }
  const stillMissing = missing.filter((item) => !trimText(translated[item.id]));
  if (stillMissing.length && isOpenAIConfigured()) {
    try {
      translated = { ...translated, ...await translateBatchWithOpenAI(stillMissing) };
    } catch (error) {
      errors.push(error);
    }
  }

  for (const item of resolved) {
    if (item.nameAr) continue;
    item.nameAr = trimText(translated[item.id]);
  }

  if (resolved.some((item) => item.nameAr)) return resolved;
  if (!isGeminiConfigured() && !isOpenAIConfigured()) {
    const error = new Error('Translation is not configured');
    error.statusCode = 503;
    throw error;
  }
  const error = errors[0] || new Error('Failed to translate category names');
  error.statusCode = 502;
  throw error;
}

export async function POST(request) {
  try {
    const auth = await verifyStoreSeller(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const kind = body?.kind === 'name' ? 'name' : 'description';

    if (kind === 'name' && Array.isArray(body?.items)) {
      const items = body.items
        .map((item) => ({
          id: String(item?.id || '').trim(),
          text: trimText(item?.text || ''),
          slug: String(item?.slug || '').trim(),
        }))
        .filter((item) => item.id && item.text)
        .slice(0, 80);
      if (!items.length) {
        return NextResponse.json({ error: 'Enter the English category name first' }, { status: 400 });
      }
      const translated = await translateNames(items);
      return NextResponse.json({
        items: translated
          .filter((item) => item.nameAr)
          .map((item) => ({ id: item.id, nameAr: item.nameAr })),
      });
    }

    const english = trimText(body?.text || '');
    if (!english) {
      return NextResponse.json({
        error: kind === 'name' ? 'Enter the English category name first' : 'Enter an English description first',
      }, { status: 400 });
    }

    if (kind === 'name') {
      const localName = suggestUaeArabicCategoryName(english, String(body?.slug || ''));
      if (localName) {
        return NextResponse.json({ descriptionAr: localName, nameAr: localName });
      }
    }

    const errors = [];

    if (isGeminiConfigured()) {
      try {
        const descriptionAr = await translateWithGemini(english, kind);
        return NextResponse.json({ descriptionAr, nameAr: kind === 'name' ? descriptionAr : undefined });
      } catch (error) {
        errors.push(getAiErrorMessage(error, 'gemini'));
      }
    }

    if (isOpenAIConfigured()) {
      try {
        const descriptionAr = await translateWithOpenAI(english, kind);
        return NextResponse.json({ descriptionAr, nameAr: kind === 'name' ? descriptionAr : undefined });
      } catch (error) {
        errors.push(getAiErrorMessage(error, 'openai'));
      }
    }

    if (!isGeminiConfigured() && !isOpenAIConfigured()) {
      return NextResponse.json({ error: 'Translation is not configured' }, { status: 503 });
    }

    return NextResponse.json({
      error: errors.filter(Boolean)[0] || 'Failed to translate description',
    }, { status: 502 });
  } catch (error) {
    console.error('[categories/translate-arabic POST]', error);
    return NextResponse.json({
      error: getAiErrorMessage(error) || 'Failed to translate description',
    }, { status: error?.statusCode || 500 });
  }
}
