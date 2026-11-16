import ExcelJS from 'exceljs';
import { deflateSync } from 'node:zlib';

export const CUSTOMER_EXPORT_HEADERS = [
  'Customer ID',
  'Name',
  'Email',
  'Phone',
  'Type',
  'Total Orders',
  'Total Spent',
  'Average Order Value',
  'Wallet Balance',
  'First Order Date',
  'Last Order Date',
  'Latest Order ID',
  'Latest Order Total',
  'Latest Order Status',
  'Street',
  'District',
  'City',
  'State',
  'Country',
];

function formatExportDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatMoney(value, currency = 'AED') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  const formatted = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
  return `${currency} ${formatted}`;
}

function formatPhone(phone, phoneCode = '') {
  const digits = String(phone || '').trim();
  if (!digits) return '';
  const code = String(phoneCode || '').trim();
  if (code && !digits.startsWith('+') && !digits.startsWith(code.replace('+', ''))) {
    return `${code}${digits}`;
  }
  return digits;
}

function buildAverageOrderValue(customer) {
  const totalOrders = Number(customer?.totalOrders || 0);
  const totalSpent = Number(customer?.totalSpent || 0);
  if (!totalOrders) return 0;
  return totalSpent / totalOrders;
}

export function buildCustomerExportRow(customer, currency = 'AED') {
  const customerId = String(customer?.id || customer?._id || '').trim();
  const totalOrders = Number(customer?.totalOrders || 0);
  const totalSpent = Number(customer?.totalSpent || 0);
  const latestOrder = customer?.latestOrder || null;

  return [
    customerId,
    String(customer?.name || '').trim(),
    String(customer?.email || '').trim(),
    formatPhone(customer?.latestPhone, customer?.latestPhoneCode),
    customer?.isGuest ? 'Guest' : 'Registered',
    totalOrders,
    formatMoney(totalSpent, currency),
    formatMoney(buildAverageOrderValue(customer), currency),
    customer?.isGuest ? '' : Number(customer?.walletBalance || 0),
    formatExportDate(customer?.firstOrderDate),
    formatExportDate(customer?.lastOrderDate),
    latestOrder?.id ? String(latestOrder.id) : '',
    latestOrder?.total != null ? formatMoney(latestOrder.total, currency) : '',
    latestOrder?.status ? String(latestOrder.status) : '',
    String(customer?.latestStreet || '').trim(),
    String(customer?.latestDistrict || '').trim(),
    String(customer?.latestCity || '').trim(),
    String(customer?.latestState || '').trim(),
    String(customer?.latestCountry || '').trim(),
  ];
}

export function buildCustomerExportWorkbookData(customers = [], currency = 'AED') {
  const rows = (customers || []).map((customer) => buildCustomerExportRow(customer, currency));
  return {
    headers: CUSTOMER_EXPORT_HEADERS,
    rows,
  };
}

const REGISTRATION_HEADERS = [
  'Registered at (Dubai)',
  'Customer ID',
  'Name',
  'Email',
  'Phone',
  'Orders in selected period',
  'Facebook orders',
  'Instagram orders',
  'Google Ads orders',
  'Organic orders',
  'Direct orders',
  'Other source orders',
  'Lifetime orders',
  'Lifetime spend',
  'Referral code',
  'Referred by customer ID',
  'First visit city',
  'First visit state',
  'First visit country',
];

const GUEST_ORDER_HEADERS = [
  'Order date and time (Dubai)',
  'Order ID',
  'Guest name',
  'Guest email',
  'Guest phone',
  'Order status',
  'Payment method',
  'Attribution source',
  'Attribution medium',
  'Campaign',
  'Order total',
];

function formatDubaiDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getDubaiDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getDubaiDateStartUtc(dateKey) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, -4));
}

function getDubaiRangeStartUtc(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 4, minute));
}

function addDubaiDateKeys(startDate, startTime, endDate, endTime, observedDates) {
  const toUtc = (date, time) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    return new Date(Date.UTC(year, month - 1, day, hour - 4, minute));
  };
  const start = toUtc(startDate, startTime);
  const end = toUtc(endDate, endTime);
  if (!start || !end || start >= end) return [...observedDates].sort();
  const first = getDubaiDateKey(start);
  const last = getDubaiDateKey(new Date(end.getTime() - 1));
  const current = new Date(`${first}T00:00:00.000Z`);
  const stop = new Date(`${last}T00:00:00.000Z`);
  const dates = [];
  while (current <= stop && dates.length < 3660) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const body = Buffer.concat([name, data]);
  const crcTable = pngChunk.crcTable || (pngChunk.crcTable = Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    return crc >>> 0;
  }));
  let crc = 0xffffffff;
  for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  return Buffer.concat([length, body, checksum]);
}

function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    pixels.copy(raw, row * (width * 4 + 1) + 1, row * width * 4, (row + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function makePixels(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = 255;
    pixels[index * 4 + 1] = 255;
    pixels[index * 4 + 2] = 255;
    pixels[index * 4 + 3] = 255;
  }
  return pixels;
}

function drawRect(pixels, width, height, x, y, rectWidth, rectHeight, color) {
  for (let pixelY = Math.max(0, Math.floor(y)); pixelY < Math.min(height, Math.ceil(y + rectHeight)); pixelY += 1) {
    for (let pixelX = Math.max(0, Math.floor(x)); pixelX < Math.min(width, Math.ceil(x + rectWidth)); pixelX += 1) {
      const offset = (pixelY * width + pixelX) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }
}

const GRAPH_COLORS = [
  { name: 'New registrations', rgb: [37, 99, 235] },
  { name: 'Registered-customer orders', rgb: [22, 163, 74] },
  { name: 'Guest orders', rgb: [234, 88, 12] },
  { name: 'Organic traffic', rgb: [124, 58, 237] },
];

const ORDER_SOURCE_SERIES = [
  { key: 'Facebook', rgb: [37, 99, 235] },
  { key: 'Instagram', rgb: [219, 39, 119] },
  { key: 'Google Ads', rgb: [234, 88, 12] },
  { key: 'Organic Search', rgb: [22, 163, 74] },
  { key: 'Direct', rgb: [100, 116, 139] },
  { key: 'Other / Referral', rgb: [124, 58, 237] },
  { key: 'Store / Admin', rgb: [8, 145, 178] },
  { key: 'Unknown', rgb: [148, 163, 184] },
];

const SALES_CHANNEL_SERIES = [
  { key: 'Paid', rgb: [37, 99, 235] },
  { key: 'Organic', rgb: [22, 163, 74] },
  { key: 'Direct', rgb: [100, 116, 139] },
  { key: 'Social', rgb: [219, 39, 119] },
  { key: 'Referrals', rgb: [124, 58, 237] },
  { key: 'Store / Admin', rgb: [8, 145, 178] },
  { key: 'Unknown', rgb: [148, 163, 184] },
];

export function classifyCustomerOrderSource(attribution = {}) {
  const source = String(attribution?.utmSource || '').trim().toLowerCase();
  const medium = String(attribution?.utmMedium || '').trim().toLowerCase();
  const referrer = String(attribution?.utmReferrer || '').trim().toLowerCase();
  if (source === 'store_admin' || medium === 'manual_order' || medium === 'abandoned_checkout_conversion') {
    return 'Store / Admin';
  }
  if (/(^|[.\s_-])(facebook|fb|meta)([.\s_-]|$)/.test(source) || source === 'facebook.com') {
    return 'Facebook';
  }
  if (/(^|[.\s_-])(instagram|ig)([.\s_-]|$)/.test(source) || /instagram\.com/.test(referrer)) {
    return 'Instagram';
  }
  if (/google/.test(source) && /(paid|cpc|ppc|paidsearch|sem)/.test(medium)) {
    return 'Google Ads';
  }
  if (
    /^(organic|google|bing|yahoo|duckduckgo|baidu|yandex)$/.test(source)
    && (medium === 'organic' || source === 'organic')
  ) {
    return 'Organic Search';
  }
  if (source === 'direct' || medium === 'none') return 'Direct';
  if (source || medium || referrer) return 'Other / Referral';
  return 'Unknown';
}

export function classifyCustomerSalesChannel(attribution = {}) {
  const source = String(attribution?.utmSource || '').trim().toLowerCase();
  const medium = String(attribution?.utmMedium || '').trim().toLowerCase();
  const referrer = String(attribution?.utmReferrer || attribution?.referrer || '').trim().toLowerCase();
  if (source === 'store_admin' || medium === 'manual_order' || medium === 'abandoned_checkout_conversion') {
    return 'Store / Admin';
  }
  if (/(paid|cpc|ppc|paidsearch|paid_social|paidsocial|sem|display|cpm)/.test(medium)) {
    return 'Paid';
  }
  if (medium === 'organic' || source === 'organic') return 'Organic';
  if (/^(google|bing|yahoo|duckduckgo|baidu|yandex)$/.test(source)) return 'Organic';
  if (/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\./.test(referrer)) return 'Organic';
  if (/(facebook|instagram|tiktok|pinterest|snapchat|linkedin|twitter|x\.com)/.test(source)) {
    return 'Social';
  }
  if (/(facebook|instagram|tiktok|pinterest|snapchat|linkedin|twitter|x\.com)/.test(referrer)) {
    return 'Social';
  }
  if (medium === 'social' || medium === 'social-media') return 'Social';
  if (medium === 'referral' || (referrer && !/google|bing|yahoo|duckduckgo|facebook|instagram|tiktok/.test(referrer))) {
    return 'Referrals';
  }
  if (source === 'direct' || medium === 'none') return 'Direct';
  if (source || medium || referrer) return 'Referrals';
  return 'Unknown';
}

function getCustomerOrderKey(order = {}) {
  if (order.userId) return `user:${String(order.userId)}`;
  const email = String(
    order.guestEmail || order.shippingAddress?.email || order.shippingAddress?.Email || '',
  ).trim().toLowerCase();
  if (email) return `email:${email}`;
  return `order:${String(order._id || '')}`;
}

function isCountableSale(order = {}) {
  const status = String(order.status || '').trim().toLowerCase();
  return status !== 'cancelled' && status !== 'payment_failed';
}

function buildDailyActivityChart(dailyRows) {
  const width = 1200;
  const height = 480;
  const left = 44;
  const top = 22;
  const plotWidth = width - left - 24;
  const plotHeight = height - top - 28;
  const rows = dailyRows.slice(-18);
  const maxValue = Math.max(1, ...rows.flatMap((row) => [
    row.registrations,
    row.registeredOrders,
    row.guestOrders,
    row.organicPageViews,
  ]));
  const gridStep = Math.max(1, Math.ceil(maxValue / 5));
  const yMax = Math.ceil(maxValue / gridStep) * gridStep;
  const groupWidth = plotWidth / Math.max(1, rows.length);
  const barWidth = Math.max(3, Math.min(20, groupWidth / 5));
  const pixels = makePixels(width, height);

  for (let tick = 0; tick <= yMax; tick += gridStep) {
    const y = top + plotHeight - (tick / yMax) * plotHeight;
    drawRect(pixels, width, height, left, y, plotWidth, 1, [226, 232, 240]);
  }
  rows.forEach((row, rowIndex) => {
    const values = [row.registrations, row.registeredOrders, row.guestOrders, row.organicPageViews];
    const barsWidth = barWidth * values.length;
    const startX = left + rowIndex * groupWidth + (groupWidth - barsWidth) / 2;
    values.forEach((value, seriesIndex) => {
      const barHeight = (value / yMax) * plotHeight;
      drawRect(
        pixels,
        width,
        height,
        startX + seriesIndex * barWidth,
        top + plotHeight - barHeight,
        Math.max(2, barWidth - 2),
        barHeight,
        GRAPH_COLORS[seriesIndex].rgb,
      );
    });
  });
  return encodePng(width, height, pixels);
}

function buildOrderMixChart(registeredOrders, guestOrders) {
  const width = 480;
  const height = 480;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 205;
  const holeRadius = 108;
  const total = registeredOrders + guestOrders;
  const split = total ? registeredOrders / total : 0.5;
  const pixels = makePixels(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > radius || distance < holeRadius) continue;
      let angle = Math.atan2(dy, dx) / (Math.PI * 2);
      if (angle < 0) angle += 1;
      const color = angle < split ? GRAPH_COLORS[1].rgb : GRAPH_COLORS[2].rgb;
      const offset = (y * width + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }
  return encodePng(width, height, pixels);
}

function buildOrderSourceChart(sourceRows) {
  const width = 1000;
  const height = 480;
  const left = 32;
  const top = 18;
  const plotWidth = width - left - 24;
  const rowHeight = 52;
  const maxValue = Math.max(1, ...sourceRows.map((row) => row.orders));
  const pixels = makePixels(width, height);
  sourceRows.forEach((row, index) => {
    const y = top + index * rowHeight;
    drawRect(pixels, width, height, left, y + 8, plotWidth, 1, [226, 232, 240]);
    const barWidth = (row.orders / maxValue) * (plotWidth - 8);
    const color = ORDER_SOURCE_SERIES.find((series) => series.key === row.source)?.rgb
      || [148, 163, 184];
    drawRect(pixels, width, height, left, y + 12, barWidth, 26, color);
  });
  return encodePng(width, height, pixels);
}

function buildOrganicTrendChart(dailyRows) {
  const width = 1100;
  const height = 420;
  const left = 32;
  const top = 18;
  const plotWidth = width - left - 24;
  const plotHeight = height - top - 28;
  const rows = dailyRows.slice(-24);
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.organicPageViews, row.organicOrders]));
  const gridStep = Math.max(1, Math.ceil(maxValue / 5));
  const yMax = Math.ceil(maxValue / gridStep) * gridStep;
  const groupWidth = plotWidth / Math.max(1, rows.length);
  const barWidth = Math.max(3, Math.min(20, groupWidth / 3));
  const colors = [[124, 58, 237], [22, 163, 74]];
  const pixels = makePixels(width, height);
  for (let tick = 0; tick <= yMax; tick += gridStep) {
    const y = top + plotHeight - (tick / yMax) * plotHeight;
    drawRect(pixels, width, height, left, y, plotWidth, 1, [226, 232, 240]);
  }
  rows.forEach((row, rowIndex) => {
    const values = [row.organicPageViews, row.organicOrders];
    const startX = left + rowIndex * groupWidth + (groupWidth - barWidth * 2) / 2;
    values.forEach((value, seriesIndex) => {
      const barHeight = (value / yMax) * plotHeight;
      drawRect(
        pixels,
        width,
        height,
        startX + seriesIndex * barWidth,
        top + plotHeight - barHeight,
        Math.max(2, barWidth - 2),
        barHeight,
        colors[seriesIndex],
      );
    });
  });
  return encodePng(width, height, pixels);
}

export async function buildCustomerRegistrationWorkbook({
  customers = [],
  orders = [],
  lifetimeOrderStats = [],
  purchaseHistoryStats = [],
  marketingExpenses = [],
  trafficEvents = [],
  periodLabel = '',
  currency = 'AED',
  dateRange = {},
} = {}) {
  const dailyCounts = new Map();
  const orderCountsByUser = new Map();
  const sourceCountsByUser = new Map();
  const lifetimeByUser = new Map(
    lifetimeOrderStats.map((row) => [String(row._id || ''), row]),
  );
  const purchaseHistoryByKey = new Map(
    purchaseHistoryStats.map((row) => [String(row._id || ''), row]),
  );
  const adsActiveDates = new Set();
  for (const expense of marketingExpenses) {
    if (!expense.startDate || !expense.endDate) continue;
    const start = new Date(expense.startDate);
    const end = new Date(expense.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) continue;
    const firstDate = getDubaiDateKey(start);
    const lastDate = getDubaiDateKey(end);
    const cursor = new Date(`${firstDate}T00:00:00.000Z`);
    const last = new Date(`${lastDate}T00:00:00.000Z`);
    while (cursor <= last && adsActiveDates.size < 3660) {
      adsActiveDates.add(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  const sourceTotals = new Map(ORDER_SOURCE_SERIES.map(({ key }) => [key, {
    source: key,
    orders: 0,
    registeredOrders: 0,
    guestOrders: 0,
    orderValue: 0,
  }]));
  const channelTotals = new Map(SALES_CHANNEL_SERIES.map(({ key }) => [key, {
    channel: key,
    orders: 0,
    sales: 0,
  }]));
  const organicSalesByDate = new Map();
  const periodOrdersByCustomer = new Map();
  const guestOrders = [];
  const organicSessions = new Set();
  let registeredOrdersCount = 0;
  let guestOrdersCount = 0;
  let registeredOrderValue = 0;
  let guestOrderValue = 0;
  let newCustomers = 0;
  let returningCustomers = 0;
  let repeatCustomers = 0;
  let salesWithAds = 0;
  let salesWithoutAds = 0;
  let newPaidCustomerCount = 0;
  let newCustomerOrderCount = 0;
  let returningCustomerOrderCount = 0;
  let newCustomerSales = 0;
  let returningCustomerSales = 0;
  let organicPageViews = 0;
  let paidAdSpend = 0;

  const reportStart = dateRange.fromDate && dateRange.fromTime
    ? getDubaiRangeStartUtc(dateRange.fromDate, dateRange.fromTime)
    : null;
  const reportEnd = dateRange.toDate && dateRange.toTime
    ? getDubaiRangeStartUtc(dateRange.toDate, dateRange.toTime)
    : null;
  for (const expense of marketingExpenses) {
    if (!expense.startDate || !expense.endDate) continue;
    const campaignStart = getDubaiDateStartUtc(getDubaiDateKey(expense.startDate));
    const campaignEndDate = getDubaiDateStartUtc(getDubaiDateKey(expense.endDate));
    if (!campaignStart || !campaignEndDate) continue;
    const campaignEnd = new Date(campaignEndDate.getTime() + 24 * 60 * 60 * 1000);
    const overlapStart = reportStart && reportStart > campaignStart ? reportStart : campaignStart;
    const overlapEnd = reportEnd && reportEnd < campaignEnd ? reportEnd : campaignEnd;
    if (overlapStart >= overlapEnd) continue;
    const overlapRatio = Math.min(
      1,
      (overlapEnd.getTime() - overlapStart.getTime()) / (campaignEnd.getTime() - campaignStart.getTime()),
    );
    paidAdSpend += Number(expense?.amount || 0) * overlapRatio;
  }
  for (const order of orders) {
    if (!isCountableSale(order)) continue;
    const dateKey = getDubaiDateKey(order?.createdAt);
    if (dateKey && !dailyCounts.has(dateKey)) {
      dailyCounts.set(dateKey, {
        registrations: 0,
        registeredOrders: 0,
        guestOrders: 0,
        organicPageViews: 0,
        registeredSalesWithAds: 0,
        guestSalesWithAds: 0,
        registeredSalesWithoutAds: 0,
        guestSalesWithoutAds: 0,
      });
    }
    const isGuest = order?.isGuest === true;
    const source = classifyCustomerOrderSource(order?.attribution);
    const channel = classifyCustomerSalesChannel(order?.attribution);
    const sourceTotal = sourceTotals.get(source);
    const channelTotal = channelTotals.get(channel);
    const customerKey = getCustomerOrderKey(order);
    const customerPeriodStats = periodOrdersByCustomer.get(customerKey) || {
      orders: 0,
      sales: 0,
      firstOrderAt: null,
      firstOrderChannel: '',
    };
    customerPeriodStats.orders += 1;
    customerPeriodStats.sales += Number(order?.total || 0);
    const orderDate = new Date(order?.createdAt);
    if (!customerPeriodStats.firstOrderAt || orderDate < customerPeriodStats.firstOrderAt) {
      customerPeriodStats.firstOrderAt = orderDate;
      customerPeriodStats.firstOrderChannel = channel;
    }
    periodOrdersByCustomer.set(customerKey, customerPeriodStats);
    sourceTotal.orders += 1;
    sourceTotal.orderValue += Number(order?.total || 0);
    channelTotal.orders += 1;
    channelTotal.sales += Number(order?.total || 0);
    if (channel === 'Organic' && dateKey) {
      const organicRow = organicSalesByDate.get(dateKey) || { orders: 0, sales: 0 };
      organicRow.orders += 1;
      organicRow.sales += Number(order?.total || 0);
      organicSalesByDate.set(dateKey, organicRow);
    }
    const activeAdDate = dateKey && adsActiveDates.has(dateKey);
    if (isGuest) {
      guestOrdersCount += 1;
      guestOrderValue += Number(order?.total || 0);
      if (activeAdDate) {
        salesWithAds += Number(order?.total || 0);
        if (dateKey) dailyCounts.get(dateKey).guestSalesWithAds += Number(order?.total || 0);
      } else {
        salesWithoutAds += Number(order?.total || 0);
        if (dateKey) dailyCounts.get(dateKey).guestSalesWithoutAds += Number(order?.total || 0);
      }
      sourceTotal.guestOrders += 1;
      if (dateKey) dailyCounts.get(dateKey).guestOrders += 1;
      guestOrders.push([
        formatDubaiDateTime(order?.createdAt),
        String(order?._id || ''),
        String(order?.guestName || order?.shippingAddress?.name || ''),
        String(order?.guestEmail || order?.shippingAddress?.email || ''),
        String(order?.guestPhone || order?.shippingAddress?.phone || ''),
        String(order?.status || ''),
        String(order?.paymentMethod || ''),
        String(order?.attribution?.utmSource || ''),
        String(order?.attribution?.utmMedium || ''),
        String(order?.attribution?.utmCampaign || ''),
        formatMoney(order?.total, currency),
      ]);
    } else {
      registeredOrdersCount += 1;
      registeredOrderValue += Number(order?.total || 0);
      if (activeAdDate) {
        salesWithAds += Number(order?.total || 0);
        if (dateKey) dailyCounts.get(dateKey).registeredSalesWithAds += Number(order?.total || 0);
      } else {
        salesWithoutAds += Number(order?.total || 0);
        if (dateKey) dailyCounts.get(dateKey).registeredSalesWithoutAds += Number(order?.total || 0);
      }
      sourceTotal.registeredOrders += 1;
      const userId = String(order?.userId || '');
      if (userId) {
        orderCountsByUser.set(userId, (orderCountsByUser.get(userId) || 0) + 1);
        const customerSources = sourceCountsByUser.get(userId) || new Map();
        customerSources.set(source, (customerSources.get(source) || 0) + 1);
        sourceCountsByUser.set(userId, customerSources);
      }
      if (dateKey) dailyCounts.get(dateKey).registeredOrders += 1;
    }
  }

  const periodStart = reportStart;
  for (const [customerKey, periodStats] of periodOrdersByCustomer) {
    const history = purchaseHistoryByKey.get(customerKey);
    const firstOrderAt = history?.firstOrderAt ? new Date(history.firstOrderAt) : null;
    const isNew = periodStart
      ? (!firstOrderAt || firstOrderAt >= periodStart)
      : (firstOrderAt && periodStats.orders > 0
        && orders.some((order) => getCustomerOrderKey(order) === customerKey
          && new Date(order.createdAt).getTime() === firstOrderAt.getTime()));
    if (isNew) {
      newCustomers += 1;
      newCustomerOrderCount += periodStats.orders;
      newCustomerSales += periodStats.sales;
    } else {
      returningCustomers += 1;
      returningCustomerOrderCount += periodStats.orders;
      returningCustomerSales += periodStats.sales;
    }
    if (Number(history?.totalOrders || periodStats.orders) > 1) repeatCustomers += 1;
    if (isNew && periodStats.firstOrderChannel === 'Paid') newPaidCustomerCount += 1;
  }

  for (const event of trafficEvents) {
    if (event?.eventType !== 'page_view') continue;
    const dateKey = getDubaiDateKey(event?.createdAt);
    if (!dateKey) continue;
    if (!dailyCounts.has(dateKey)) {
      dailyCounts.set(dateKey, {
        registrations: 0,
        registeredOrders: 0,
        guestOrders: 0,
        organicPageViews: 0,
        registeredSalesWithAds: 0,
        guestSalesWithAds: 0,
        registeredSalesWithoutAds: 0,
        guestSalesWithoutAds: 0,
      });
    }
    if (classifyCustomerSalesChannel(event?.context?.metadata || {}) === 'Organic') {
      dailyCounts.get(dateKey).organicPageViews += 1;
      organicPageViews += 1;
      if (event?.context?.sessionId) {
        organicSessions.add(String(event.context.sessionId));
        dailyCounts.get(dateKey).organicSessions ??= new Set();
        dailyCounts.get(dateKey).organicSessions.add(String(event.context.sessionId));
      }
    }
  }

  const cac = paidAdSpend > 0 && newPaidCustomerCount > 0
    ? paidAdSpend / newPaidCustomerCount
    : null;
  const repeatPurchaseRate = periodOrdersByCustomer.size
    ? repeatCustomers / periodOrdersByCustomer.size
    : 0;
  const registrationRows = (customers || []).map((customer) => {
    const dateKey = getDubaiDateKey(customer?.createdAt);
    if (dateKey) {
      if (!dailyCounts.has(dateKey)) {
        dailyCounts.set(dateKey, {
          registrations: 0,
          registeredOrders: 0,
          guestOrders: 0,
          organicPageViews: 0,
          registeredSalesWithAds: 0,
          guestSalesWithAds: 0,
          registeredSalesWithoutAds: 0,
          guestSalesWithoutAds: 0,
        });
      }
      dailyCounts.get(dateKey).registrations += 1;
    }
    const location = customer?.firstVisitLocation || {};
    const lifetime = lifetimeByUser.get(String(customer?._id || '')) || {};
    const customerSources = sourceCountsByUser.get(String(customer?._id || '')) || new Map();
    return [
      formatDubaiDateTime(customer?.createdAt),
      String(customer?._id || ''),
      String(customer?.name || ''),
      String(customer?.email || ''),
      String(customer?.phone || ''),
      orderCountsByUser.get(String(customer?._id || '')) || 0,
      customerSources.get('Facebook') || 0,
      customerSources.get('Instagram') || 0,
      customerSources.get('Google Ads') || 0,
      customerSources.get('Organic Search') || 0,
      customerSources.get('Direct') || 0,
      (customerSources.get('Other / Referral') || 0)
        + (customerSources.get('Store / Admin') || 0)
        + (customerSources.get('Unknown') || 0),
      Number(lifetime.totalOrders || 0),
      formatMoney(lifetime.totalSpent, currency),
      String(customer?.referralCode || ''),
      String(customer?.referredByUserId || ''),
      String(location.city || ''),
      String(location.state || ''),
      String(location.country || ''),
    ];
  });

  const observedDates = new Set(dailyCounts.keys());
  const dateKeys = dateRange.fromDate && dateRange.fromTime
    ? addDubaiDateKeys(
      dateRange.fromDate,
      dateRange.fromTime,
      dateRange.toDate,
      dateRange.toTime,
      observedDates,
    )
    : [...observedDates].sort();
  const dailyRows = dateKeys.map((date) => ({
    date,
    ...(dailyCounts.get(date) || {
      registrations: 0,
      registeredOrders: 0,
      guestOrders: 0,
      organicPageViews: 0,
      registeredSalesWithAds: 0,
      guestSalesWithAds: 0,
      registeredSalesWithoutAds: 0,
      guestSalesWithoutAds: 0,
    }),
    organicSessions: dailyCounts.get(date)?.organicSessions?.size || 0,
    organicOrders: organicSalesByDate.get(date)?.orders || 0,
    organicSales: organicSalesByDate.get(date)?.sales || 0,
    adsActive: adsActiveDates.has(date),
  }));
  const sourceRows = [...sourceTotals.values()];
  const channelRows = [...channelTotals.values()];
  const allTimeOrdersByExportedCustomers = customers.reduce(
    (total, customer) => total + Number(lifetimeByUser.get(String(customer._id || ''))?.totalOrders || 0),
    0,
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HAMODY';
  workbook.created = new Date();
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { width: 34 }, { width: 18 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 },
    { width: 22 }, { width: 12 }, { width: 14 }, { width: 12 },
    { width: 18 }, { width: 12 },
  ];
  summarySheet.mergeCells('A1:N1');
  summarySheet.getCell('A1').value = 'Customer Registration & Orders Summary';
  summarySheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
  summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  summarySheet.getRow(1).height = 36;
  summarySheet.mergeCells('A2:N2');
  summarySheet.getCell('A2').value = periodLabel || 'All available registration and order dates (Dubai time)';
  summarySheet.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };
  summarySheet.mergeCells('A3:N3');
  summarySheet.getCell('A3').value = 'Registrations and orders are counted independently within the selected period. Guest orders are orders marked as guest checkout.';
  summarySheet.getCell('A3').font = { color: { argb: 'FF475569' }, size: 10 };

  const cards = [
    ['New registrations', customers.length, 'FF2563EB'],
    ['Registered-customer orders', registeredOrdersCount, 'FF16A34A'],
    ['Guest orders', guestOrdersCount, 'FFEA580C'],
    ['Total orders in period', registeredOrdersCount + guestOrdersCount, 'FF334155'],
    ['Registered order value', formatMoney(registeredOrderValue, currency), 'FF16A34A'],
    ['Guest order value', formatMoney(guestOrderValue, currency), 'FFEA580C'],
    ['Lifetime orders (listed customers)', allTimeOrdersByExportedCustomers, 'FF7C3AED'],
  ];
  cards.forEach(([label, value, color], index) => {
    const column = index + 1;
    const labelCell = summarySheet.getCell(5, column);
    const valueCell = summarySheet.getCell(6, column);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    valueCell.value = value;
    valueCell.font = { bold: true, size: 16, color: { argb: color } };
    valueCell.alignment = { horizontal: 'center' };
  });
  summarySheet.getRow(5).height = 32;
  summarySheet.getRow(6).height = 30;

  summarySheet.getCell('A8').value = 'Daily activity trend';
  summarySheet.getCell('A8').font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  GRAPH_COLORS.forEach((series, index) => {
    const cell = summarySheet.getCell(9, index + 1);
    cell.value = series.name;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${series.rgb.map((part) => part.toString(16).padStart(2, '0')).join('').toUpperCase()}` },
    };
  });
  summarySheet.getCell('I8').value = 'Orders by checkout type';
  summarySheet.getCell('I8').font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  summarySheet.getCell('I9').value = 'Registered customer orders';
  summarySheet.getCell('I10').value = registeredOrdersCount;
  summarySheet.getCell('I11').value = 'Guest orders';
  summarySheet.getCell('I12').value = guestOrdersCount;
  summarySheet.getCell('I9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
  summarySheet.getCell('I11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
  summarySheet.getCell('I9').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getCell('I11').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  const barImage = workbook.addImage({ buffer: buildDailyActivityChart(dailyRows), extension: 'png' });
  summarySheet.addImage(barImage, 'A10:H28');
  const mixImage = workbook.addImage({
    buffer: buildOrderMixChart(registeredOrdersCount, guestOrdersCount),
    extension: 'png',
  });
  summarySheet.addImage(mixImage, 'I13:N28');

  summarySheet.getCell('A30').value = 'Order attribution by source';
  summarySheet.getCell('A30').font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  const sourceChart = workbook.addImage({
    buffer: buildOrderSourceChart(sourceRows),
    extension: 'png',
  });
  summarySheet.addImage(sourceChart, 'A31:H49');
  summarySheet.getCell('I30').value = 'Orders by attribution source';
  summarySheet.getCell('I30').font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  const sourceHeaders = ['Source', 'Orders', 'Registered', 'Guest', 'Order value', 'Share'];
  sourceHeaders.forEach((header, index) => {
    summarySheet.getCell(31, index + 9).value = header;
  });
  summarySheet.getRow(31).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(31).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  sourceRows.forEach((row, index) => {
    const rowIndex = index + 32;
    summarySheet.getCell(rowIndex, 9).value = row.source;
    summarySheet.getCell(rowIndex, 10).value = row.orders;
    summarySheet.getCell(rowIndex, 11).value = row.registeredOrders;
    summarySheet.getCell(rowIndex, 12).value = row.guestOrders;
    summarySheet.getCell(rowIndex, 13).value = formatMoney(row.orderValue, currency);
    const totalCountableOrders = [...sourceTotals.values()]
      .reduce((sum, sourceRow) => sum + sourceRow.orders, 0);
    summarySheet.getCell(rowIndex, 14).value = totalCountableOrders
      ? row.orders / totalCountableOrders
      : 0;
    summarySheet.getCell(rowIndex, 14).numFmt = '0.0%';
  });
  summarySheet.getCell('I41').value = 'Attribution note';
  summarySheet.getCell('I41').font = { bold: true, color: { argb: 'FF334155' } };
  summarySheet.mergeCells('I42:N44');
  summarySheet.getCell('I42').value = 'Source is based on the UTM source/medium saved on each order. Older orders without attribution are counted as Unknown, not assumed organic.';
  summarySheet.getCell('I42').alignment = { wrapText: true, vertical: 'top' };
  summarySheet.getCell('I42').font = { italic: true, color: { argb: 'FF475569' }, size: 10 };

  const dailyHeaderRow = 52;
  const dailyHeaders = [
    'Date (Dubai)',
    'New registrations',
    'Registered-customer orders',
    'Guest orders',
    'Total orders',
  ];
  dailyHeaders.forEach((header, index) => {
    summarySheet.getCell(dailyHeaderRow, index + 1).value = header;
  });
  summarySheet.getRow(dailyHeaderRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(dailyHeaderRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  dailyRows.forEach((row) => {
    summarySheet.addRow([
      row.date,
      row.registrations,
      row.registeredOrders,
      row.guestOrders,
      row.registeredOrders + row.guestOrders,
    ]);
  });
  summarySheet.autoFilter = {
    from: { row: dailyHeaderRow, column: 1 },
    to: { row: dailyHeaderRow, column: dailyHeaders.length },
  };
  summarySheet.views = [{ state: 'frozen', ySplit: dailyHeaderRow }];

  const marketingSheet = workbook.addWorksheet('Marketing & Retention');
  marketingSheet.columns = [
    { width: 30 }, { width: 20 }, { width: 20 }, { width: 20 },
    { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 },
  ];
  marketingSheet.mergeCells('A1:H1');
  marketingSheet.getCell('A1').value = 'Sales Channels, Customer Retention & Marketing';
  marketingSheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  marketingSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  marketingSheet.getRow(1).height = 34;
  marketingSheet.mergeCells('A2:H2');
  marketingSheet.getCell('A2').value = 'Order-based figures use non-cancelled, non-payment-failed orders. Dubai local dates are used. Organic traffic uses tracked page views (event history is retained for up to 90 days).';
  marketingSheet.getCell('A2').alignment = { wrapText: true };
  marketingSheet.getCell('A2').font = { italic: true, color: { argb: 'FF475569' }, size: 10 };

  const addTableHeader = (rowNumber, labels, endColumn = labels.length) => {
    labels.forEach((label, index) => {
      marketingSheet.getCell(rowNumber, index + 1).value = label;
    });
    const header = marketingSheet.getRow(rowNumber);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    header.alignment = { wrapText: true };
    return endColumn;
  };
  marketingSheet.getCell('A4').value = 'Sales by channel';
  marketingSheet.getCell('A4').font = { bold: true, size: 14 };
  addTableHeader(5, ['Channel', 'Orders', 'Sales', 'Sales share']);
  channelRows.forEach((row, index) => {
    const rowIndex = index + 6;
    marketingSheet.getCell(rowIndex, 1).value = row.channel;
    marketingSheet.getCell(rowIndex, 2).value = row.orders;
    marketingSheet.getCell(rowIndex, 3).value = formatMoney(row.sales, currency);
    marketingSheet.getCell(rowIndex, 4).value = registeredOrderValue + guestOrderValue
      ? row.sales / (registeredOrderValue + guestOrderValue)
      : 0;
    marketingSheet.getCell(rowIndex, 4).numFmt = '0.0%';
  });
  marketingSheet.mergeCells('A14:H14');
  marketingSheet.getCell('A14').value = 'New vs. returning purchasers';
  marketingSheet.getCell('A14').font = { bold: true, size: 14 };
  addTableHeader(15, ['Customer segment', 'Unique purchasers', 'Orders', 'Sales']);
  marketingSheet.addRow(['First purchase in period', newCustomers, newCustomerOrderCount, formatMoney(newCustomerSales, currency)]);
  marketingSheet.addRow(['Returning from before period', returningCustomers, returningCustomerOrderCount, formatMoney(returningCustomerSales, currency)]);
  marketingSheet.getCell('A18').value = 'Repeat purchase rate (lifetime)';
  marketingSheet.getCell('B18').value = periodOrdersByCustomer.size
    ? repeatCustomers / periodOrdersByCustomer.size
    : 0;
  marketingSheet.getCell('B18').numFmt = '0.0%';
  marketingSheet.mergeCells('A20:H20');
  marketingSheet.getCell('A20').value = 'Sales with active ads vs. without active ads';
  marketingSheet.getCell('A20').font = { bold: true, size: 14 };
  addTableHeader(21, ['Period type', 'Sales', 'Orders']);
  marketingSheet.getCell('A22').value = 'Ad campaign active';
  marketingSheet.getCell('B22').value = formatMoney(salesWithAds, currency);
  marketingSheet.getCell('C22').value = dailyRows.reduce((sum, row) => sum + (row.adsActive ? row.registeredOrders + row.guestOrders : 0), 0);
  marketingSheet.getCell('A23').value = 'No active campaign recorded';
  marketingSheet.getCell('B23').value = formatMoney(salesWithoutAds, currency);
  marketingSheet.getCell('C23').value = dailyRows.reduce((sum, row) => sum + (!row.adsActive ? row.registeredOrders + row.guestOrders : 0), 0);
  marketingSheet.mergeCells('A25:H25');
  marketingSheet.getCell('A25').value = 'Customer Acquisition Cost (CAC)';
  marketingSheet.getCell('A25').font = { bold: true, size: 14 };
  addTableHeader(26, ['Recorded ad spend', 'New paid-attributed purchasers', 'Estimated CAC']);
  marketingSheet.getCell('A27').value = formatMoney(paidAdSpend, currency);
  marketingSheet.getCell('B27').value = newPaidCustomerCount;
  marketingSheet.getCell('C27').value = cac == null ? 'N/A' : formatMoney(cac, currency);
  marketingSheet.mergeCells('A28:H29');
  marketingSheet.getCell('A28').value = 'Estimated CAC = ad spend prorated by the campaign days overlapping this report ÷ unique purchasers whose first order in the report has a paid UTM source. CAC is N/A if dated spend or new paid purchasers are not recorded. Active-ad sales use campaign start/end dates; unattributed orders are not assumed to be ad-driven.';
  marketingSheet.getCell('A28').alignment = { wrapText: true, vertical: 'top' };
  marketingSheet.getCell('A28').font = { italic: true, color: { argb: 'FF475569' }, size: 10 };

  marketingSheet.getCell('A31').value = 'Organic traffic and sales trends';
  marketingSheet.getCell('A31').font = { bold: true, size: 14 };
  marketingSheet.getCell('A32').value = 'Organic page views';
  marketingSheet.getCell('A32').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
  marketingSheet.getCell('A32').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  marketingSheet.getCell('B32').value = 'Organic orders';
  marketingSheet.getCell('B32').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
  marketingSheet.getCell('B32').font = { bold: true, color: { argb: 'FFFFFFFF' } };
  const organicImage = workbook.addImage({
    buffer: buildOrganicTrendChart(dailyRows),
    extension: 'png',
  });
  marketingSheet.addImage(organicImage, 'A33:H49');
  addTableHeader(51, [
    'Date (Dubai)',
    'Organic page views',
    'Organic sessions',
    'Organic orders',
    'Organic sales',
    'Active ad campaign',
    'Sales with ads',
    'Sales without ads',
  ]);
  dailyRows.forEach((row) => {
    marketingSheet.addRow([
      row.date,
      row.organicPageViews,
      row.organicSessions,
      row.organicOrders,
      formatMoney(row.organicSales, currency),
      row.adsActive ? 'Yes' : 'No',
      formatMoney(row.registeredSalesWithAds + row.guestSalesWithAds, currency),
      formatMoney(row.registeredSalesWithoutAds + row.guestSalesWithoutAds, currency),
    ]);
  });
  marketingSheet.autoFilter = {
    from: { row: 51, column: 1 },
    to: { row: 51, column: 8 },
  };
  marketingSheet.views = [{ state: 'frozen', ySplit: 5 }];

  const customersSheet = workbook.addWorksheet('Registered Customers');
  customersSheet.addRow(REGISTRATION_HEADERS);
  registrationRows.forEach((row) => customersSheet.addRow(row));
  customersSheet.columns = REGISTRATION_HEADERS.map((header) => ({
    width: Math.min(34, Math.max(header.length + 2, 16)),
  }));
  customersSheet.views = [{ state: 'frozen', ySplit: 1 }];
  customersSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, registrationRows.length + 1), column: REGISTRATION_HEADERS.length },
  };

  const guestsSheet = workbook.addWorksheet('Guest Orders');
  guestsSheet.addRow(GUEST_ORDER_HEADERS);
  guestOrders.forEach((row) => guestsSheet.addRow(row));
  guestsSheet.columns = GUEST_ORDER_HEADERS.map((header) => ({
    width: Math.min(34, Math.max(header.length + 2, 16)),
  }));
  guestsSheet.views = [{ state: 'frozen', ySplit: 1 }];
  guestsSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, guestOrders.length + 1), column: GUEST_ORDER_HEADERS.length },
  };

  return workbook.xlsx.writeBuffer();
}
