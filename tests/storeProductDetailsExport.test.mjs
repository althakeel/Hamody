import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProductDetailsCsvRows } from '../lib/storeProductDetailsExport.js';

test('unresolved category IDs stay out of the exported category-name column', () => {
  const [row] = buildProductDetailsCsvRows([{
    _id: 'product-1',
    name: 'Example product',
    category: '6a3bd17ebeeb62e6800f7ab5',
    categories: ['6a3bd17ebeeb62e6800f7ab5'],
    categoryNames: [],
  }]);

  assert.equal(row.categories, '');
  assert.match(row.categoryIds, /6a3bd17ebeeb62e6800f7ab5/);
});

test('resolved category names are exported normally', () => {
  const [row] = buildProductDetailsCsvRows([{
    _id: 'product-2',
    name: 'Example product',
    category: 'category-id',
    categories: ['category-id'],
    categoryNames: ['Power Banks', 'PORODO'],
  }]);

  assert.equal(row.categories, 'Power Banks, PORODO');
});
