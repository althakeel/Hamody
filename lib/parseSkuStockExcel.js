import { normalizeSku, parseSkuStockRows } from '@/lib/parseSkuList';

function excelCellValue(cell) {
  const value = cell?.value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    if (typeof value.result === 'number' && Number.isFinite(value.result)) return value.result;
    if (typeof value.text === 'string' && value.text.trim()) return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('');
  }
  if (cell?.text) return cell.text;
  return value;
}

function worksheetToRows(worksheet) {
  const rows = [];
  worksheet.eachRow((row) => {
    const last = Math.max(row.cellCount || 5, 5);
    const cells = [];
    for (let index = 1; index <= last; index += 1) {
      cells.push(excelCellValue(row.getCell(index)));
    }
    rows.push(cells);
  });
  return rows;
}

export async function parseSkuStockExcelFile(file) {
  if (!file) throw new Error('Choose an Excel file');
  const ExcelJSMod = await import('exceljs');
  const ExcelJS = ExcelJSMod.default || ExcelJSMod;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('The Excel file has no sheets');
  const rows = parseSkuStockRows(worksheetToRows(worksheet));
  if (!rows.length) {
    throw new Error('No SKU rows found. Use SKU, PRODUCT NAME, STOCK, SUPPLIER NAME, BRAND.');
  }
  return rows;
}

export async function downloadSkuStockExcelTemplate() {
  const ExcelJSMod = await import('exceljs');
  const ExcelJS = ExcelJSMod.default || ExcelJSMod;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock');
  sheet.addRow(['SKU', 'PRODUCT NAME', 'STOCK', 'SUPPLIER NAME', 'BRAND']);
  sheet.addRow(['644161878772', 'Air Blower', 0, 'China', 'NEXSO']);
  sheet.addRow(['ST4007', 'Sample product', 12, 'China', 'NEXSO']);
  sheet.addRow(['ST4008', 'Another product', 0, '', '']);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = [{ width: 18 }, { width: 28 }, { width: 12 }, { width: 18 }, { width: 14 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'stock-by-sku-template.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function triggerExcelDownload(buffer, fileName) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function paintNotFoundRow(row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { color: { argb: 'FFB91C1C' }, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFECACA' },
    };
  });
}

export async function downloadInventoryPreviewExcel({
  rows = [],
  missingSkus = [],
  fileName = 'inventory-not-found.xlsx',
} = {}) {
  const missing = new Set(
    (Array.isArray(missingSkus) ? missingSkus : [])
      .map((sku) => normalizeSku(sku).toLowerCase())
      .filter(Boolean),
  );
  const ExcelJSMod = await import('exceljs');
  const ExcelJS = ExcelJSMod.default || ExcelJSMod;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inventory');
  const header = sheet.addRow(['SKU', 'PRODUCT NAME', 'STOCK', 'SUPPLIER NAME', 'BRAND']);
  header.font = { bold: true };
  sheet.columns = [{ width: 18 }, { width: 36 }, { width: 12 }, { width: 18 }, { width: 14 }];

  const seen = new Set();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const sku = normalizeSku(row?.sku);
    if (!sku) return;
    seen.add(sku.toLowerCase());
    const excelRow = sheet.addRow([
      sku,
      String(row?.name || row?.productName || ''),
      row?.stockQuantity ?? '',
      String(row?.supplierName || ''),
      String(row?.brand || ''),
    ]);
    if (missing.has(sku.toLowerCase())) paintNotFoundRow(excelRow);
  });

  missing.forEach((skuLower) => {
    if (seen.has(skuLower)) return;
    const excelRow = sheet.addRow([skuLower, '', '', '', '']);
    paintNotFoundRow(excelRow);
  });

  if (sheet.rowCount <= 1) {
    throw new Error('No rows to download');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  triggerExcelDownload(buffer, fileName);
}
