/** Shared helpers for /store/exports CSV downloads. */

export const STORE_EXPORT_TYPES = ['orders', 'customers', 'products', 'categories'];

export function escapeExportCsvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(headers = [], rows = []) {
  return [
    headers.map(escapeExportCsvCell).join(','),
    ...rows.map((row) => row.map(escapeExportCsvCell).join(',')),
  ].join('\n');
}

/**
 * @param {'full'|'custom'} range
 * @param {string} fromDate YYYY-MM-DD
 * @param {string} toDate YYYY-MM-DD
 * @param {string} fromTime HH:mm in Dubai time
 * @param {string} toTime HH:mm in Dubai time
 * @returns {{ createdAt?: { $gte?: Date, $lt?: Date, $lte?: Date } }}
 */
export function buildStoreExportDateFilter(range = 'full', fromDate = '', toDate = '', fromTime = '', toTime = '') {
  if (String(range || '').toLowerCase() !== 'custom') return {};

  const from = String(fromDate || '').trim();
  const to = String(toDate || '').trim();
  if (!from || !to) {
    const err = new Error('From date and to date are required for a custom range');
    err.status = 400;
    throw err;
  }

  const startTime = String(fromTime || '').trim();
  const endTime = String(toTime || '').trim();
  if (Boolean(startTime) !== Boolean(endTime)) {
    const err = new Error('Both from and to times are required');
    err.status = 400;
    throw err;
  }

  if (startTime || endTime) {
    const parseDubaiDateTime = (date, time) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      const dateCheck = new Date(Date.UTC(year, month - 1, day));
      if (
        dateCheck.getUTCFullYear() !== year
        || dateCheck.getUTCMonth() !== month - 1
        || dateCheck.getUTCDate() !== day
        || hour > 23
        || minute > 59
      ) return null;
      return new Date(Date.UTC(year, month - 1, day, hour - 4, minute));
    };

    const start = parseDubaiDateTime(from, startTime);
    const end = parseDubaiDateTime(to, endTime);
    if (!start || !end) {
      const err = new Error('Invalid date or time');
      err.status = 400;
      throw err;
    }
    if (start >= end) {
      const err = new Error('From date and time must be before the to date and time');
      err.status = 400;
      throw err;
    }
    return { createdAt: { $gte: start, $lt: end } };
  }

  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const err = new Error('Invalid from or to date');
    err.status = 400;
    throw err;
  }
  if (start > end) {
    const err = new Error('From date must be on or before to date');
    err.status = 400;
    throw err;
  }

  end.setHours(23, 59, 59, 999);
  return { createdAt: { $gte: start, $lte: end } };
}

export const CATEGORY_EXPORT_HEADERS = [
  'ID',
  'Name',
  'Name (Arabic)',
  'Slug',
  'Parent ID',
  'Level',
  'Sort Order',
  'Active',
  'URL',
  'Meta Title',
  'Meta Description',
  'Created At',
  'Updated At',
];

export function buildCategoryExportCsv(categories = []) {
  const rows = categories.map((category) => [
    category?._id || '',
    category?.name || '',
    category?.nameAr || '',
    category?.slug || '',
    category?.parentId || '',
    category?.level ?? '',
    category?.sortOrder ?? '',
    category?.isActive === false ? 'No' : 'Yes',
    category?.url || '',
    category?.metaTitle || '',
    category?.metaDescription || '',
    category?.createdAt ? new Date(category.createdAt).toISOString() : '',
    category?.updatedAt ? new Date(category.updatedAt).toISOString() : '',
  ]);
  return rowsToCsv(CATEGORY_EXPORT_HEADERS, rows);
}

export function buildExportFilename(type, range = 'full', fromDate = '', toDate = '') {
  const stamp = new Date().toISOString().slice(0, 10);
  const safeType = String(type || 'export').replace(/[^a-z0-9_-]/gi, '');
  if (String(range).toLowerCase() === 'custom' && fromDate && toDate) {
    return `store-${safeType}-${fromDate}_to_${toDate}.csv`;
  }
  return `store-${safeType}-full-${stamp}.csv`;
}

export function buildOrderExcelFilename(range = 'full', fromDate = '', toDate = '', fromTime = '', toTime = '') {
  const stamp = new Date().toISOString().slice(0, 10);
  if (String(range).toLowerCase() === 'custom' && fromDate && toDate) {
    const startTime = String(fromTime || '').replace(':', '');
    const endTime = String(toTime || '').replace(':', '');
    const timeLabel = startTime && endTime ? `_${startTime}_to_${endTime}` : '';
    return `store-orders-${fromDate}${timeLabel}_to_${toDate}.xlsx`;
  }
  return `store-orders-full-${stamp}.xlsx`;
}

export function buildCustomerExcelFilename(range = 'full', fromDate = '', toDate = '', fromTime = '', toTime = '') {
  const stamp = new Date().toISOString().slice(0, 10);
  if (String(range).toLowerCase() === 'custom' && fromDate && toDate) {
    const startTime = String(fromTime || '').replace(':', '');
    const endTime = String(toTime || '').replace(':', '');
    const timeLabel = startTime && endTime ? `_${startTime}_to_${endTime}` : '';
    return `store-customers-${fromDate}${timeLabel}_to_${toDate}.xlsx`;
  }
  return `store-customers-full-${stamp}.xlsx`;
}
