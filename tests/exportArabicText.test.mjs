import test from 'node:test';
import assert from 'node:assert/strict';
import { formatExcelText, formatPdfText, hasArabicText } from '../lib/exportArabicText.js';

test('detects Arabic customer names', () => {
  assert.equal(hasArabicText('Mohomed'), false);
  assert.equal(hasArabicText('محمد علي'), true);
});

test('Excel keeps logical Arabic order', () => {
  assert.equal(formatExcelText('محمد علي'), 'محمد علي');
});

test('PDF reverses Arabic runs so LTR drawing still reads correctly', () => {
  const visual = formatPdfText('محمد');
  assert.equal(hasArabicText(visual), true);
  assert.notEqual(visual, 'pápóbé');
  assert.equal(Array.from(visual).reverse().join(''), 'محمد');
});
