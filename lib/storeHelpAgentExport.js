import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDubaiDateParts } from '@/lib/storeOrdersByProductDates';
import { getSalesReportPeriodParts, buildSalesReportPeriodGroups } from '@/lib/storeSalesReportExport';
import { cleanHelpProductName } from '@/lib/storeHelpAgentFacts';
import { formatExcelText, formatPdfText, hasArabicText } from '@/lib/exportArabicText';
import { buildCustomerExportWorkbookData } from '@/lib/storeCustomerExport';

const HELP_FONT_NAME = 'Tajawal';
const HELP_FONT_FILE = 'Tajawal-Regular.ttf';

function money(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function loadHelpExportFontBase64() {
  const fontPath = path.join(process.cwd(), 'lib', 'fonts', HELP_FONT_FILE);
  return fs.readFileSync(fontPath).toString('base64');
}

function registerHelpExportFont(doc) {
  doc.addFileToVFS(HELP_FONT_FILE, loadHelpExportFontBase64());
  doc.addFont(HELP_FONT_FILE, HELP_FONT_NAME, 'normal');
  doc.addFont(HELP_FONT_FILE, HELP_FONT_NAME, 'bold');
}

function itemNames(order) {
  return (order.items || [])
    .map((item) => cleanHelpProductName(item.name))
    .filter(Boolean)
    .join(', ');
}

function alignmentFor(value) {
  return hasArabicText(value)
    ? { wrapText: true, vertical: 'middle', readingOrder: 'rtl' }
    : { wrapText: true, vertical: 'middle' };
}

function writeHelpSummarySheet(workbook, rows = []) {
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [{ width: 22 }, { width: 80 }];
  rows.forEach((row) => {
    const added = summary.addRow(row);
    added.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = alignmentFor(cell.value);
    });
  });
  summary.getRow(1).font = { name: 'Calibri', size: 16, bold: true };
  return summary;
}

async function writeHelpListWorkbook(payload = {}, sheetName, headers, rows) {
  const generated = getSalesReportPeriodParts(new Date());
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HAMODY';
  writeHelpSummarySheet(workbook, [
    ['Store Help export'],
    ['Question', formatExcelText(payload.question)],
    ['Range', formatExcelText(payload.range || payload.title)],
    ['Generated', `${generated.dateLabel} ${generated.timeLabel} (Asia/Dubai)`],
    ...(payload.kind === 'pages'
      ? [
        ['Public pages', Number(payload.totals?.publicCount || 0)],
        ['Dashboard pages', Number(payload.totals?.dashboardCount || 0)],
        ['Total pages', Number(payload.totals?.pageCount || rows.length)],
      ]
      : [['Details', formatExcelText(payload.answer)]]),
  ]);
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = headers.map((header) => ({ header, width: Math.max(16, header.length + 6) }));
  sheet.getRow(1).font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  rows.forEach((row) => {
    const added = sheet.addRow(row);
    added.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = alignmentFor(cell.value);
    });
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function hasExportableHelpPayload(payload = {}) {
  if (!payload) return false;
  if (payload.kind === 'pages') return Array.isArray(payload.pages) && payload.pages.length > 0;
  if (payload.kind === 'notes') return Boolean(payload.answer || payload.links?.length);
  return Boolean(payload.orders?.length || payload.customers?.length);
}

export async function writeHelpExportWorkbook(payload = {}) {
  if (payload.kind === 'pages') {
    const pages = Array.isArray(payload.pages) ? payload.pages : [];
    return writeHelpListWorkbook(
      payload,
      'Pages',
      ['Section', 'Page', 'Path', 'What it is'],
      pages.map((page) => [
        formatExcelText(page.section),
        formatExcelText(page.label),
        page.href || '',
        formatExcelText(page.note),
      ]),
    );
  }
  if (payload.kind === 'notes') {
    const links = Array.isArray(payload.links) ? payload.links : [];
    return writeHelpListWorkbook(
      payload,
      'Details',
      ['Item', 'Value'],
      [
        ['Answer', formatExcelText(payload.answer)],
        ...links.map((link) => [formatExcelText(link.label), link.href || '']),
      ],
    );
  }
  if (payload.kind === 'customers') {
    const generated = getSalesReportPeriodParts(new Date());
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HAMODY';
    const { headers, rows } = buildCustomerExportWorkbookData(payload.customers || [], payload.currency || 'AED');
    const sheet = workbook.addWorksheet('Customers');
    sheet.columns = headers.map((header) => ({ header, width: Math.max(14, header.length + 4) }));
    sheet.getRow(1).font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    rows.forEach((row) => {
      const added = sheet.addRow(row);
      added.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11 };
        cell.alignment = alignmentFor(cell.value);
      });
    });
    const summary = workbook.addWorksheet('Summary');
    summary.columns = [{ width: 22 }, { width: 60 }];
    [
      ['Store Help export'],
      ['Question', formatExcelText(payload.question)],
      ['Range', 'All customers'],
      ['Generated', `${generated.dateLabel} ${generated.timeLabel} (Asia/Dubai)`],
      ['Customers', rows.length],
    ].forEach((row) => {
      const added = summary.addRow(row);
      added.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11 };
        cell.alignment = alignmentFor(cell.value);
      });
    });
    summary.getRow(1).font = { name: 'Calibri', size: 16, bold: true };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  const generated = getSalesReportPeriodParts(new Date());
  const orders = Array.isArray(payload.orders) ? payload.orders : [];
  const currency = payload.currency || 'AED';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HAMODY';

  const orderRows = orders.map((order) => {
    const period = getSalesReportPeriodParts(order.createdAt);
    return {
      order,
      period,
      customer: formatExcelText(order.customer),
      items: formatExcelText(itemNames(order)),
      total: money(order.total),
    };
  });

  const summary = workbook.addWorksheet('Summary');
  summary.columns = [{ width: 22 }, { width: 60 }, { width: 18 }];
  [
    ['Store Help export'],
    ['Question', formatExcelText(payload.question)],
    ['Range', formatExcelText(payload.range || payload.title)],
    ['Status', formatExcelText(payload.statusLabel || 'All successful orders')],
    ['Generated', `${generated.dateLabel} ${generated.timeLabel} (Asia/Dubai)`],
    ['Currency', currency],
    [],
    ['Orders', Number(payload.totals?.orderCount || orders.length)],
    ['Units sold', Number(payload.totals?.unitsSold || 0)],
    ['Revenue', money(payload.totals?.revenue)],
  ].forEach((row) => {
    const added = summary.addRow(row);
    added.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = alignmentFor(cell.value);
    });
  });
  summary.getRow(1).font = { name: 'Calibri', size: 16, bold: true };

  const ordersSheet = workbook.addWorksheet('Orders');
  ordersSheet.columns = [
    { header: 'Order Number', width: 16 },
    { header: 'Date', width: 16 },
    { header: 'Time', width: 10 },
    { header: 'Year', width: 10 },
    { header: 'Month', width: 18 },
    { header: 'Week', width: 28 },
    { header: 'Customer', width: 28 },
    { header: 'Email', width: 28 },
    { header: 'Phone', width: 16 },
    { header: 'City', width: 16 },
    { header: 'Payment', width: 14 },
    { header: 'Payment status', width: 16 },
    { header: 'Status', width: 18 },
    { header: 'Units', width: 10 },
    { header: 'Items', width: 42 },
    { header: 'Total', width: 12 },
  ];
  ordersSheet.getRow(1).font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
  ordersSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

  orderRows.forEach((row) => {
    const added = ordersSheet.addRow([
      row.order.orderNumber || '',
      row.period.dateLabel,
      row.period.timeLabel,
      row.period.year,
      row.period.monthLabel,
      row.period.weekLabel,
      row.customer,
      formatExcelText(row.order.email),
      formatExcelText(row.order.phone),
      formatExcelText(row.order.city),
      row.order.paymentMethod || '',
      row.order.paymentStatus || '',
      row.order.status || '',
      Number(row.order.units || 0),
      row.items,
      row.total,
    ]);
    added.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = alignmentFor(cell.value);
      if (colNumber === 16) cell.numFmt = '#,##0.00';
    });
  });

  const periodRows = buildSalesReportPeriodGroups(orderRows.map((row) => ({
    period: row.period,
    countsTowardRevenue: true,
    paymentBucket: 'paidOnline',
    netRevenue: row.total,
    profit: row.total,
    grossRevenue: row.total,
    refunded: 0,
    productCost: 0,
    deliveryCost: 0,
  })));

  [
    ['By Month', periodRows.monthly],
    ['By Week', periodRows.weekly],
    ['By Day', periodRows.daily],
  ].forEach(([name, groups]) => {
    if (!groups.length) return;
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
      { header: 'Period', width: 28 },
      { header: 'From', width: 16 },
      { header: 'To', width: 16 },
      { header: 'Orders', width: 12 },
      { header: 'Revenue', width: 14 },
    ];
    sheet.getRow(1).font = { name: 'Calibri', bold: true };
    groups.forEach((group) => {
      sheet.addRow([
        group.label,
        group.from,
        group.to,
        group.includedOrders || group.orders || 0,
        money(group.netRevenue || group.revenue || 0),
      ]);
    });
  });

  if (payload.byProduct?.length) {
    const sheet = workbook.addWorksheet('By Product');
    sheet.columns = [
      { header: 'Product', width: 42 },
      { header: 'SKU', width: 16 },
      { header: 'Orders', width: 12 },
      { header: 'Units', width: 12 },
      { header: 'Revenue', width: 14 },
    ];
    payload.byProduct.forEach((row) => {
      const added = sheet.addRow([
        formatExcelText(cleanHelpProductName(row.productName)),
        row.sku || '',
        Number(row.orderCount || 0),
        Number(row.unitsSold || 0),
        money(row.revenue),
      ]);
      added.getCell(1).alignment = alignmentFor(row.productName);
      added.getCell(1).font = { name: 'Calibri', size: 11 };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function buildHelpExportPdf(payload = {}) {
  if (payload.kind === 'pages' || payload.kind === 'notes') {
    const generated = getSalesReportPeriodParts(new Date());
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    registerHelpExportFont(doc);
    const margin = 12;
    doc.setFont(HELP_FONT_NAME, 'bold');
    doc.setFontSize(16);
    doc.text('Store Help export', margin, 16);
    doc.setFont(HELP_FONT_NAME, 'normal');
    doc.setFontSize(10);
    doc.text(formatPdfText(`Question: ${String(payload.question || '').slice(0, 110)}`), margin, 24);
    doc.text(formatPdfText(`Range: ${payload.range || payload.title || ''}`), margin, 30);
    doc.text(`Generated: ${generated.dateLabel} ${generated.timeLabel} (Asia/Dubai)`, margin, 36);
    if (payload.kind === 'pages') {
      const pages = Array.isArray(payload.pages) ? payload.pages : [];
      doc.text(`${pages.length} pages`, margin, 42);
      autoTable(doc, {
        startY: 48,
        head: [['Section', 'Page', 'Path', 'What it is']],
        body: pages.map((page) => [
          formatPdfText(page.section),
          formatPdfText(page.label),
          page.href || '',
          formatPdfText(page.note),
        ]),
        theme: 'grid',
        styles: { font: HELP_FONT_NAME, fontSize: 8, cellPadding: 1.8, overflow: 'linebreak' },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', font: HELP_FONT_NAME },
      });
    } else {
      doc.text(formatPdfText(String(payload.answer || '').slice(0, 240)), margin, 42);
      autoTable(doc, {
        startY: 56,
        head: [['Page', 'Path']],
        body: (payload.links || []).map((link) => [formatPdfText(link.label), link.href || '']),
        theme: 'grid',
        styles: { font: HELP_FONT_NAME, fontSize: 8, cellPadding: 1.8, overflow: 'linebreak' },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', font: HELP_FONT_NAME },
      });
    }
    return Buffer.from(doc.output('arraybuffer'));
  }

  if (payload.kind === 'customers') {
    const generated = getSalesReportPeriodParts(new Date());
    const customers = Array.isArray(payload.customers) ? payload.customers : [];
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    registerHelpExportFont(doc);
    const margin = 12;
    doc.setFont(HELP_FONT_NAME, 'bold');
    doc.setFontSize(16);
    doc.text('Store Help export', margin, 16);
    doc.setFont(HELP_FONT_NAME, 'normal');
    doc.setFontSize(10);
    doc.text(formatPdfText(`Question: ${String(payload.question || '').slice(0, 110)}`), margin, 24);
    doc.text(`Customers: ${customers.length}`, margin, 30);
    doc.text(`Generated: ${generated.dateLabel} ${generated.timeLabel} (Asia/Dubai)`, margin, 36);
    autoTable(doc, {
      startY: 42,
      head: [['Name', 'Email', 'Type', 'Orders', 'Spent']],
      body: customers.map((customer) => [
        formatPdfText(customer.name),
        formatPdfText(customer.email),
        customer.isGuest ? 'Guest' : 'Registered',
        Number(customer.totalOrders || 0),
        Number(customer.totalSpent || 0),
      ]),
      theme: 'grid',
      styles: { font: HELP_FONT_NAME, fontSize: 8, cellPadding: 1.8, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', font: HELP_FONT_NAME },
    });
    return Buffer.from(doc.output('arraybuffer'));
  }

  const generated = getSalesReportPeriodParts(new Date());
  const orders = Array.isArray(payload.orders) ? payload.orders : [];
  const currency = payload.currency || 'AED';
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  registerHelpExportFont(doc);
  const margin = 12;

  doc.setFont(HELP_FONT_NAME, 'bold');
  doc.setFontSize(16);
  doc.text('Store Help export', margin, 16);

  doc.setFont(HELP_FONT_NAME, 'normal');
  doc.setFontSize(10);
  doc.text(formatPdfText(`Question: ${String(payload.question || '').slice(0, 110)}`), margin, 24);
  doc.text(formatPdfText(`Range: ${payload.range || payload.title || ''}`), margin, 30);
  doc.text(formatPdfText(`Status: ${payload.statusLabel || 'All successful orders'}`), margin, 36);
  doc.text(`Generated: ${generated.dateLabel} ${generated.timeLabel} (Asia/Dubai)`, margin, 42);
  doc.text(
    `${Number(payload.totals?.orderCount || orders.length)} orders · ${Number(payload.totals?.unitsSold || 0)} units · ${currency} ${money(payload.totals?.revenue).toLocaleString('en-US')}`,
    margin,
    48,
  );

  autoTable(doc, {
    startY: 54,
    head: [['Order', 'Date', 'Customer', 'Email', 'Phone', 'Status', 'Units', 'Items', `Total (${currency})`]],
    body: orders.map((order) => {
      const period = getSalesReportPeriodParts(order.createdAt);
      return [
        order.orderNumber || '',
        period.dateLabel,
        formatPdfText(order.customer),
        formatPdfText(order.email),
        formatPdfText(order.phone),
        order.status || '',
        Number(order.units || 0),
        formatPdfText(itemNames(order)),
        money(order.total),
      ];
    }),
    theme: 'grid',
    styles: { font: HELP_FONT_NAME, fontSize: 7, cellPadding: 1.6, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', font: HELP_FONT_NAME },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 24 },
      2: { cellWidth: 28 },
      3: { cellWidth: 36 },
      4: { cellWidth: 24 },
      5: { cellWidth: 24 },
      6: { cellWidth: 14, halign: 'right' },
      7: { cellWidth: 70 },
      8: { cellWidth: 22, halign: 'right' },
    },
  });

  return Buffer.from(doc.output('arraybuffer'));
}

export function getHelpExportFileName(payload = {}, format = 'xlsx') {
  const stamp = getDubaiDateParts().date;
  const range = String(payload.rangeKey || payload.kind || 'help').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  const prefix = payload.kind === 'pages'
    ? 'help-pages'
    : payload.kind === 'customers'
      ? 'help-customers'
      : payload.kind === 'notes'
        ? 'help-details'
        : 'help-orders';
  return `${prefix}-${range}-${stamp}.${ext}`;
}
