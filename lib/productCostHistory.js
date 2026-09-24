import connectDB from '@/lib/mongodb';
import ProductCostHistory from '@/models/ProductCostHistory';
import { resolveInventoryActor } from '@/lib/inventoryHistory';

export async function recordProductCostHistory(entries = []) {
  const rows = (Array.isArray(entries) ? entries : [entries]).filter((entry) => (
    entry && entry.storeId && entry.productId
  ));
  if (!rows.length) return;

  try {
    await connectDB();
    await ProductCostHistory.insertMany(rows.map((entry) => ({
      storeId: String(entry.storeId),
      productId: String(entry.productId),
      productName: String(entry.productName || ''),
      sku: String(entry.sku || ''),
      actorUserId: String(entry.actorUserId || ''),
      actorEmail: String(entry.actorEmail || ''),
      actorName: String(entry.actorName || ''),
      actorRole: entry.actorRole || 'unknown',
      action: entry.action || 'set_cost',
      previousCost: Number(entry.previousCost || 0),
      newCost: Number(entry.newCost || 0),
      source: String(entry.source || 'product_cost_page'),
      details: String(entry.details || ''),
    })));
  } catch (error) {
    console.warn('[recordProductCostHistory] failed:', error?.message || error);
  }
}

export function formatProductCostHistoryRow(row = {}) {
  return {
    _id: String(row._id),
    productId: String(row.productId || ''),
    productName: row.productName || '',
    sku: row.sku || '',
    actorName: row.actorName || '',
    actorEmail: row.actorEmail || '',
    actorRole: row.actorRole || '',
    action: row.action || 'set_cost',
    previousCost: Number(row.previousCost || 0),
    newCost: Number(row.newCost || 0),
    source: row.source || '',
    details: row.details || '',
    createdAt: row.createdAt || null,
  };
}

export { resolveInventoryActor };
