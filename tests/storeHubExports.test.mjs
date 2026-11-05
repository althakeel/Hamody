import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

import {
  buildStoreExportDateFilter,
  buildCustomerExcelFilename,
  STORE_EXPORT_TYPES,
} from '../lib/storeHubExports.js';
import {
  buildCustomerRegistrationWorkbook,
  classifyCustomerSalesChannel,
  classifyCustomerOrderSource,
} from '../lib/storeCustomerExport.js';
import {
  buildDailyOrderOutcomeSummary,
  buildLocationOrderSummary,
  buildOrderExcelWorkbook,
} from '../lib/storeOrderExcelExport.js';

test('custom export date-time bounds use Dubai time and an exclusive end', () => {
  const filter = buildStoreExportDateFilter(
    'custom',
    '2026-10-31',
    '2026-11-02',
    '10:00',
    '10:00',
  );

  assert.equal(filter.createdAt.$gte.toISOString(), '2026-10-31T06:00:00.000Z');
  assert.equal(filter.createdAt.$lt.toISOString(), '2026-11-02T06:00:00.000Z');
});

test('custom export date-time bounds reject invalid times and reversed ranges', () => {
  assert.throws(
    () => buildStoreExportDateFilter('custom', '2026-10-31', '2026-11-02', '25:00', '10:00'),
    /Invalid date or time/,
  );
  assert.throws(
    () => buildStoreExportDateFilter('custom', '2026-11-02', '2026-10-31', '10:00', '10:00'),
    /must be before/,
  );
});

test('custom date-only export retains its inclusive end-of-day behavior', () => {
  const filter = buildStoreExportDateFilter('custom', '2026-10-31', '2026-11-02');
  const expectedStart = new Date('2026-10-31');
  const expectedEnd = new Date('2026-11-02');
  expectedEnd.setHours(23, 59, 59, 999);

  assert.equal(filter.createdAt.$gte.getTime(), expectedStart.getTime());
  assert.equal(filter.createdAt.$lte.getTime(), expectedEnd.getTime());
});

test('registered customer export charts registrations and registered/guest orders', async () => {
  const buffer = await buildCustomerRegistrationWorkbook({
    customers: [
      {
        _id: 'uid-1',
        name: 'Customer One',
        email: 'one@example.com',
        phone: '+971500000001',
        createdAt: new Date('2026-11-01T22:00:00.000Z'),
        firstVisitLocation: { city: 'Dubai', country: 'UAE' },
      },
      {
        _id: 'uid-2',
        name: 'Customer Two',
        email: 'two@example.com',
        createdAt: new Date('2026-11-02T07:00:00.000Z'),
      },
    ],
    orders: [
      {
        _id: 'order-registered',
        userId: 'uid-1',
        isGuest: false,
        total: 40,
        createdAt: new Date('2026-11-02T06:30:00.000Z'),
        attribution: { utmSource: 'facebook', utmMedium: 'paid' },
      },
      {
        _id: 'order-organic',
        userId: 'uid-1',
        isGuest: false,
        total: 20,
        createdAt: new Date('2026-11-02T07:00:00.000Z'),
        attribution: { utmSource: 'google', utmMedium: 'organic' },
      },
      {
        _id: 'order-guest',
        isGuest: true,
        guestName: 'Guest Customer',
        guestEmail: 'guest@example.com',
        total: 60,
        createdAt: new Date('2026-11-02T07:00:00.000Z'),
        attribution: { utmSource: 'instagram', utmMedium: 'paid_social' },
      },
    ],
    lifetimeOrderStats: [{ _id: 'uid-1', totalOrders: 5, totalSpent: 250 }],
    purchaseHistoryStats: [
      { _id: 'user:uid-1', totalOrders: 5, firstOrderAt: new Date('2025-01-01T00:00:00.000Z') },
      { _id: 'email:guest@example.com', totalOrders: 1, firstOrderAt: new Date('2026-11-02T07:00:00.000Z') },
    ],
    marketingExpenses: [{
      platform: 'FACEBOOK',
      amount: 100,
      startDate: new Date('2026-11-02T00:00:00.000Z'),
      endDate: new Date('2026-11-02T00:00:00.000Z'),
    }],
    trafficEvents: [{
      eventType: 'page_view',
      createdAt: new Date('2026-11-02T08:00:00.000Z'),
      context: {
        sessionId: 'organic-session',
        metadata: { referrer: 'https://www.google.com/' },
      },
    }],
    periodLabel: '2026-11-02 10:00 to 2026-11-02 12:00 (Dubai time)',
    dateRange: {
      fromDate: '2026-11-02',
      fromTime: '10:00',
      toDate: '2026-11-02',
      toTime: '12:00',
    },
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const summary = workbook.getWorksheet('Summary');
  const customers = workbook.getWorksheet('Registered Customers');
  const guests = workbook.getWorksheet('Guest Orders');

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), [
    'Summary',
    'Marketing & Retention',
    'Registered Customers',
    'Guest Orders',
  ]);
  assert.equal(summary.getImages().length, 3);
  assert.equal(summary.getCell('A6').value, 2);
  assert.equal(summary.getCell('B6').value, 2);
  assert.equal(summary.getCell('C6').value, 1);
  assert.equal(summary.getCell('D6').value, 3);
  assert.equal(summary.getCell('G6').value, 5);
  assert.equal(summary.getCell('J32').value, 1);
  assert.equal(summary.getCell('K32').value, 1);
  assert.equal(summary.getCell('L32').value, 0);
  assert.equal(summary.getCell('I33').value, 'Instagram');
  assert.equal(summary.getCell('J33').value, 1);
  assert.deepEqual(
    [summary.getCell('A53').value, summary.getCell('B53').value, summary.getCell('C53').value, summary.getCell('D53').value],
    ['2026-11-02', 2, 2, 1],
  );
  assert.equal(customers.getCell('B2').value, 'uid-1');
  assert.equal(customers.getCell('F2').value, 2);
  assert.equal(customers.getCell('G2').value, 1);
  assert.equal(customers.getCell('J2').value, 1);
  assert.equal(customers.getCell('M2').value, 5);
  assert.equal(customers.getCell('N2').value, 'AED 250');
  assert.equal(guests.getCell('C2').value, 'Guest Customer');
  assert.equal(guests.getCell('H2').value, 'instagram');
  assert.equal(guests.getCell('K2').value, 'AED 60');
  assert.equal(classifyCustomerOrderSource({ utmSource: 'facebook', utmMedium: 'paid' }), 'Facebook');
  assert.equal(classifyCustomerOrderSource({ utmSource: 'google', utmMedium: 'organic' }), 'Organic Search');
  assert.equal(classifyCustomerOrderSource({}), 'Unknown');
  const marketing = workbook.getWorksheet('Marketing & Retention');
  assert.equal(marketing.getCell('A6').value, 'Paid');
  assert.equal(marketing.getCell('B6').value, 2);
  assert.equal(marketing.getCell('A7').value, 'Organic');
  assert.equal(marketing.getCell('B7').value, 1);
  assert.equal(marketing.getCell('B16').value, 1);
  assert.equal(marketing.getCell('B17').value, 1);
  assert.equal(marketing.getCell('B18').value, 0.5);
  assert.equal(marketing.getCell('B22').value, 'AED 120');
  assert.equal(marketing.getCell('B23').value, 'AED 0');
  assert.equal(marketing.getCell('A27').value, 'AED 8.33');
  assert.equal(marketing.getCell('C27').value, 'AED 8.33');
  assert.equal(marketing.getCell('B52').value, 1);
  assert.equal(marketing.getCell('C52').value, 1);
  assert.equal(marketing.getCell('D52').value, 1);
  assert.equal(marketing.getCell('E52').value, 'AED 20');
  assert.equal(classifyCustomerSalesChannel({ utmSource: 'facebook', utmMedium: 'paid_social' }), 'Paid');
  assert.equal(classifyCustomerSalesChannel({ utmSource: 'instagram', utmMedium: 'social' }), 'Social');
  assert.equal(classifyCustomerSalesChannel({ utmSource: 'partner-site', utmMedium: 'referral' }), 'Referrals');
  assert.equal(classifyCustomerSalesChannel({ referrer: 'https://www.google.com/' }), 'Organic');
  assert.ok(STORE_EXPORT_TYPES.includes('customers'));
  assert.equal(
    buildCustomerExcelFilename('custom', '2026-11-02', '2026-11-02', '10:00', '11:00'),
    'store-customers-2026-11-02_1000_to_1100_to_2026-11-02.xlsx',
  );
});

test('order outcome summary groups Dubai dates and includes zero-order days', () => {
  const orders = [
    { createdAt: new Date('2026-10-31T06:00:00.000Z'), outcome: 'Success', method: 'COD' },
    { createdAt: new Date('2026-11-01T05:59:00.000Z'), outcome: 'Failed', method: 'CARD' },
    { createdAt: new Date('2026-11-01T06:00:00.000Z'), outcome: 'Cancelled', method: 'COD' },
    { createdAt: new Date('2026-11-02T05:59:00.000Z'), outcome: 'Pending', method: 'COD' },
  ];
  const summary = buildDailyOrderOutcomeSummary(
    orders,
    (order) => order.outcome,
    { fromDate: '2026-10-31', fromTime: '10:00', toDate: '2026-11-02', toTime: '10:00' },
    (order) => order.method,
  );

  assert.deepEqual(summary.dailyRows.map((row) => row.date), [
    '2026-10-31',
    '2026-11-01',
  ]);
  assert.deepEqual(summary.dailyRows.map((row) => row.total), [2, 2]);
  assert.deepEqual(summary.dailyRows.map((row) => row.cod), [1, 2]);
  assert.equal(summary.totals.success, 1);
  assert.equal(summary.totals.failed, 1);
  assert.equal(summary.totals.cancelled, 1);
  assert.equal(summary.totals.cod, 3);
});

test('location summary combines matching addresses and counts COD and outcomes', () => {
  const rows = buildLocationOrderSummary(
    [
      {
        shippingAddress: { district: 'Al Danah', city: 'Abu Dhabi', state: 'Abu Dhabi' },
        outcome: 'Success',
        method: 'COD',
      },
      {
        shippingAddress: { district: ' al danah ', city: 'ABU   DHABI', state: 'abu dhabi' },
        outcome: 'Failed',
        method: 'CARD',
      },
      {
        shippingAddress: { city: 'Dubai', country: 'UAE' },
        outcome: 'Pending',
        method: 'COD',
      },
    ],
    (order) => order.outcome,
    (order) => order.method,
  );

  assert.equal(rows[0].location, 'Al Danah, Abu Dhabi');
  assert.equal(rows[0].total, 2);
  assert.equal(rows[0].cod, 1);
  assert.equal(rows[0].success, 1);
  assert.equal(rows[0].failed, 1);
  assert.equal(rows[1].location, 'Dubai, UAE');
});

test('order Excel workbook starts with a chart summary and contains order details', async () => {
  const buffer = await buildOrderExcelWorkbook({
    orders: [{
      createdAt: new Date('2026-10-31T06:00:00.000Z'),
      outcome: 'Success',
      method: 'COD',
      shippingAddress: { city: 'Dubai', country: 'UAE' },
    }],
    detailHeaders: ['Order Number', 'Failed or Success'],
    detailRows: [['1001', 'Success']],
    resolvePaymentResult: (order) => order.outcome,
    resolvePaymentMethod: (order) => order.method,
    periodLabel: '2026-10-31 10:00 – 2026-11-02 10:00 (Dubai time)',
    fromDate: '2026-10-31',
    toDate: '2026-11-02',
    fromTime: '10:00',
    toTime: '10:00',
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Summary', 'Orders']);
  assert.equal(workbook.getWorksheet('Summary').getImages().length, 2);
  assert.equal(workbook.getWorksheet('Summary').getCell('A5').value, 1);
  assert.equal(workbook.getWorksheet('Summary').getCell('B5').value, 1);
  assert.equal(workbook.getWorksheet('Summary').getCell('G5').value, 1);
  assert.equal(workbook.getWorksheet('Summary').getCell('C29').value, 1);
  assert.equal(workbook.getWorksheet('Summary').getCell('A54').value, 'Dubai, UAE');
  assert.equal(workbook.getWorksheet('Summary').getCell('B54').value, 1);
  assert.equal(workbook.getWorksheet('Summary').getCell('C54').value, 1);
  assert.equal(workbook.getWorksheet('Orders').getCell('A2').value, '1001');
});
