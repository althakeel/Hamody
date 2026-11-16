import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDisplayOrderNumber, getOrderCustomerDisplayName } from './orderDisplay.js';
import { getEmxTrackingNumber } from './waslahTracking.js';
import { formatPdfText } from './exportArabicText.js';
import { getDubaiDateParts } from './storeOrdersByProductDates.js';

const FONT_NAME = 'Tajawal';
const FONT_FILE = 'Tajawal-Regular.ttf';

function loadFontBase64() {
  const fontPath = path.join(process.cwd(), 'lib', 'fonts', FONT_FILE);
  return fs.readFileSync(fontPath).toString('base64');
}

function registerPackedPdfFont(doc) {
  doc.addFileToVFS(FONT_FILE, loadFontBase64());
  doc.addFont(FONT_FILE, FONT_NAME, 'normal');
  doc.addFont(FONT_FILE, FONT_NAME, 'bold');
  doc.setFont(FONT_NAME, 'normal');
}

function formatPackedAt(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dubai',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatGeneratedAt(date = new Date()) {
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function lineItems(order = {}) {
  if (Array.isArray(order.orderItems) && order.orderItems.length) return order.orderItems;
  if (Array.isArray(order.items) && order.items.length) return order.items;
  return [];
}

function itemSummary(order = {}) {
  const lines = lineItems(order);
  if (!lines.length) return '—';
  const quantity = lines.reduce((sum, item) => sum + Number(item?.quantity || item?.qty || 0), 0);
  const count = lines.length;
  const qty = quantity > 0 ? quantity : count;
  return `${qty} (${count} line${count === 1 ? '' : 's'})`;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `AED ${amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function courierLabel(order = {}, awb = '') {
  if (awb) return 'EMX';
  const name = String(order?.courier || '').trim();
  return name || '—';
}

export function buildPackedOrderPdfRows(orders = []) {
  return (orders || []).map((order) => {
    const shipping = order?.shippingAddress || {};
    const awb = getEmxTrackingNumber(order);
    return [
      formatPackedAt(order?.warehousePacking?.packedAt),
      getDisplayOrderNumber(order) || '—',
      awb || '—',
      formatPdfText(getOrderCustomerDisplayName(order) || '—'),
      String(order?.guestPhone || shipping.phone || '').trim() || '—',
      formatPdfText(String(shipping.city || '').trim() || '—'),
      itemSummary(order),
      formatMoney(order?.total),
      String(order?.status || '').trim() || '—',
      courierLabel(order, awb),
    ];
  });
}

export function buildPackedOrdersPdfBuffer(orders = [], { dateKey = '', generatedAt = new Date() } = {}) {
  const rows = buildPackedOrderPdfRows(orders);
  const todayKey = getDubaiDateParts(generatedAt).date;
  const dayLabel = dateKey === todayKey ? `Today · ${dateKey}` : dateKey;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  registerPackedPdfFont(doc);
  const margin = 10;

  doc.setFont(FONT_NAME, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`PACKED ORDERS only  ${dayLabel}`, margin, 14);

  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('Report type: PACKED ORDERS ONLY (does not include returns)', margin, 20);
  doc.setTextColor(71, 85, 105);
  doc.text('Hamody', margin, 25);
  doc.text(
    `${rows.length} packed order${rows.length === 1 ? '' : 's'} · Generated ${formatGeneratedAt(generatedAt)}`,
    margin,
    30,
  );

  autoTable(doc, {
    startY: 34,
    margin: { left: 8, right: 8 },
    head: [[
      'Packed at',
      'Order #',
      'AWB',
      'Customer',
      'Phone',
      'City',
      'Items',
      'Total',
      'Status',
      'Courier',
    ]],
    body: rows,
    theme: 'grid',
    styles: {
      font: FONT_NAME,
      fontSize: 8,
      cellPadding: 1.6,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [186, 224, 216],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      font: FONT_NAME,
    },
    didDrawPage: () => {
      doc.setFont(FONT_NAME, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        doc.internal.pageSize.getWidth() - margin,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'right' },
      );
    },
  });

  return Buffer.from(doc.output('arraybuffer'));
}
