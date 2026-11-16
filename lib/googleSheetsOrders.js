import { GoogleAuth } from 'google-auth-library';
import connectDB from '@/lib/mongodb';
import { loadFirebaseServiceAccount } from '@/lib/loadFirebaseServiceAccount';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Store from '@/models/Store';
import MarketingExpense from '@/models/MarketingExpense';
import ShippingSetting from '@/models/ShippingSetting';
import { getDisplayOrderNumber } from '@/lib/orderDisplay';
import { ACTIVE_RECORD_FILTER } from '@/lib/storeTrashFilters';
import { buildProductCostMap, calculateOrderProductCost } from '@/lib/storeSalesReport';
import { getWaslahCourierReason } from '@/lib/waslahTracking';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const DEFAULT_SPREADSHEET_ID = '12_FhGB-kseSczUv43rjpn_Hp9TbCpDxP_FSGe33UGKI';
const DEFAULT_TAB = 'Raw Data';
const DEFAULT_DASHBOARD_TAB = 'Summary';
const DEFAULT_ALL_ORDERS_TAB = 'All Orders';
const DEFAULT_PROCESSING_TAB = 'Processing';
const DEFAULT_COMPLAINTS_TAB = 'Complaints';
const DEFAULT_PICKUP_REQUESTED_TAB = 'Today Pickup Requested';
const DEFAULT_ORDER_HISTORY_TAB = 'Order History';

export const GOOGLE_SHEETS_ORDER_HEADERS = [
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
];

const COLUMN_WIDTHS = [100, 125, 85, 145, 135, 135, 125, 155, 165, 230, 220, 145, 240];

export const GOOGLE_SHEETS_OPERATIONAL_HEADERS = [
  'Order Number',
  'Product(s)',
  'Order Status',
  'Order Date',
  'First Name',
  'Contact No',
  'Payment Method',
  'Courier Reference',
  'EMX Update',
];

export const GOOGLE_SHEETS_ALL_ORDERS_HEADERS = [
  ...GOOGLE_SHEETS_OPERATIONAL_HEADERS,
  'Product Cost (AED)',
  'Sale Price (AED)',
  'Gross Profit (AED)',
  'Delivery Cost (AED)',
  'Net Profit (AED)',
];

export const GOOGLE_SHEETS_ORDER_HISTORY_HEADERS = [
  'Yesterday (10am to 10am)',
  'This Week',
  'This Month',
  ...GOOGLE_SHEETS_ALL_ORDERS_HEADERS,
];

export const GOOGLE_SHEETS_COMPLAINT_HEADERS = [
  'Order Number',
  'Product(s)',
  'Order Status',
  'Order Date',
  'First Name',
  'Contact No',
  'Customer Complaint',
  'EMX Update',
  'Courier Reason for RTO',
  'Courier Reference',
];

export const GOOGLE_SHEETS_PICKUP_HEADERS = [
  'Order Number',
  'Product(s)',
  'Order Status',
  'Pickup Requested At',
  'First Name',
  'Contact No',
  'Payment Method',
  'Courier Reference',
  'EMX Update',
];

const OPERATIONAL_COLUMN_WIDTHS = [100, 260, 125, 145, 135, 135, 150, 165, 220];
const ALL_ORDERS_COLUMN_WIDTHS = [...OPERATIONAL_COLUMN_WIDTHS, 130, 130, 135, 135, 135];
const ORDER_HISTORY_COLUMN_WIDTHS = [150, 95, 100, ...ALL_ORDERS_COLUMN_WIDTHS];
const COMPLAINT_COLUMN_WIDTHS = [100, 260, 125, 145, 135, 135, 240, 220, 240, 165];

const STATUS_LABELS = {
  PAYMENT_FAILED: 'Payment Failed',
  AWAITING_PAYMENT: 'Pending payment',
  // Keep sheet labels aligned with /store orders:
  // ORDER_PLACED = "Order Placed", PROCESSING = "Processing" (separate).
  ORDER_PLACED: 'Order placed',
  PROCESSING: 'Processing',
  WAITING_FOR_PICKUP: 'Waiting for pickup',
  PICKUP_REQUESTED: 'Pickup requested',
  PICKED_UP: 'Picked up',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Completed',
  RETURN_REQUESTED: 'Return requested',
  RETURN_APPROVED: 'Return approved',
  RETURNED: 'Returned',
  RTO: 'RTO (not collected)',
  RETURN: 'Return (after delivery)',
  REPLACEMENT: 'Replacement (after delivery)',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

const PAYMENT_TITLES = {
  COD: 'Cash on delivery',
  CARD: 'Credit / Debit Card',
  STRIPE: 'Credit / Debit Card (Stripe)',
  TABBY: 'Tabby',
  TAMARA: 'Tamara',
  RAZORPAY: 'Razorpay',
  VAULTSPAY: 'Credit / Debit Card (VaultsPay)',
  UPI: 'UPI',
  WALLET: 'Wallet',
};

function normalizeServiceAccount(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const privateKey = String(parsed.private_key || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();
  if (!parsed.client_email || !privateKey.includes('BEGIN')) return null;
  return {
    ...parsed,
    private_key: privateKey.endsWith('\n') ? privateKey : `${privateKey}\n`,
  };
}

function parseServiceAccountJson(raw) {
  const value = String(raw || '').trim();
  if (!value.startsWith('{')) return null;
  try {
    return normalizeServiceAccount(JSON.parse(value));
  } catch {
    return null;
  }
}

function loadSheetsServiceAccount() {
  const dedicated = parseServiceAccountJson(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON);
  if (dedicated) return dedicated;

  try {
    const firebaseAccount = normalizeServiceAccount(loadFirebaseServiceAccount());
    if (firebaseAccount) return firebaseAccount;
  } catch {
    // Fall through to the remaining service-account environment variables.
  }

  return parseServiceAccountJson(process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON)
    || parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}

export function getGoogleSheetsOrdersConfig() {
  const spreadsheetId = String(
    process.env.GOOGLE_SHEETS_ORDERS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID,
  ).trim();
  const tab = String(process.env.GOOGLE_SHEETS_ORDERS_TAB || DEFAULT_TAB).trim() || DEFAULT_TAB;
  const dashboardTab = String(
    process.env.GOOGLE_SHEETS_ORDERS_DASHBOARD_TAB || DEFAULT_DASHBOARD_TAB,
  ).trim() || DEFAULT_DASHBOARD_TAB;
  const allOrdersTab = String(
    process.env.GOOGLE_SHEETS_ORDERS_ALL_TAB || DEFAULT_ALL_ORDERS_TAB,
  ).trim() || DEFAULT_ALL_ORDERS_TAB;
  const processingTab = String(
    process.env.GOOGLE_SHEETS_ORDERS_PROCESSING_TAB || DEFAULT_PROCESSING_TAB,
  ).trim() || DEFAULT_PROCESSING_TAB;
  const complaintsTab = String(
    process.env.GOOGLE_SHEETS_ORDERS_COMPLAINTS_TAB || DEFAULT_COMPLAINTS_TAB,
  ).trim() || DEFAULT_COMPLAINTS_TAB;
  const pickupRequestedTab = String(
    process.env.GOOGLE_SHEETS_ORDERS_PICKUP_REQUESTED_TAB || DEFAULT_PICKUP_REQUESTED_TAB,
  ).trim() || DEFAULT_PICKUP_REQUESTED_TAB;
  const orderHistoryTab = String(
    process.env.GOOGLE_SHEETS_ORDERS_HISTORY_TAB || DEFAULT_ORDER_HISTORY_TAB,
  ).trim() || DEFAULT_ORDER_HISTORY_TAB;
  const storeId = String(process.env.GOOGLE_SHEETS_ORDERS_STORE_ID || '').trim();
  const serviceAccount = loadSheetsServiceAccount();

  return {
    spreadsheetId,
    tab,
    dashboardTab,
    allOrdersTab,
    processingTab,
    complaintsTab,
    pickupRequestedTab,
    orderHistoryTab,
    storeId,
    serviceAccount,
    clientEmail: String(serviceAccount?.client_email || '').trim(),
    spreadsheetUrl: spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      : '',
    configured: Boolean(spreadsheetId && serviceAccount),
  };
}

function escapeSheetTitle(value = '') {
  return String(value || DEFAULT_TAB).replace(/'/g, "''");
}

function formatDubaiDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function dubaiDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function dubaiMidnightUtc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, -4, 0, 0, 0));
}

function addHours(value, hours) {
  return new Date(new Date(value).getTime() + (hours * 60 * 60 * 1000));
}

export function getDubaiOrderReportingRanges(value = new Date()) {
  const { year, month, day } = dubaiDateParts(value);
  const dayEnd = addHours(dubaiMidnightUtc(year, month, day), 10);
  const dayStart = addHours(dayEnd, -24);
  const yesterdayStart = addHours(dayStart, -24);
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (calendarDay.getUTCDay() + 6) % 7;
  const weekStartCalendar = new Date(calendarDay);
  weekStartCalendar.setUTCDate(calendarDay.getUTCDate() - daysSinceMonday);
  const weekStart = dubaiMidnightUtc(
    weekStartCalendar.getUTCFullYear(),
    weekStartCalendar.getUTCMonth() + 1,
    weekStartCalendar.getUTCDate(),
  );
  const monthStart = dubaiMidnightUtc(year, month, 1);
  const nextMonthStart = month === 12
    ? dubaiMidnightUtc(year + 1, 1, 1)
    : dubaiMidnightUtc(year, month + 1, 1);

  return {
    dayStart,
    dayEnd,
    yesterdayStart,
    weekStart,
    monthStart,
    nextMonthStart,
    dayStartText: formatDubaiDate(dayStart),
    dayEndText: formatDubaiDate(dayEnd),
    yesterdayStartText: formatDubaiDate(yesterdayStart),
    weekStartText: formatDubaiDate(weekStart),
    monthStartText: formatDubaiDate(monthStart),
    nextMonthStartText: formatDubaiDate(nextMonthStart),
    monthLabel: new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dubai',
      month: 'long',
      year: 'numeric',
    }).format(monthStart),
  };
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function resolveFirstName(order = {}) {
  const address = order.shippingAddress || {};
  const explicit = firstNonEmpty(address.firstName, address.first_name, address.billingFirstName);
  if (explicit) return explicit;
  return firstNonEmpty(address.name, order.guestName).split(/\s+/).filter(Boolean)[0] || '';
}

function resolvePhone(order = {}) {
  const address = order.shippingAddress || {};
  const phone = firstNonEmpty(address.phone, order.guestPhone, order.alternatePhone);
  if (!phone || phone.startsWith('+')) return phone;
  const code = firstNonEmpty(address.phoneCode, order.alternatePhoneCode);
  return code ? `${code}${phone.replace(/^0+/, '')}` : phone;
}

function resolveState(order = {}) {
  const address = order.shippingAddress || {};
  return firstNonEmpty(address.stateCode, address.state, address.emirate, address.city);
}

function resolvePaymentTitle(order = {}) {
  const method = String(order.paymentMethod || '').trim().toUpperCase();
  return PAYMENT_TITLES[method] || method;
}

function resolveCustomerReason(order = {}) {
  const returns = Array.isArray(order.returns) ? order.returns : [];
  const latestReturn = [...returns]
    .sort((a, b) => new Date(b?.requestedAt || 0) - new Date(a?.requestedAt || 0))[0];
  return firstNonEmpty(
    latestReturn?.reason,
    order.returnReason,
    order.cancelReason,
    order.cancellationReason,
  );
}

function resolveCourierReference(order = {}) {
  return firstNonEmpty(
    order.waslah?.emxTrackingNumber,
    order.trackingId,
    order.waslah?.trackingNumber,
    order.awb,
    order.airwayBillNo,
    order.waslah?.reference,
    order.waslah?.orderId,
  );
}

function resolveEmxUpdate(order = {}) {
  const latestEvent = Array.isArray(order.waslah?.events) ? order.waslah.events[0] : null;
  return firstNonEmpty(
    order.waslah?.lastSubtagMessage,
    latestEvent?.remarks,
    latestEvent?.status,
    order.waslah?.currentStatus,
    order.waslah?.carrierStatus,
    order.waslah?.appStatus,
    order.waslah?.lastSubtag,
  );
}

function resolveLastUpdate(order = {}) {
  const candidates = [
    order.updatedAt,
    order.waslah?.lastEventAt,
    order.waslah?.lastStatusSyncAt,
  ]
    .map((value) => new Date(value || 0))
    .filter((value) => !Number.isNaN(value.getTime()) && value.getTime() > 0)
    .sort((a, b) => b - a);
  return formatDubaiDate(candidates[0] || order.createdAt);
}

function resolveRtoReason(order = {}) {
  const courier = getWaslahCourierReason(order);
  const status = String(order.status || '').toUpperCase();
  const courierStatus = String(courier?.courierStatus || '').toUpperCase();
  const isRto = status === 'RTO' || courierStatus === 'RTO';
  return isRto || courier?.isFailure ? String(courier?.reason || '').trim() : '';
}

function resolveOrderProducts(order = {}) {
  const lines = Array.isArray(order.orderItems) && order.orderItems.length
    ? order.orderItems
    : (Array.isArray(order.items) ? order.items : []);
  const labels = lines.map((item) => {
    const name = firstNonEmpty(
      item?.name,
      item?.productName,
      item?.title,
      item?.productId?.name,
      item?.product?.name,
    );
    if (!name) return '';
    const quantity = Math.max(1, Number(item?.quantity || 1));
    return quantity > 1 ? `${name} × ${quantity}` : name;
  }).filter(Boolean);
  return [...new Set(labels)].join(' | ');
}

export function buildGoogleSheetsOrderRow(order = {}) {
  const status = String(order.status || '').trim().toUpperCase();
  const orderType = String(order.fulfillmentKind || 'SALE').trim().toUpperCase();
  return [
    String(getDisplayOrderNumber(order) || order.legacySourceId || order._id || ''),
    STATUS_LABELS[status] || status,
    orderType,
    formatDubaiDate(order.createdAt),
    resolveFirstName(order),
    resolvePhone(order),
    resolveState(order),
    resolvePaymentTitle(order),
    resolveCourierReference(order),
    resolveCustomerReason(order),
    resolveEmxUpdate(order),
    resolveLastUpdate(order),
    resolveRtoReason(order),
  ];
}

const COMPLAINT_STATUSES = new Set([
  'Return requested',
  'Return approved',
  'Returned',
  'RTO (not collected)',
  'Return (after delivery)',
]);

const COURIER_COMPLAINT_PATTERN = /failed|refused|not reachable|incorrect address|unsuccessful|damaged|lost|complaint|return|\brto\b/i;

function relatedValue(map, row) {
  return map instanceof Map ? String(map.get(String(row?.[0] || '')) || '') : '';
}

function buildOperationalRow(row = [], productsByOrderNumber = new Map()) {
  return [
    row[0],
    relatedValue(productsByOrderNumber, row),
    row[1],
    row[3],
    row[4],
    row[5],
    row[7],
    row[8],
    row[10],
  ];
}

function buildAllOrdersRow(
  row = [],
  productsByOrderNumber = new Map(),
  productCostByOrderNumber = new Map(),
  salePriceByOrderNumber = new Map(),
  courierDeliveryCost = 0,
) {
  const productCost = Number(relatedValue(productCostByOrderNumber, row) || 0);
  const salePrice = Number(relatedValue(salePriceByOrderNumber, row) || 0);
  const grossProfit = salePrice - productCost;
  const deliveryCost = String(row?.[8] || '').trim()
    ? Math.max(0, Number(courierDeliveryCost) || 0)
    : 0;
  return [
    ...buildOperationalRow(row, productsByOrderNumber),
    productCost,
    salePrice,
    Number(grossProfit.toFixed(2)),
    Number(deliveryCost.toFixed(2)),
    Number((grossProfit - deliveryCost).toFixed(2)),
  ];
}

function buildOrderHistoryRow(
  row = [],
  productsByOrderNumber = new Map(),
  productCostByOrderNumber = new Map(),
  salePriceByOrderNumber = new Map(),
  reportingRanges = getDubaiOrderReportingRanges(),
  courierDeliveryCost = 0,
) {
  const orderDate = String(row?.[3] || '');
  const isYesterday = orderDate >= reportingRanges.yesterdayStartText
    && orderDate < reportingRanges.dayStartText;
  const isThisWeek = orderDate >= reportingRanges.weekStartText;
  return [
    isYesterday ? 'Yes' : '',
    isThisWeek ? 'Yes' : '',
    'Yes',
    ...buildAllOrdersRow(
      row,
      productsByOrderNumber,
      productCostByOrderNumber,
      salePriceByOrderNumber,
      courierDeliveryCost,
    ),
  ];
}

function buildComplaintRow(row = [], productsByOrderNumber = new Map()) {
  return [
    row[0],
    relatedValue(productsByOrderNumber, row),
    row[1],
    row[3],
    row[4],
    row[5],
    row[9],
    row[10],
    row[12],
    row[8],
  ];
}

function buildPickupRequestedRow(
  row = [],
  productsByOrderNumber = new Map(),
  pickupRequestedAtByOrderNumber = new Map(),
) {
  const operational = buildOperationalRow(row, productsByOrderNumber);
  operational[3] = relatedValue(pickupRequestedAtByOrderNumber, row) || row[3];
  return operational;
}

function isComplaintOrderRow(row = []) {
  const status = String(row?.[1] || '').trim();
  const customerReason = String(row?.[9] || '').trim();
  const emxUpdate = String(row?.[10] || '').trim();
  const courierReason = String(row?.[12] || '').trim();
  return Boolean(
    customerReason
    || courierReason
    || COMPLAINT_STATUSES.has(status)
    || COURIER_COMPLAINT_PATTERN.test(emxUpdate),
  );
}

function resolveComplaintSummaryReason(row = []) {
  return firstNonEmpty(
    row?.[12],
    row?.[9],
    COURIER_COMPLAINT_PATTERN.test(String(row?.[10] || '')) ? row?.[10] : '',
    row?.[1],
  );
}

export function buildGoogleSheetsOrderViews(rows = [], options = {}) {
  const productsByOrderNumber = options.productsByOrderNumber || new Map();
  const productCostByOrderNumber = options.productCostByOrderNumber || new Map();
  const salePriceByOrderNumber = options.salePriceByOrderNumber || new Map();
  const courierDeliveryCost = Math.max(0, Number(options.courierDeliveryCost) || 0);
  const pickupRequestedAtByOrderNumber = options.pickupRequestedAtByOrderNumber || new Map();
  const reportingRanges = options.reportingRanges || getDubaiOrderReportingRanges();
  const allOrdersRows = rows.map((row) => buildAllOrdersRow(
    row,
    productsByOrderNumber,
    productCostByOrderNumber,
    salePriceByOrderNumber,
    courierDeliveryCost,
  ));
  const orderHistoryRows = rows.map((row) => buildOrderHistoryRow(
    row,
    productsByOrderNumber,
    productCostByOrderNumber,
    salePriceByOrderNumber,
    reportingRanges,
    courierDeliveryCost,
  ));
  // Processing tab = ops queue (same idea as store Pending shipment):
  // Order placed + Processing. Labels stay distinct in column C.
  const processingRows = rows
    .filter((row) => {
      const status = String(row?.[1] || '').trim();
      return status === 'Order placed' || status === 'Processing';
    })
    .map((row) => buildOperationalRow(row, productsByOrderNumber));
  const complaintRows = rows
    .filter(isComplaintOrderRow)
    .map((row) => buildComplaintRow(row, productsByOrderNumber));
  const pickupRequestedRows = rows
    .filter((row) => {
      const recordedRequestedAt = relatedValue(pickupRequestedAtByOrderNumber, row);
      const hasRecordedRequest = Boolean(recordedRequestedAt);
      if (!hasRecordedRequest && String(row?.[1] || '').trim() !== 'Pickup requested') return false;
      const requestedAt = recordedRequestedAt || String(row?.[3] || '');
      return requestedAt >= reportingRanges.dayStartText
        && requestedAt < reportingRanges.dayEndText;
    })
    .map((row) => buildPickupRequestedRow(
      row,
      productsByOrderNumber,
      pickupRequestedAtByOrderNumber,
    ));

  return {
    allOrdersRows,
    orderHistoryRows,
    processingRows,
    complaintRows,
    pickupRequestedRows,
  };
}

const REQUIRED_STATUS_SUMMARY_ORDER = [
  'Order placed',
  'Processing',
  'Pending payment',
  'Cancelled',
  'Payment Failed',
  'Returned',
  'Completed',
  'Out for delivery',
];

const STATUS_SUMMARY_ORDER = [
  ...REQUIRED_STATUS_SUMMARY_ORDER,
  'Pickup requested',
  'Waiting for pickup',
  'Picked up',
  'Shipped',
  'Return requested',
  'Return approved',
  'RTO (not collected)',
  'Return (after delivery)',
  'Replacement (after delivery)',
  'Refunded',
];

function incrementCount(map, value) {
  const key = String(value ?? '').trim() || '0';
  map.set(key, (map.get(key) || 0) + 1);
}

function sortedCountRows(map, emptyLabel) {
  const rows = [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return rows.length ? rows : [[emptyLabel, 0]];
}

export function summarizeGoogleSheetsOrderRows(rows = []) {
  const statusCounts = new Map();
  const emxCounts = new Map();

  for (const row of rows) {
    const status = String(row?.[1] ?? '').trim();
    if (status) incrementCount(statusCounts, status);
    const emxUpdate = String(row?.[10] ?? '').trim();
    const courierReference = String(row?.[8] ?? '').trim();
    incrementCount(
      emxCounts,
      emxUpdate || (courierReference ? '#N/A' : 'Not yet created AWB'),
    );
  }

  const statusRank = new Map(STATUS_SUMMARY_ORDER.map((label, index) => [label, index]));
  const requiredStatuses = new Set(REQUIRED_STATUS_SUMMARY_ORDER);
  const statusRows = REQUIRED_STATUS_SUMMARY_ORDER.map((label) => [
    label,
    statusCounts.get(label) || 0,
  ]);
  const additionalStatusRows = [...statusCounts.entries()]
    .filter(([label]) => !requiredStatuses.has(label))
    .sort(([left], [right]) => {
      const leftRank = statusRank.has(left) ? statusRank.get(left) : Number.MAX_SAFE_INTEGER;
      const rightRank = statusRank.has(right) ? statusRank.get(right) : Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.localeCompare(right);
    });
  statusRows.push(...additionalStatusRows);
  const emxRows = [...emxCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  return {
    statusRows,
    emxRows: emxRows.length ? emxRows : [['No EMX updates', 0]],
    notYetCreatedAwb: emxCounts.get('Not yet created AWB') || 0,
  };
}

function countStatus(rows, labels) {
  const accepted = new Set(Array.isArray(labels) ? labels : [labels]);
  return rows.reduce((count, row) => count + (accepted.has(String(row?.[1] || '')) ? 1 : 0), 0);
}

function buildPeriodSummaryRow(label, rows) {
  return [
    label,
    rows.length,
    countStatus(rows, 'Processing'),
    countStatus(rows, 'Pending payment'),
    countStatus(rows, 'Payment Failed'),
    countStatus(rows, 'Out for delivery'),
    countStatus(rows, 'Completed'),
    countStatus(rows, 'Cancelled'),
    countStatus(rows, ['Returned', 'RTO (not collected)', 'Return (after delivery)']),
  ];
}

function summarizeFinancialRows(rows = []) {
  return rows.reduce((summary, row) => {
    const productCost = Number(row?.[9] || 0);
    const salePrice = Number(row?.[10] || 0);
    const grossProfit = Number(row?.[11] || 0);
    const deliveryCost = Number(row?.[12] || 0);
    return {
      productCost: summary.productCost + productCost,
      salePrice: summary.salePrice + salePrice,
      grossProfit: summary.grossProfit + grossProfit,
      deliveryCost: summary.deliveryCost + deliveryCost,
      missingCostOrders: summary.missingCostOrders + (salePrice > 0 && productCost <= 0 ? 1 : 0),
    };
  }, {
    productCost: 0,
    salePrice: 0,
    grossProfit: 0,
    deliveryCost: 0,
    missingCostOrders: 0,
  });
}

function buildDailySalesRows(
  dailyCounts = new Map(),
  financialRows = [],
  marketingExpenses = [],
  reportingRanges = getDubaiOrderReportingRanges(),
) {
  const daily = new Map();
  const ensureDay = (date) => {
    if (!daily.has(date)) {
      daily.set(date, {
        orders: 0,
        productCost: 0,
        sales: 0,
        grossProfit: 0,
        deliveryCost: 0,
        marketingExpense: 0,
      });
    }
    return daily.get(date);
  };
  const isCurrentMonth = (dateTime) => dateTime >= reportingRanges.monthStartText
    && dateTime < reportingRanges.nextMonthStartText;

  for (const [date, count] of dailyCounts.entries()) {
    const dateText = String(date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) continue;
    if (!isCurrentMonth(`${dateText} 00:00:00`)) continue;
    ensureDay(dateText).orders = Number(count || 0);
  }

  for (const row of financialRows) {
    const orderDate = String(row?.[3] || '');
    if (!isCurrentMonth(orderDate)) continue;
    const date = orderDate.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const day = ensureDay(date);
    day.productCost += Number(row?.[9] || 0);
    day.sales += Number(row?.[10] || 0);
    day.grossProfit += Number(row?.[11] || 0);
    day.deliveryCost += Number(row?.[12] || 0);
  }

  for (const expense of marketingExpenses) {
    const startText = marketingExpenseStartText(expense);
    const amount = Number(expense?.amount || 0);
    if (!startText || !Number.isFinite(amount) || amount <= 0 || !isCurrentMonth(startText)) continue;
    ensureDay(startText.slice(0, 10)).marketingExpense += amount;
  }

  return [...daily.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, day]) => [
      date,
      day.orders,
      Number(day.sales.toFixed(2)),
      Number(day.productCost.toFixed(2)),
      Number(day.grossProfit.toFixed(2)),
      Number(day.deliveryCost.toFixed(2)),
      Number(day.marketingExpense.toFixed(2)),
      Number((day.grossProfit - day.deliveryCost - day.marketingExpense).toFixed(2)),
    ]);
}

function marketingExpenseStartText(expense = {}) {
  const startDate = expense.startDate || expense.createdAt;
  if (!startDate) return '';

  const parsedStartDate = new Date(startDate);
  if (Number.isNaN(parsedStartDate.getTime())) return '';

  const dateText = expense.startDate
    ? parsedStartDate.toISOString().slice(0, 10)
    : formatDubaiDate(parsedStartDate).slice(0, 10);
  const startTime = /^\d{2}:\d{2}$/.test(String(expense.startTime || ''))
    ? `${expense.startTime}:00`
    : '00:00:00';
  return `${dateText} ${startTime}`;
}

function summarizeMarketingExpenses(expenses = [], reportingRanges = getDubaiOrderReportingRanges()) {
  return expenses.reduce((summary, expense) => {
    const amount = Number(expense?.amount || 0);
    const startText = marketingExpenseStartText(expense);
    if (!Number.isFinite(amount) || amount <= 0 || !startText) return summary;

    if (startText >= reportingRanges.monthStartText && startText < reportingRanges.nextMonthStartText) {
      summary.month += amount;
    }
    if (startText >= reportingRanges.weekStartText && startText < reportingRanges.nextMonthStartText) {
      summary.week += amount;
    }
    if (startText >= reportingRanges.dayStartText && startText < reportingRanges.dayEndText) {
      summary.today += amount;
    }
    return summary;
  }, { today: 0, week: 0, month: 0 });
}

export function buildGoogleSheetsDashboardValues(
  rows = [],
  syncedAt = new Date(),
  reportingRanges = getDubaiOrderReportingRanges(syncedAt),
  financialRows = [],
  marketingExpenses = [],
) {
  const summary = summarizeGoogleSheetsOrderRows(rows);
  const views = buildGoogleSheetsOrderViews(rows);
  const summaryLength = Math.max(summary.statusRows.length, summary.emxRows.length);
  const todayRows = rows.filter((row) => {
    const orderDate = String(row?.[3] || '');
    return orderDate >= reportingRanges.dayStartText && orderDate < reportingRanges.dayEndText;
  });
  const weekRows = rows.filter((row) => String(row?.[3] || '') >= reportingRanges.weekStartText);
  const dailyCounts = new Map();
  const paymentCounts = new Map();
  const complaintReasonCounts = new Map();
  rows.forEach((row) => {
    incrementCount(dailyCounts, String(row?.[3] || '').slice(0, 10));
    incrementCount(paymentCounts, row?.[7]);
    if (isComplaintOrderRow(row)) {
      incrementCount(complaintReasonCounts, resolveComplaintSummaryReason(row));
    }
  });
  const dailyRows = [...dailyCounts.entries()].sort(([left], [right]) => left.localeCompare(right));
  const paymentRows = sortedCountRows(paymentCounts, 'No payment data');
  const complaintReasonRows = sortedCountRows(complaintReasonCounts, 'No complaints');
  const dailySalesRows = buildDailySalesRows(
    dailyCounts,
    financialRows,
    marketingExpenses,
    reportingRanges,
  );
  const todayFinancialRows = financialRows.filter((row) => {
    const orderDate = String(row?.[3] || '');
    return orderDate >= reportingRanges.dayStartText && orderDate < reportingRanges.dayEndText;
  });
  const weekFinancialRows = financialRows.filter(
    (row) => String(row?.[3] || '') >= reportingRanges.weekStartText,
  );
  const todayFinancialSummary = summarizeFinancialRows(todayFinancialRows);
  const weekFinancialSummary = summarizeFinancialRows(weekFinancialRows);
  const monthFinancialSummary = summarizeFinancialRows(financialRows);
  const marketingSummary = summarizeMarketingExpenses(marketingExpenses, reportingRanges);
  const profitMargin = monthFinancialSummary.salePrice > 0
    ? monthFinancialSummary.grossProfit / monthFinancialSummary.salePrice
    : 0;
  const marketingShare = monthFinancialSummary.salePrice > 0
    ? marketingSummary.month / monthFinancialSummary.salePrice
    : 0;
  const netAfterMarketingAndDelivery = monthFinancialSummary.grossProfit
    - monthFinancialSummary.deliveryCost
    - marketingSummary.month;
  const periodRows = [
    buildPeriodSummaryRow('Today (10am to 10am)', todayRows),
    buildPeriodSummaryRow('This week', weekRows),
    buildPeriodSummaryRow('This month', rows),
  ];
  const periodSectionRow = 11;
  const periodHeaderRow = 12;
  const statusSectionRow = 17;
  const statusHeaderRow = 18;
  const values = [
    [`HAMODY Orders Summary - ${reportingRanges.monthLabel}`],
    [
      'Last synced',
      formatDubaiDate(syncedAt),
      'Reporting window',
      `${reportingRanges.dayStartText} to ${reportingRanges.dayEndText}`,
    ],
    [
      'Today (10am to 10am)',
      todayRows.length,
      'This week',
      weekRows.length,
      'This month',
      rows.length,
    ],
    [
      'Processing',
      views.processingRows.length,
      'Complaints',
      views.complaintRows.length,
      'Not yet created AWB',
      summary.notYetCreatedAwb,
    ],
    [
      'Today sales',
      Number(todayFinancialSummary.salePrice.toFixed(2)),
      'This week sales',
      Number(weekFinancialSummary.salePrice.toFixed(2)),
      'This month sales',
      Number(monthFinancialSummary.salePrice.toFixed(2)),
    ],
    [
      'Today marketing expense',
      Number(marketingSummary.today.toFixed(2)),
      'This week marketing expense',
      Number(marketingSummary.week.toFixed(2)),
      'This month marketing expense',
      Number(marketingSummary.month.toFixed(2)),
    ],
    [
      'This month product cost',
      Number(monthFinancialSummary.productCost.toFixed(2)),
      'This month gross profit',
      Number(monthFinancialSummary.grossProfit.toFixed(2)),
      'Profit margin',
      profitMargin,
    ],
    [
      'Today delivery cost',
      Number(todayFinancialSummary.deliveryCost.toFixed(2)),
      'This week delivery cost',
      Number(weekFinancialSummary.deliveryCost.toFixed(2)),
      'This month delivery cost',
      Number(monthFinancialSummary.deliveryCost.toFixed(2)),
    ],
    [
      'Net profit after all costs',
      Number(netAfterMarketingAndDelivery.toFixed(2)),
      'Marketing % of sales',
      marketingShare,
      'Orders missing cost',
      monthFinancialSummary.missingCostOrders,
    ],
    [],
    ['Order overview'],
    [
      'Period',
      'Orders',
      'Processing',
      'Pending payment',
      'Payment Failed',
      'Out for delivery',
      'Completed',
      'Cancelled',
      'Returned / RTO',
    ],
    ...periodRows,
    [],
    ['Status and courier updates'],
    ['Order Status - This Month', 'Count', 'EMX Update - This Month', 'Count'],
  ];

  for (let index = 0; index < summaryLength; index += 1) {
    const status = summary.statusRows[index] || ['', ''];
    const emx = summary.emxRows[index] || ['', ''];
    values.push([status[0], status[1], emx[0], emx[1]]);
  }

  const secondarySectionRow = Math.max(36, values.length + 3);
  while (values.length < secondarySectionRow - 1) values.push([]);
  values.push(['Monthly activity']);
  const secondaryStartRow = secondarySectionRow + 1;
  values.push([
    'Order Date',
    'Orders',
    'Payment Method',
    'Orders',
    'Complaint / Failure Reason',
    'Orders',
  ]);
  const secondaryLength = Math.max(dailyRows.length, paymentRows.length, complaintReasonRows.length);
  for (let index = 0; index < secondaryLength; index += 1) {
    const daily = dailyRows[index] || ['', ''];
    const payment = paymentRows[index] || ['', ''];
    const complaint = complaintReasonRows[index] || ['', ''];
    values.push([daily[0], daily[1], payment[0], payment[1], complaint[0], complaint[1]]);
  }

  const dailySalesSectionRow = values.length + 3;
  while (values.length < dailySalesSectionRow - 1) values.push([]);
  values.push(['Daily sales report']);
  const dailySalesStartRow = dailySalesSectionRow + 1;
  values.push([
    'Order Date',
    'Orders',
    'Sales',
    'Product Cost',
    'Gross Profit',
    'Delivery Cost',
    'Marketing Expense',
    'Net Profit',
  ]);
  if (dailySalesRows.length) {
    values.push(...dailySalesRows);
  } else {
    values.push(['No daily sales data', 0, 0, 0, 0, 0, 0, 0]);
  }

  const detailSectionRow = Math.max(74, values.length + 3);
  while (values.length < detailSectionRow - 1) values.push([]);
  values.push(['Recent orders']);
  const detailStartRow = detailSectionRow + 1;
  values.push([
    'Recent Order Number',
    'Order Status',
    'Order Date',
    'First Name',
    'Contact No',
    'Courier Reference',
    'EMX Update',
  ]);
  rows.slice(0, 20).forEach((row) => {
    values.push([row[0], row[1], row[3], row[4], row[5], row[8], row[10]]);
  });

  return {
    values,
    detailStartRow,
    detailSectionRow,
    dailySalesStartRow,
    dailySalesSectionRow,
    secondaryStartRow,
    secondarySectionRow,
    periodHeaderRow,
    periodSectionRow,
    statusHeaderRow,
    statusSectionRow,
    periodRows,
    statusRows: summary.statusRows,
    emxRows: summary.emxRows,
    dailyRows,
    paymentRows,
    complaintReasonRows,
    dailySalesRows,
  };
}

async function resolveStoreId(configuredStoreId = '') {
  if (configuredStoreId) return configuredStoreId;

  const store = await Store.findOne({
    $or: [
      { name: { $regex: 'store\\s*1920', $options: 'i' } },
      { username: { $regex: 'hamody|store\\s*1920', $options: 'i' } },
      { website: { $regex: 'hamody\\.com|store1920\\.com', $options: 'i' } },
    ],
  })
    .sort({ isActive: -1, createdAt: 1 })
    .select('_id')
    .lean();

  if (store?._id) return String(store._id);

  const stores = await Store.find({}).select('_id').limit(2).lean();
  if (stores.length === 1) return String(stores[0]._id);

  throw new Error(
    'Could not uniquely identify the HAMODY store. Set GOOGLE_SHEETS_ORDERS_STORE_ID.',
  );
}

async function sheetsRequest(token, path, options = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Google Sheets request failed (${response.status})`);
  }
  return data;
}

async function ensureSheet(token, spreadsheetId, tab, { index } = {}) {
  const metadata = await sheetsRequest(
    token,
    `/spreadsheets/${spreadsheetId}?fields=sheets(properties,charts(chartId),bandedRanges(bandedRangeId))`,
  );
  const existing = (metadata.sheets || []).find((sheet) => sheet?.properties?.title === tab);
  if (existing) {
    return {
      sheetId: Number(existing.properties.sheetId),
      chartIds: (existing.charts || []).map((chart) => Number(chart.chartId)).filter(Number.isFinite),
      bandedRangeIds: (existing.bandedRanges || [])
        .map((banding) => Number(banding.bandedRangeId))
        .filter(Number.isFinite),
    };
  }

  const created = await sheetsRequest(token, `/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        addSheet: {
          properties: {
            title: tab,
            ...(Number.isInteger(index) ? { index } : {}),
          },
        },
      }],
    }),
  });
  return {
    sheetId: Number(created?.replies?.[0]?.addSheet?.properties?.sheetId || 0),
    chartIds: [],
    bandedRangeIds: [],
  };
}

async function migrateLegacySheetNames(token, config) {
  const metadata = await sheetsRequest(
    token,
    `/spreadsheets/${config.spreadsheetId}?fields=sheets(properties(sheetId,title))`,
  );
  const sheets = metadata.sheets || [];
  const titles = new Set(sheets.map((sheet) => sheet?.properties?.title));
  const requests = [];

  if (!titles.has(config.dashboardTab) && titles.has('Dashboard')) {
    const legacyDashboard = sheets.find((sheet) => sheet?.properties?.title === 'Dashboard');
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: Number(legacyDashboard.properties.sheetId),
          title: config.dashboardTab,
        },
        fields: 'title',
      },
    });
  }

  if (!titles.has(config.tab) && titles.has('Orders')) {
    const legacyOrders = sheets.find((sheet) => sheet?.properties?.title === 'Orders');
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: Number(legacyOrders.properties.sheetId),
          title: config.tab,
        },
        fields: 'title',
      },
    });
  }

  if (requests.length) {
    await sheetsRequest(token, `/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }
}

async function hideEmptyDefaultSheet(token, config) {
  const metadata = await sheetsRequest(
    token,
    `/spreadsheets/${config.spreadsheetId}?fields=sheets(properties(sheetId,title,hidden))`,
  );
  const defaultSheet = (metadata.sheets || [])
    .find((sheet) => sheet?.properties?.title === 'Sheet1');
  if (!defaultSheet || defaultSheet.properties.hidden) return;

  const range = "'Sheet1'!A1:Z1000";
  const data = await sheetsRequest(
    token,
    `/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}`,
  );
  const hasData = (data.values || []).some((row) => (
    row.some((value) => String(value ?? '').trim())
  ));
  if (hasData) return;

  await sheetsRequest(token, `/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        updateSheetProperties: {
          properties: {
            sheetId: Number(defaultSheet.properties.sheetId),
            hidden: true,
          },
          fields: 'hidden',
        },
      }],
    }),
  });
}

async function replaceTableTab(token, config, {
  sheetId,
  tab,
  headers,
  rows,
  index,
  columnWidths,
  bandedRangeIds = [],
  currencyColumnIndexes = [],
  highlightRowStatuses = [],
  statusColumnIndex = 1,
  headerColor = { red: 0.075, green: 0.2, blue: 0.36 },
  tabColor = { red: 0.12, green: 0.48, blue: 0.75 },
}) {
  const safeTab = escapeSheetTitle(tab);
  const values = [headers, ...rows];
  const columnCount = headers.length;
  const lastColumn = String.fromCharCode(64 + columnCount);
  await sheetsRequest(token, `/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        updateSheetProperties: {
          properties: {
            sheetId,
            index,
            tabColorStyle: { rgbColor: tabColor },
            gridProperties: {
              rowCount: Math.max(1000, values.length + 20),
              columnCount: Math.max(13, columnCount),
              hideGridlines: true,
            },
          },
          fields: 'index,tabColorStyle,gridProperties(rowCount,columnCount,hideGridlines)',
        },
      }],
    }),
  });

  const clearRange = `'${safeTab}'!A:${lastColumn}`;
  await sheetsRequest(
    token,
    `/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`,
    { method: 'POST', body: '{}' },
  );

  const chunkSize = 4000;
  for (let offset = 0; offset < values.length; offset += chunkSize) {
    const chunk = values.slice(offset, offset + chunkSize);
    const startRow = offset + 1;
    const range = `'${safeTab}'!A${startRow}:${lastColumn}${startRow + chunk.length - 1}`;
    await sheetsRequest(
      token,
      `/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        body: JSON.stringify({ range, majorDimension: 'ROWS', values: chunk }),
      },
    );
  }

  const requests = [
    ...bandedRangeIds.map((bandedRangeId) => ({ deleteBanding: { bandedRangeId } })),
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: columnCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: headerColor,
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            horizontalAlignment: 'CENTER',
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: Math.max(2, values.length),
          startColumnIndex: 0,
          endColumnIndex: columnCount,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
            borders: {
              bottom: {
                style: 'SOLID',
                color: { red: 0.88, green: 0.9, blue: 0.93 },
              },
            },
          },
        },
        fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy,borders.bottom)',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 38 },
        fields: 'pixelSize',
      },
    },
  ];

  columnWidths.forEach((pixelSize, columnIndex) => {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: columnIndex,
          endIndex: columnIndex + 1,
        },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    });
  });

  currencyColumnIndexes.forEach((columnIndex) => {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: Math.max(2, values.length),
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex + 1,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'NUMBER', pattern: '"AED" #,##0.00' },
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
      },
    });
  });

  requests.push({
    addBanding: {
      bandedRange: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: Math.max(2, values.length),
          startColumnIndex: 0,
          endColumnIndex: columnCount,
        },
        rowProperties: {
          headerColor: headerColor,
          firstBandColor: { red: 1, green: 1, blue: 1 },
          secondBandColor: { red: 0.955, green: 0.97, blue: 0.985 },
        },
      },
    },
  });

  const highlightedStatuses = new Set(highlightRowStatuses);
  rows.forEach((row, rowIndex) => {
    if (!highlightedStatuses.has(String(row?.[statusColumnIndex] || '').trim())) return;
    requests.push(
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: rowIndex + 1,
            endRowIndex: rowIndex + 2,
            startColumnIndex: 0,
            endColumnIndex: columnCount,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.86, green: 0.95, blue: 0.88 },
              textFormat: { foregroundColor: { red: 0.05, green: 0.34, blue: 0.17 } },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat.foregroundColor)',
        },
      },
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: rowIndex + 1,
            endRowIndex: rowIndex + 2,
            startColumnIndex: statusColumnIndex,
            endColumnIndex: statusColumnIndex + 1,
          },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      },
    );
  });

  requests.push({
    setBasicFilter: {
      filter: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: Math.max(1, values.length),
          startColumnIndex: 0,
          endColumnIndex: columnCount,
        },
      },
    },
  });
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: Math.max(1, values.length),
        startColumnIndex: 0,
        endColumnIndex: columnCount,
      },
      cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
      fields: 'userEnteredFormat.horizontalAlignment',
    },
  });

  await sheetsRequest(token, `/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
}

function chartSourceRange(
  sheetId,
  startColumnIndex,
  endColumnIndex,
  rowCount,
  startRowIndex = 8,
) {
  return {
    sources: [{
      sheetId,
      startRowIndex,
      endRowIndex: startRowIndex + 1 + rowCount,
      startColumnIndex,
      endColumnIndex,
    }],
  };
}

async function replaceDashboardTab(
  token,
  config,
  dashboard,
  rows,
  financialRows,
  marketingExpenses,
  syncedAt,
  reportingRanges,
) {
  const dashboardData = buildGoogleSheetsDashboardValues(
    rows,
    syncedAt,
    reportingRanges,
    financialRows,
    marketingExpenses,
  );
  const chartDataLabel = {
    type: 'DATA',
    textFormat: {
      foregroundColor: { red: 0.12, green: 0.17, blue: 0.24 },
      bold: true,
      fontSize: 10,
    },
  };
  const safeTab = escapeSheetTitle(config.dashboardTab);
  const clearRange = `'${safeTab}'!A:O`;
  await sheetsRequest(
    token,
    `/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`,
    { method: 'POST', body: '{}' },
  );

  const range = `'${safeTab}'!A1:O${dashboardData.values.length}`;
  await sheetsRequest(
    token,
    `/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: dashboardData.values,
      }),
    },
  );

  const sheetId = dashboard.sheetId;
  const requests = dashboard.chartIds.map((objectId) => ({ deleteEmbeddedObject: { objectId } }));
  requests.push(
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          index: 0,
          tabColorStyle: { rgbColor: { red: 0.075, green: 0.2, blue: 0.36 } },
          gridProperties: { frozenRowCount: 2, hideGridlines: true },
        },
        fields: 'index,tabColorStyle,gridProperties(frozenRowCount,hideGridlines)',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: Math.max(dashboardData.values.length + 8, 160),
          startColumnIndex: 0,
          endColumnIndex: 15,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 },
            textFormat: {
              foregroundColor: { red: 0.12, green: 0.17, blue: 0.24 },
              fontFamily: 'Arial',
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 15 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.075, green: 0.2, blue: 0.36 },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 16,
              fontFamily: 'Arial',
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 15 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.91, green: 0.95, blue: 1 },
            textFormat: { bold: true, foregroundColor: { red: 0.075, green: 0.2, blue: 0.36 } },
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.periodHeaderRow - 1,
          endRowIndex: dashboardData.periodHeaderRow,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.15, green: 0.38, blue: 0.62 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.statusHeaderRow - 1,
          endRowIndex: dashboardData.statusHeaderRow,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.15, green: 0.38, blue: 0.62 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.statusHeaderRow - 1,
          endRowIndex: dashboardData.statusHeaderRow,
          startColumnIndex: 2,
          endColumnIndex: 4,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.05, green: 0.42, blue: 0.46 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.secondaryStartRow - 1,
          endRowIndex: dashboardData.secondaryStartRow,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.05, green: 0.42, blue: 0.46 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.secondaryStartRow - 1,
          endRowIndex: dashboardData.secondaryStartRow,
          startColumnIndex: 2,
          endColumnIndex: 4,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.05, green: 0.42, blue: 0.46 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.secondaryStartRow - 1,
          endRowIndex: dashboardData.secondaryStartRow,
          startColumnIndex: 4,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.68, green: 0.2, blue: 0.22 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.dailySalesStartRow - 1,
          endRowIndex: dashboardData.dailySalesStartRow,
          startColumnIndex: 0,
          endColumnIndex: 8,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.05, green: 0.42, blue: 0.46 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.detailStartRow - 1,
          endRowIndex: dashboardData.detailStartRow,
          startColumnIndex: 0,
          endColumnIndex: 7,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.15, green: 0.38, blue: 0.62 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat',
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: 'Daily, weekly, and monthly orders',
            backgroundColor: { red: 1, green: 1, blue: 1 },
            fontName: 'Arial',
            titleTextFormat: {
              foregroundColor: { red: 0.075, green: 0.2, blue: 0.36 },
              bold: true,
              fontSize: 14,
            },
            basicChart: {
              chartType: 'COLUMN',
              legendPosition: 'NO_LEGEND',
              headerCount: 1,
              domains: [{
                domain: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    0,
                    1,
                    dashboardData.periodRows.length,
                    dashboardData.periodHeaderRow - 1,
                  ),
                },
              }],
              series: [{
                series: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    1,
                    2,
                    dashboardData.periodRows.length,
                    dashboardData.periodHeaderRow - 1,
                  ),
                },
                targetAxis: 'LEFT_AXIS',
                color: { red: 0.12, green: 0.48, blue: 0.75 },
                dataLabel: chartDataLabel,
              }],
              axis: [
                { position: 'BOTTOM_AXIS', title: 'Period' },
                { position: 'LEFT_AXIS', title: 'Orders' },
              ],
            },
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: dashboardData.periodSectionRow - 1, columnIndex: 9 },
              widthPixels: 720,
              heightPixels: 300,
            },
          },
        },
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: 'Orders by status - this month',
            backgroundColor: { red: 1, green: 1, blue: 1 },
            fontName: 'Arial',
            titleTextFormat: {
              foregroundColor: { red: 0.075, green: 0.2, blue: 0.36 },
              bold: true,
              fontSize: 14,
            },
            basicChart: {
              chartType: 'COLUMN',
              legendPosition: 'NO_LEGEND',
              headerCount: 1,
              domains: [{
                domain: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    0,
                    1,
                    dashboardData.statusRows.length,
                    dashboardData.statusHeaderRow - 1,
                  ),
                },
              }],
              series: [{
                series: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    1,
                    2,
                    dashboardData.statusRows.length,
                    dashboardData.statusHeaderRow - 1,
                  ),
                },
                targetAxis: 'LEFT_AXIS',
                color: { red: 0.12, green: 0.48, blue: 0.75 },
                dataLabel: chartDataLabel,
              }],
              axis: [
                { position: 'BOTTOM_AXIS', title: 'Order Status' },
                { position: 'LEFT_AXIS', title: 'Orders' },
              ],
            },
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: 23, columnIndex: 9 },
              widthPixels: 720,
              heightPixels: 300,
            },
          },
        },
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: 'EMX updates - this month',
            backgroundColor: { red: 1, green: 1, blue: 1 },
            fontName: 'Arial',
            titleTextFormat: {
              foregroundColor: { red: 0.05, green: 0.42, blue: 0.46 },
              bold: true,
              fontSize: 14,
            },
            basicChart: {
              chartType: 'BAR',
              legendPosition: 'NO_LEGEND',
              headerCount: 1,
              domains: [{
                domain: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    2,
                    3,
                    dashboardData.emxRows.length,
                    dashboardData.statusHeaderRow - 1,
                  ),
                },
              }],
              series: [{
                series: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    3,
                    4,
                    dashboardData.emxRows.length,
                    dashboardData.statusHeaderRow - 1,
                  ),
                },
                targetAxis: 'BOTTOM_AXIS',
                color: { red: 0.11, green: 0.66, blue: 0.52 },
                dataLabel: chartDataLabel,
              }],
              axis: [
                { position: 'LEFT_AXIS', title: 'EMX Update' },
                { position: 'BOTTOM_AXIS', title: 'Orders' },
              ],
            },
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: 39, columnIndex: 9 },
              widthPixels: 720,
              heightPixels: Math.min(420, Math.max(340, dashboardData.emxRows.length * 20 + 100)),
            },
          },
        },
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: 'Daily order trend - this month',
            backgroundColor: { red: 1, green: 1, blue: 1 },
            fontName: 'Arial',
            titleTextFormat: {
              foregroundColor: { red: 0.31, green: 0.18, blue: 0.62 },
              bold: true,
              fontSize: 14,
            },
            basicChart: {
              chartType: 'LINE',
              legendPosition: 'NO_LEGEND',
              headerCount: 1,
              domains: [{
                domain: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    0,
                    1,
                    dashboardData.dailyRows.length,
                    dashboardData.secondaryStartRow - 1,
                  ),
                },
              }],
              series: [{
                series: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    1,
                    2,
                    dashboardData.dailyRows.length,
                    dashboardData.secondaryStartRow - 1,
                  ),
                },
                targetAxis: 'LEFT_AXIS',
                color: { red: 0.35, green: 0.3, blue: 0.78 },
                dataLabel: chartDataLabel,
              }],
              axis: [
                { position: 'BOTTOM_AXIS', title: 'Order date' },
                { position: 'LEFT_AXIS', title: 'Orders' },
              ],
            },
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: 61, columnIndex: 9 },
              widthPixels: 720,
              heightPixels: 300,
            },
          },
        },
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: 'Payment methods - this month',
            backgroundColor: { red: 1, green: 1, blue: 1 },
            fontName: 'Arial',
            titleTextFormat: {
              foregroundColor: { red: 0.05, green: 0.42, blue: 0.46 },
              bold: true,
              fontSize: 14,
            },
            basicChart: {
              chartType: 'BAR',
              legendPosition: 'NO_LEGEND',
              headerCount: 1,
              domains: [{
                domain: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    2,
                    3,
                    dashboardData.paymentRows.length,
                    dashboardData.secondaryStartRow - 1,
                  ),
                },
              }],
              series: [{
                series: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    3,
                    4,
                    dashboardData.paymentRows.length,
                    dashboardData.secondaryStartRow - 1,
                  ),
                },
                targetAxis: 'BOTTOM_AXIS',
                color: { red: 0.05, green: 0.42, blue: 0.46 },
                dataLabel: chartDataLabel,
              }],
              axis: [
                { position: 'LEFT_AXIS', title: 'Payment method' },
                { position: 'BOTTOM_AXIS', title: 'Orders' },
              ],
            },
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: 77, columnIndex: 9 },
              widthPixels: 720,
              heightPixels: 300,
            },
          },
        },
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: 'Complaints and delivery failures - this month',
            backgroundColor: { red: 1, green: 1, blue: 1 },
            fontName: 'Arial',
            titleTextFormat: {
              foregroundColor: { red: 0.68, green: 0.2, blue: 0.22 },
              bold: true,
              fontSize: 14,
            },
            basicChart: {
              chartType: 'BAR',
              legendPosition: 'NO_LEGEND',
              headerCount: 1,
              domains: [{
                domain: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    4,
                    5,
                    dashboardData.complaintReasonRows.length,
                    dashboardData.secondaryStartRow - 1,
                  ),
                },
              }],
              series: [{
                series: {
                  sourceRange: chartSourceRange(
                    sheetId,
                    5,
                    6,
                    dashboardData.complaintReasonRows.length,
                    dashboardData.secondaryStartRow - 1,
                  ),
                },
                targetAxis: 'BOTTOM_AXIS',
                color: { red: 0.85, green: 0.27, blue: 0.25 },
                dataLabel: chartDataLabel,
              }],
              axis: [
                { position: 'LEFT_AXIS', title: 'Complaint / failure reason' },
                { position: 'BOTTOM_AXIS', title: 'Orders' },
              ],
            },
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: 93, columnIndex: 9 },
              widthPixels: 720,
              heightPixels: 330,
            },
          },
        },
      },
    },
  );

  const dashboardCards = [
    { row: 2, start: 0, color: { red: 0.93, green: 0.9, blue: 1 }, text: { red: 0.31, green: 0.18, blue: 0.62 } },
    { row: 2, start: 2, color: { red: 0.86, green: 0.93, blue: 1 }, text: { red: 0.08, green: 0.32, blue: 0.58 } },
    { row: 2, start: 4, color: { red: 0.86, green: 0.96, blue: 0.91 }, text: { red: 0.05, green: 0.42, blue: 0.26 } },
    { row: 3, start: 0, color: { red: 0.84, green: 0.94, blue: 1 }, text: { red: 0.08, green: 0.32, blue: 0.58 } },
    { row: 3, start: 2, color: { red: 1, green: 0.9, blue: 0.9 }, text: { red: 0.58, green: 0.12, blue: 0.14 } },
    { row: 3, start: 4, color: { red: 1, green: 0.94, blue: 0.8 }, text: { red: 0.55, green: 0.31, blue: 0.04 } },
    { row: 4, start: 0, color: { red: 0.88, green: 0.94, blue: 1 }, text: { red: 0.06, green: 0.3, blue: 0.58 } },
    { row: 4, start: 2, color: { red: 1, green: 0.95, blue: 0.84 }, text: { red: 0.55, green: 0.31, blue: 0.04 } },
    { row: 4, start: 4, color: { red: 0.86, green: 0.96, blue: 0.89 }, text: { red: 0.05, green: 0.42, blue: 0.24 } },
    { row: 5, start: 0, color: { red: 0.93, green: 0.9, blue: 1 }, text: { red: 0.31, green: 0.18, blue: 0.62 } },
    { row: 5, start: 2, color: { red: 1, green: 0.9, blue: 0.9 }, text: { red: 0.58, green: 0.12, blue: 0.14 } },
    { row: 5, start: 4, color: { red: 0.86, green: 0.96, blue: 0.89 }, text: { red: 0.05, green: 0.42, blue: 0.24 } },
    { row: 6, start: 0, color: { red: 0.88, green: 0.94, blue: 1 }, text: { red: 0.06, green: 0.3, blue: 0.58 } },
    { row: 6, start: 2, color: { red: 0.86, green: 0.96, blue: 0.91 }, text: { red: 0.05, green: 0.42, blue: 0.26 } },
    { row: 6, start: 4, color: { red: 0.93, green: 0.9, blue: 1 }, text: { red: 0.31, green: 0.18, blue: 0.62 } },
    { row: 7, start: 0, color: { red: 0.86, green: 0.96, blue: 0.89 }, text: { red: 0.05, green: 0.42, blue: 0.24 } },
    { row: 7, start: 2, color: { red: 1, green: 0.94, blue: 0.8 }, text: { red: 0.55, green: 0.31, blue: 0.04 } },
    { row: 7, start: 4, color: { red: 1, green: 0.9, blue: 0.9 }, text: { red: 0.58, green: 0.12, blue: 0.14 } },
    { row: 8, start: 0, color: { red: 0.84, green: 0.94, blue: 1 }, text: { red: 0.08, green: 0.32, blue: 0.58 } },
    { row: 8, start: 2, color: { red: 0.93, green: 0.9, blue: 1 }, text: { red: 0.31, green: 0.18, blue: 0.62 } },
    { row: 8, start: 4, color: { red: 1, green: 0.94, blue: 0.8 }, text: { red: 0.55, green: 0.31, blue: 0.04 } },
  ];
  dashboardCards.forEach(({ row, start, color, text: textColor }) => {
    requests.push(
      {
        repeatCell: {
          range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: start, endColumnIndex: start + 2 },
          cell: {
            userEnteredFormat: {
              backgroundColor: color,
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              wrapStrategy: 'WRAP',
              borders: {
                top: { style: 'SOLID', color: { red: 1, green: 1, blue: 1 } },
                bottom: { style: 'SOLID', color: { red: 1, green: 1, blue: 1 } },
                left: { style: 'SOLID', color: { red: 1, green: 1, blue: 1 } },
                right: { style: 'SOLID', color: { red: 1, green: 1, blue: 1 } },
              },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,borders)',
        },
      },
      {
        repeatCell: {
          range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: start, endColumnIndex: start + 1 },
          cell: { userEnteredFormat: { textFormat: { foregroundColor: textColor, bold: true, fontSize: 9 } } },
          fields: 'userEnteredFormat.textFormat',
        },
      },
      {
        repeatCell: {
          range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: start + 1, endColumnIndex: start + 2 },
          cell: { userEnteredFormat: { textFormat: { foregroundColor: textColor, bold: true, fontSize: 13 } } },
          fields: 'userEnteredFormat.textFormat',
        },
      },
    );
  });
  [4, 5, 6, 7, 8].forEach((rowIndex) => {
    [1, 3, 5].forEach((columnIndex) => {
      if ((rowIndex === 6 && columnIndex === 5) || (rowIndex === 8 && columnIndex > 1)) return;
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: columnIndex,
            endColumnIndex: columnIndex + 1,
          },
          cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '"AED" #,##0.00' } } },
          fields: 'userEnteredFormat.numberFormat',
        },
      });
    });
  });
  [
    { rowIndex: 6, columnIndex: 5 },
    { rowIndex: 8, columnIndex: 3 },
  ].forEach(({ rowIndex, columnIndex }) => {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex + 1,
        },
        cell: { userEnteredFormat: { numberFormat: { type: 'PERCENT', pattern: '0.0%' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  });

  [
    dashboardData.periodSectionRow,
    dashboardData.statusSectionRow,
    dashboardData.secondarySectionRow,
    dashboardData.dailySalesSectionRow,
    dashboardData.detailSectionRow,
  ].forEach((rowNumber) => {
    requests.push(
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: rowNumber - 1,
            endRowIndex: rowNumber,
            startColumnIndex: 0,
            endColumnIndex: 9,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.88, green: 0.93, blue: 0.98 },
              textFormat: {
                foregroundColor: { red: 0.075, green: 0.2, blue: 0.36 },
                bold: true,
                fontSize: 11,
              },
              borders: {
                bottom: { style: 'SOLID_MEDIUM', color: { red: 0.15, green: 0.38, blue: 0.62 } },
              },
            },
          },
          fields: 'userEnteredFormat',
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
          properties: { pixelSize: 28 },
          fields: 'pixelSize',
        },
      },
    );
  });

  const summaryBodyEnd = dashboardData.statusHeaderRow + Math.max(
    dashboardData.statusRows.length,
    dashboardData.emxRows.length,
  );
  const secondaryBodyEnd = dashboardData.secondaryStartRow + Math.max(
    dashboardData.dailyRows.length,
    dashboardData.paymentRows.length,
    dashboardData.complaintReasonRows.length,
  );
  const dailySalesBodyEnd = dashboardData.dailySalesStartRow
    + Math.max(1, dashboardData.dailySalesRows.length);
  requests.push(
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.periodHeaderRow,
          endRowIndex: dashboardData.periodHeaderRow + 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.96, green: 0.94, blue: 1 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.periodHeaderRow + 1,
          endRowIndex: dashboardData.periodHeaderRow + 2,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.92, green: 0.96, blue: 1 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.periodHeaderRow + 2,
          endRowIndex: dashboardData.periodHeaderRow + 3,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.9, green: 0.97, blue: 0.93 },
            textFormat: { bold: true },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat.bold)',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.statusHeaderRow,
          endRowIndex: summaryBodyEnd,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.94, green: 0.97, blue: 1 },
            borders: { bottom: { style: 'SOLID', color: { red: 0.88, green: 0.91, blue: 0.95 } } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,borders.bottom)',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.statusHeaderRow,
          endRowIndex: summaryBodyEnd,
          startColumnIndex: 2,
          endColumnIndex: 4,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.92, green: 0.98, blue: 0.97 },
            borders: { bottom: { style: 'SOLID', color: { red: 0.86, green: 0.93, blue: 0.92 } } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,borders.bottom)',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.secondaryStartRow,
          endRowIndex: secondaryBodyEnd,
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.96, green: 0.94, blue: 1 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.dailySalesStartRow,
          endRowIndex: dailySalesBodyEnd,
          startColumnIndex: 0,
          endColumnIndex: 8,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.92, green: 0.98, blue: 0.97 },
            borders: { bottom: { style: 'SOLID', color: { red: 0.86, green: 0.93, blue: 0.92 } } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,borders.bottom)',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.dailySalesStartRow,
          endRowIndex: dailySalesBodyEnd,
          startColumnIndex: 2,
          endColumnIndex: 8,
        },
        cell: {
          userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '"AED" #,##0.00' } },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.secondaryStartRow,
          endRowIndex: secondaryBodyEnd,
          startColumnIndex: 2,
          endColumnIndex: 4,
        },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.92, green: 0.98, blue: 0.97 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.secondaryStartRow,
          endRowIndex: secondaryBodyEnd,
          startColumnIndex: 4,
          endColumnIndex: 6,
        },
        cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 0.94, blue: 0.94 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dashboardData.detailStartRow,
          endRowIndex: dashboardData.detailStartRow + Math.min(20, rows.length),
          startColumnIndex: 0,
          endColumnIndex: 7,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.97, green: 0.98, blue: 1 },
            borders: { bottom: { style: 'SOLID', color: { red: 0.9, green: 0.92, blue: 0.95 } } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,borders.bottom)',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 46 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 30 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 2, endIndex: 9 },
        properties: { pixelSize: 48 },
        fields: 'pixelSize',
      },
    },
  );

  const widths = [205, 145, 205, 145, 205, 145, 170, 90, 170, 90, 170, 90, 190, 90, 90];
  widths.forEach((pixelSize, index) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: index, endIndex: index + 1 },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    });
  });
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: Math.max(1, dashboardData.values.length),
        startColumnIndex: 0,
        endColumnIndex: 15,
      },
      cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
      fields: 'userEnteredFormat.horizontalAlignment',
    },
  });

  await sheetsRequest(token, `/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
}

export async function syncOrdersToGoogleSheet() {
  const config = getGoogleSheetsOrdersConfig();
  if (!config.configured) {
    throw new Error(
      'Google Sheets authentication is not configured. Add a service account and share the sheet with it.',
    );
  }

  await connectDB();
  const storeId = await resolveStoreId(config.storeId);
  const reportingRanges = getDubaiOrderReportingRanges();
  const [orders, marketingExpenses, shippingSetting] = await Promise.all([
    Order.find({
      storeId,
      ...ACTIVE_RECORD_FILTER,
      $or: [
        {
          createdAt: {
            $gte: reportingRanges.monthStart,
            $lt: reportingRanges.nextMonthStart,
          },
        },
        {
          'waslah.pickupRequestedAt': {
            $gte: reportingRanges.dayStart,
            $lt: reportingRanges.dayEnd,
          },
        },
      ],
    })
      .select([
      '_id',
      'shortOrderNumber',
      'legacySourceId',
      'total',
      'status',
      'fulfillmentKind',
      'createdAt',
      'updatedAt',
      'guestName',
      'guestPhone',
      'alternatePhone',
      'alternatePhoneCode',
      'shippingAddress',
      'paymentMethod',
      'cancelReason',
      'cancellationReason',
      'returnReason',
      'returns.reason',
      'returns.requestedAt',
      'orderItems',
      'items',
      'trackingId',
      'awb',
      'airwayBillNo',
      'waslah',
    ].join(' '))
      .populate({ path: 'orderItems.productId', model: Product, select: 'name' })
      .sort({ createdAt: -1, shortOrderNumber: -1 })
      .lean(),
    MarketingExpense.find({
      storeId: { $in: ['default', String(storeId)] },
      $or: [
        {
          startDate: {
            $gte: reportingRanges.monthStart,
            $lt: reportingRanges.nextMonthStart,
          },
        },
        {
          startDate: { $exists: false },
          createdAt: {
            $gte: reportingRanges.monthStart,
            $lt: reportingRanges.nextMonthStart,
          },
        },
      ],
    })
      .select('amount startDate startTime createdAt')
      .lean(),
    ShippingSetting.findOne({ storeId })
      .select('courierDeliveryCost')
      .lean(),
  ]);

  const auth = new GoogleAuth({
    credentials: config.serviceAccount,
    scopes: [SHEETS_SCOPE],
  });
  const accessToken = await auth.getAccessToken();
  if (!accessToken) throw new Error('Failed to get a Google Sheets access token.');

  const monthlyOrders = orders.filter((order) => {
    const createdAt = new Date(order?.createdAt || 0);
    return createdAt >= reportingRanges.monthStart && createdAt < reportingRanges.nextMonthStart;
  });
  const exportRecords = monthlyOrders.map((order) => ({
    order,
    row: buildGoogleSheetsOrderRow(order),
  }));
  const pickupExportRecords = orders.map((order) => ({
    order,
    row: buildGoogleSheetsOrderRow(order),
  })).sort((left, right) => (
    new Date(right.order?.waslah?.pickupRequestedAt || 0).getTime()
      - new Date(left.order?.waslah?.pickupRequestedAt || 0).getTime()
  ));
  const rows = exportRecords.map(({ row }) => row);
  const productsByOrderNumber = new Map(exportRecords.map(({ order, row }) => [
    String(row[0]),
    resolveOrderProducts(order),
  ]));
  const catalogProductCostMap = await buildProductCostMap(monthlyOrders, Product);
  const productCostByOrderNumber = new Map(exportRecords.map(({ order, row }) => [
    String(row[0]),
    calculateOrderProductCost(order, catalogProductCostMap),
  ]));
  const salePriceByOrderNumber = new Map(exportRecords.map(({ order, row }) => [
    String(row[0]),
    Number(order?.total || 0),
  ]));
  const courierDeliveryCost = Math.max(0, Number(shippingSetting?.courierDeliveryCost) || 0);
  const pickupProductsByOrderNumber = new Map(pickupExportRecords.map(({ order, row }) => [
    String(row[0]),
    resolveOrderProducts(order),
  ]));
  const pickupRequestedAtByOrderNumber = new Map(pickupExportRecords.map(({ order, row }) => [
    String(row[0]),
    formatDubaiDate(order?.waslah?.pickupRequestedAt),
  ]));
  const {
    allOrdersRows,
    orderHistoryRows,
    processingRows,
    complaintRows,
  } = buildGoogleSheetsOrderViews(rows, {
    productsByOrderNumber,
    productCostByOrderNumber,
    salePriceByOrderNumber,
    courierDeliveryCost,
    pickupRequestedAtByOrderNumber,
    reportingRanges,
  });
  const pickupRequestedRows = buildGoogleSheetsOrderViews(
    pickupExportRecords.map(({ row }) => row),
    {
      productsByOrderNumber: pickupProductsByOrderNumber,
      pickupRequestedAtByOrderNumber,
      reportingRanges,
    },
  ).pickupRequestedRows;
  try {
    await migrateLegacySheetNames(accessToken, config);
    const rawDataSheet = await ensureSheet(accessToken, config.spreadsheetId, config.tab, { index: 6 });
    const dashboardSheet = await ensureSheet(
      accessToken,
      config.spreadsheetId,
      config.dashboardTab,
      { index: 0 },
    );
    const allOrdersSheet = await ensureSheet(
      accessToken,
      config.spreadsheetId,
      config.allOrdersTab,
      { index: 1 },
    );
    const processingSheet = await ensureSheet(
      accessToken,
      config.spreadsheetId,
      config.processingTab,
      { index: 2 },
    );
    const complaintsSheet = await ensureSheet(
      accessToken,
      config.spreadsheetId,
      config.complaintsTab,
      { index: 3 },
    );
    const pickupRequestedSheet = await ensureSheet(
      accessToken,
      config.spreadsheetId,
      config.pickupRequestedTab,
      { index: 4 },
    );
    const orderHistorySheet = await ensureSheet(
      accessToken,
      config.spreadsheetId,
      config.orderHistoryTab,
      { index: 5 },
    );
    await hideEmptyDefaultSheet(accessToken, config);
    const syncedAt = new Date();
    await replaceTableTab(accessToken, config, {
      sheetId: rawDataSheet.sheetId,
      tab: config.tab,
      headers: GOOGLE_SHEETS_ORDER_HEADERS,
      rows,
      index: 6,
      columnWidths: COLUMN_WIDTHS,
      bandedRangeIds: rawDataSheet.bandedRangeIds,
      headerColor: { red: 0.31, green: 0.36, blue: 0.42 },
      tabColor: { red: 0.55, green: 0.6, blue: 0.65 },
    });
    await replaceTableTab(accessToken, config, {
      sheetId: allOrdersSheet.sheetId,
      tab: config.allOrdersTab,
      headers: GOOGLE_SHEETS_ALL_ORDERS_HEADERS,
      rows: allOrdersRows,
      index: 1,
      columnWidths: ALL_ORDERS_COLUMN_WIDTHS,
      bandedRangeIds: allOrdersSheet.bandedRangeIds,
      currencyColumnIndexes: [9, 10, 11, 12, 13],
      highlightRowStatuses: ['Completed', 'Delivered'],
      statusColumnIndex: 2,
      headerColor: { red: 0.05, green: 0.42, blue: 0.46 },
      tabColor: { red: 0.08, green: 0.65, blue: 0.62 },
    });
    await replaceTableTab(accessToken, config, {
      sheetId: processingSheet.sheetId,
      tab: config.processingTab,
      headers: GOOGLE_SHEETS_OPERATIONAL_HEADERS,
      rows: processingRows,
      index: 2,
      columnWidths: OPERATIONAL_COLUMN_WIDTHS,
      bandedRangeIds: processingSheet.bandedRangeIds,
      headerColor: { red: 0.12, green: 0.4, blue: 0.72 },
      tabColor: { red: 0.2, green: 0.58, blue: 0.9 },
    });
    await replaceTableTab(accessToken, config, {
      sheetId: complaintsSheet.sheetId,
      tab: config.complaintsTab,
      headers: GOOGLE_SHEETS_COMPLAINT_HEADERS,
      rows: complaintRows,
      index: 3,
      columnWidths: COMPLAINT_COLUMN_WIDTHS,
      bandedRangeIds: complaintsSheet.bandedRangeIds,
      headerColor: { red: 0.68, green: 0.2, blue: 0.22 },
      tabColor: { red: 0.9, green: 0.33, blue: 0.31 },
    });
    await replaceTableTab(accessToken, config, {
      sheetId: pickupRequestedSheet.sheetId,
      tab: config.pickupRequestedTab,
      headers: GOOGLE_SHEETS_PICKUP_HEADERS,
      rows: pickupRequestedRows,
      index: 4,
      columnWidths: OPERATIONAL_COLUMN_WIDTHS,
      bandedRangeIds: pickupRequestedSheet.bandedRangeIds,
      headerColor: { red: 0.45, green: 0.3, blue: 0.68 },
      tabColor: { red: 0.58, green: 0.43, blue: 0.82 },
    });
    await replaceTableTab(accessToken, config, {
      sheetId: orderHistorySheet.sheetId,
      tab: config.orderHistoryTab,
      headers: GOOGLE_SHEETS_ORDER_HISTORY_HEADERS,
      rows: orderHistoryRows,
      index: 5,
      columnWidths: ORDER_HISTORY_COLUMN_WIDTHS,
      bandedRangeIds: orderHistorySheet.bandedRangeIds,
      currencyColumnIndexes: [12, 13, 14, 15, 16],
      highlightRowStatuses: ['Completed', 'Delivered'],
      statusColumnIndex: 5,
      headerColor: { red: 0.3, green: 0.24, blue: 0.55 },
      tabColor: { red: 0.48, green: 0.4, blue: 0.72 },
    });
    await replaceDashboardTab(
      accessToken,
      config,
      dashboardSheet,
      rows,
      allOrdersRows,
      marketingExpenses,
      syncedAt,
      reportingRanges,
    );
  } catch (error) {
    if (/permission|forbidden|not found/i.test(String(error?.message || ''))) {
      throw new Error(
        `Share the Google Sheet as Editor with ${config.clientEmail}. ${error.message}`,
      );
    }
    throw error;
  }

  return {
    success: true,
    rowCount: rows.length,
    storeId,
    tab: config.tab,
    dashboardTab: config.dashboardTab,
    allOrdersTab: config.allOrdersTab,
    processingTab: config.processingTab,
    complaintsTab: config.complaintsTab,
    pickupRequestedTab: config.pickupRequestedTab,
    orderHistoryTab: config.orderHistoryTab,
    processingCount: processingRows.length,
    complaintsCount: complaintRows.length,
    pickupRequestedCount: pickupRequestedRows.length,
    orderHistoryCount: orderHistoryRows.length,
    spreadsheetUrl: config.spreadsheetUrl,
    syncedAt: new Date().toISOString(),
  };
}
