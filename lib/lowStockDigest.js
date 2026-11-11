import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import LowStockDigestRun from '@/models/LowStockDigestRun';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  loadLowStockAlertSettings,
} from '@/lib/lowStockAlertSettings';
import { formatVariantOptionsLabel } from '@/lib/productVariantOptions';

export const LOW_STOCK_THRESHOLD = DEFAULT_LOW_STOCK_THRESHOLD;
const DEFAULT_SLOT_HOURS = 3;
const SLOT_LOCK_MS = 10 * 60 * 1000;

function toStock(value) {
  if (value === null || value === undefined || value === '') return null;
  const stock = Number(value);
  return Number.isFinite(stock) && stock >= 0 ? stock : null;
}

function stripProductPrefix(label = '', productName = '') {
  const text = String(label || '').trim();
  const product = String(productName || '').trim();
  if (!text || !product) return text;
  const escaped = product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .replace(new RegExp(`^${escaped}\\s*[-–—:/|]\\s*`, 'i'), '')
    .trim() || text;
}

/** Customer-facing variant text only — never dump image URLs or imageSlot into emails. */
export function getVariantLabel(variant = {}, productName = '') {
  const named = String(
    variant.variantName || variant.name || variant.label || variant.title || '',
  ).trim();
  if (named) return stripProductPrefix(named, productName);

  const options = variant?.options;
  if (Array.isArray(options)) {
    return options
      .map((option) => (typeof option === 'string' ? option : option?.value || option?.name))
      .map((part) => String(part || '').trim())
      .filter((part) => part && !/^https?:\/\//i.test(part))
      .join(' · ');
  }

  if (!options || typeof options !== 'object') return '';

  const color = String(options.color || '').trim();
  const size = String(options.size || '').trim();
  if (color || size) return [color, size].filter(Boolean).join(' · ');

  const formatted = formatVariantOptionsLabel(options);
  return stripProductPrefix(formatted, productName);
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
          variant: getVariantLabel(variant, name),
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

export async function loadCustomLowStockItems(productIds = [], threshold = LOW_STOCK_THRESHOLD) {
  const ids = [...new Set((Array.isArray(productIds) ? productIds : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
  if (!ids.length) return [];
  await connectDB();
  const products = await Product.find({ _id: { $in: ids } })
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

async function sendDigestForScope({
  mode = 'catalog',
  enabled,
  threshold,
  intervalHours,
  recipients,
  items,
  now = new Date(),
  dryRun = false,
  force = false,
}) {
  const baseSlot = force
    ? `manual-${now.toISOString().replace(/[:.]/g, '-')}`
    : getLowStockDigestSlotKey(now, intervalHours);
  const slotKey = mode === 'custom' ? `custom-${baseSlot}` : baseSlot;

  if (!enabled && !force) {
    return { skipped: true, reason: mode === 'custom' ? 'custom_disabled' : 'disabled', mode, threshold, intervalHours, slotKey };
  }
  if (dryRun) {
    return {
      dryRun: true,
      mode,
      slotKey,
      threshold,
      intervalHours,
      itemCount: items.length,
      items,
    };
  }
  if (!items.length) {
    return { skipped: true, reason: 'no_low_stock_items', mode, slotKey, threshold, intervalHours };
  }

  const claim = await claimDigestSlot(slotKey, now);
  if (!claim) {
    return { skipped: true, reason: 'slot_already_processed_or_running', mode, slotKey, threshold, intervalHours };
  }

  try {
    const { sendAdminLowStockDigestEmail } = await import('@/lib/email');
    const sendResult = await sendAdminLowStockDigestEmail({
      items,
      threshold,
      intervalHours,
      slotKey,
      recipients,
      mode,
    });
    await LowStockDigestRun.updateOne(
      { _id: claim._id, status: 'sending' },
      { $set: { status: 'sent', sentAt: new Date() }, $unset: { lockExpiresAt: 1, error: 1 } },
    );
    return {
      skipped: false,
      mode,
      slotKey,
      threshold,
      intervalHours,
      itemCount: items.length,
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

/** Catalog-wide low-stock digest (all products). */
export async function runLowStockDigest({
  now = new Date(),
  dryRun = false,
  force = false,
} = {}) {
  const settings = await loadLowStockAlertSettings();
  const lowStockItems = await loadLowStockItems(settings.threshold);
  return sendDigestForScope({
    mode: 'catalog',
    enabled: settings.enabled,
    threshold: settings.threshold,
    intervalHours: settings.intervalHours,
    recipients: settings.recipients,
    items: lowStockItems,
    now,
    dryRun,
    force,
  });
}

/** Manual watch-list digest (selected products only). */
export async function runCustomLowStockDigest({
  now = new Date(),
  dryRun = false,
  force = false,
} = {}) {
  const settings = await loadLowStockAlertSettings();
  const productIds = (settings.customProducts || []).map((row) => row.productId);
  if (!productIds.length && !dryRun) {
    return {
      skipped: true,
      reason: 'no_custom_products',
      mode: 'custom',
      threshold: settings.customThreshold,
      intervalHours: settings.customIntervalHours,
    };
  }
  const lowStockItems = await loadCustomLowStockItems(productIds, settings.customThreshold);
  return sendDigestForScope({
    mode: 'custom',
    enabled: settings.customEnabled,
    threshold: settings.customThreshold,
    intervalHours: settings.customIntervalHours,
    recipients: settings.customRecipients,
    items: lowStockItems,
    now,
    dryRun,
    force,
  });
}

/** Cron entry: run catalog + custom digests. */
export async function runAllLowStockDigests(options = {}) {
  const catalog = await runLowStockDigest(options);
  let custom;
  try {
    custom = await runCustomLowStockDigest(options);
  } catch (error) {
    custom = {
      skipped: false,
      mode: 'custom',
      error: String(error?.message || error).slice(0, 500),
    };
  }
  return { catalog, custom };
}
