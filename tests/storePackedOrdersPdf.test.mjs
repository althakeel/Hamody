import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPackedOrderPdfRows, buildPackedOrdersPdfBuffer } from '../lib/storePackedOrdersPdf.js';

test('packed order pdf rows keep Arabic customer names as text', () => {
  const rows = buildPackedOrderPdfRows([{
    shortOrderNumber: 619715,
    status: 'WAITING_FOR_PICKUP',
    total: 99,
    guestName: 'محمد مصطفى',
    guestPhone: '+9710528893053',
    shippingAddress: { city: 'دبي' },
    waslah: { emxTrackingNumber: '1000047297737' },
    warehousePacking: { packed: true, packedAt: '2026-09-28T10:28:00.000Z' },
    orderItems: [{ quantity: 1 }],
  }]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0][1], '619715');
  assert.equal(rows[0][2], '1000047297737');
  assert.match(rows[0][3], /[\u0600-\u06FF]/);
  assert.match(rows[0][5], /[\u0600-\u06FF]/);
  assert.equal(rows[0][9], 'EMX');
});

test('packed orders pdf is a real file with the Arabic font', () => {
  const buffer = buildPackedOrdersPdfBuffer([{
    shortOrderNumber: 619715,
    status: 'WAITING_FOR_PICKUP',
    total: 69.9,
    guestName: 'محمد مصطفى',
    shippingAddress: { city: 'Dubai', phone: '+971500000000' },
    waslah: { emxTrackingNumber: '1000047297737' },
    warehousePacking: { packed: true, packedAt: '2026-09-28T10:30:00.000Z' },
    orderItems: [{ quantity: 1 }],
  }], { dateKey: '2026-09-28', generatedAt: new Date('2026-09-28T10:31:00.000Z') });

  const text = Buffer.from(buffer).toString('latin1');
  assert.match(text, /^%PDF/);
  assert.match(text, /Tajawal/);
  assert.ok(buffer.length > 20000);
});
