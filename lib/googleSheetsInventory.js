import { GoogleAuth } from 'google-auth-library';
import mongoose from 'mongoose';
import { after } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import Supplier from '@/models/Supplier';
import { loadFirebaseServiceAccount } from '@/lib/loadFirebaseServiceAccount';
import { getCurrentStock, getVariantStocks } from '@/lib/storeInventory';
import { parseInventorySheetRows } from '@/lib/parseSkuList';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SHEET_TITLE = 'Store1920 Inventory';
const COST_SHEET_TITLE = 'Store1920 Product Cost';
const COLUMN_COUNT = 8;
const HEADERS = [
  'SKU',
  'PRODUCT NAME',
  'STOCK',
  'SUPPLIER NAME',
  'BRAND',
  'Variant stocks',
  'Stock updated',
  'Synced at',
];
const COLUMN_WIDTHS = [160, 320, 90, 180, 140, 240, 150, 150];
const COST_COLUMN_COUNT = 5;
const COST_HEADERS = ['Product name', 'SKU', 'Product cost', 'Sale price', 'Margin %'];
const COST_COLUMN_WIDTHS = [360, 160, 130, 130, 110];
const NEXSO_SHEET_TITLE = 'Nexso';
const NEXSO_COLUMN_COUNT = 6;
const NEXSO_HEADERS = ['Product name', 'SKU', 'Product cost', 'Sale price', 'Margin %', 'Stock'];
const NEXSO_COLUMN_WIDTHS = [360, 160, 130, 130, 110, 90];
const SUPPLIERS_SHEET_TITLE = 'Store1920 Suppliers';
const SUPPLIERS_COLUMN_COUNT = 12;
const SUPPLIERS_HEADERS = [
  'Supplier name',
  'Company',
  'Contact name',
  'Email',
  'Phone',
  'TRN',
  'Address',
  'City',
  'Country',
  'Notes',
  'Status',
  'Updated',
];
const SUPPLIERS_COLUMN_WIDTHS = [200, 180, 160, 220, 140, 140, 260, 120, 120, 240, 90, 150];

function hexColor(hex) {
  const value = String(hex || '').replace('#', '');
  return {
    red: Number.parseInt(value.slice(0, 2), 16) / 255,
    green: Number.parseInt(value.slice(2, 4), 16) / 255,
    blue: Number.parseInt(value.slice(4, 6), 16) / 255,
  };
}

const syncGenerations = new Map();
const AUTO_SYNC_DELAY_MS = 2500;

export function parseSpreadsheetId(value = '') {
  const raw = String(value || '').trim();
  const fromUrl = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return fromUrl?.[1] || raw;
}

function normalizeServiceAccount(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const key = String(parsed.private_key || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();
  if (!parsed.client_email || !key.includes('BEGIN')) return null;
  return {
    ...parsed,
    private_key: key.endsWith('\n') ? key : `${key}\n`,
  };
}

function parseServiceAccountJson(raw) {
  const inline = String(raw || '').trim();
  if (!inline.startsWith('{')) return null;
  try {
    return normalizeServiceAccount(JSON.parse(inline));
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
    // Fall through to merchant credentials.
  }

  return parseServiceAccountJson(process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON)
    || parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}

export function getGoogleSheetsInventoryConfig() {
  const spreadsheetId = parseSpreadsheetId(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '');
  const tab = String(process.env.GOOGLE_SHEETS_TAB || 'Inventory').trim() || 'Inventory';
  const costTab = String(process.env.GOOGLE_SHEETS_COST_TAB || 'Product Cost').trim() || 'Product Cost';
  const nexsoTab = String(process.env.GOOGLE_SHEETS_NEXSO_TAB || 'Nexso').trim() || 'Nexso';
  const suppliersTab = String(process.env.GOOGLE_SHEETS_SUPPLIERS_TAB || 'Suppliers').trim() || 'Suppliers';
  const serviceAccountJson = loadSheetsServiceAccount();

  return {
    spreadsheetId,
    tab,
    costTab,
    nexsoTab,
    suppliersTab,
    serviceAccountJson,
    clientEmail: String(serviceAccountJson?.client_email || '').trim(),
    spreadsheetUrl: spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      : '',
    configured: Boolean(spreadsheetId && serviceAccountJson),
  };
}

function sheetRange(tab, a1 = 'A1') {
  const safe = String(tab || 'Inventory').replace(/'/g, "''");
  return `'${safe}'!${a1}`;
}

function formatSheetDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function supplierLabel(product = {}) {
  const names = Array.isArray(product.supplierNames)
    ? product.supplierNames.map((name) => String(name || '').trim()).filter(Boolean)
    : [];
  if (names.length) return names.join(', ');
  return String(product.supplierName || '').trim();
}

function variantStockLabel(product = {}) {
  return getVariantStocks(product)
    .map((item) => `${item.label}: ${item.stock}`)
    .join('; ');
}

function columnLetter(count) {
  return String.fromCharCode(64 + Math.max(1, Math.min(26, Number(count) || 1)));
}

function variantDisplayLabel(variant = {}, index = 0) {
  const options = variant?.options && typeof variant.options === 'object' ? variant.options : {};
  const fromOptions = [
    options.color,
    options.size,
    options.title,
    options.bundleQty ? `Qty ${options.bundleQty}` : '',
  ].map((part) => String(part || '').trim()).filter(Boolean);
  if (fromOptions.length) return fromOptions.join(' / ');
  const named = String(variant?.name || variant?.title || variant?.label || '').trim();
  return named || `Variant ${index + 1}`;
}

function sheetMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function rowSalePrice(product = {}, variant = null) {
  if (variant) {
    return sheetMoney(variant.price ?? variant.AED ?? product.AED ?? product.price ?? 0);
  }
  return sheetMoney(product.AED ?? product.price ?? 0);
}

function rowCostPrice(product = {}, variant = null) {
  return sheetMoney(variant?.costPrice ?? product.costPrice ?? 0);
}

function rowMarginPercent(cost, sale) {
  if (!(sale > 0) || !(cost > 0)) return '';
  return Math.round(((sale - cost) / sale) * 1000) / 10;
}

function costSheetRow(name, sku, cost, sale) {
  return [name, sku, cost, sale, rowMarginPercent(cost, sale)];
}

function rowStock(product = {}, variant = null) {
  if (variant) return Math.max(0, Number(variant.stock ?? 0));
  return getCurrentStock(product);
}

function isNexsoProduct(product = {}) {
  return String(product?.brand || '').trim().toLowerCase().includes('nexso');
}

function nexsoSheetRow(name, sku, cost, sale, stock) {
  return [name, sku, cost, sale, rowMarginPercent(cost, sale), stock];
}

export function productsToNexsoSheetRows(products = []) {
  const rows = [];
  (Array.isArray(products) ? products : []).filter(isNexsoProduct).forEach((product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const variantRows = (product?.hasVariants ? variants : [])
      .map((variant, index) => {
        const sku = String(variant?.sku || '').trim();
        if (!sku) return null;
        const label = variantDisplayLabel(variant, index);
        const cost = rowCostPrice(product, variant);
        const sale = rowSalePrice(product, variant);
        return nexsoSheetRow(
          `${String(product?.name || '').trim()}${label ? ` — ${label}` : ''}`.trim(),
          sku,
          cost,
          sale,
          rowStock(product, variant),
        );
      })
      .filter(Boolean);

    if (variantRows.length) {
      rows.push(...variantRows);
      return;
    }

    rows.push(nexsoSheetRow(
      String(product?.name || ''),
      String(product?.sku || ''),
      rowCostPrice(product),
      rowSalePrice(product),
      rowStock(product),
    ));
  });
  return rows;
}

function supplierStoreQuery(storeId) {
  const raw = String(storeId || '').trim();
  const keys = [raw, storeId].filter(Boolean);
  if (/^[a-fA-F0-9]{24}$/.test(raw)) {
    keys.push(new mongoose.Types.ObjectId(raw));
  }
  return { storeId: { $in: keys } };
}

export function suppliersToSheetRows(suppliers = []) {
  return (Array.isArray(suppliers) ? suppliers : []).map((supplier) => ([
    String(supplier?.name || ''),
    String(supplier?.company || ''),
    String(supplier?.contactName || ''),
    String(supplier?.email || ''),
    String(supplier?.phone || ''),
    String(supplier?.trn || ''),
    String(supplier?.address || ''),
    String(supplier?.city || ''),
    String(supplier?.country || ''),
    String(supplier?.notes || ''),
    supplier?.isActive === false ? 'Inactive' : 'Active',
    formatSheetDate(supplier?.updatedAt || supplier?.createdAt),
  ]));
}

export function productsToCostSheetRows(products = []) {
  const rows = [];
  (Array.isArray(products) ? products : []).forEach((product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const variantRows = (product?.hasVariants ? variants : [])
      .map((variant, index) => {
        const sku = String(variant?.sku || '').trim();
        if (!sku) return null;
        const label = variantDisplayLabel(variant, index);
        const cost = rowCostPrice(product, variant);
        const sale = rowSalePrice(product, variant);
        return costSheetRow(
          `${String(product?.name || '').trim()}${label ? ` — ${label}` : ''}`.trim(),
          sku,
          cost,
          sale,
        );
      })
      .filter(Boolean);

    if (variantRows.length) {
      rows.push(...variantRows);
      return;
    }

    const cost = rowCostPrice(product);
    const sale = rowSalePrice(product);
    rows.push(costSheetRow(String(product?.name || ''), String(product?.sku || ''), cost, sale));
  });
  return rows;
}

export function productToSheetRow(product = {}, syncedAt = new Date()) {
  return [
    String(product.sku || ''),
    String(product.name || ''),
    getCurrentStock(product),
    supplierLabel(product),
    String(product.brand || ''),
    variantStockLabel(product),
    formatSheetDate(product.stockUpdatedAt || product.updatedAt),
    formatSheetDate(syncedAt),
  ];
}

export async function readInventorySheetRows() {
  const config = getGoogleSheetsInventoryConfig();
  if (!config.configured) {
    throw new Error('Google Sheets is not configured. Add GOOGLE_SHEETS_SPREADSHEET_ID and share the sheet with the service account.');
  }

  const token = await getSheetsAccessToken(config.serviceAccountJson);
  const encodedRange = encodeURIComponent(sheetRange(config.tab, 'A:Z'));
  const data = await sheetsRequest(
    token,
    `/spreadsheets/${config.spreadsheetId}/values/${encodedRange}`,
  );
  const rows = parseInventorySheetRows(data?.values || []);
  if (!rows.length) {
    throw new Error('No SKU rows found in the Inventory tab. Use SKU, PRODUCT NAME, STOCK, SUPPLIER NAME, BRAND.');
  }
  return rows;
}

async function getSheetsAccessToken(serviceAccountJson) {
  const auth = new GoogleAuth({
    credentials: serviceAccountJson,
    scopes: [SHEETS_SCOPE],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  if (!token) throw new Error('Failed to get Google Sheets access token');
  return token;
}

async function sheetsRequest(token, path, { method = 'GET', body } = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const googleMessage = data?.error?.message || `Google Sheets request failed (${response.status})`;
    const permissionError = response.status === 403 || /permission/i.test(googleMessage);
    throw new Error(permissionError
      ? `${googleMessage} Share the sheet with this email as Editor, then try Sync again.`
      : googleMessage);
  }
  return data;
}

async function ensureInventoryTab(token, spreadsheetId, tab) {
  const meta = await sheetsRequest(token, `/spreadsheets/${spreadsheetId}?fields=sheets.properties`);
  const existing = (meta.sheets || []).find((sheet) => sheet?.properties?.title === tab);
  if (existing) return Number(existing.properties.sheetId);

  const added = await sheetsRequest(token, `/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: {
      requests: [{ addSheet: { properties: { title: tab } } }],
    },
  });
  return Number(added?.replies?.[0]?.addSheet?.properties?.sheetId || 0);
}

function cellRange(sheetId, startRow, endRow, startCol = 0, endCol = COLUMN_COUNT) {
  return {
    sheetId,
    startRowIndex: startRow,
    endRowIndex: endRow,
    startColumnIndex: startCol,
    endColumnIndex: endCol,
  };
}

function formatSheetLayoutRequests({
  sheetId,
  rowCount,
  tab,
  columnCount = COLUMN_COUNT,
  columnWidths = COLUMN_WIDTHS,
  headerHex = '047857',
}) {
  const lastRow = Math.max(rowCount, 2);
  const range = (startRow, endRow) => cellRange(sheetId, startRow, endRow, 0, columnCount);
  return [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          title: tab,
          gridProperties: { frozenRowCount: 2, columnCount },
        },
        fields: 'title,gridProperties.frozenRowCount,gridProperties.columnCount',
      },
    },
    {
      mergeCells: {
        range: range(0, 1),
        mergeType: 'MERGE_ALL',
      },
    },
    {
      repeatCell: {
        range: range(0, lastRow),
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy',
      },
    },
    {
      repeatCell: {
        range: range(0, 1),
        cell: {
          userEnteredFormat: {
            backgroundColor: hexColor('0F172A'),
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            textFormat: {
              bold: true,
              fontSize: 16,
              foregroundColor: hexColor('FFFFFF'),
              fontFamily: 'Arial',
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)',
      },
    },
    {
      repeatCell: {
        range: range(1, 2),
        cell: {
          userEnteredFormat: {
            backgroundColor: hexColor(headerHex),
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            textFormat: {
              bold: true,
              fontSize: 11,
              foregroundColor: hexColor('FFFFFF'),
              fontFamily: 'Arial',
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)',
      },
    },
    {
      repeatCell: {
        range: range(2, lastRow),
        cell: {
          userEnteredFormat: {
            backgroundColor: hexColor('F8FAFC'),
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            textFormat: {
              fontSize: 10,
              foregroundColor: hexColor('334155'),
              fontFamily: 'Arial',
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)',
      },
    },
    {
      updateBorders: {
        range: range(0, lastRow),
        top: { style: 'SOLID', color: hexColor('CBD5E1'), width: 1 },
        bottom: { style: 'SOLID', color: hexColor('CBD5E1'), width: 1 },
        left: { style: 'SOLID', color: hexColor('CBD5E1'), width: 1 },
        right: { style: 'SOLID', color: hexColor('CBD5E1'), width: 1 },
        innerHorizontal: { style: 'SOLID', color: hexColor('E2E8F0'), width: 1 },
        innerVertical: { style: 'SOLID', color: hexColor('E2E8F0'), width: 1 },
      },
    },
    ...columnWidths.map((pixelSize, index) => ({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: index,
          endIndex: index + 1,
        },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    })),
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 42 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 32 },
        fields: 'pixelSize',
      },
    },
  ];
}

function formatInventorySheetRequests(sheetId, rowCount, tab) {
  return formatSheetLayoutRequests({
    sheetId,
    rowCount,
    tab,
    columnCount: COLUMN_COUNT,
    columnWidths: COLUMN_WIDTHS,
    headerHex: '047857',
  });
}

async function writeTabValues(token, spreadsheetId, tab, sheetId, values, {
  columnCount,
  columnWidths,
  headerHex,
} = {}) {
  const lastCol = columnLetter(columnCount);
  const encodedRange = encodeURIComponent(sheetRange(tab, `A:${lastCol}`));
  await sheetsRequest(token, `/spreadsheets/${spreadsheetId}/values/${encodedRange}:clear`, {
    method: 'POST',
    body: {},
  });

  const updateRange = encodeURIComponent(sheetRange(tab, 'A1'));
  await sheetsRequest(
    token,
    `/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: { values },
    },
  );

  await sheetsRequest(token, `/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: {
      requests: formatSheetLayoutRequests({
        sheetId,
        rowCount: values.length,
        tab,
        columnCount,
        columnWidths,
        headerHex,
      }),
    },
  });
}

async function writeInventoryValues(token, spreadsheetId, tab, sheetId, values) {
  await writeTabValues(token, spreadsheetId, tab, sheetId, values, {
    columnCount: COLUMN_COUNT,
    columnWidths: COLUMN_WIDTHS,
    headerHex: '047857',
  });
}

export function getGoogleSheetsInventoryStatus() {
  const config = getGoogleSheetsInventoryConfig();
  return {
    configured: config.configured,
    spreadsheetUrl: config.spreadsheetUrl,
    tab: config.tab,
    costTab: config.costTab,
    nexsoTab: config.nexsoTab,
    suppliersTab: config.suppliersTab,
    clientEmail: config.clientEmail,
    viewOnly: false,
  };
}

export async function syncStoreInventoryToGoogleSheet(storeId) {
  const config = getGoogleSheetsInventoryConfig();
  if (!config.configured) {
    throw new Error('Google Sheets is not configured. Add GOOGLE_SHEETS_SPREADSHEET_ID and share the sheet with the service account.');
  }

  await connectDB();
  const [products, suppliers] = await Promise.all([
    Product.find({ storeId: String(storeId || '').trim() })
      .select('name sku brand supplierName supplierNames stockQuantity inStock hasVariants variants stockUpdatedAt updatedAt price AED costPrice')
      .sort({ sku: 1, name: 1 })
      .lean(),
    Supplier.find(supplierStoreQuery(storeId)).sort({ name: 1, updatedAt: -1 }).lean(),
  ]);

  const syncedAt = new Date();
  const title = `${SHEET_TITLE}  ·  ${products.length} products  ·  Edit stock, supplier, brand  ·  SKU and name stay  ·  Synced ${formatSheetDate(syncedAt)} UTC`;
  const values = [
    [title, ...Array(COLUMN_COUNT - 1).fill('')],
    HEADERS,
    ...products.map((product) => productToSheetRow(product, syncedAt)),
  ];
  const costRows = productsToCostSheetRows(products);
  const costTitle = `${COST_SHEET_TITLE}  ·  ${costRows.length} SKUs  ·  View only  ·  Synced ${formatSheetDate(syncedAt)} UTC`;
  const costValues = [
    [costTitle, ...Array(COST_COLUMN_COUNT - 1).fill('')],
    COST_HEADERS,
    ...costRows,
  ];
  const nexsoRows = productsToNexsoSheetRows(products);
  const nexsoTitle = `${NEXSO_SHEET_TITLE}  ·  ${nexsoRows.length} SKUs  ·  View only  ·  Synced ${formatSheetDate(syncedAt)} UTC`;
  const nexsoValues = [
    [nexsoTitle, ...Array(NEXSO_COLUMN_COUNT - 1).fill('')],
    NEXSO_HEADERS,
    ...nexsoRows,
  ];
  const supplierRows = suppliersToSheetRows(suppliers);
  const supplierTitle = `${SUPPLIERS_SHEET_TITLE}  ·  ${supplierRows.length} suppliers  ·  View only  ·  Synced ${formatSheetDate(syncedAt)} UTC`;
  const supplierValues = [
    [supplierTitle, ...Array(SUPPLIERS_COLUMN_COUNT - 1).fill('')],
    SUPPLIERS_HEADERS,
    ...supplierRows,
  ];
  const token = await getSheetsAccessToken(config.serviceAccountJson);
  try {
    const sheetId = await ensureInventoryTab(token, config.spreadsheetId, config.tab);
    await writeInventoryValues(token, config.spreadsheetId, config.tab, sheetId, values);
    const costSheetId = await ensureInventoryTab(token, config.spreadsheetId, config.costTab);
    await writeTabValues(token, config.spreadsheetId, config.costTab, costSheetId, costValues, {
      columnCount: COST_COLUMN_COUNT,
      columnWidths: COST_COLUMN_WIDTHS,
      headerHex: '1D4ED8',
    });
    const nexsoSheetId = await ensureInventoryTab(token, config.spreadsheetId, config.nexsoTab);
    await writeTabValues(token, config.spreadsheetId, config.nexsoTab, nexsoSheetId, nexsoValues, {
      columnCount: NEXSO_COLUMN_COUNT,
      columnWidths: NEXSO_COLUMN_WIDTHS,
      headerHex: 'B45309',
    });
    const suppliersSheetId = await ensureInventoryTab(token, config.spreadsheetId, config.suppliersTab);
    await writeTabValues(token, config.spreadsheetId, config.suppliersTab, suppliersSheetId, supplierValues, {
      columnCount: SUPPLIERS_COLUMN_COUNT,
      columnWidths: SUPPLIERS_COLUMN_WIDTHS,
      headerHex: '0F766E',
    });
  } catch (error) {
    const message = String(error?.message || 'Google Sheets request failed');
    if (/permission/i.test(message) && config.clientEmail) {
      throw new Error(`${message} Share this address as Editor: ${config.clientEmail}`);
    }
    throw error;
  }

  return {
    success: true,
    rowCount: products.length,
    costRowCount: costRows.length,
    nexsoRowCount: nexsoRows.length,
    supplierRowCount: supplierRows.length,
    syncedAt: syncedAt.toISOString(),
    spreadsheetUrl: config.spreadsheetUrl,
    tab: config.tab,
    costTab: config.costTab,
    nexsoTab: config.nexsoTab,
    suppliersTab: config.suppliersTab,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runQueuedSheetSync(storeId, generation) {
  await delay(AUTO_SYNC_DELAY_MS);
  if (syncGenerations.get(storeId) !== generation) return;
  try {
    await syncStoreInventoryToGoogleSheet(storeId);
  } catch (error) {
    console.error('[google-sheet inventory]', error?.message || error);
  }
}

export function queueInventorySheetSync(storeId) {
  const config = getGoogleSheetsInventoryConfig();
  if (!config.configured || !storeId) return;

  const id = String(storeId);
  const generation = (syncGenerations.get(id) || 0) + 1;
  syncGenerations.set(id, generation);
  const job = runQueuedSheetSync(id, generation);

  try {
    after(() => job);
  } catch {
    // Local Node still keeps the promise; serverless uses after() above.
  }
}
