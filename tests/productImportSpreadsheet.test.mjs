import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

import { sheetToRows } from '../lib/productImportSpreadsheet.js';

test('product import maps the vendor workbook columns and preserves numeric SKU precision', () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    [
      'Brand',
      'SKU',
      'Product Name',
      'Category',
      'Regular Price',
      'Selling',
      'Current Stock',
      'Image URL',
      'Additional Images',
    ],
    [
      'Bioline',
      6970117126013,
      'Wet cat food',
      'Cat Food Wet',
      11.7,
      9,
      5,
      'https://images.example/main.jpg',
      'https://images.example/side-1.jpg, https://images.example/side-2.jpg',
    ],
  ]);

  const [row] = sheetToRows(sheet);

  assert.equal(row.Brands, 'Bioline');
  assert.equal(String(row.SKU), '6970117126013');
  assert.equal(row.Name, 'Wet cat food');
  assert.equal(row.Categories, 'Cat Food Wet');
  assert.equal(row['Regular price'], 11.7);
  assert.equal(row['Sale price'], 9);
  assert.equal(row['Meta: _total_stock_quantity'], 5);
  assert.equal(row.Images, 'https://images.example/main.jpg');
  assert.equal(
    row['Images (2)'],
    'https://images.example/side-1.jpg, https://images.example/side-2.jpg',
  );
});
