export function normalizeSku(value) {
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
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isSkuHeader(key) {
  return ['sku', 'skucode', 'skus', 'productsku', 'itemsku', 'barcode'].includes(key);
}

function isNameHeader(key) {
  return ['productname', 'name', 'product', 'title'].includes(key);
}

function isStockHeader(key) {
  return ['stock', 'qty', 'quantity', 'mainstock', 'newstock'].includes(key);
}

function isSupplierHeader(key) {
  return ['suppliername', 'supplier', 'vendor', 'vendorname'].includes(key);
}

function isBrandHeader(key) {
  return ['brand', 'brandname'].includes(key);
}

function detectColumnMap(headerCells = []) {
  const map = { sku: -1, name: -1, stock: -1, supplier: -1, brand: -1 };
  headerCells.forEach((cell, index) => {
    const key = headerKey(cell);
    if (map.sku < 0 && isSkuHeader(key)) map.sku = index;
    else if (map.stock < 0 && isStockHeader(key)) map.stock = index;
    else if (map.supplier < 0 && isSupplierHeader(key)) map.supplier = index;
    else if (map.brand < 0 && isBrandHeader(key)) map.brand = index;
    else if (map.name < 0 && isNameHeader(key)) map.name = index;
  });
  return map.sku >= 0 ? map : null;
}

function defaultColumnMap(width) {
  if (width >= 5) {
    return { sku: 0, name: 1, stock: 2, supplier: 3, brand: 4 };
  }
  return { sku: 0, name: -1, stock: 1, supplier: -1, brand: -1 };
}

function cellsFromRow(row) {
  if (Array.isArray(row)) return row;
  return [
    row?.sku,
    row?.name ?? row?.productName,
    row?.stock ?? row?.stockQuantity,
    row?.supplierName ?? row?.supplier,
    row?.brand,
  ];
}

function isTitleRow(cells = []) {
  const first = String(cells[0] ?? '').trim();
  if (!first) return false;
  if (/inventory|view only|synced |hamody/i.test(first) && first.length > 24) return true;
  return false;
}

function isHeaderRow(sku, stock) {
  const skuKey = headerKey(sku);
  const stockKey = headerKey(stock);
  if (!skuKey) return true;
  if (isSkuHeader(skuKey) || isNameHeader(skuKey) || isStockHeader(skuKey)) return true;
  if (isStockHeader(stockKey) && !/^\d+$/.test(stockKey)) return true;
  return false;
}

function parseStockCell(value) {
  if (value == null || value === '') return null;
  const qty = Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(qty) || qty < 0 || !Number.isInteger(qty)) return null;
  return qty;
}

function cellText(value) {
  if (value == null) return '';
  return String(value).trim();
}

/** Split pasted SKUs: commas, spaces, newlines, or semicolons. */
export function parseSkuList(value = '') {
  return [...new Set(
    String(value || '')
      .split(/[\s,;|]+/)
      .map((sku) => normalizeSku(sku))
      .filter(Boolean),
  )];
}

/**
 * Inventory sheet/Excel rows. SKU is the match key only.
 * Product name is ignored for writes. Duplicate SKUs keep the last values.
 */
export function parseInventorySheetRows(rows = []) {
  const matrix = (Array.isArray(rows) ? rows : []).map(cellsFromRow);
  let start = 0;
  let map = null;

  for (let index = 0; index < Math.min(matrix.length, 5); index += 1) {
    if (isTitleRow(matrix[index])) continue;
    const detected = detectColumnMap(matrix[index]);
    if (detected) {
      map = detected;
      start = index + 1;
      break;
    }
  }

  if (!map) {
    const width = Math.max(0, ...matrix.map((row) => row.length));
    map = defaultColumnMap(width);
  }

  const bySku = new Map();
  for (let index = start; index < matrix.length; index += 1) {
    const cells = matrix[index];
    const sku = normalizeSku(cells[map.sku]);
    const stockCell = map.stock >= 0 ? cells[map.stock] : '';
    if (!sku || isHeaderRow(sku, stockCell) || isTitleRow(cells)) continue;

    const stockQuantity = map.stock >= 0 ? parseStockCell(stockCell) : null;
    const supplierName = map.supplier >= 0 ? cellText(cells[map.supplier]) : '';
    const brand = map.brand >= 0 ? cellText(cells[map.brand]) : '';
    if (stockQuantity == null && !supplierName && !brand) continue;

    bySku.set(sku, {
      sku,
      name: map.name >= 0 ? cellText(cells[map.name]) : '',
      stockQuantity,
      supplierName,
      brand,
    });
  }

  return [...bySku.values()];
}

/**
 * Excel/CSV rows: column 1 = SKU, column 2 = stock, or a headed inventory sheet.
 * Duplicate SKUs keep the last values.
 */
export function parseSkuStockRows(rows = []) {
  return parseInventorySheetRows(rows);
}
