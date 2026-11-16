import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGoogleSheetsDashboardValues,
  buildGoogleSheetsOrderRow,
  buildGoogleSheetsOrderViews,
  getDubaiOrderReportingRanges,
  GOOGLE_SHEETS_ORDER_HEADERS,
  summarizeGoogleSheetsOrderRows,
} from '../lib/googleSheetsOrders.js';

test('Google Sheets order export keeps the requested 13-column layout', () => {
  assert.deepEqual(GOOGLE_SHEETS_ORDER_HEADERS, [
    'Order Number',
    'Order Status',
    'Order Type',
    'Order Date',
    'First Name (Billing)',
    'Contcat No',
    'State Code (Billing)',
    'Payment Method Title',
    'Currier Reference',
    'Customer Reason',
    'EMX Update',
    'Last Update Date',
    'Courier Reason for RTO',
  ]);
});

test('Google Sheets order export maps billing, EMX, and RTO details', () => {
  const row = buildGoogleSheetsOrderRow({
    _id: 'order-id',
    shortOrderNumber: 620750,
    status: 'RTO',
    fulfillmentKind: 'SALE',
    createdAt: '2026-11-05T06:00:00.000Z',
    updatedAt: '2026-11-05T07:00:00.000Z',
    paymentMethod: 'COD',
    guestName: 'Amina Noor',
    guestPhone: '501234567',
    shippingAddress: {
      name: 'Amina Noor',
      phone: '501234567',
      phoneCode: '+971',
      state: 'Dubai',
    },
    returns: [{ reason: 'Customer refused delivery', requestedAt: '2026-11-05T06:30:00.000Z' }],
    trackingId: '1000045332510',
    waslah: {
      appStatus: 'RTO',
      currentSubtag: 'ReturnToShipper_001',
      lastSubtagMessage: 'Shipment returned to sender',
      lastEventAt: '2026-11-05T08:00:00.000Z',
      events: [{
        subtag: 'ReturnToShipper_001',
        status: 'Return to shipper',
        remarks: 'Customer refused delivery',
      }],
    },
  });

  assert.equal(row.length, 13);
  assert.equal(row[0], '620750');
  assert.equal(row[1], 'RTO (not collected)');
  assert.equal(row[2], 'SALE');
  assert.equal(row[4], 'Amina');
  assert.equal(row[5], '+971501234567');
  assert.equal(row[6], 'Dubai');
  assert.equal(row[7], 'Cash on delivery');
  assert.equal(row[8], '1000045332510');
  assert.equal(row[9], 'Customer refused delivery');
  assert.equal(row[10], 'Shipment returned to sender');
  assert.equal(row[12], 'Customer refused delivery');
});

test('dashboard groups order status and EMX updates and includes recent details', () => {
  const rows = [
    ['620750', 'Processing', 'SALE', '2026-11-05 09:00:00', 'Amina', '+971500000001', 'Dubai', 'Cash on delivery', '', '', '', '2026-11-05 09:05:00', ''],
    ['620751', 'Processing', 'SALE', '2026-11-05 09:10:00', 'Omar', '+971500000002', 'Sharjah', 'Tabby', '100001', '', 'Shipment out for delivery', '2026-11-05 09:15:00', ''],
    ['620752', 'Completed', 'SALE', '2026-11-05 09:20:00', 'Sara', '+971500000003', 'Abu Dhabi', 'Credit / Debit Card', '100002', '', 'Delivered', '2026-11-05 09:25:00', ''],
  ];

  const summary = summarizeGoogleSheetsOrderRows(rows);
  assert.deepEqual(summary.statusRows, [
    ['Order placed', 0],
    ['Processing', 2],
    ['Pending payment', 0],
    ['Cancelled', 0],
    ['Payment Failed', 0],
    ['Returned', 0],
    ['Completed', 1],
    ['Out for delivery', 0],
  ]);
  assert.deepEqual(summary.emxRows, [
    ['Delivered', 1],
    ['Not yet created AWB', 1],
    ['Shipment out for delivery', 1],
  ]);
  assert.equal(summary.notYetCreatedAwb, 1);
  const withBlankStatus = summarizeGoogleSheetsOrderRows([
    ...rows,
    ['620753', '', 'SALE', '2026-11-05 09:30:00'],
  ]);
  assert.equal(withBlankStatus.statusRows.some(([label]) => label === '0'), false);

  const reportingRanges = getDubaiOrderReportingRanges('2026-11-05T06:00:00.000Z');
  const financialRows = [
    ['620750', 'Product A', 'Processing', '2026-11-05 09:00:00', 'Amina', '+971500000001', 'COD', '', '', 30, 100, 70, 15, 55],
    ['620751', 'Product B', 'Processing', '2026-11-05 09:10:00', 'Omar', '+971500000002', 'Tabby', '', '', 0, 120, 120, 15, 105],
    ['620752', 'Product C', 'Completed', '2026-11-05 09:20:00', 'Sara', '+971500000003', 'Card', '', '', 50, 80, 30, 0, 30],
  ];
  const dashboard = buildGoogleSheetsDashboardValues(
    rows,
    '2026-11-05T06:00:00.000Z',
    reportingRanges,
    financialRows,
    [
      { amount: 50, startDate: '2026-11-05T00:00:00.000Z', startTime: '09:00' },
      { amount: 25, startDate: '2026-11-03T00:00:00.000Z', startTime: '12:00' },
      { amount: 10, startDate: '2026-11-01T00:00:00.000Z', startTime: '15:00' },
    ],
  );
  assert.equal(dashboard.values[0][0], 'HAMODY Orders Summary - November 2026');
  assert.equal(dashboard.values[2][1], 3);
  assert.equal(dashboard.values[2][3], 3);
  assert.equal(dashboard.values[2][5], 3);
  assert.equal(dashboard.values[4][1], 300);
  assert.equal(dashboard.values[4][3], 300);
  assert.equal(dashboard.values[4][5], 300);
  assert.deepEqual(dashboard.values[5], [
    'Today marketing expense', 50,
    'This week marketing expense', 75,
    'This month marketing expense', 85,
  ]);
  assert.equal(dashboard.values[6][1], 80);
  assert.equal(dashboard.values[6][3], 220);
  assert.equal(dashboard.values[6][5], 220 / 300);
  assert.deepEqual(dashboard.values[7], [
    'Today delivery cost', 30,
    'This week delivery cost', 30,
    'This month delivery cost', 30,
  ]);
  assert.equal(dashboard.values[8][1], 105);
  assert.equal(dashboard.values[8][0], 'Net profit after all costs');
  assert.equal(dashboard.values[8][3], 85 / 300);
  assert.equal(dashboard.values[8][5], 1);
  assert.equal(dashboard.values[dashboard.periodSectionRow - 1][0], 'Order overview');
  assert.equal(dashboard.values[dashboard.statusSectionRow - 1][0], 'Status and courier updates');
  assert.equal(dashboard.values[dashboard.dailySalesSectionRow - 1][0], 'Daily sales report');
  assert.deepEqual(dashboard.values[dashboard.dailySalesStartRow - 1], [
    'Order Date',
    'Orders',
    'Sales',
    'Product Cost',
    'Gross Profit',
    'Delivery Cost',
    'Marketing Expense',
    'Net Profit',
  ]);
  assert.deepEqual(
    dashboard.dailySalesRows.find(([date]) => date === '2026-11-05'),
    ['2026-11-05', 3, 300, 80, 220, 30, 50, 140],
  );
  assert.deepEqual(dashboard.periodRows.map((row) => row.slice(0, 2)), [
    ['Today (10am to 10am)', 3],
    ['This week', 3],
    ['This month', 3],
  ]);
  assert.equal(dashboard.values[dashboard.detailStartRow - 1][0], 'Recent Order Number');
  assert.equal(dashboard.values[dashboard.detailStartRow][0], '620750');
});

test('processing and complaints views select the intended current-month orders', () => {
  const rows = [
    ['620749', 'Order placed', 'SALE', '2026-11-05 09:50:00', 'Lina', '+971500000000', 'Dubai', 'Cash on delivery', '', '', '', '2026-11-05 09:55:00', ''],
    ['620750', 'Processing', 'SALE', '2026-11-05 10:00:00', 'Amina', '+971500000001', 'Dubai', 'Cash on delivery', '100000', '', '', '2026-11-05 10:05:00', ''],
    ['620751', 'Completed', 'SALE', '2026-11-04 09:00:00', 'Omar', '+971500000002', 'Sharjah', 'Tabby', '100001', '', 'Delivered', '2026-11-04 09:15:00', ''],
    ['620752', 'Cancelled', 'SALE', '2026-11-05 10:20:00', 'Sara', '+971500000003', 'Abu Dhabi', 'Credit / Debit Card', '', 'Customer changed mind', '', '2026-11-05 10:25:00', ''],
    ['620753', 'Shipped', 'SALE', '2026-11-05 10:30:00', 'Ali', '+971500000004', 'Dubai', 'Cash on delivery', '100003', '', 'Customer not reachable over phone', '2026-11-05 10:35:00', ''],
    ['620754', 'RTO (not collected)', 'SALE', '2026-11-05 10:40:00', 'Maya', '+971500000005', 'Ajman', 'Cash on delivery', '100004', '', 'Returned to sender', '2026-11-05 10:45:00', 'Incorrect address'],
    ['620755', 'Pickup requested', 'SALE', '2026-11-05 08:30:00', 'Noor', '+971500000006', 'Dubai', 'Cash on delivery', '100005', '', 'Pickup Requested', '2026-11-05 09:30:00', ''],
  ];

  const productsByOrderNumber = new Map([
    ['620749', 'Desk Lamp'],
    ['620750', 'Camping Chair × 2'],
    ['620752', 'Portable Fan'],
    ['620755', 'Camping Tent'],
  ]);
  const pickupRequestedAtByOrderNumber = new Map([
    ['620753', '2026-11-05 09:59:59'],
    ['620755', '2026-11-05 09:30:00'],
  ]);
  const productCostByOrderNumber = new Map([
    ['620750', 30],
  ]);
  const salePriceByOrderNumber = new Map([
    ['620750', 100],
  ]);
  const reportingRanges = getDubaiOrderReportingRanges('2026-11-05T12:00:00.000Z');
  const views = buildGoogleSheetsOrderViews(rows, {
    productsByOrderNumber,
    productCostByOrderNumber,
    salePriceByOrderNumber,
    courierDeliveryCost: 15,
    pickupRequestedAtByOrderNumber,
    reportingRanges,
  });
  assert.equal(views.allOrdersRows.length, 7);
  assert.deepEqual(views.allOrdersRows[1].slice(-5), [30, 100, 70, 15, 55]);
  const yesterdayHistoryRow = views.orderHistoryRows.find((row) => row[3] === '620751');
  assert.deepEqual(yesterdayHistoryRow.slice(0, 3), ['Yes', 'Yes', 'Yes']);
  assert.deepEqual(views.processingRows.map((row) => row[0]), ['620749', '620750']);
  assert.deepEqual(views.processingRows.map((row) => row[2]), ['Order placed', 'Processing']);
  assert.deepEqual(views.complaintRows.map((row) => row[0]), ['620752', '620753', '620754']);
  assert.deepEqual(views.pickupRequestedRows.map((row) => row.slice(0, 4)), [
    ['620753', '', 'Shipped', '2026-11-05 09:59:59'],
    ['620755', 'Camping Tent', 'Pickup requested', '2026-11-05 09:30:00'],
  ]);
  assert.deepEqual(views.complaintRows[0], [
    '620752',
    'Portable Fan',
    'Cancelled',
    '2026-11-05 10:20:00',
    'Sara',
    '+971500000003',
    'Customer changed mind',
    '',
    '',
    '',
  ]);
});

test('today pickup requested uses the Dubai 10am-to-10am request window', () => {
  const rows = ['before-start', 'at-start', 'before-end', 'at-end'].map((orderNumber) => [
    orderNumber,
    'Shipped',
    'SALE',
    '2026-11-04 08:00:00',
  ]);
  const pickupRequestedAtByOrderNumber = new Map([
    ['before-start', '2026-11-04 09:59:59'],
    ['at-start', '2026-11-04 10:00:00'],
    ['before-end', '2026-11-05 09:59:59'],
    ['at-end', '2026-11-05 10:00:00'],
  ]);
  const reportingRanges = getDubaiOrderReportingRanges('2026-11-05T12:00:00.000Z');
  const views = buildGoogleSheetsOrderViews(rows, {
    pickupRequestedAtByOrderNumber,
    reportingRanges,
  });

  assert.deepEqual(
    views.pickupRequestedRows.map((row) => row[0]),
    ['at-start', 'before-end'],
  );
});

test('Dubai reporting ranges use Monday week start and current calendar month', () => {
  const ranges = getDubaiOrderReportingRanges('2026-11-05T12:00:00.000Z');
  assert.equal(ranges.dayStart.toISOString(), '2026-11-04T06:00:00.000Z');
  assert.equal(ranges.dayEnd.toISOString(), '2026-11-05T06:00:00.000Z');
  assert.equal(ranges.yesterdayStart.toISOString(), '2026-11-03T06:00:00.000Z');
  assert.equal(ranges.weekStart.toISOString(), '2026-11-01T20:00:00.000Z');
  assert.equal(ranges.monthStart.toISOString(), '2026-10-31T20:00:00.000Z');
  assert.equal(ranges.nextMonthStart.toISOString(), '2026-11-30T20:00:00.000Z');
  assert.equal(ranges.nextMonthStartText, '2026-12-01 00:00:00');
  assert.equal(ranges.monthLabel, 'November 2026');
});
