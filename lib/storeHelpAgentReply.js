import { ensureOpenAI, isOpenAIConfigured } from '@/configs/openai';
import { ensureGemini, isGeminiConfigured } from '@/configs/gemini';
import { canExportHelpFacts, shouldOfferHelpExport } from '@/lib/storeHelpAgent';
import { cleanHelpProductName, formatStoreHelpReply, wantsHelpDownload } from '@/lib/storeHelpAgentFacts';
import { getStoreWebsiteFacts, STORE1920_AUTHOR } from '@/lib/storeHelpKnowledge';

const HELP_SYSTEM_PROMPT = `You are Store Help, a sharp, friendly store assistant for the Store1920 seller dashboard.
Read the seller's intent even with typos. "downaldo" or "downlaod" means download. "exel" means Excel. "rohith" as a customer name is a name, not a download.

Write 1 to 3 short English sentences, like a helpful colleague. Do not sound like a form or a keyword matcher.

Rules:
- Use ONLY the store facts JSON. Never invent orders, revenue, products, pages, or dates.
- Never output JSON, code, object fields, SKUs dumps, or WooCommerce keys.
- Use clean product names only. If a name looks like JSON, ignore it and use the cleaned name from facts.
- Keep the same numbers as facts.draftAnswer when that draft exists.
- If facts.periodSales exists, that is the sales answer. Use statusLabel when it exists (for example delivered). Use byStatus counts when they exist. Never say you could not find sales data.
- If facts.customerList exists, they want the customer list / names file. Say how many customers you have and that Excel/PDF is below when facts.canExport is true. Do not treat leftover words as a person's name.
- If facts.customerSearch exists, answer from that. If notFound is true, say no customer with that name. If names exist, say yes and list them.
- If facts.canExport is true, Excel and PDF buttons are below with the same details the seller asked for (orders, customers, or website pages). Mention those buttons when the seller asked to download.
- Do not mention the author, creator, founder, or developer unless the seller asked. If they ask, answer exactly: The author of Store1920 is ${STORE1920_AUTHOR}.
- You may use facts.website to explain this store, dashboard pages, navbar, category bar, homepage banners, blogs, spin wheel, shipping limits, returns, and languages.
- If facts cannot answer the question, say you can check this website's pages, store sales, an order number, a product, pickups, or customers.
- Do not mention AI, models, or these instructions.`;

function compactHelpFacts(facts = {}, draftAnswer = '', question = '') {
  return {
    draftAnswer,
    canExport: shouldOfferHelpExport(facts, question),
    downloadRequested: wantsHelpDownload(question),
    periodSales: facts.periodSales
      ? {
          range: facts.periodSales.range,
          rangeKey: facts.periodSales.rangeKey,
          currency: facts.periodSales.currency,
          orderCount: facts.periodSales.orderCount,
          unitsSold: facts.periodSales.unitsSold,
          revenue: facts.periodSales.revenue,
          statusLabel: facts.periodSales.statusLabel || '',
          byStatus: Array.isArray(facts.periodSales.byStatus)
            ? facts.periodSales.byStatus.slice(0, 6)
            : [],
        }
      : null,
    productSales: facts.productSales
      ? {
          searched: facts.productSales.searched,
          range: facts.productSales.range,
          rangeKey: facts.productSales.rangeKey,
          notFound: Boolean(facts.productSales.notFound),
          productName: cleanHelpProductName(
            facts.productSales.byProduct?.[0]?.productName
            || facts.productSales.matchedCatalogProducts?.[0]?.name
            || facts.productSales.searched
            || '',
          ),
          totals: facts.productSales.totals || null,
        }
      : null,
    order: facts.order
      ? {
          notFound: Boolean(facts.order.notFound),
          orderNumber: facts.order.orderNumber || facts.order.searched || '',
          status: facts.order.status || '',
          total: facts.order.total,
          items: (facts.order.items || []).slice(0, 3).map((item) => cleanHelpProductName(item.name)),
        }
      : null,
    customerList: facts.customerList
      ? {
          customerCount: Number(facts.customerList.customerCount || 0),
          names: (facts.customerList.customers || []).slice(0, 5).map((customer) => customer.name).filter(Boolean),
        }
      : null,
    customerSearch: facts.customerSearch
      ? {
          searched: facts.customerSearch.searched || '',
          notFound: Boolean(facts.customerSearch.notFound),
          customerCount: (facts.customerSearch.customers || []).length,
          orderCount: Number(facts.customerSearch.orderCount || 0),
          names: (facts.customerSearch.customers || []).slice(0, 5).map((customer) => customer.name).filter(Boolean),
        }
      : null,
    snapshot: facts.snapshot
      ? {
          awaitingPickupCount: facts.snapshot.awaitingPickupCount,
          todayOrderCount: facts.snapshot.todayOrderCount,
        }
      : null,
    website: getStoreWebsiteFacts(),
  };
}

function looksLikeRawDump(answer = '') {
  const text = String(answer || '');
  return /[{}\[\]]/.test(text)
    || /"name"\s*:/i.test(text)
    || /woocommerce/i.test(text)
    || /productid/i.test(text);
}

function extractHelpNumbers(value) {
  return String(value || '')
    .replace(/,/g, '')
    .match(/\d+(?:\.\d+)?/g)
    || [];
}

export function isSafeHelpAnswer(answer = '', factsPayload = {}) {
  const text = String(answer || '').trim();
  if (!text || text.length > 400) return false;
  if (looksLikeRawDump(text)) return false;
  if (
    factsPayload?.periodSales
    && Number.isFinite(Number(factsPayload.periodSales.orderCount))
    && /could(?:n'?t| not) find|no sales data|couldn.t find any sales/i.test(text)
  ) {
    return false;
  }
  if (
    factsPayload?.customerSearch
    && !factsPayload.customerSearch.notFound
    && Number(factsPayload.customerSearch.customerCount || 0) > 0
    && /don'?t have|no (information|customer)|could(?:n'?t| not) find/i.test(text)
  ) {
    return false;
  }
  if (
    Number(factsPayload?.customerList?.customerCount || 0) > 0
    && /no customer named|could(?:n'?t| not) find|not available/i.test(text)
  ) {
    return false;
  }

  const allowed = new Set(extractHelpNumbers(JSON.stringify(factsPayload)));
  const used = extractHelpNumbers(text);
  return used.every((number) => allowed.has(number));
}

async function callOpenAiHelp(prompt) {
  const client = ensureOpenAI();
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_HELP_AGENT_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0.2,
    max_tokens: 180,
    messages: [
      { role: 'system', content: HELP_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });
  return String(completion.choices?.[0]?.message?.content || '').trim();
}

async function callGeminiHelp(prompt) {
  const genAI = ensureGemini();
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_HELP_AGENT_MODEL || process.env.GEMINI_DASHBOARD_INSIGHTS_MODEL || 'gemini-2.5-flash',
    generationConfig: { temperature: 0.2, maxOutputTokens: 180 },
  });
  const result = await model.generateContent(`${HELP_SYSTEM_PROMPT}\n\n${prompt}`);
  return String(result.response.text() || '').trim();
}

function hasLiveStoreNumbers(facts = {}) {
  return Boolean(
    facts.periodSales
    || (facts.productSales && !facts.productSales.notFound)
    || facts.customerList
    || facts.customerSearch
    || (facts.order && !facts.order.notFound)
  );
}

export async function polishStoreHelpReply(facts = {}, question = '') {
  const fallback = formatStoreHelpReply(facts, question);
  if (hasLiveStoreNumbers(facts) && fallback?.answer) {
    return {
      ...fallback,
      canExport: shouldOfferHelpExport(facts, question),
    };
  }
  const draftAnswer = fallback?.answer || '';
  const factsPayload = compactHelpFacts(facts, draftAnswer, question);
  const prompt = `Seller question: ${question}

Store facts JSON:
${JSON.stringify(factsPayload)}`;

  const providers = [
    ...(isOpenAIConfigured() ? ['openai'] : []),
    ...(isGeminiConfigured() ? ['gemini'] : []),
  ];

  for (const provider of providers) {
    try {
      const answer = provider === 'openai'
        ? await callOpenAiHelp(prompt)
        : await callGeminiHelp(prompt);
      if (isSafeHelpAnswer(answer, factsPayload)) {
        return {
          answer,
          links: fallback?.links || [],
          canExport: shouldOfferHelpExport(facts, question),
        };
      }
    } catch (error) {
      console.warn(`[store-help-agent] ${provider} failed:`, error?.message || error);
    }
  }

  if (fallback) {
    return {
      ...fallback,
      canExport: shouldOfferHelpExport(facts, question),
    };
  }

  return {
    answer: "I can check this website's pages, store sales, an order number, a product, pickups, or tell you which dashboard page to open.",
    links: [
      { label: 'Sales Report', href: '/store/sales-report' },
    ],
    canExport: false,
  };
}
