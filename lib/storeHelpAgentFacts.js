import { addDaysToDateOnly, getDubaiDateParts } from './storeOrdersByProductDates.js';
import { matchHelpHowTo } from './storeHelpPages.js';
import { matchStoreHelpKnowledge } from './storeHelpKnowledge.js';

const STOP_WORDS = new Set([
  'total', 'how', 'many', 'much', 'order', 'orders', 'got', 'get', 'for', 'the', 'a', 'an',
  'of', 'my', 'i', 'we', 'please', 'check', 'what', 'is', 'are', 'did', 'do', 'sold', 'sell',
  'product', 'products', 'item', 'items', 'sku', 'stock', 'today', 'yesterday', 'this', 'week',
  'month', 'months', 'week', 'weeks', 'day', 'days', 'year', 'years', 'last', 'past',
  'previous', 'ago', 'all', 'time', 'count', 'number', 'show', 'me', 'about', 'and',
  'or', 'to', 'in', 'on', 'from', 'with', 'that', 'give', 'need', 'want', 'can', 'you',
  'tell', 'know', 'sale', 'sales', 'revenue', 'earning', 'earnings', 'download',
  'excel', 'pdf', 'export', 'exports', 'report', 'reports', 'details', 'detail',
  'only', 'just', 'until', 'till', 'since', 'through', 'thru', 'present', 'starting',
  'between', 'up',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'delivered', 'deliver', 'delivery', 'deliverd', 'delieverd', 'delevered',
  'shipped', 'cancelled', 'canceled', 'processing',
  'page', 'pages', 'website', 'site', 'there', 'ther',
]);

const OPS_WORDS = new Set([
  ...STOP_WORDS,
  'pickup', 'pickups', 'waiting', 'missing', 'status', 'dashboard',
  'help', 'now', 'reason', 'why', 'meaning', 'mean', 'page',
]);

const CUSTOMER_STOP_WORDS = new Set([
  ...OPS_WORDS,
  'anyone', 'anybody', 'someone', 'somebody', 'named', 'name', 'names',
  'customer', 'customers', 'guest', 'guests', 'buyer', 'buyers',
  'account', 'accounts', 'user', 'users', 'called', 'person', 'people',
  'have', 'has', 'there', 'any', 'one',
  'where', 'which', 'page', 'list', 'find', 'search', 'look', 'lookup',
  'show', 'open', 'go',
]);

const HELP_TYPOS = {
  resport: 'report',
  raport: 'report',
  downlaod: 'download',
  donwload: 'download',
  donload: 'download',
  dowload: 'download',
  downlod: 'download',
  downaldo: 'download',
  downalood: 'download',
  downlood: 'download',
  downlodo: 'download',
  donaldo: 'download',
  donwlaod: 'download',
  pfd: 'pdf',
  pdff: 'pdf',
  pdfs: 'pdf',
  ordersl: 'orders',
  oderlist: 'orders',
  sit: 'list',
  exel: 'excel',
  exlce: 'excel',
  excle: 'excel',
  slaes: 'sales',
  slae: 'sale',
  motnth: 'month',
  montth: 'month',
  mnth: 'month',
  deliverd: 'delivered',
  delieverd: 'delivered',
  delevered: 'delivered',
  oder: 'order',
  oders: 'orders',
  oderer: 'order',
  ther: 'there',
  navabr: 'navbar',
  navber: 'navbar',
  nabvar: 'navbar',
  baner: 'banner',
  bannr: 'banner',
  coupn: 'coupon',
  cupon: 'coupon',
  popop: 'popup',
  popoup: 'popup',
  hompage: 'homepage',
  categroy: 'category',
  catagory: 'category',
  footre: 'footer',
  shiping: 'shipping',
  disount: 'discount',
  dicount: 'discount',
};

function editDistance(left = '', right = '') {
  const a = String(left || '');
  const b = String(right || '');
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = Array.from({ length: a.length + 1 }, (_, index) => {
    const row = new Array(b.length + 1).fill(0);
    row[0] = index;
    return row;
  });
  for (let col = 0; col <= b.length; col += 1) rows[0][col] = col;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      );
    }
  }
  return rows[a.length][b.length];
}

const INTENT_WORDS = [
  'download', 'excel', 'export', 'report', 'sales', 'order', 'orders',
  'customer', 'customers', 'product', 'pickup', 'revenue', 'list', 'month',
  'delivered',
];

function correctHelpTypo(word = '') {
  const term = String(word || '').toLowerCase();
  if (!term) return '';
  if (HELP_TYPOS[term]) return HELP_TYPOS[term];
  if (INTENT_WORDS.includes(term) || STOP_WORDS.has(term) || OPS_WORDS.has(term)) return term;
  if (term.length < 5) return term;
  let best = term;
  let bestDistance = 99;
  for (const known of INTENT_WORDS) {
    if (Math.abs(known.length - term.length) > 3) continue;
    const distance = editDistance(term, known);
    const allowed = known.length >= 8 ? 3 : 2;
    if (distance <= allowed && distance < bestDistance) {
      best = known;
      bestDistance = distance;
    }
  }
  return best;
}

function isNoiseHelpTerm(word = '') {
  const term = String(word || '').toLowerCase();
  if (!term) return true;
  if (OPS_WORDS.has(term) || HELP_TYPOS[term] || INTENT_WORDS.includes(term)) return true;
  if (term.length < 5) return false;
  for (const known of [...OPS_WORDS, ...INTENT_WORDS]) {
    if (Math.abs(known.length - term.length) > 3) continue;
    const allowed = known.length >= 8 ? 3 : 2;
    if (editDistance(term, known) <= allowed) return true;
  }
  return false;
}

export function normalizeHelpQuestion(question = '') {
  return String(question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => correctHelpTypo(word))
    .join(' ');
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dubaiDayStart(dateKey) {
  return new Date(`${dateKey}T00:00:00+04:00`);
}

function dubaiDayEnd(dateKey) {
  return new Date(`${dateKey}T23:59:59.999+04:00`);
}

function addMonthsToDateOnly(dateValue = '', months = 0) {
  const [year, month, day] = String(dateValue || '').split('-').map(Number);
  if (!year || !month || !day) return '';
  const shifted = new Date(Date.UTC(year, month - 1 + Number(months || 0), 1));
  const lastDay = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate();
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(Math.min(day, lastDay))}`;
}

export function cleanHelpProductName(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!/[\[{]/.test(text) && !/"name"\s*:/i.test(text)) return text;
  try {
    const parsed = JSON.parse(text);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    const name = String(first?.name || first?.productName || '').trim();
    if (name) return cleanHelpProductName(name);
  } catch {
    // Woo/import lines sometimes store broken JSON in the name field.
  }
  const quoted = text.match(/"?name"?\s*:\s*"((?:\\.|[^"\\])*)"/i);
  if (quoted?.[1]) return quoted[1].replace(/\\"/g, '"').trim();
  const loose = text.match(/name"?\s*:\s*"?([^",}\\]+)/i);
  if (loose?.[1]) return loose[1].trim();
  return 'that product';
}

export function extractHelpSearchTerms(question = '') {
  return normalizeHelpQuestion(question)
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !isNoiseHelpTerm(word));
}

export function wantsCustomerListExport(question = '') {
  const text = normalizeHelpQuestion(question);
  if (!/\b(customer|customers|buyer|buyers|guest|guests)\b/.test(text)) return false;
  if (/\b(named|called)\s+[a-z]{3,}/.test(text)) return false;
  return wantsHelpDownload(text)
    || /\b(customer list|customer names|all customers)\b/.test(text);
}

export function extractCustomerNameQuery(question = '') {
  const text = normalizeHelpQuestion(question);
  if (!text) return [];
  if (wantsCustomerListExport(text)) return [];
  const hasCustomerWord = /\b(customer|customers|buyer|buyers|guest|guests|named|name)\b/.test(text);
  const hasPersonOrders = /\b(order|orders|list)\b/.test(text)
    && (wantsHelpDownload(text) || /\b(orders? of|orders for)\b/.test(text));
  if (!hasCustomerWord && !hasPersonOrders) return [];
  return extractHelpSearchTerms(text).filter((word) => !CUSTOMER_STOP_WORDS.has(word) && word !== 'list');
}

export function wantsCustomerLookup(question = '') {
  const text = normalizeHelpQuestion(question);
  if (!text) return false;
  if (wantsCustomerListExport(text)) return false;
  const terms = extractCustomerNameQuery(text);
  if (!terms.length) return false;
  return /\b(customer|customers|buyer|buyers|guest|guests)\b/.test(text)
    || /\b(named|name)\b/.test(text)
    || (/\b(order|orders|list)\b/.test(text) && wantsHelpDownload(text));
}

export function extractProductQuery(question = '') {
  const text = normalizeHelpQuestion(question);
  if (!text) return [];

  const afterFor = text.match(/\b(?:for|about)\s+(.+)$/i);
  const source = afterFor ? afterFor[1] : text;
  return extractHelpSearchTerms(source).filter((word) => !OPS_WORDS.has(word) && !isNoiseHelpTerm(word));
}

export function orderHasProductMatch(order = {}, { terms = [], productIds = new Set() } = {}) {
  const lines = [
    ...(Array.isArray(order.orderItems) ? order.orderItems : []),
    ...(Array.isArray(order.items) ? order.items : []),
  ];

  return lines.some((item) => {
    const productId = String(item?.productId?._id || item?.productId || '');
    if (productId && productIds.has(productId)) return true;
    const hay = `${item?.name || ''} ${item?.productName || ''} ${item?.sku || ''}`.toLowerCase();
    return terms.some((term) => hay.includes(String(term).toLowerCase()));
  });
}

export function wantsHelpDownload(question = '') {
  return /download|excel|pdf|\bexport\b/i.test(normalizeHelpQuestion(question));
}

export function getHelpExportFormats(question = '') {
  const text = normalizeHelpQuestion(question);
  const wantsPdf = /\bpdf\b/.test(text);
  const wantsExcel = /\b(excel|xlsx|xls|spreadsheet)\b/.test(text);
  if (wantsPdf && !wantsExcel) return ['pdf'];
  if (wantsExcel && !wantsPdf) return ['xlsx'];
  return ['xlsx', 'pdf'];
}

export function isHelpDownloadFollowUp(question = '') {
  const text = normalizeHelpQuestion(question);
  if (!wantsHelpDownload(text)) return false;
  const leftover = text
    .replace(/\b(please|download|excel|pdf|export|those|that|this|them|the|it|details|detail|file|report|also|well|too|as)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return leftover.length < 3;
}

export function mergeHelpDownloadContext(question = '', priorQuestion = '') {
  const current = String(question || '').trim();
  const prior = String(priorQuestion || '').trim();
  if (!prior || current === prior) return current;
  if (!isHelpDownloadFollowUp(current)) return current;
  return `${prior} download`.trim();
}

export function isWebsiteHelpQuestion(question = '') {
  const text = normalizeHelpQuestion(question);
  if (!text) return false;
  if (/sales|revenue|order|orders|customer|product|sku|delivered|pickup/i.test(text)) return false;
  return /\b(how many|number of|count)\b/.test(text) && /\bpages?\b/.test(text)
    || (/\b(this website|this site|the website|the site)\b/.test(text) && /\b(pages?|what pages)\b/.test(text));
}

export function wantsProductSalesLookup(question = '', terms = []) {
  if (!terms.length) return false;
  if (isWebsiteHelpQuestion(question)) return false;
  if (wantsCustomerListExport(question) || wantsCustomerLookup(question)) return false;
  return /how many|total|sold|order|orders|product|sku|sales/i.test(String(question || ''));
}

export function extractHelpStatusFilter(question = '') {
  const text = normalizeHelpQuestion(question);
  if (/\b(delivered|deliverd|delieverd|delevered)\b/.test(text)) {
    return { key: 'delivered', statuses: ['DELIVERED'], label: 'delivered' };
  }
  if (/\bout for delivery\b|\bshipped\b/.test(text)) {
    return { key: 'out_for_delivery', statuses: ['OUT_FOR_DELIVERY', 'SHIPPED'], label: 'out for delivery' };
  }
  if (/\b(cancelled|canceled)\b/.test(text)) {
    return { key: 'cancelled', statuses: ['CANCELLED'], label: 'cancelled' };
  }
  if (/\b(processing|order placed)\b/.test(text)) {
    return { key: 'processing', statuses: ['PROCESSING', 'ORDER_PLACED'], label: 'processing' };
  }
  return null;
}

export function wantsPeriodSalesLookup(question = '', terms = []) {
  const text = normalizeHelpQuestion(question);
  if (isWebsiteHelpQuestion(text)) return false;
  if (wantsCustomerListExport(text) || wantsCustomerLookup(text)) return false;
  if (/pickup|stock|inventory|missing sku/i.test(text) && !/sales|orders|revenue|report/i.test(text)) {
    return false;
  }
  if (/\bstatus\b/i.test(text) && /\b\d{4,8}\b/.test(text) && !/sales|revenue|report/i.test(text)) {
    return false;
  }
  const hasPeriodAsk = /how many|total|sales|revenue|sold|orders|earn|report/i.test(text)
    || wantsHelpDownload(text);
  if (!hasPeriodAsk) return false;
  if (extractHelpStatusFilter(text) && extractHelpDateRange(text) && !terms.length) return true;
  if (extractHelpDateRange(text) && !terms.length) return true;
  if (extractHelpDateRange(text) && /sales|revenue|report|download|excel|pdf/i.test(text)) return true;
  if (terms.length) return false;
  return true;
}

export function extractHelpDateRange(question = '') {
  const text = normalizeHelpQuestion(question)
    .replace(/\b(last|past|previous)(\d{1,2})(months?|weeks?|days?)\b/g, '$1 $2 $3')
    .replace(/(\d)\s*(months?|weeks?|days?)/g, '$1 $2');
  const lastMonths = text.match(/\b(?:last|past|previous)\s+(\d{1,2})\s+months?\b/);
  if (lastMonths) return `last_months_${Math.min(24, Number(lastMonths[1]))}`;
  const lastWeeks = text.match(/\b(?:last|past|previous)\s+(\d{1,2})\s+weeks?\b/);
  if (lastWeeks) return `last_weeks_${Math.min(12, Number(lastWeeks[1]))}`;
  const lastDays = text.match(/\b(?:last|past|previous)\s+(\d{1,2})\s+days?\b/);
  if (lastDays) return `last_days_${Math.min(90, Number(lastDays[1]))}`;
  if (/\blast month\b/.test(text)) return 'last_month';
  if (/\bthis month\b|\bcurrent month\b/.test(text)) return 'this_month';
  if (/\blast week\b/.test(text)) return 'last_week';
  if (/\bthis week\b/.test(text)) return 'this_week';
  if (/\blast year\b|\bpast year\b/.test(text)) return 'last_year';
  if (/\bthis year\b/.test(text)) return 'this_year';
  if (/\byesterday\b/.test(text)) return 'yesterday';
  if (/\btoday\b/.test(text)) return 'today';
  if (/\ball time\b|\balltime\b/.test(text)) return 'all_time';
  return null;
}

export function getHelpDateBounds(rangeKey = null, now = new Date()) {
  const parts = getDubaiDateParts(now);
  const today = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;

  if (rangeKey === 'today') {
    return {
      key: 'today',
      label: `today ${today} (Dubai)`,
      start: dubaiDayStart(today),
      end: dubaiDayEnd(today),
    };
  }

  if (rangeKey === 'yesterday') {
    const yesterday = addDaysToDateOnly(today, -1);
    return {
      key: 'yesterday',
      label: `yesterday ${yesterday} (Dubai)`,
      start: dubaiDayStart(yesterday),
      end: dubaiDayEnd(yesterday),
    };
  }

  if (rangeKey === 'this_month') {
    const start = `${parts.year}-${pad2(parts.month)}-01`;
    return {
      key: 'this_month',
      label: `${MONTH_NAMES[parts.month - 1]} ${parts.year} (1–${parts.day}, Dubai)`,
      start: dubaiDayStart(start),
      end: dubaiDayEnd(today),
    };
  }

  if (rangeKey === 'last_month') {
    const prev = new Date(Date.UTC(parts.year, parts.month - 2, 1));
    const year = prev.getUTCFullYear();
    const month = prev.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const start = `${year}-${pad2(month)}-01`;
    const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
    return {
      key: 'last_month',
      label: `${MONTH_NAMES[month - 1]} ${year} (Dubai)`,
      start: dubaiDayStart(start),
      end: dubaiDayEnd(end),
    };
  }

  const lastMonths = String(rangeKey || '').match(/^last_months_(\d+)$/);
  if (lastMonths) {
    const count = Number(lastMonths[1]);
    const start = addMonthsToDateOnly(today, -count);
    return {
      key: `last_months_${count}`,
      label: `the last ${count} months (${start} to ${today}, Dubai)`,
      start: dubaiDayStart(start),
      end: dubaiDayEnd(today),
    };
  }

  const lastWeeks = String(rangeKey || '').match(/^last_weeks_(\d+)$/);
  if (lastWeeks) {
    const count = Number(lastWeeks[1]);
    const start = addDaysToDateOnly(today, -(count * 7));
    return {
      key: `last_weeks_${count}`,
      label: `the last ${count} weeks (${start} to ${today}, Dubai)`,
      start: dubaiDayStart(start),
      end: dubaiDayEnd(today),
    };
  }

  const lastDays = String(rangeKey || '').match(/^last_days_(\d+)$/);
  if (lastDays) {
    const count = Number(lastDays[1]);
    const start = addDaysToDateOnly(today, -count);
    return {
      key: `last_days_${count}`,
      label: `the last ${count} days (${start} to ${today}, Dubai)`,
      start: dubaiDayStart(start),
      end: dubaiDayEnd(today),
    };
  }

  if (rangeKey === 'this_year') {
    const start = `${parts.year}-01-01`;
    return {
      key: 'this_year',
      label: `${parts.year} (1 Jan–${parts.day} ${MONTH_NAMES[parts.month - 1]}, Dubai)`,
      start: dubaiDayStart(start),
      end: dubaiDayEnd(today),
    };
  }

  if (rangeKey === 'last_year') {
    const year = parts.year - 1;
    return {
      key: 'last_year',
      label: `${year} (Dubai)`,
      start: dubaiDayStart(`${year}-01-01`),
      end: dubaiDayEnd(`${year}-12-31`),
    };
  }

  if (rangeKey === 'this_week' || rangeKey === 'last_week') {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dubai',
      weekday: 'short',
    }).format(now);
    const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday] ?? 1;
    const daysFromMonday = (weekdayIndex + 6) % 7;
    const thisMonday = addDaysToDateOnly(today, -daysFromMonday);
    const thisSunday = addDaysToDateOnly(thisMonday, 6);
    if (rangeKey === 'this_week') {
      return {
        key: 'this_week',
        label: `${thisMonday} to ${today} (Dubai)`,
        start: dubaiDayStart(thisMonday),
        end: dubaiDayEnd(today),
      };
    }
    const lastMonday = addDaysToDateOnly(thisMonday, -7);
    const lastSunday = addDaysToDateOnly(thisSunday, -7);
    return {
      key: 'last_week',
      label: `${lastMonday} to ${lastSunday} (Dubai)`,
      start: dubaiDayStart(lastMonday),
      end: dubaiDayEnd(lastSunday),
    };
  }

  return {
    key: 'all_time',
    label: 'all time',
    start: null,
    end: null,
  };
}

export function formatHelpMoney(value = 0, currency = 'AED') {
  const amount = Number(value || 0);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

function rangeCount(rangeKey = '', prefix = '') {
  const match = String(rangeKey || '').match(new RegExp(`^${prefix}_(\\d+)$`));
  return match ? Number(match[1]) : 0;
}

function periodLeadIn(rangeKey = '') {
  const months = rangeCount(rangeKey, 'last_months');
  if (months) return `In the last ${months} months you've had`;
  const weeks = rangeCount(rangeKey, 'last_weeks');
  if (weeks) return `In the last ${weeks} weeks you've had`;
  const days = rangeCount(rangeKey, 'last_days');
  if (days) return `In the last ${days} days you've had`;

  switch (rangeKey) {
    case 'today':
      return "Today you've had";
    case 'yesterday':
      return 'Yesterday you had';
    case 'this_month':
      return "This month you've had";
    case 'last_month':
      return 'Last month you had';
    case 'this_week':
      return "This week you've had";
    case 'last_week':
      return 'Last week you had';
    case 'this_year':
      return "This year you've had";
    case 'last_year':
      return 'Last year you had';
    default:
      return "In total you've had";
  }
}

function speakWhen(rangeKey = '') {
  const months = rangeCount(rangeKey, 'last_months');
  if (months) return `in the last ${months} months`;
  const weeks = rangeCount(rangeKey, 'last_weeks');
  if (weeks) return `in the last ${weeks} weeks`;
  const days = rangeCount(rangeKey, 'last_days');
  if (days) return `in the last ${days} days`;

  switch (rangeKey) {
    case 'today':
      return 'today';
    case 'yesterday':
      return 'yesterday';
    case 'this_month':
      return 'this month';
    case 'last_month':
      return 'last month';
    case 'this_week':
      return 'this week';
    case 'last_week':
      return 'last week';
    case 'this_year':
      return 'this year';
    case 'last_year':
      return 'last year';
    default:
      return 'in total';
  }
}

function orderLabel(count = 0) {
  return Number(count) === 1 ? '1 order' : `${Number(count || 0)} orders`;
}

function formatHelpWhen(value) {
  const dated = value ? new Date(value) : null;
  if (!dated || Number.isNaN(dated.getTime())) return '';
  return dated.toLocaleString('en-GB', {
    timeZone: 'Asia/Dubai',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFullPeriodSales(sales = {}) {
  const statusBit = sales.statusLabel ? ` ${sales.statusLabel}` : '';
  const units = Number(sales.unitsSold || 0);
  const lines = [
    `${periodLeadIn(sales.rangeKey)} ${orderLabel(sales.orderCount)}${statusBit}, totaling ${formatHelpMoney(sales.revenue, sales.currency)}${units ? ` across ${units} unit${units === 1 ? '' : 's'}` : ''}.`,
  ];

  const statuses = Array.isArray(sales.byStatus) ? sales.byStatus : [];
  if (!sales.statusLabel && statuses.length) {
    lines.push('', 'By status:');
    statuses.forEach((row) => {
      const label = String(row.status || '').replace(/_/g, ' ').toLowerCase();
      lines.push(`- ${row.orderCount} ${label}: ${formatHelpMoney(row.revenue, sales.currency)}`);
    });
  }

  const orders = Array.isArray(sales.orders) ? sales.orders : [];
  if (orders.length) {
    lines.push('', `Every order (${orders.length}):`);
    orders.forEach((order) => {
      const when = formatHelpWhen(order.createdAt);
      const who = order.customer ? ` · ${order.customer}` : '';
      const status = order.status ? ` · ${String(order.status).replace(/_/g, ' ').toLowerCase()}` : '';
      lines.push(`- ${order.orderNumber || 'Order'}${who}${status} · ${formatHelpMoney(order.total, sales.currency)}${when ? ` · ${when}` : ''}`);
    });
  }

  return lines.join('\n');
}

export function formatStoreHelpReply(facts = {}, question = '') {
  if (isWebsiteHelpQuestion(question)) {
    return matchStoreHelpKnowledge(question);
  }

  const answer = formatStoreHelpAnswer(facts, question);
  if (!answer) {
    const knowledge = matchStoreHelpKnowledge(question);
    if (knowledge) return knowledge;

    const howTo = matchHelpHowTo(question);
    if (howTo) {
      return {
        answer: howTo.answer,
        links: [{ label: howTo.label, href: howTo.href }],
      };
    }
    return null;
  }

  const links = [];
  const terms = extractProductQuery(question);
  const usePeriodSales = Boolean(facts.periodSales)
    && (!facts.productSales || facts.productSales.notFound || wantsPeriodSalesLookup(question, terms));
  if (usePeriodSales) {
    links.push({ label: 'Sales Report', href: '/store/sales-report' });
  } else if (facts.productSales && !facts.productSales.notFound) {
    links.push({ label: 'Orders by Product', href: '/store/orders-by-product' });
  }
  if (/pickup/i.test(question) && facts.snapshot) {
    links.push({ label: 'Pickup list', href: '/store/todays-pickup' });
  }
  if (facts.customerList && Number(facts.customerList.customerCount || 0) > 0) {
    links.push({ label: 'Customers', href: '/store/customers' });
  } else if (facts.customerSearch && !facts.customerSearch.notFound) {
    links.push({
      label: 'Customers',
      href: `/store/customers?search=${encodeURIComponent(facts.customerSearch.searched || '')}`,
    });
  }
  if (facts.order && !facts.order.notFound) {
    const orderNumber = String(facts.order.orderNumber || '').trim();
    links.push({
      label: orderNumber ? `Order ${orderNumber}` : 'Orders',
      href: orderNumber
        ? `/store/orders?q=${encodeURIComponent(orderNumber)}`
        : '/store/orders',
    });
  }

  return { answer, links };
}

function speakOrderStatus(status = '') {
  const text = String(status || '').trim();
  if (!text) return 'in progress';
  return text
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function withDownloadHint(answer = '', question = '') {
  if (!answer || !wantsHelpDownload(question)) return answer;
  return `${answer} Use Excel or PDF below to download the details.`;
}

export function formatStoreHelpAnswer(facts = {}, question = '') {
  const text = String(question || '');
  const terms = extractProductQuery(text);
  const usePeriodSales = Boolean(facts.periodSales)
    && (!facts.productSales || facts.productSales.notFound || wantsPeriodSalesLookup(text, terms));

  if (/pickup/i.test(text) && facts.snapshot && Number.isFinite(Number(facts.snapshot.awaitingPickupCount))) {
    const waiting = Number(facts.snapshot.awaitingPickupCount);
    if (waiting === 0) return "Nothing's waiting for pickup right now.";
    return `You've got ${waiting} pickup${waiting === 1 ? '' : 's'} waiting for courier.`;
  }

  if (usePeriodSales) {
    const sales = facts.periodSales;
    if (!sales.orderCount) {
      if (sales.statusLabel) {
        return `You haven't had any ${sales.statusLabel} orders ${speakWhen(sales.rangeKey)} yet.`;
      }
      return `You haven't had any successful orders ${speakWhen(sales.rangeKey)} yet.`;
    }
    return withDownloadHint(formatFullPeriodSales(sales), text);
  }

  if (facts.productSales && !facts.productSales.notFound) {
    const sales = facts.productSales;
    const when = speakWhen(sales.rangeKey);
    const name = cleanHelpProductName(
      sales.byProduct?.[0]?.productName
      || sales.matchedCatalogProducts?.[0]?.name
      || sales.searched
      || 'that product',
    );

    if (!sales.totals?.orderCount) {
      return `${name} hasn't had any orders ${when}.`;
    }
    return withDownloadHint(
      `${name} has ${orderLabel(sales.totals.orderCount)} ${when} — ${sales.totals.unitsSold} sold, ${formatHelpMoney(sales.totals.revenue)}.`,
      text,
    );
  }

  if (facts.order?.notFound) {
    return `I couldn't find order ${facts.order.searched}.`;
  }

  if (facts.customerList) {
    const count = Number(facts.customerList.customerCount || 0);
    if (!count) return "You don't have any customers in your orders yet.";
    return withDownloadHint(
      `You've got ${count} customer${count === 1 ? '' : 's'} on file.`,
      text,
    );
  }

  if (facts.customerSearch) {
    const searched = facts.customerSearch.searched || 'that name';
    if (facts.customerSearch.notFound) {
      return `No customer named ${searched} in your orders.`;
    }
    const names = (facts.customerSearch.customers || [])
      .map((customer) => customer.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    const count = facts.customerSearch.customers?.length || 0;
    const orders = Number(facts.customerSearch.orderCount || 0);
    return withDownloadHint(
      `Yes — ${count} customer${count === 1 ? '' : 's'} match ${searched}${names ? ` (${names})` : ''}${orders ? `, with ${orderLabel(orders)}` : ''}.`,
      text,
    );
  }

  if (facts.order) {
    const items = (facts.order.items || [])
      .map((item) => cleanHelpProductName(item.name))
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    return withDownloadHint(
      `Order ${facts.order.orderNumber} is ${speakOrderStatus(facts.order.status)}, ${formatHelpMoney(facts.order.total)}${items ? ` — ${items}` : ''}.`,
      text,
    );
  }

  if (facts.productSales?.notFound && !facts.periodSales) {
    return `I couldn't find a product matching "${facts.productSales.searched}".`;
  }

  return null;
}
