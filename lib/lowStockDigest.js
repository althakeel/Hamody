import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import LowStockDigestRun from '@/models/LowStockDigestRun';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  loadLowStockAlertSettings,
} from '@/lib/lowStockAlertSettings';

export const LOW_STOCK_THRESHOLD = DEFAULT_LOW_STOCK_THRESHOLD;
const DEFAULT_SLOT_HOURS = 3;
const SLOT_LOCK_MS = 10 * 60 * 1000;

function toStock(value) {
  if (value === null || value === undefined || value === '') return null;
  const stock = Number(value);
  return Number.isFinite(stock) && stock >= 0 ? stock : null;
}

function getVariantLabel(variant = {}) {
  const label = variant.variantName || variant.name || variant.label || variant.title;
  if (label) return String(label).trim();
  if (Array.isArray(variant.options)) {
    return variant.options
      .map((option) => typeof option === 'string' ? option : option?.value || option?.name)
      .filter(Boolean)
      .join(' / ');
  }
  if (variant.options && typeof variant.options === 'object') {
    return Object.values(variant.options)
      .map((option) => typeof option === 'string' ? option : option?.value || option?.name)
      .filter(Boolean)
      .join(' / ');
  }
  return '';
}

export function collectLowStockItems(products = [], threshold = LOW_STOCK_THRESHOLD) {
  const items = [];

  for (const product of products) {
    const name = String(product?.name || 'Unnamed product').trim();
    const hasVariants = product?.hasVariants && Array.isArray(product.variants) && product.variants.length > 0;

    if (hasVariants) {
      for (const variant of product.variants) {
        const stock = toStock(variant?.stock);
        if (stock === null || stock >= threshold) continue;
        items.push({
          productId: String(product._id || ''),
          name,
          sku: String(variant?.sku || product.sku || '').trim(),
          variant: getVariantLabel(variant),
          stock,
        });
      }
      continue;
    }

    const stock = toStock(product?.stockQuantity);
    if (stock === null || stock >= threshold) continue;
    items.push({
      productId: String(product._id || ''),
      name,
      sku: String(product.sku || '').trim(),
      variant: '',
      stock,
    });
  }

  return items.sort((first, second) => first.stock - second.stock
    || first.name.localeCompare(second.name)
    || first.sku.localeCompare(second.sku));
}

export function getLowStockDigestSlotKey(now = new Date(), intervalHours = DEFAULT_SLOT_HOURS) {
  const safeInterval = Number.isInteger(Number(intervalHours)) && Number(intervalHours) > 0
    ? Number(intervalHours)
    : DEFAULT_SLOT_HOURS;
  const slot = new Date(now);
  slot.setUTCMinutes(0, 0, 0);
  slot.setUTCHours(Math.floor(slot.getUTCHours() / safeInterval) * safeInterval);
  return `${slot.toISOString().slice(0, 13)}-${safeInterval}h`;
}

export async function loadLowStockItems(threshold = LOW_STOCK_THRESHOLD) {
  await connectDB();
  const products = await Product.find({})
    .select('_id name sku hasVariants variants stockQuantity')
    .lean();
  return collectLowStockItems(products, threshold);
}

async function claimDigestSlot(slotKey, now) {
  const lockExpiresAt = new Date(now.getTime() + SLOT_LOCK_MS);
  try {
    return await LowStockDigestRun.create({
      slotKey,
      status: 'sending',
      lockExpiresAt,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  return LowStockDigestRun.findOneAndUpdate(
    {
      slotKey,
      $or: [
        { status: 'failed' },
        { status: 'sending', lockExpiresAt: { $lt: now } },
      ],
    },
    {
      $set: { status: 'sending', lockExpiresAt },
      $unset: { error: 1 },
    },
    { new: true },
  );
}

export async function runLowStockDigest({ now = new Date(), dryRun = false } = {}) {
  const settings = await loadLowStockAlertSettings();
  if (!settings.enabled) {
    return { skipped: true, reason: 'disabled', threshold: settings.threshold, intervalHours: settings.intervalHours };
  }

  const lowStockItems = await loadLowStockItems(settings.threshold);
  const slotKey = getLowStockDigestSlotKey(now, settings.intervalHours);

  if (dryRun) {
    return {
      dryRun: true,
      slotKey,
      threshold: settings.threshold,
      intervalHours: settings.intervalHours,
      itemCount: lowStockItems.length,
      items: lowStockItems,
    };
  }
  if (!lowStockItems.length) {
    return { skipped: true, reason: 'no_low_stock_items', slotKey, threshold: settings.threshold };
  }

  const claim = await claimDigestSlot(slotKey, now);
  if (!claim) {
    return { skipped: true, reason: 'slot_already_processed_or_running', slotKey, threshold: settings.threshold };
  }

  try {
    const { sendAdminLowStockDigestEmail } = await import('@/lib/email');
    const sendResult = await sendAdminLowStockDigestEmail({
      items: lowStockItems,
      threshold: settings.threshold,
      intervalHours: settings.intervalHours,
      slotKey,
      recipients: settings.recipients,
    });
    await LowStockDigestRun.updateOne(
      { _id: claim._id, status: 'sending' },
      { $set: { status: 'sent', sentAt: new Date() }, $unset: { lockExpiresAt: 1, error: 1 } },
    );
    return {
      skipped: false,
      slotKey,
      threshold: settings.threshold,
      intervalHours: settings.intervalHours,
      itemCount: lowStockItems.length,
      sendResult,
    };
  } catch (error) {
    await LowStockDigestRun.updateOne(
      { _id: claim._id, status: 'sending' },
      { $set: { status: 'failed', error: String(error?.message || error).slice(0, 500) }, $unset: { lockExpiresAt: 1 } },
    );
    throw error;
  }
}
