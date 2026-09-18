import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import ProductVisualIndex from '@/models/ProductVisualIndex';
import { isGeminiConfigured } from '@/configs/gemini';
import { parseAutofillJson } from '@/lib/productAiAutofill';
import { shrinkImageForVision } from '@/lib/normalizeImageForAi';
import {
  extractFilenameKeywords,
  findCategoryProductsForImage,
  findProductsForImageKeywords,
  imageQueryFamilyTerm,
  judgeImageSearchCandidates,
  pickBestAndRecommended,
  shouldSkipImageSearchJudge,
  uniqueSearchTerms,
} from '@/lib/imageSearch';
import {
  embedImageBuffer,
  findProductsByVisualEmbedding,
  mergeVisualAndKeywordProducts,
} from '@/lib/productVisualIndex';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GEMINI_MODELS = [
  process.env.GEMINI_PRODUCT_VISION_MODEL,
  process.env.GEMINI_PRODUCT_AUTOFILL_MODEL,
  'gemini-2.5-flash',
  'gemini-flash-latest',
].filter(Boolean).filter((model, index, list) => list.indexOf(model) === index).slice(0, 2);

const GEMINI_TIMEOUT_MS = 12000;

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => String(part?.text || '')).join('\n').trim();
}

async function describeProductImage(buffer, mimeType) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;

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
                  text: `Identify the EXACT product in this shopper photo for a UAE ecommerce store.
Return raw JSON only:
{"name":"","type":"","category":"","keywords":[],"exclude":[]}
Rules:
- name is a specific 4-8 word catalog label (shape + use).
- type is one of: kick scooter, electric scooter, desk stand, car mount, air pump, oud burner, humidifier, coffee grinder, lint remover, shower pump, bowl, luggage tag, watch, bag, light, speaker, earbuds, charger, other.
- A bowl, plate, or dish is type bowl. A square/round tracker with a loop is a luggage tag. Never mix those two.
- A black cylinder with a metal/gold lid or top nozzle for incense or steam is an oud burner or humidifier, NEVER an air pump.
- An air pump has a pistol/gun head, hose, or inflation nozzle. Do not guess air pump for every black cylinder.
- A hopper on top is a coffee grinder. A round fabric shaver is a lint remover.
- If it is a foot-powered kick scooter, type must be kick scooter.
- If it is an electric scooter, type must be electric scooter.
- keywords are extra specific terms. exclude is lookalike products that are NOT this item.
- category is one catalog word.`,
                },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: buffer.toString('base64'),
                  },
                },
              ],
            }],
            generationConfig: { temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || `Gemini failed (${response.status})`);
      }
      const parsed = parseAutofillJson(extractGeminiText(payload));
      const keywords = uniqueSearchTerms([
        parsed?.name,
        parsed?.category,
        ...(Array.isArray(parsed?.keywords) ? parsed.keywords : []),
      ]);
      if (!keywords.length) throw new Error('Gemini returned no keywords');
      return {
        keywords,
        category: String(parsed?.category || '').trim(),
        name: String(parsed?.name || '').trim(),
        type: String(parsed?.type || '').trim(),
        exclude: uniqueSearchTerms(parsed?.exclude || []),
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) console.warn('[search-by-image] vision fallback:', lastError.message);
  return null;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    if (!image || typeof image.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await image.arrayBuffer());
    if (!rawBuffer.length) {
      return NextResponse.json({ error: 'Image is empty' }, { status: 400 });
    }

    const startedAt = Date.now();
    const shrunk = await shrinkImageForVision(rawBuffer, image.type || 'image/jpeg');
    const buffer = shrunk.buffer;
    const mimeType = shrunk.mimeType;

    await dbConnect();

    const [vision, queryEmbedding] = await Promise.all([
      isGeminiConfigured() ? describeProductImage(buffer, mimeType) : null,
      embedImageBuffer(buffer, mimeType),
    ]);
    const identifyMs = Date.now() - startedAt;

    const filenameKeywords = extractFilenameKeywords(image.name);
    const keywords = uniqueSearchTerms([
      vision?.name,
      vision?.category,
      ...(vision?.keywords || []),
      ...filenameKeywords,
    ]);

    const [visual, keywordResult, categoryProducts] = await Promise.all([
      queryEmbedding.length
        ? findProductsByVisualEmbedding(Product, ProductVisualIndex, queryEmbedding, {
          limit: 24,
          visionText: `${vision?.type || ''} ${vision?.name || ''}`,
        })
        : { products: [], relatedProducts: [], candidates: [], scores: [] },
      keywords.length
        ? findProductsForImageKeywords(Product, {
          keywords,
          name: vision?.name || '',
          type: vision?.type || '',
          category: vision?.category || '',
          exclude: vision?.exclude || [],
          limit: 12,
        })
        : { products: [], relatedProducts: [], keyword: '', keywords: [] },
      findCategoryProductsForImage(Product, Category, {
        name: vision?.name || '',
        type: vision?.type || '',
        category: vision?.category || '',
        keywords,
      }, { limit: 20 }),
    ]);

    const candidates = mergeVisualAndKeywordProducts(
      categoryProducts,
      [
        ...(visual.candidates || []),
        ...(visual.products || []),
        ...keywordResult.products,
        ...keywordResult.relatedProducts,
      ],
      20,
    );

    const catalogMs = Date.now() - startedAt;
    let verdict = null;
    if (isGeminiConfigured() && candidates.length && !shouldSkipImageSearchJudge(visual.scores)) {
      verdict = await judgeImageSearchCandidates({
        buffer,
        mimeType,
        vision,
        candidates,
      });
    }

    const picked = pickBestAndRecommended(candidates, verdict, {
      allowFallback: Boolean(imageQueryFamilyTerm({
        name: vision?.name || '',
        type: vision?.type || '',
        category: vision?.category || '',
        keywords,
      })),
    });
    const products = picked.products;
    const relatedProducts = picked.relatedProducts;

    console.info('[search-by-image]', {
      vision: vision?.name || '',
      type: vision?.type || '',
      exact: products.map((product) => product.name),
      related: relatedProducts.map((product) => product.name).slice(0, 8),
      scores: (visual.scores || []).slice(0, 8),
      ms: {
        identify: identifyMs,
        catalog: catalogMs - identifyMs,
        judge: Date.now() - startedAt - catalogMs,
        total: Date.now() - startedAt,
      },
      judged: Boolean(verdict),
    });

    return NextResponse.json({
      keyword: vision?.name || keywordResult.keyword || keywords[0] || '',
      keywords: keywordResult.keywords || keywords,
      products,
      relatedProducts,
      recommendedProducts: relatedProducts,
      resultCount: products.length,
      searchMethod: products.length ? 'visual+gemini' : (relatedProducts.length ? 'gemini-related' : 'none'),
      message: products.length
        ? `Found ${products.length} product${products.length === 1 ? '' : 's'}`
        : (relatedProducts.length
          ? 'No exact match. Showing related products.'
          : 'No related products for this photo.'),
    });
  } catch (error) {
    console.error('[search-by-image POST]', error);
    return NextResponse.json({ error: error.message || 'Image search failed' }, { status: 500 });
  }
}
