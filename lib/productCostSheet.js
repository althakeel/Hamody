function parseCost(value) {
  if (value === undefined || value === null || value === '') return null;
  const amount = Number(String(value).replace(/[, ]/g, ''));
  if (!Number.isFinite(amount) || amount < 0) return null;
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

function looksLikeSku(value) {
  const text = normalizeSku(value);
  if (!text || text.length < 2) return false;
  if (/^(sku|product|cost|price|productcost)$/i.test(text)) return false;
  if (/^\d{3,}$/.test(text)) return true;
  return /[a-z]/i.test(text) && /[0-9]/.test(text);
}

function headerKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isSkuHeader(key) {
  return ['sku', 'skucode', 'skus', 'productsku', 'itemsku', 'barcode'].includes(key);
}

function isCostHeader(key) {
  return ['cost', 'productcost', 'costprice', 'purchasecost', 'price', 'amount'].includes(key);
}

function pickFromRow(row = {}) {
  const entries = Object.entries(row).map(([key, value]) => ({
    key: headerKey(key),
    value,
  }));

  const skuFromHeader = entries.find((item) => isSkuHeader(item.key))?.value;
  const costFromHeader = entries.find((item) => isCostHeader(item.key))?.value;
  const sku = normalizeSku(skuFromHeader);
  const costPrice = parseCost(costFromHeader);
  if (sku && costPrice !== null) {
    return { sku, costPrice };
  }

  const values = entries.map((item) => item.value).filter((value) => value !== '' && value != null);
  const skuValue = values.find((value) => looksLikeSku(value));
  const costValue = values.find((value) => parseCost(value) !== null && !looksLikeSku(value));
  if (skuValue !== undefined && costValue !== undefined) {
    return { sku: normalizeSku(skuValue), costPrice: parseCost(costValue) };
  }
  return null;
}

export function rowsToSkuCostLines(rows = []) {
  return rows
    .map(pickFromRow)
    .filter((row) => row?.sku && row.costPrice !== null)
    .map((row) => `${row.sku},${row.costPrice}`);
}

export function countSkuCostRows(rows = []) {
  return rowsToSkuCostLines(rows).length;
}
