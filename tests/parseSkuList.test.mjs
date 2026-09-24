import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSku, parseSkuList, parseInventorySheetRows, parseSkuStockRows } from '../lib/parseSkuList.js';

test('splits comma, space, and newline SKU lists and drops duplicates', () => {
  assert.deepEqual(parseSkuList('123456,123456,654321'), ['123456', '654321']);
  assert.deepEqual(parseSkuList('ST4006 ST4007\nST4008;ST4006'), ['ST4006', 'ST4007', 'ST4008']);
  assert.deepEqual(parseSkuList('  '), []);
});

test('reads SKU / product name / stock / supplier / brand and ignores name for writes', () => {
  const rows = parseInventorySheetRows([
    ['SKU', 'PRODUCT NAME', 'STOCK', 'SUPPLIER NAME', 'BRAND'],
    [644161878772, 'Air Blower', 0, 'China', 'NEXSO'],
    ['644161878933', 'Matcha Set', 4, '', 'NEXSO'],
  ]);
  assert.deepEqual(rows, [
    { sku: '644161878772', name: 'Air Blower', stockQuantity: 0, supplierName: 'China', brand: 'NEXSO' },
    { sku: '644161878933', name: 'Matcha Set', stockQuantity: 4, supplierName: '', brand: 'NEXSO' },
  ]);
});

test('still reads two-column SKU and stock files', () => {
  assert.deepEqual(
    parseSkuStockRows([
      ['SKU', 'Stock'],
      ['ST4006', 20],
    ]),
    [{ sku: 'ST4006', name: '', stockQuantity: 20, supplierName: '', brand: '' }],
  );
});

test('keeps long numeric SKUs and scientific-notation cells', () => {
  assert.equal(normalizeSku(644161878772), '644161878772');
  assert.equal(normalizeSku('6.44161878772e+11'), '644161878772');
  assert.deepEqual(
    parseSkuStockRows([
      ['SKU', 'Stock'],
      [644161878772, 12],
      ['6.44161878772e+11', 3],
    ]),
    [
      { sku: '644161878772', name: '', stockQuantity: 3, supplierName: '', brand: '' },
    ],
  );
});
