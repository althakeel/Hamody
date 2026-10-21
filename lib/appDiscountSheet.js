function parseMoney(value) {
  if (value === undefined || value === null || value === '') return null;
  const amount = Number(String(value).replace(/[, ]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

function normalizeSku(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > Number.MAX_SAFE_INTEGER) return String(value);
    return String(Math.round(value));
  }
  const text = String(value).trim();
  if (!text) return '';
  if (/^\d+\.?\d*e[+-]?\d+$/i.test(text.replace(/\s/g, ''))) {
    const amount = Number(text);
    if (Number.isFinite(amount) && amount <= Number.MAX_SAFE_INTEGER) {
      return String(Math.round(amount));
    }
  }
  if (/^\d+\.0+$/.test(text)) return text.replace(/\.0+$/, '');
  return text;
}

function headerKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isSkuHeader(key) {
  return ['sku', 'skucode', 'skus', 'productsku', 'itemsku', 'barcode'].includes(key);
}

function isMobilePriceHeader(key) {
  if (['saleprice', 'regularprice', 'websiteprice', 'mrp', 'cost', 'costprice'].includes(key)) return false;
  return ['mobileprice', 'appprice', 'mobile', 'price', 'app'].includes(key);
}

function pickFromRow(row = {}) {
  const entries = Object.entries(row).map(([key, value]) => ({
    key: headerKey(key),
    value,
  }));
  const sku = normalizeSku(entries.find((item) => isSkuHeader(item.key))?.value);
  const mobilePrice = parseMoney(entries.find((item) => isMobilePriceHeader(item.key))?.value);
  if (!sku || mobilePrice === null) return null;
  return { sku, mobilePrice };
}

export function rowsToAppPrices(rows = []) {
  const bySku = new Map();
  rows.forEach((row) => {
    const picked = pickFromRow(row);
    if (picked) bySku.set(picked.sku.toLowerCase(), picked);
  });
  return [...bySku.values()];
}
