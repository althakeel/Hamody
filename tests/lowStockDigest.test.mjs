import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectLowStockItems,
  getLowStockDigestSlotKey,
  LOW_STOCK_THRESHOLD,
} from '../lib/lowStockDigest.js';
import {
  LOW_STOCK_ALERT_INTERVALS,
  isValidLowStockRecipients,
  validateLowStockAlertSettings,
} from '../lib/lowStockAlertSettings.js';

test('low-stock report includes only product and variant quantities below 20', () => {
  const items = collectLowStockItems([
    { _id: 'main-low', name: 'Low main stock', sku: 'MAIN-1', stockQuantity: 4 },
    { _id: 'main-at-limit', name: 'At limit', stockQuantity: 20 },
    {
      _id: 'variants',
      name: 'Variant product',
      sku: 'PARENT',
      hasVariants: true,
      stockQuantity: 25,
      variants: [
        { sku: 'VAR-1', stock: 3, options: { color: 'Blue', size: 'S' } },
        { sku: 'VAR-2', stock: 20, options: { color: 'Red', size: 'M' } },
        { sku: 'VAR-3', stock: 0 },
      ],
    },
  ]);

  assert.equal(LOW_STOCK_THRESHOLD, 20);
  assert.deepEqual(items.map((item) => [item.sku, item.stock]), [
    ['VAR-3', 0],
    ['VAR-1', 3],
    ['MAIN-1', 4],
  ]);
  assert.equal(items[1].variant, 'Blue / S');
});

test('low-stock digest slot remains stable for each three-hour UTC window', () => {
  assert.equal(getLowStockDigestSlotKey(new Date('2026-11-05T05:59:59.000Z'), 3), '2026-11-05T03-3h');
  assert.equal(getLowStockDigestSlotKey(new Date('2026-11-05T06:00:00.000Z'), 3), '2026-11-05T06-3h');
  assert.equal(getLowStockDigestSlotKey(new Date('2026-11-05T05:59:59.000Z'), 1), '2026-11-05T05-1h');
});

test('low-stock settings validate interval and recipient emails', () => {
  assert.deepEqual(LOW_STOCK_ALERT_INTERVALS, [1, 2, 3, 4, 6, 8, 12, 24]);
  assert.equal(isValidLowStockRecipients(['merchandise@althakeel.com', 'admin@example.com']), true);
  assert.equal(isValidLowStockRecipients(['not-an-email']), false);
  assert.equal(validateLowStockAlertSettings({
    enabled: true,
    threshold: 20,
    intervalHours: 3,
    recipients: ['merchandise@althakeel.com', 'admin@example.com'],
  }), '');
  assert.match(validateLowStockAlertSettings({
    enabled: true,
    threshold: 20,
    intervalHours: 5,
    recipients: ['admin@example.com'],
  }), /Interval must be/);
});
