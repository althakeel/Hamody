import { getAdminOrderNotificationEmails } from '@/lib/storeContact';
import connectDB from '@/lib/mongodb';
import LowStockAlertSettings from '@/models/LowStockAlertSettings';
import {
  LOW_STOCK_ALERT_INTERVALS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_LOW_STOCK_INTERVAL_HOURS,
  LOW_STOCK_MERCHANDISE_EMAIL,
  MAX_CUSTOM_LOW_STOCK_PRODUCTS,
} from '@/lib/lowStockAlertConstants';

export {
  LOW_STOCK_ALERT_INTERVALS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_LOW_STOCK_INTERVAL_HOURS,
  LOW_STOCK_MERCHANDISE_EMAIL,
  MAX_CUSTOM_LOW_STOCK_PRODUCTS,
};

export function parseLowStockRecipients(value) {
  const entries = Array.isArray(value) ? value : String(value || '').split(/[,\n;]/);
  return [...new Set(entries
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean))];
}

export function isValidLowStockRecipients(recipients = []) {
  return Array.isArray(recipients)
    && recipients.length > 0
    && recipients.length <= 20
    && recipients.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

export function normalizeCustomLowStockProducts(list = []) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const row of list) {
    const productId = String(row?.productId || row?._id || row?.id || '').trim();
    if (!productId || seen.has(productId)) continue;
    seen.add(productId);
    out.push({
      productId,
      name: String(row?.name || '').trim().slice(0, 200),
      sku: String(row?.sku || '').trim().slice(0, 80),
      image: String(row?.image || '').trim().slice(0, 500),
    });
    if (out.length >= MAX_CUSTOM_LOW_STOCK_PRODUCTS) break;
  }
  return out;
}

export function getDefaultLowStockAlertSettings() {
  return {
    enabled: true,
    threshold: DEFAULT_LOW_STOCK_THRESHOLD,
    intervalHours: DEFAULT_LOW_STOCK_INTERVAL_HOURS,
    recipients: parseLowStockRecipients([
      LOW_STOCK_MERCHANDISE_EMAIL,
      ...getAdminOrderNotificationEmails(),
    ]),
    customEnabled: false,
    customThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
    customIntervalHours: DEFAULT_LOW_STOCK_INTERVAL_HOURS,
    customRecipients: parseLowStockRecipients([
      LOW_STOCK_MERCHANDISE_EMAIL,
      ...getAdminOrderNotificationEmails(),
    ]),
    customProducts: [],
  };
}

function normalizeThreshold(value, fallback) {
  const threshold = Number(value);
  return Number.isInteger(threshold) && threshold >= 1 && threshold <= 100000
    ? threshold
    : fallback;
}

function normalizeInterval(value, fallback) {
  const intervalHours = Number(value);
  return LOW_STOCK_ALERT_INTERVALS.includes(intervalHours) ? intervalHours : fallback;
}

export function normalizeLowStockAlertSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const defaults = getDefaultLowStockAlertSettings();
  const recipients = parseLowStockRecipients(source.recipients);
  const customRecipients = parseLowStockRecipients(source.customRecipients);

  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaults.enabled,
    threshold: normalizeThreshold(source.threshold, defaults.threshold),
    intervalHours: normalizeInterval(source.intervalHours, defaults.intervalHours),
    recipients: recipients.length ? recipients : defaults.recipients,
    customEnabled: typeof source.customEnabled === 'boolean'
      ? source.customEnabled
      : defaults.customEnabled,
    customThreshold: normalizeThreshold(source.customThreshold, defaults.customThreshold),
    customIntervalHours: normalizeInterval(source.customIntervalHours, defaults.customIntervalHours),
    customRecipients: customRecipients.length ? customRecipients : defaults.customRecipients,
    customProducts: normalizeCustomLowStockProducts(source.customProducts),
  };
}

export async function loadLowStockAlertSettings() {
  await connectDB();
  const saved = await LowStockAlertSettings.findById('global').lean();
  return normalizeLowStockAlertSettings(saved || getDefaultLowStockAlertSettings());
}

export function validateLowStockAlertSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const recipients = parseLowStockRecipients(source.recipients);
  const customRecipients = parseLowStockRecipients(source.customRecipients);
  const customProducts = normalizeCustomLowStockProducts(source.customProducts);

  if (typeof source.enabled !== 'boolean') return 'Enabled must be true or false.';
  if (!Number.isInteger(Number(source.threshold)) || Number(source.threshold) < 1 || Number(source.threshold) > 100000) {
    return 'Catalog threshold must be a whole number from 1 to 100,000.';
  }
  if (!LOW_STOCK_ALERT_INTERVALS.includes(Number(source.intervalHours))) {
    return `Catalog interval must be one of: ${LOW_STOCK_ALERT_INTERVALS.join(', ')} hours.`;
  }
  if (!isValidLowStockRecipients(recipients)) {
    return 'Add between 1 and 20 valid emails for catalog alerts.';
  }

  if (typeof source.customEnabled !== 'boolean') return 'Custom enabled must be true or false.';
  if (!Number.isInteger(Number(source.customThreshold)) || Number(source.customThreshold) < 1 || Number(source.customThreshold) > 100000) {
    return 'Custom threshold must be a whole number from 1 to 100,000.';
  }
  if (!LOW_STOCK_ALERT_INTERVALS.includes(Number(source.customIntervalHours))) {
    return `Custom interval must be one of: ${LOW_STOCK_ALERT_INTERVALS.join(', ')} hours.`;
  }
  if (!isValidLowStockRecipients(customRecipients)) {
    return 'Add between 1 and 20 valid emails for custom product alerts.';
  }
  if (customProducts.length > MAX_CUSTOM_LOW_STOCK_PRODUCTS) {
    return `Choose up to ${MAX_CUSTOM_LOW_STOCK_PRODUCTS} custom products.`;
  }
  if (source.customEnabled && customProducts.length < 1) {
    return 'Add at least one product for custom stock alerts, or turn custom alerts off.';
  }
  return '';
}
