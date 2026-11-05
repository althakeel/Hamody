import * as XLSX from 'xlsx';

const HEADER_ALIASES = new Map([
  ['id', 'ID'],
  ['store product id', 'Store product id'],
  ['type', 'Type'],
  ['sku', 'SKU'],
  ['name', 'Name'],
  ['title', 'Name'],
  ['product name', 'Name'],
  ['product title', 'Name'],
  ['name arabic', 'Name Arabic'],
  ['name ar', 'Name Arabic'],
  ['arabic name', 'Name Arabic'],
  ['slug', 'Slug'],
  ['published', 'Published'],
  ['online', 'Published'],
  ['online / published', 'Published'],
  ['short description', 'Short description'],
  ['description', 'Description'],
  ['sale price', 'Sale price'],
  ['selling', 'Sale price'],
  ['price', 'Sale price'],
  ['regular price', 'Regular price'],
  ['mrp', 'Regular price'],
  ['aed', 'Regular price'],
  ['aed / mrp', 'Regular price'],
  ['aed/mrp', 'Regular price'],
  ['cost price', 'Cost price'],
  ['cost', 'Cost price'],
  ['categories', 'Categories'],
  ['category', 'Categories'],
  ['tags', 'Tags'],
  ['tag', 'Tags'],
  ['images', 'Images'],
  ['image', 'Images'],
  ['image url', 'Images'],
  ['additional images', 'Images'],
  ['brands', 'Brands'],
  ['brand', 'Brands'],
  ['brand arabic', 'Brand Arabic'],
  ['parent', 'Parent'],
  ['in stock', 'In stock?'],
  ['in stock?', 'In stock?'],
  ['stock status', 'In stock?'],
  ['stock', 'Meta: _total_stock_quantity'],
  ['current stock', 'Meta: _total_stock_quantity'],
  ['stock quantity', 'Meta: _total_stock_quantity'],
  ['qty', 'Meta: _total_stock_quantity'],
  ['quantity', 'Meta: _total_stock_quantity'],
  ['meta: _total_stock_quantity', 'Meta: _total_stock_quantity'],
  ['fast delivery', 'Fast delivery'],
  ['free shipping', 'Free shipping'],
  ['allow return', 'Allow return'],
  ['allow replacement', 'Allow replacement'],
  ['is featured?', 'Is featured?'],
  ['featured', 'Is featured?'],
  ['weight', 'Weight'],
  ['length', 'Length'],
  ['width', 'Width'],
  ['height', 'Height'],
  ['hs code', 'HS code'],
  ['origin country', 'Origin country'],
  ['shipping weight kg', 'Shipping weight kg'],
  ['seo title', 'SEO title'],
  ['seo h1', 'SEO H1'],
  ['seo description', 'SEO description'],
  ['seo keywords', 'SEO keywords'],
  ['suppliers', 'Suppliers'],
  ['supplier', 'Suppliers'],
  ['variant id', 'Variant id'],
  ['bundle qty', 'Bundle qty'],
  ['option label', 'Option label'],
  ['bundle title', 'Bundle title'],
  ['variant tag', 'Variant tag'],
  ['image slot', 'Image slot'],
]);

function canonicalHeader(value, index) {
  const trimmed = String(value || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return `Column ${index + 1}`;
  return HEADER_ALIASES.get(trimmed.toLowerCase()) || trimmed;
}

const normalizeHeaderRow = (headerRow = []) => {
  const seen = new Map();

  return headerRow.map((value, index) => {
    const baseHeader = canonicalHeader(value, index);
    const duplicateCount = seen.get(baseHeader) || 0;
    seen.set(baseHeader, duplicateCount + 1);

    return duplicateCount > 0 ? `${baseHeader} (${duplicateCount + 1})` : baseHeader;
  });
};

export function sheetToRows(sheet) {
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: true,
  });

  const headerIndex = matrix.findIndex((row) => Array.isArray(row) && row.some((cell) => String(cell || '').trim() !== ''));
  if (headerIndex === -1) return [];

  const headers = normalizeHeaderRow(matrix[headerIndex] || []);

  return matrix
    .slice(headerIndex + 1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || '').trim() !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

export async function parseProductImportFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('No worksheet found in file');
  }

  return sheetToRows(workbook.Sheets[sheetName]);
}
