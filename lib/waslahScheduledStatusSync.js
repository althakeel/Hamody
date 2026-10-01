import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { isWaslahConfigured } from '@/lib/waslah';
import { syncWaslahStatusForOrder, shouldSyncWaslahOrderStatus } from '@/lib/waslahOrderStatusSync';

const TERMINAL_ORDER_STATUSES = [
  'DELIVERED',
  'RTO',
  'RETURN',
  'RETURNED',
  'CANCELLED',
  'REFUNDED',
  'PAYMENT_FAILED',
];

const TERMINAL_WASLAH_APP_STATUSES = [
  'DELIVERED',
  'RTO',
  'RETURN',
  'RETURNED',
  'CANCELLED',
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** Orders with a Waslah / EMX shipment that still need POST /orders/history polling. */
const DEFAULT_STATUS_SYNC_MIN_AGE_MS = 2 * 60 * 1000;

export function buildWaslahScheduledSyncQuery({ minAgeMs = DEFAULT_STATUS_SYNC_MIN_AGE_MS } = {}) {
  const cutoff = new Date(Date.now() - Math.max(0, Number(minAgeMs) || 0));

  return {
    $or: [
      {
        status: { $nin: TERMINAL_ORDER_STATUSES },
        $and: [
          {
            $or: [
              { 'waslah.orderId': { $exists: true, $nin: [null, ''] } },
              { 'waslah.trackingNumber': { $exists: true, $nin: [null, ''] } },
              { 'waslah.emxTrackingNumber': { $exists: true, $nin: [null, ''] } },
              { 'waslah.waslahTrackingNumber': { $exists: true, $nin: [null, ''] } },
              { trackingId: { $exists: true, $nin: [null, ''] } },
            ],
          },
          {
            $or: [
              { 'waslah.appStatus': { $exists: false } },
              { 'waslah.appStatus': null },
              { 'waslah.appStatus': '' },
              { 'waslah.appStatus': { $nin: TERMINAL_WASLAH_APP_STATUSES } },
            ],
          },
          {
            $or: [
              { 'waslah.lastStatusSyncAt': { $exists: false } },
              { 'waslah.lastStatusSyncAt': null },
              { 'waslah.lastStatusSyncAt': { $lt: cutoff } },
            ],
          },
        ],
      },
      // Reverse pickups on delivered sales — Waslah may assign EMX AWB after create.
      {
        'waslahReturn.orderId': { $exists: true, $nin: [null, ''] },
        $or: [
          { 'waslahReturn.trackingNumber': { $exists: false } },
          { 'waslahReturn.trackingNumber': null },
          { 'waslahReturn.trackingNumber': '' },
          { 'waslahReturn.trackingNumber': { $regex: /^62/ } },
          { 'waslahReturn.lastStatusSyncAt': { $exists: false } },
          { 'waslahReturn.lastStatusSyncAt': null },
          { 'waslahReturn.lastStatusSyncAt': { $lt: cutoff } },
        ],
      },
    ],
  };
}

/**
 * Poll Waslah POST /orders/history often enough for the dashboard to follow
 * courier scans. Batches of ~10 AWBs keep a pause between calls.
 */
export async function processWaslahScheduledStatusSync({
  batchSize = readPositiveInt(process.env.WASLAH_STATUS_SYNC_BATCH_SIZE, 10),
  batchDelayMs = readPositiveInt(process.env.WASLAH_STATUS_SYNC_BATCH_DELAY_MS, 3000),
  maxOrders = readPositiveInt(process.env.WASLAH_STATUS_SYNC_MAX_ORDERS, 120),
  minAgeMs = readPositiveInt(process.env.WASLAH_STATUS_SYNC_MIN_AGE_MS, DEFAULT_STATUS_SYNC_MIN_AGE_MS),
} = {}) {
  if (!isWaslahConfigured()) {
    return {
      skipped: true,
      reason: 'waslah_not_configured',
      synced: 0,
      batches: 0,
    };
  }

  await connectDB();

  const query = buildWaslahScheduledSyncQuery({ minAgeMs });
  const candidates = await Order.find(query)
    .sort({ 'waslah.lastStatusSyncAt': 1, updatedAt: 1 })
    .limit(maxOrders)
    .lean();

  const orders = candidates.filter((order) => shouldSyncWaslahOrderStatus(order));
  const summary = {
    skipped: false,
    scanned: candidates.length,
    eligible: orders.length,
    batches: 0,
    synced: 0,
    changed: 0,
    empty: 0,
    errors: 0,
    batchSize,
    batchDelayMs,
  };

  for (let index = 0; index < orders.length; index += batchSize) {
    const batch = orders.slice(index, index + batchSize);
    summary.batches += 1;

    for (const order of batch) {
      const syncStartedAt = new Date();
      let shouldStamp = false;
      try {
        const result = await syncWaslahStatusForOrder(order, { persist: true });
        summary.synced += 1;
        if (result.changed) summary.changed += 1;
        if (result.empty || result.pending) summary.empty += 1;
        if (result.error) summary.errors += 1;
        // A failed look-up must stay eligible for the next run.
        shouldStamp = !result.error;
      } catch (error) {
        summary.errors += 1;
        console.error('[waslah-scheduled-sync] order failed', {
          orderId: String(order._id),
          error: error?.message || error,
        });
      }
      if (shouldStamp) {
        await Order.findByIdAndUpdate(order._id, {
          $set: { 'waslah.lastStatusSyncAt': syncStartedAt },
        }).catch(() => {});
      }
    }

    if (index + batchSize < orders.length) {
      await sleep(batchDelayMs);
    }
  }

  summary.completedAt = new Date().toISOString();
  return summary;
}
