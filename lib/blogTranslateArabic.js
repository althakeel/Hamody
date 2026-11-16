import { sanitizeBlogHtml } from './blogHelpers.js';
import { parseAutofillJson } from './productAiAutofill.js';

export const BLOG_TRANSLATE_HTML_MAX = 24000;

export function stripBlogHtmlToText(html = '') {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasEnglishBlogCopy({ title = '', excerpt = '', contentHtml = '' } = {}) {
  return Boolean(
    String(title || '').trim()
    || String(excerpt || '').trim()
    || stripBlogHtmlToText(contentHtml),
  );
}

export function normalizeBlogTranslation(parsed = {}) {
  const titleAr = String(parsed.titleAr || '').replace(/\s+/g, ' ').trim();
  const excerptAr = String(parsed.excerptAr || '').replace(/\s+/g, ' ').trim();
  const rawHtml = String(parsed.contentHtmlAr || parsed.descriptionAr || '').trim();
  const contentHtmlAr = rawHtml ? sanitizeBlogHtml(rawHtml) : '';

  return {
    titleAr,
    excerptAr,
    contentHtmlAr,
  };
}

export function parseBlogTranslationJson(raw) {
  return parseAutofillJson(raw);
}

export function buildBlogTranslatePrompt({ title = '', excerpt = '', contentHtml = '' } = {}) {
  const html = String(contentHtml || '').slice(0, BLOG_TRANSLATE_HTML_MAX);
  return `Translate this HAMODY blog post into natural UAE / GCC Arabic (Gulf Modern Standard Arabic, not Egyptian slang).
Return raw JSON only. No markdown fences, no explanation.

Schema:
{
  "titleAr": string,
  "excerptAr": string,
  "contentHtmlAr": string
}

Rules:
- Translate only visible English text.
- Keep every HTML tag and attribute unchanged (img src, href, class, style, data-width, data-align, width, height).
- Keep images, links, headings, lists, and inline styles in the same place.
- Translate img alt / title when they are English.
- If a field is empty in English, return an empty string for that Arabic field.
- Do not add extra sections.

English title:
${String(title || '').trim()}

English excerpt:
${String(excerpt || '').trim()}

English HTML:
${html}`;
}
