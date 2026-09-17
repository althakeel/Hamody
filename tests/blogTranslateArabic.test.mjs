import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasEnglishBlogCopy,
  normalizeBlogTranslation,
  parseBlogTranslationJson,
} from '../lib/blogTranslateArabic.js';

test('detects English copy even when HTML wraps the text', () => {
  assert.equal(hasEnglishBlogCopy({ title: 'Hello' }), true);
  assert.equal(hasEnglishBlogCopy({ contentHtml: '<p>Buying guide</p>' }), true);
  assert.equal(hasEnglishBlogCopy({ contentHtml: '<p></p>' }), false);
  assert.equal(hasEnglishBlogCopy({}), false);
});

test('normalizes AI JSON and keeps safe HTML tags', () => {
  const result = normalizeBlogTranslation({
    titleAr: '  دليل الشراء  ',
    excerptAr: 'ملخص',
    contentHtmlAr: '<h2>السلامة</h2><p>نص</p><img src="https://cdn.example/x.jpg" data-width="half" alt="سكوتر">',
  });

  assert.equal(result.titleAr, 'دليل الشراء');
  assert.equal(result.excerptAr, 'ملخص');
  assert.match(result.contentHtmlAr, /<h2>السلامة<\/h2>/);
  assert.match(result.contentHtmlAr, /data-width="half"/);
});

test('parses markdown-fenced translation JSON', () => {
  const parsed = parseBlogTranslationJson('```json\n{"titleAr":"عنوان","excerptAr":"","contentHtmlAr":"<p>نص</p>"}\n```');
  assert.equal(parsed.titleAr, 'عنوان');
});
