import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { getWarehouseApiContext } from '@/lib/warehouseAuth';
import { ACTIVE_RECORD_FILTER } from '@/lib/storeTrash';
import { excludeReturnPickupCloneOrders } from '@/lib/storeReturnLabels';
import { syncWaslahStatusForOrders } from '@/lib/waslahOrderStatusSync';
import { serializeWarehouseTrackingOrdersHydrated } from '@/lib/warehouseTracking';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function escapeRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dubaiDayStart(dateKey = '') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  return new Date(`${dateKey}T00:00:00+04:00`);
}

function dubaiDayEnd(dateKey = '') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  return new Date(`${dateKey}T23:59:59.999+04:00`);
}

/**
 * GET /api/warehouse/orders
 *
 * Mobile / warehouse app: every created store order, newest first, with the
 * latest saved Waslah status. Optional live=true refreshes Waslah for this page.
 *
 * Auth: x-warehouse-key OR Authorization: Bearer <Firebase seller token>
 *
 * Query:
 * - page=1
 * - limit=50          max 100
 * - status=           comma list; omit for every status
 * - fromDate=YYYY-MM-DD   createdAt, Dubai day start
 * - toDate=YYYY-MM-DD     createdAt, Dubai day end
 * - q=                order number, AWB, name, or phone
 * - shipment=waslah   only orders already created in Waslah
 * - live=true         pull fresh Waslah status for this page before responding
 */
export async function GET(request) {
  try {
    const context = await getWarehouseApiContext(request);
    if (!context?.storeId) {
      return NextResponse.json({
        error: 'Unauthorized',
        hint: 'Send x-warehouse-key or Authorization: Bearer <Firebase ID token>',
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10) || 50));
    const statusParam = String(searchParams.get('status') || '').trim();
    const fromDate = String(searchParams.get('fromDate') || '').trim();
    const toDate = String(searchParams.get('toDate') || '').trim();
    const q = String(searchParams.get('q') || '').trim();
    const shipment = String(searchParams.get('shipment') || '').trim().toLowerCase();
    const live = ['1', 'true', 'yes'].includes(String(searchParams.get('live') || '').toLowerCase());

    const query = {
      storeId: String(context.storeId),
      ...ACTIVE_RECORD_FILTER,
    };

    if (statusParam) {
      const statuses = statusParam.split(',').map((value) => value.trim().toUpperCase()).filter(Boolean);
      if (statuses.length) query.status = { $in: statuses };
    }

    const createdAt = {};
    const from = dubaiDayStart(fromDate);
    const to = dubaiDayEnd(toDate);
    if (fromDate && !from) {
      return NextResponse.json({ error: 'fromDate must be YYYY-MM-DD' }, { status: 400 });
    }
    if (toDate && !to) {
      return NextResponse.json({ error: 'toDate must be YYYY-MM-DD' }, { status: 400 });
    }
    if (from) createdAt.$gte = from;
    if (to) createdAt.$lte = to;
    if (Object.keys(createdAt).length) query.createdAt = createdAt;

    if (shipment === 'waslah' || shipment === 'created') {
      query['waslah.orderId'] = { $exists: true, $nin: [null, ''] };
    }

    query.$nor = [
      { fulfillmentKind: 'RETURN' },
      { 'attribution.utmMedium': 'return_order' },
      {
        sourceOrderId: { $exists: true, $nin: [null, ''] },
        fulfillmentKind: { $ne: 'REPLACEMENT' },
      },
    ];

    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      const or = [
        { guestName: rx },
        { guestPhone: rx },
        { guestEmail: rx },
        { trackingId: rx },
        { 'waslah.emxTrackingNumber': rx },
        { 'waslah.waslahTrackingNumber': rx },
        { 'waslah.reference': rx },
        { 'waslah.orderId': rx },
        { 'shippingAddress.phone': rx },
        { 'shippingAddress.name': rx },
        { 'shippingAddress.city': rx },
      ];
      if (/^\d+$/.test(q)) or.push({ shortOrderNumber: Number(q) });
      query.$or = or;
    }

    await dbConnect();

    const total = await Order.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    let orders = await Order.find(query)
      .sort({ createdAt: -1, shortOrderNumber: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    orders = excludeReturnPickupCloneOrders(orders);

    let liveSync = null;
    if (live && orders.length) {
      try {
        const synced = await syncWaslahStatusForOrders(orders, {
          max: Math.min(orders.length, 20),
          persist: true,
          concurrency: 4,
          staleFirst: true,
        });
        orders = synced;
        liveSync = {
          requested: true,
          refreshed: Math.min(orders.length, 20),
        };
      } catch (error) {
        liveSync = {
          requested: true,
          refreshed: 0,
          error: error?.message || 'Waslah status refresh failed',
        };
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'orders',
      page,
      limit,
      total,
      totalPages,
      filters: {
        status: statusParam || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        q: q || null,
        shipment: shipment || null,
        live,
      },
      liveSync,
      orders: await serializeWarehouseTrackingOrdersHydrated(orders),
    });
  } catch (error) {
    console.error('[warehouse/orders GET]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load orders' },
      { status: 500 },
    );
  }
}
