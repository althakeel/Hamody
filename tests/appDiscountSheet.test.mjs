import test from 'node:test';
import assert from 'node:assert/strict';
import { rowsToAppPrices } from '../lib/appDiscountSheet.js';

test('excel rows use SKU and Mobile price', () => {
  const rows = rowsToAppPrices([
    { SKU: 'GL-100', 'Mobile price': 69 },
    { SKU: 'GL-100', 'Mobile price': 65 },
    { sku: '', price: 10 },
  ]);
  assert.deepEqual(rows, [{ sku: 'GL-100', mobilePrice: 65 }]);
});
