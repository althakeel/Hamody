import ExcelJS from 'exceljs';
import { deflateSync } from 'node:zlib';

const OUTCOME_SERIES = [
  { key: 'success', label: 'Success', color: '#16a34a' },
  { key: 'failed', label: 'Failed', color: '#dc2626' },
  { key: 'pending', label: 'Pending', color: '#d97706' },
  { key: 'cancelled', label: 'Cancelled', color: '#64748b' },
  { key: 'other', label: 'Other', color: '#2563eb' },
];

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

function getDubaiBusinessDateKey(value, cutoffHour = 10) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getDubaiDateKey(new Date(date.getTime() - cutoffHour * 60 * 60 * 1000));
}

function parseDubaiDateTime(date, time) {
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
}

function addDateKeys(first, last) {
  const dates = [];
  const current = new Date(`${first}T00:00:00.000Z`);
  const end = new Date(`${last}T00:00:00.000Z`);
  while (current <= end && dates.length < 3660) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export function buildDailyOrderOutcomeSummary(
  orders = [],
  resolvePaymentResult,
  dateRange = {},
  resolvePaymentMethod = () => '',
) {
  const groupedOrders = new Map();
  for (const order of orders) {
    const dateKey = getDubaiBusinessDateKey(order?.createdAt);
    if (!dateKey) continue;

    if (!groupedOrders.has(dateKey)) {
      groupedOrders.set(dateKey, []);
    }
    groupedOrders.get(dateKey).push(order);
  }

  const orderDates = [...groupedOrders.keys()].sort();
  const rangeStart = dateRange.fromDate && dateRange.fromTime
    ? parseDubaiDateTime(dateRange.fromDate, dateRange.fromTime)
    : null;
  const rangeEnd = dateRange.toDate && dateRange.toTime
    ? parseDubaiDateTime(dateRange.toDate, dateRange.toTime)
    : null;
  const firstDate = rangeStart
    ? getDubaiBusinessDateKey(rangeStart)
    : (orderDates[0] || dateRange.fromDate || '');
  const lastDate = rangeEnd
    ? getDubaiBusinessDateKey(new Date(rangeEnd.getTime() - 1))
    : (orderDates[orderDates.length - 1] || dateRange.toDate || '');
  const dateKeys = firstDate && lastDate && firstDate <= lastDate
    ? addDateKeys(firstDate, lastDate)
    : orderDates;

  const dailyRows = dateKeys.map((date) => {
    const counts = { date, cod: 0, success: 0, failed: 0, pending: 0, cancelled: 0, other: 0 };
    for (const order of groupedOrders.get(date) || []) {
      if (String(resolvePaymentMethod(order) || '').trim().toUpperCase() === 'COD') {
        counts.cod += 1;
      }
      const result = String(resolvePaymentResult(order) || '').trim().toLowerCase();
      const key = result === 'success'
        ? 'success'
        : result === 'failed'
          ? 'failed'
          : result === 'pending'
            ? 'pending'
            : result === 'cancelled'
              ? 'cancelled'
              : 'other';
      counts[key] += 1;
    }
    counts.total = OUTCOME_SERIES.reduce((sum, series) => sum + counts[series.key], 0);
    return counts;
  });

  const totals = dailyRows.reduce((result, row) => {
    for (const series of OUTCOME_SERIES) {
      result[series.key] += row[series.key];
    }
    result.cod += row.cod;
    result.total += row.total;
    return result;
  }, { total: 0, cod: 0, success: 0, failed: 0, pending: 0, cancelled: 0, other: 0 });

  return { dailyRows, totals };
}

function getOrderLocation(order = {}) {
  const address = order.shippingAddress || {};
  const parts = [address.district, address.city, address.state, address.country]
    .map((value) => String(value || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .filter((value, index, values) => (
      values.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index
    ));
  return parts.length ? parts.join(', ') : 'Unknown / not provided';
}

export function buildLocationOrderSummary(
  orders = [],
  resolvePaymentResult,
  resolvePaymentMethod = () => '',
) {
  const groupedLocations = new Map();
  for (const order of orders) {
    const location = getOrderLocation(order);
    const key = location.toLowerCase();
    if (!groupedLocations.has(key)) {
      groupedLocations.set(key, {
        location,
        total: 0,
        cod: 0,
        success: 0,
        failed: 0,
        pending: 0,
        cancelled: 0,
        other: 0,
      });
    }

    const counts = groupedLocations.get(key);
    counts.total += 1;
    if (String(resolvePaymentMethod(order) || '').trim().toUpperCase() === 'COD') {
      counts.cod += 1;
    }
    const result = String(resolvePaymentResult(order) || '').trim().toLowerCase();
    const outcome = result === 'success'
      ? 'success'
      : result === 'failed'
        ? 'failed'
        : result === 'pending'
          ? 'pending'
          : result === 'cancelled'
            ? 'cancelled'
            : 'other';
    counts[outcome] += 1;
  }

  return [...groupedLocations.values()].sort(
    (first, second) => second.total - first.total || first.location.localeCompare(second.location),
  );
}

function parseHexColor(color) {
  const value = String(color).replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    255,
  ];
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);

  let crc = 0xffffffff;
  for (let index = 4; index < 8 + data.length; index += 1) {
    crc ^= chunk[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length);
  return chunk;
}

function buildOutcomeChartPng(dailyRows) {
  const width = 1200;
  const height = 400;
  const left = 40;
  const right = 24;
  const top = 24;
  const bottom = 32;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(1, dailyRows.reduce((max, row) => Math.max(max, row.total), 0));
  const step = maxValue <= 5 ? 1 : Math.ceil(maxValue / 5);
  const yMax = Math.max(step, Math.ceil(maxValue / step) * step);
  const dateCount = Math.max(1, dailyRows.length);
  const clusterWidth = plotWidth / dateCount;
  const barWidth = Math.max(2, Math.min(20, clusterWidth * 0.13));
  const gap = Math.max(1, Math.min(5, clusterWidth * 0.035));
  const seriesWidth = OUTCOME_SERIES.length * barWidth + (OUTCOME_SERIES.length - 1) * gap;
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = 255;
    pixels[index * 4 + 1] = 255;
    pixels[index * 4 + 2] = 255;
    pixels[index * 4 + 3] = 255;
  }

  const drawRect = (x, y, rectWidth, rectHeight, color) => {
    const [red, green, blue, alpha] = color;
    const startX = Math.max(0, Math.floor(x));
    const endX = Math.min(width, Math.ceil(x + rectWidth));
    const startY = Math.max(0, Math.floor(y));
    const endY = Math.min(height, Math.ceil(y + rectHeight));
    for (let pixelY = startY; pixelY < endY; pixelY += 1) {
      for (let pixelX = startX; pixelX < endX; pixelX += 1) {
        const offset = (pixelY * width + pixelX) * 4;
        pixels[offset] = red;
        pixels[offset + 1] = green;
        pixels[offset + 2] = blue;
        pixels[offset + 3] = alpha;
      }
    }
  };

  for (let value = 0; value <= yMax; value += step) {
    const y = top + plotHeight - (value / yMax) * plotHeight;
    drawRect(left, y, plotWidth, 1, [226, 232, 240, 255]);
  }

  dailyRows.forEach((row, index) => {
    const clusterLeft = left + index * clusterWidth + (clusterWidth - seriesWidth) / 2;
    OUTCOME_SERIES.forEach((series, seriesIndex) => {
      const value = row[series.key];
      if (!value) return;
      const barHeight = (value / yMax) * plotHeight;
      const x = clusterLeft + seriesIndex * (barWidth + gap);
      const y = top + plotHeight - barHeight;
      drawRect(x, y, barWidth, barHeight, parseHexColor(series.color));
    });
  });

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const rowStart = row * (width * 4 + 1);
    pixels.copy(raw, rowStart + 1, row * width * 4, (row + 1) * width * 4);
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

function buildLocationChartPng(locationRows) {
  const width = 1200;
  const height = 400;
  const left = 40;
  const right = 24;
  const top = 24;
  const bottom = 32;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const rows = locationRows.slice(0, 10);
  const maxValue = Math.max(1, rows.reduce((max, row) => Math.max(max, row.total), 0));
  const step = maxValue <= 5 ? 1 : Math.ceil(maxValue / 5);
  const yMax = Math.max(step, Math.ceil(maxValue / step) * step);
  const clusterWidth = plotWidth / Math.max(1, rows.length);
  const barWidth = Math.max(8, Math.min(64, clusterWidth * 0.45));
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = 255;
    pixels[index * 4 + 1] = 255;
    pixels[index * 4 + 2] = 255;
    pixels[index * 4 + 3] = 255;
  }

  const drawRect = (x, y, rectWidth, rectHeight, color) => {
    const startX = Math.max(0, Math.floor(x));
    const endX = Math.min(width, Math.ceil(x + rectWidth));
    const startY = Math.max(0, Math.floor(y));
    const endY = Math.min(height, Math.ceil(y + rectHeight));
    for (let pixelY = startY; pixelY < endY; pixelY += 1) {
      for (let pixelX = startX; pixelX < endX; pixelX += 1) {
        const offset = (pixelY * width + pixelX) * 4;
        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
        pixels[offset + 3] = 255;
      }
    }
  };

  for (let value = 0; value <= yMax; value += step) {
    const y = top + plotHeight - (value / yMax) * plotHeight;
    drawRect(left, y, plotWidth, 1, [226, 232, 240]);
  }

  rows.forEach((row, index) => {
    const barHeight = (row.total / yMax) * plotHeight;
    const x = left + index * clusterWidth + (clusterWidth - barWidth) / 2;
    const y = top + plotHeight - barHeight;
    drawRect(x, y, barWidth, barHeight, [37, 99, 235]);
  });

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const rowStart = row * (width * 4 + 1);
    pixels.copy(raw, rowStart + 1, row * width * 4, (row + 1) * width * 4);
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

function setSummarySheetLayout(sheet, dailyRows, totals, locationRows, periodLabel) {
  sheet.columns = [
    { width: 34 },
    { width: 22 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
  ];
  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = 'Order Export Summary';
  sheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  sheet.getCell('A1').alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 36;

  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = periodLabel || 'All available order dates (Dubai time)';
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };

  const cards = [
    { label: 'Total orders', value: totals.total, color: 'FF1D4ED8' },
    { label: 'Success', value: totals.success, color: 'FF16A34A' },
    { label: 'Failed', value: totals.failed, color: 'FFDC2626' },
    { label: 'Pending', value: totals.pending, color: 'FFD97706' },
    { label: 'Cancelled', value: totals.cancelled, color: 'FF64748B' },
    { label: 'Other', value: totals.other, color: 'FF2563EB' },
    { label: 'COD orders', value: totals.cod, color: 'FFB45309' },
  ];
  cards.forEach((card, index) => {
    const column = index + 1;
    const labelCell = sheet.getCell(4, column);
    const valueCell = sheet.getCell(5, column);
    labelCell.value = card.label;
    labelCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.color } };
    labelCell.alignment = { horizontal: 'center' };
    valueCell.value = card.value;
    valueCell.font = { bold: true, size: 18, color: { argb: card.color } };
    valueCell.alignment = { horizontal: 'center' };
    valueCell.border = {
      bottom: { style: 'thin', color: { argb: card.color } },
      left: { style: 'thin', color: { argb: card.color } },
      right: { style: 'thin', color: { argb: card.color } },
    };
  });

  sheet.getCell('A7').value = 'Daily order outcomes';
  sheet.getCell('A7').font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  OUTCOME_SERIES.forEach((series, index) => {
    const cell = sheet.getCell(8, index + 1);
    cell.value = series.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${series.color.slice(1).toUpperCase()}` } };
    cell.alignment = { horizontal: 'center' };
  });

  const headerRow = 28;
  const headers = [
    'Business day (10:00 AM–next 10:00 AM Dubai)',
    'COD orders (separate count)',
    'Success',
    'Failed',
    'Pending',
    'Cancelled',
    'Other',
    'Total',
  ];
  const header = sheet.getRow(headerRow);
  headers.forEach((value, index) => {
    header.getCell(index + 1).value = value;
  });
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  header.alignment = { horizontal: 'center' };

  dailyRows.forEach((row) => {
    sheet.addRow([
      row.date,
      row.cod,
      row.success,
      row.failed,
      row.pending,
      row.cancelled,
      row.other,
      row.total,
    ]);
  });
  const locationTitleRow = headerRow + dailyRows.length + 3;
  sheet.getCell(locationTitleRow, 1).value = 'Orders by delivery location';
  sheet.getCell(locationTitleRow, 1).font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  sheet.mergeCells(locationTitleRow + 1, 1, locationTitleRow + 1, 8);
  sheet.getCell(locationTitleRow + 1, 1).value = 'Chart shows order counts for the top 10 locations; the complete ranked counts and outcomes are listed below.';
  sheet.getCell(locationTitleRow + 1, 1).font = { italic: true, color: { argb: 'FF475569' } };

  const locationHeaderRow = locationTitleRow + 20;
  const locationHeaders = [
    'Delivery location',
    'Total orders',
    'COD orders',
    'Success',
    'Failed',
    'Pending',
    'Cancelled',
    'Other',
  ];
  const locationHeader = sheet.getRow(locationHeaderRow);
  locationHeaders.forEach((value, index) => {
    locationHeader.getCell(index + 1).value = value;
  });
  locationHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  locationHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  locationRows.forEach((row) => {
    sheet.addRow([
      row.location,
      row.total,
      row.cod,
      row.success,
      row.failed,
      row.pending,
      row.cancelled,
      row.other,
    ]);
  });
  sheet.autoFilter = {
    from: { row: locationHeaderRow, column: 1 },
    to: { row: locationHeaderRow, column: locationHeaders.length },
  };
  sheet.views = [{ state: 'frozen', ySplit: headerRow }];
  return { locationChartAnchor: `A${locationTitleRow + 2}:N${locationHeaderRow - 1}` };
}

export async function buildOrderExcelWorkbook({
  orders = [],
  detailRows = [],
  detailHeaders = [],
  resolvePaymentResult,
  periodLabel = '',
  fromDate = '',
  toDate = '',
  fromTime = '',
  toTime = '',
  resolvePaymentMethod = () => '',
} = {}) {
  if (typeof resolvePaymentResult !== 'function') {
    throw new TypeError('An order payment-result resolver is required');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Store1920';
  workbook.created = new Date();

  const { dailyRows, totals } = buildDailyOrderOutcomeSummary(
    orders,
    resolvePaymentResult,
    { fromDate, toDate, fromTime, toTime },
    resolvePaymentMethod,
  );
  const locationRows = buildLocationOrderSummary(
    orders,
    resolvePaymentResult,
    resolvePaymentMethod,
  );
  const summarySheet = workbook.addWorksheet('Summary');
  const { locationChartAnchor } = setSummarySheetLayout(
    summarySheet,
    dailyRows,
    totals,
    locationRows,
    periodLabel,
  );

  const chartId = workbook.addImage({ buffer: buildOutcomeChartPng(dailyRows), extension: 'png' });
  summarySheet.addImage(chartId, 'A9:N26');
  const locationChartId = workbook.addImage({
    buffer: buildLocationChartPng(locationRows),
    extension: 'png',
  });
  summarySheet.addImage(locationChartId, locationChartAnchor);

  const orderSheet = workbook.addWorksheet('Orders');
  orderSheet.addRow(detailHeaders);
  detailRows.forEach((row) => orderSheet.addRow(row));
  orderSheet.views = [{ state: 'frozen', ySplit: 1 }];
  if (detailHeaders.length) {
    orderSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, detailRows.length + 1), column: detailHeaders.length },
    };
    orderSheet.columns = detailHeaders.map((header, index) => {
      const maxLength = detailRows.reduce(
        (max, row) => Math.max(max, String(row[index] ?? '').length),
        String(header || '').length,
      );
      return { width: Math.min(Math.max(maxLength + 2, 12), 42) };
    });
  }
  orderSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  orderSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
