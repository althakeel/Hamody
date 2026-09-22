import * as XLSX from 'xlsx';
import { getDubaiDateParts } from '@/lib/storeOrdersByProductDates';
import { getSalesReportDateRangeLabel } from '@/lib/storeSalesReport';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function money(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function formatShortDate(year, month, day) {
  return `${pad2(day)} ${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`;
}

function addUtcDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function utcDateParts(date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function buildSalesReportPeriodGroups(orderRows = []) {
  return {
    monthly: groupSalesReportByPeriod(orderRows, (period) => ({
      key: period.monthKey,
      label: period.monthLabel,
      from: formatShortDate(period.year, period.month, 1),
      to: formatShortDate(period.year, period.month, lastDayOfMonth(period.year, period.month)),
    })),
    weekly: groupSalesReportByPeriod(orderRows, (period) => ({
      key: period.weekKey,
      label: period.weekLabel,
      from: period.weekStartLabel,
      to: period.weekEndLabel,
    })),
    daily: groupSalesReportByPeriod(orderRows, (period) => ({
      key: period.dateKey,
      label: period.dateLabel,
      from: period.dateLabel,
      to: period.dateLabel,
    })),
  };
}

export function getSalesReportPeriodParts(value) {
  const parts = getDubaiDateParts(value || new Date());
  const utcNoon = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  const weekStart = addUtcDays(utcNoon, -utcNoon.getUTCDay());
  const weekEnd = addUtcDays(weekStart, 6);
  const start = utcDateParts(weekStart);
  const end = utcDateParts(weekEnd);

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    dateKey: parts.date,
    dateLabel: formatShortDate(parts.year, parts.month, parts.day),
    monthKey: `${parts.year}-${pad2(parts.month)}`,
    monthLabel: `${MONTH_NAMES[parts.month - 1]} ${parts.year}`,
    weekKey: `${start.year}-${pad2(start.month)}-${pad2(start.day)}`,
    weekLabel: `${formatShortDate(start.year, start.month, start.day)} – ${formatShortDate(end.year, end.month, end.day)}`,
    weekStartLabel: formatShortDate(start.year, start.month, start.day),
    weekEndLabel: formatShortDate(end.year, end.month, end.day),
    timeLabel: `${pad2(parts.hour)}:${pad2(parts.minute)}`,
  };
}

function emptyPeriodTotals() {
  return {
    orders: 0,
    includedOrders: 0,
    failedOrders: 0,
    codOrders: 0,
    paidOnlineOrders: 0,
    grossRevenue: 0,
    refunded: 0,
    netRevenue: 0,
    productCost: 0,
    deliveryCost: 0,
    profit: 0,
  };
}

function addOrderToPeriod(target, row) {
  target.orders += 1;
  if (row.paymentBucket === 'cod') target.codOrders += 1;
  if (row.paymentBucket === 'paidOnline') target.paidOnlineOrders += 1;
  if (row.paymentBucket === 'failed') target.failedOrders += 1;

  if (!row.countsTowardRevenue) return;

  target.includedOrders += 1;
  target.grossRevenue += money(row.grossRevenue);
  target.refunded += money(row.refunded);
  target.netRevenue += money(row.netRevenue);
  target.productCost += money(row.productCost);
  target.deliveryCost += money(row.deliveryCost);
  target.profit += money(row.profit);
}

export function groupSalesReportByPeriod(rows, getKey) {
  const groups = new Map();

  for (const row of rows) {
    const period = getKey(row.period);
    if (!groups.has(period.key)) {
      groups.set(period.key, {
        key: period.key,
        label: period.label,
        from: period.from,
        to: period.to,
        ...emptyPeriodTotals(),
      });
    }
    addOrderToPeriod(groups.get(period.key), row);
  }

  return [...groups.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

function periodRows(groups) {
  const headers = [
    'Period',
    'From',
    'To',
    'Successful Orders',
    'Failed Orders',
    'COD Orders',
    'Paid Online',
    'Gross Revenue',
    'Refunded',
    'Net Revenue',
    'Product Cost',
    'Delivery Cost',
    'Profit / Loss',
    'Margin %',
  ];

  const rows = groups.map((group) => {
    const margin = group.netRevenue > 0
      ? Math.round((group.profit / group.netRevenue) * 10000) / 100
      : 0;

    return [
      group.label,
      group.from,
      group.to,
      group.includedOrders,
      group.failedOrders,
      group.codOrders,
      group.paidOnlineOrders,
      money(group.grossRevenue),
      money(group.refunded),
      money(group.netRevenue),
      money(group.productCost),
      money(group.deliveryCost),
      money(group.profit),
      margin,
    ];
  });

  if (groups.length > 1) {
    const totals = groups.reduce((acc, group) => {
      acc.includedOrders += group.includedOrders;
      acc.failedOrders += group.failedOrders;
      acc.codOrders += group.codOrders;
      acc.paidOnlineOrders += group.paidOnlineOrders;
      acc.grossRevenue += group.grossRevenue;
      acc.refunded += group.refunded;
      acc.netRevenue += group.netRevenue;
      acc.productCost += group.productCost;
      acc.deliveryCost += group.deliveryCost;
      acc.profit += group.profit;
      return acc;
    }, emptyPeriodTotals());

    rows.push([
      'Total',
      '',
      '',
      totals.includedOrders,
      totals.failedOrders,
      totals.codOrders,
      totals.paidOnlineOrders,
      money(totals.grossRevenue),
      money(totals.refunded),
      money(totals.netRevenue),
      money(totals.productCost),
      money(totals.deliveryCost),
      money(totals.profit),
      totals.netRevenue > 0 ? Math.round((totals.profit / totals.netRevenue) * 10000) / 100 : 0,
    ]);
  }

  return [headers, ...rows];
}

function columnWidths(matrix) {
  const widths = [];
  for (const row of matrix) {
    row.forEach((cell, index) => {
      const length = String(cell ?? '').length;
      widths[index] = Math.max(widths[index] || 12, Math.min(length + 2, 36));
    });
  }
  return widths.map((wch) => ({ wch }));
}

function appendSheet(workbook, name, matrix) {
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  sheet['!cols'] = columnWidths(matrix);
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

export function buildSalesReportWorkbook({
  orderRows = [],
  dateRange = 'THIS_MONTH',
  fromDate = '',
  toDate = '',
  marketingCosts = 0,
  currency = 'AED',
} = {}) {
  const generated = getSalesReportPeriodParts(new Date());
  const rangeLabel = getSalesReportDateRangeLabel(dateRange, fromDate, toDate);
  const totals = emptyPeriodTotals();

  for (const row of orderRows) {
    addOrderToPeriod(totals, row);
  }

  const totalCosts = money(totals.productCost + totals.deliveryCost + marketingCosts);
  const profitAfterMarketing = money(totals.profit - marketingCosts);
  const margin = totals.netRevenue > 0
    ? Math.round((profitAfterMarketing / totals.netRevenue) * 10000) / 100
    : 0;
  const avgOrderValue = totals.includedOrders > 0
    ? money(totals.netRevenue / totals.includedOrders)
    : 0;

  const { monthly: monthGroups, weekly: weekGroups, daily: dayGroups } = buildSalesReportPeriodGroups(orderRows);

  const summary = [
    ['Sales Report'],
    ['Date range', rangeLabel],
    ['Generated', `${generated.dateLabel} ${generated.timeLabel} (Asia/Dubai)`],
    ['Currency', currency],
    [],
    ['Metric', 'Value'],
    ['Total orders in range', totals.orders],
    ['Successful orders', totals.includedOrders],
    ['Failed orders excluded', totals.failedOrders],
    ['Gross revenue', money(totals.grossRevenue)],
    ['Refunded', money(totals.refunded)],
    ['Net revenue', money(totals.netRevenue)],
    ['Product cost', money(totals.productCost)],
    ['Delivery cost', money(totals.deliveryCost)],
    ['Marketing cost', money(marketingCosts)],
    ['Total costs', totalCosts],
    ['Profit / Loss', profitAfterMarketing],
    ['Margin %', margin],
    ['Average order value', avgOrderValue],
    [],
    ['Payment type', 'Orders', `Net revenue (${currency})`],
    ['COD', totals.codOrders, money(orderRows
      .filter((row) => row.paymentBucket === 'cod' && row.countsTowardRevenue)
      .reduce((sum, row) => sum + row.netRevenue, 0))],
    ['Payment success', totals.paidOnlineOrders, money(orderRows
      .filter((row) => row.paymentBucket === 'paidOnline' && row.countsTowardRevenue)
      .reduce((sum, row) => sum + row.netRevenue, 0))],
    ['Failed', totals.failedOrders, 0],
  ];

  const orderHeaders = [
    'Order Number',
    'Date',
    'Time',
    'Year',
    'Month',
    'Week',
    'Payment Type',
    'Gross Revenue',
    'Refunded',
    'Net Revenue',
    'Product Cost',
    'Delivery Cost',
    'Profit / Loss',
    'Included In Revenue',
    'Status',
  ];

  const ordersSheet = [
    orderHeaders,
    ...orderRows.map((row) => [
      row.orderNumber,
      row.period.dateLabel,
      row.period.timeLabel,
      row.period.year,
      row.period.monthLabel,
      row.period.weekLabel,
      row.paymentLabel,
      row.grossRevenue,
      row.refunded,
      row.netRevenue,
      row.productCost,
      row.deliveryCost,
      row.profit,
      row.countsTowardRevenue ? 'Yes' : 'No',
      row.status,
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, 'Summary', summary);
  appendSheet(workbook, 'By Month', periodRows(monthGroups));
  appendSheet(workbook, 'By Week', periodRows(weekGroups));
  appendSheet(workbook, 'By Day', periodRows(dayGroups));
  appendSheet(workbook, 'Orders', ordersSheet);

  return workbook;
}

export function writeSalesReportWorkbook(workbook) {
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function getSalesReportExportFileName(dateRange, fromDate, toDate) {
  const stamp = getDubaiDateParts().date;
  const range = String(dateRange || 'THIS_MONTH').toLowerCase().replace(/_/g, '-');
  if (range === 'custom' && fromDate && toDate) {
    return `sales-report-${fromDate}-to-${toDate}.xlsx`;
  }
  return `sales-report-${range}-${stamp}.xlsx`;
}
