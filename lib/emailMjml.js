import { createRequire } from 'module';
import { extractMjmlDocument, isMjmlMarkup } from './emailMjmlDetect.js';

const require = createRequire(import.meta.url);

function mapMjmlErrors(errors = [], blockId = '') {
  return (Array.isArray(errors) ? errors : [])
    .map((error) => ({
      blockId,
      message: String(error?.message || error || 'MJML compile error'),
      line: Number.isFinite(Number(error?.line)) ? Number(error.line) : null,
      tagName: String(error?.tagName || ''),
    }))
    .filter((error) => error.message);
}

export async function compileMjmlToHtml(markup = '') {
  const source = extractMjmlDocument(markup);
  if (!isMjmlMarkup(source)) {
    return { html: String(markup || ''), errors: [], mjml: false };
  }

  // Loaded only on the server so the campaign builder bundle stays browser-safe.
  const mjml2html = require('mjml');
  const result = await mjml2html(source, {
    validationLevel: 'soft',
    minify: false,
    keepComments: false,
  });

  return {
    html: String(result?.html || ''),
    errors: mapMjmlErrors(result?.errors),
    mjml: true,
  };
}

export async function compileEmailBlocksMjml(blocks = []) {
  const errors = [];
  const next = [];
  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (block?.type !== 'html' || !isMjmlMarkup(block.html)) {
      next.push(block);
      continue;
    }
    const compiled = await compileMjmlToHtml(block.html);
    errors.push(...mapMjmlErrors(compiled.errors, block.id || ''));
    if (!compiled.html) {
      errors.push({
        blockId: block.id || '',
        message: 'MJML compiled to an empty email.',
        line: null,
        tagName: '',
      });
      next.push(block);
      continue;
    }
    next.push({ ...block, html: compiled.html });
  }
  return { blocks: next, errors };
}

export { isMjmlMarkup };
