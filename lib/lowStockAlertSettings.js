import { getAdminOrderNotificationEmails } from '@/lib/storeContact';
import connectDB from '@/lib/mongodb';
import LowStockAlertSettings from '@/models/LowStockAlertSettings';

export const LOW_STOCK_ALERT_INTERVALS = [1, 2, 3, 4, 6, 8, 12, 24];
export const DEFAULT_LOW_STOCK_THRESHOLD = 20;
export const DEFAULT_LOW_STOCK_INTERVAL_HOURS = 3;
export const LOW_STOCK_MERCHANDISE_EMAIL = 'merchandise@althakeel.com';

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

export function getDefaultLowStockAlertSettings() {
  return {
    enabled: true,
    threshold: DEFAULT_LOW_STOCK_THRESHOLD,
    intervalHours: DEFAULT_LOW_STOCK_INTERVAL_HOURS,
    recipients: parseLowStockRecipients([
      LOW_STOCK_MERCHANDISE_EMAIL,
      ...getAdminOrderNotificationEmails(),
    ]),
  };
}

export function normalizeLowStockAlertSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const defaults = getDefaultLowStockAlertSettings();
  const threshold = Number(source.threshold);
  const intervalHours = Number(source.intervalHours);
  const recipients = parseLowStockRecipients(source.recipients);

  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaults.enabled,
    threshold: Number.isInteger(threshold) && threshold >= 1 && threshold <= 100000
      ? threshold
      : defaults.threshold,
    intervalHours: LOW_STOCK_ALERT_INTERVALS.includes(intervalHours)
      ? intervalHours
      : defaults.intervalHours,
    recipients: recipients.length ? recipients : defaults.recipients,
  };
}

export async function loadLowStockAlertSettings() {
  await connectDB();
  const saved = await LowStockAlertSettings.findById('global').lean();
  return normalizeLowStockAlertSettings(saved || getDefaultLowStockAlertSettings());
}

export function validateLowStockAlertSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const threshold = Number(source.threshold);
  const intervalHours = Number(source.intervalHours);
  const recipients = parseLowStockRecipients(source.recipients);

  if (typeof source.enabled !== 'boolean') return 'Enabled must be true or false.';
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100000) {
    return 'Threshold must be a whole number from 1 to 100,000.';
  }
  if (!LOW_STOCK_ALERT_INTERVALS.includes(intervalHours)) {
    return `Interval must be one of: ${LOW_STOCK_ALERT_INTERVALS.join(', ')} hours.`;
  }
  if (!isValidLowStockRecipients(recipients)) {
    return 'Add between 1 and 20 valid email addresses.';
  }
  return '';
}
