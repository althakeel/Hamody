import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { isGeminiConfigured } from '@/configs/gemini';
import { ensureOpenAI, isOpenAIConfigured } from '@/configs/openai';
import { getAiErrorMessage } from '@/lib/aiProviderErrors';
import {
  buildBlogTranslatePrompt,
  hasEnglishBlogCopy,
  normalizeBlogTranslation,
  parseBlogTranslationJson,
} from '@/lib/blogTranslateArabic';

const GEMINI_MODELS = [
  process.env.GEMINI_PRODUCT_AUTOFILL_MODEL,
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
].filter(Boolean).filter((model, index, list) => list.indexOf(model) === index);

async function requireSeller(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    const storeId = await authSeller(decoded.uid);
    if (!storeId) {
      return { error: NextResponse.json({ error: 'Not authorized as seller' }, { status: 403 }) };
    }
    return { storeId };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => String(part?.text || '')).join('\n').trim();
}

async function translateWithGemini(prompt) {
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
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(60000),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || `Gemini request failed (${response.status})`);
      }

      const raw = extractGeminiText(payload);
      const parsed = parseBlogTranslationJson(raw);
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Gemini translation failed');
}

async function translateWithOpenAI(prompt) {
  const client = ensureOpenAI();
  const model = process.env.OPENAI_PRODUCT_AUTOFILL_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'Translate HAMODY blog posts into UAE / GCC Arabic. Return raw JSON only with titleAr, excerptAr, contentHtmlAr. Preserve HTML tags and image URLs.',
      },
      { role: 'user', content: prompt },
    ],
  });

  return parseBlogTranslationJson(completion?.choices?.[0]?.message?.content || '');
}

export async function POST(request) {
  try {
    const auth = await requireSeller(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const title = String(body?.title || '').trim();
    const excerpt = String(body?.excerpt || '').trim();
    const contentHtml = String(body?.contentHtml || '');

    if (!hasEnglishBlogCopy({ title, excerpt, contentHtml })) {
      return NextResponse.json({ error: 'Write the English blog content first' }, { status: 400 });
    }

    const prompt = buildBlogTranslatePrompt({ title, excerpt, contentHtml });
    const errors = [];

    if (isGeminiConfigured()) {
      try {
        const parsed = await translateWithGemini(prompt);
        return NextResponse.json(normalizeBlogTranslation(parsed));
      } catch (error) {
        errors.push(getAiErrorMessage(error, 'gemini'));
      }
    }

    if (isOpenAIConfigured()) {
      try {
        const parsed = await translateWithOpenAI(prompt);
        return NextResponse.json(normalizeBlogTranslation(parsed));
      } catch (error) {
        errors.push(getAiErrorMessage(error, 'openai'));
      }
    }

    if (!isGeminiConfigured() && !isOpenAIConfigured()) {
      return NextResponse.json({ error: 'Translation is not configured' }, { status: 503 });
    }

    return NextResponse.json({
      error: errors.filter(Boolean)[0] || 'Failed to translate blog',
    }, { status: 502 });
  } catch (error) {
    console.error('[blogs/translate-arabic POST]', error);
    return NextResponse.json({
      error: getAiErrorMessage(error) || 'Failed to translate blog',
    }, { status: 500 });
  }
}
