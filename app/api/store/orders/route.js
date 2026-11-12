import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Address from '@/models/Address';
import AbandonedCart from '@/models/AbandonedCart';
import { attachConversionToOrders } from '@/lib/storeOrderInsights';
import { batchPopulateOrderUsers } from '@/lib/storeOrderUsers';
import { ACTIVE_RECORD_FILTER } from '@/lib/storeTrash';
import { repairOrderBundleLines } from '@/lib/bundleOrderRepair';
import { getOrderLineProduct } from '@/lib/orderDisplay';
import { isCatalogSku, resolveLineSku } from '@/lib/storePickupExcelSku';

const ORDER_LINE_PRODUCT_SELECT = 'name slug images sku variants price salePrice';
const ORDER_PAGE_DEFAULT = 20;
const ORDER_PAGE_MAX = 100;

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function orderListPaymentFilter(method) {
  const key = String(method || 'ALL').trim().toUpperCase();
  if (key === 'COD') return { paymentMethod: { $regex: 'cod', $options: 'i' } };
  if (key === 'TABBY') return { paymentMethod: { $regex: 'tabby', $options: 'i' } };
  if (key === 'TAMARA') return { paymentMethod: { $regex: 'tamara', $options: 'i' } };
  if (key === 'WALLET') return { paymentMethod: { $regex: '^wallet$', $options: 'i' } };
  if (key === 'CARD') {
    return { paymentMethod: { $in: ['CARD', 'STRIPE', 'RAZORPAY', 'VAULTSPAY', 'card', 'stripe', 'razorpay', 'vaultspay'] } };
  }
  return null;
}

function orderListSearchFilter(query) {
  const text = String(query || '').trim().slice(0, 80);
  if (!text) return null;
  const digits = text.replace(/\D/g, '');
  const bare = text.replace(/^#/, '');
  if (/^\d{4,8}$/.test(digits) && digits === bare.replace(/\D/g, '') && !/[a-z]/i.test(bare)) {
    return {
      $or: [
        { shortOrderNumber: Number(digits) },
        { trackingId: text },
        { legacySourceId: text },
        { 'waslah.trackingNumber': text },
        { 'waslah.emxTrackingNumber': text },
        { vaultsPayTransactionId: text },
        { razorpayPaymentId: text },
        { razorpayOrderId: text },
        { stripeCheckoutSessionId: text },
        { tabbyPaymentId: text },
        { tamaraOrderId: text },
        { 'paymentVerification.providerReference': text },
        { 'shippingAddress.phone': { $regex: `${digits}$` } },
        { guestPhone: { $regex: `${digits}$` } },
      ],
    };
  }
  const pattern = escapeRegex(text);
  return {
    $or: [
      { guestName: { $regex: pattern, $options: 'i' } },
      { guestEmail: { $regex: pattern, $options: 'i' } },
      { guestPhone: { $regex: pattern, $options: 'i' } },
      { 'shippingAddress.name': { $regex: pattern, $options: 'i' } },
      { 'shippingAddress.email': { $regex: pattern, $options: 'i' } },
      { 'shippingAddress.phone': { $regex: pattern, $options: 'i' } },
      { trackingId: { $regex: pattern, $options: 'i' } },
      { legacySourceId: { $regex: pattern, $options: 'i' } },
      { vaultsPayTransactionId: { $regex: pattern, $options: 'i' } },
      { razorpayPaymentId: { $regex: pattern, $options: 'i' } },
      { razorpayOrderId: { $regex: pattern, $options: 'i' } },
      { stripeCheckoutSessionId: { $regex: pattern, $options: 'i' } },
      { tabbyPaymentId: { $regex: pattern, $options: 'i' } },
      { tamaraOrderId: { $regex: pattern, $options: 'i' } },
      { 'paymentVerification.providerReference': { $regex: pattern, $options: 'i' } },
    ],
  };
}

function orderListStatusFilter(status) {
  const key = String(status || 'ALL').trim().toUpperCase();
  if (!key || key === 'ALL' || key === 'CONVERTED' || key.startsWith('DELIVERY_')) return null;
  if (key === 'PENDING_PAYMENT') return { status: 'AWAITING_PAYMENT' };
  if (key === 'PENDING_SHIPMENT') {
    return {
      status: { $in: ['ORDER_PLACED', 'PROCESSING'] },
      trackingId: { $in: [null, ''] },
      awb: { $in: [null, ''] },
    };
  }
  if (key === 'PACKED') return { 'warehousePacking.packed': true };
  if (key === 'LABEL_READY') {
    return {
      'waslah.orderId': { $exists: true, $nin: [null, ''] },
      'waslah.labelDownloadCount': { $in: [null, 0] },
      'waslah.labelPrintedAt': null,
    };
  }
  if (key === 'RETURN_REQUESTED') return { 'returns.status': 'REQUESTED' };
  return { status: key };
}

function orderListSort(sortBy, sortDirection) {
  const direction = String(sortDirection || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  if (sortBy === 'orderNumber') return { shortOrderNumber: direction, createdAt: -1 };
  if (sortBy === 'total') return { total: direction, createdAt: -1 };
  if (sortBy === 'customer') return { 'shippingAddress.name': direction, createdAt: -1 };
  return { createdAt: direction, shortOrderNumber: -1 };
}

async function hydrateOrderItemProducts(orders = []) {
  const missingIds = new Set();

  for (const order of orders) {
    for (const item of order.orderItems || []) {
      const product = getOrderLineProduct(item);
      const rawId = typeof item.productId === 'object'
        ? (item.productId?._id || item.productId?.id)
        : item.productId;
      if (!rawId) continue;

      const hasName = Boolean(String(product?.name || item?.name || '').trim());
      const hasImage = Boolean(product?.images?.length || item?.image);
      const hasSku = isCatalogSku(product?.sku)
        || isCatalogSku(item?.sku)
        || (Array.isArray(product?.variants) && product.variants.some((variant) => isCatalogSku(variant?.sku)));
      // Always refill when populate was skipped/wiped, snapshot is empty, or SKU is missing for export.
      if (!hasName || !hasImage || !product?.variants || !hasSku) {
        missingIds.add(String(rawId));
      }
    }
  }

  if (!missingIds.size) return orders;

  const products = await Product.find({ _id: { $in: [...missingIds] } })
    .select(ORDER_LINE_PRODUCT_SELECT)
    .lean();
  const productById = new Map(products.map((product) => [String(product._id), product]));

  return orders.map((order) => ({
    ...order,
    orderItems: (order.orderItems || []).map((item) => {
      const rawId = typeof item.productId === 'object'
        ? String(item.productId?._id || item.productId?.id || '')
        : String(item.productId || '');
      const hydrated = productById.get(rawId);
      if (!hydrated) return item;
      const lineName = String(item.name || item.productName || '').trim();
      const nextItem = {
        ...item,
        name: lineName || hydrated.name || item.name || '',
      };
      const mergedProduct = typeof item.productId === 'object' && item.productId
        ? { ...item.productId, ...hydrated }
        : hydrated;
      const resolvedSku = resolveLineSku({ ...nextItem, productId: mergedProduct });
      if (resolvedSku) nextItem.sku = resolvedSku;
      if (typeof item.productId === 'object' && item.productId) {
        return { ...nextItem, productId: { ...item.productId, ...hydrated } };
      }
      return { ...nextItem, productId: hydrated };
    }),
  }));
}

// Debug log helper
function debugLog(...args) {
    try { console.log('[ORDER API DEBUG]', ...args); } catch {}
}



// Update seller order status
export async function POST(request) {
    try {
        await connectDB();
        
        // Firebase Auth: Extract token from Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        const { getAuth } = await import('firebase-admin/auth');
        const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
        if (getApps().length === 0) {
            initializeApp({ credential: applicationDefault() });
        }
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const userId = decodedToken.uid;
        const storeId = await authSeller(userId)
        if(!storeId){
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const {orderId, status } = await request.json()

        await Order.findOneAndUpdate(
            { _id: orderId, storeId },
            { status }
        );

        return NextResponse.json({message: "Order Status updated"})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all orders for a seller
export async function GET(request){
    console.log('[ORDER API ROUTE] Route hit');
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const includeWaslah = searchParams.get('withWaslah') !== 'false';
        
        // Firebase Auth: Extract token from Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        const { getAuth } = await import('firebase-admin/auth');
        const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
        if (getApps().length === 0) {
            initializeApp({ credential: applicationDefault() });
        }
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const userId = decodedToken.uid;
        debugLog('userId from Firebase:', userId);
        const storeId = await authSeller(userId)
        debugLog('storeId from authSeller:', storeId);
        if(!storeId){
            debugLog('Not authorized: no storeId');
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const page = Math.max(1, Number(searchParams.get('page')) || 1);
        const limit = Math.min(ORDER_PAGE_MAX, Math.max(1, Number(searchParams.get('limit')) || ORDER_PAGE_DEFAULT));
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const createdAt = {};
        if (from) {
          const start = new Date(from);
          if (!Number.isNaN(start.getTime())) createdAt.$gte = start;
        }
        if (to) {
          const end = new Date(to);
          if (!Number.isNaN(end.getTime())) createdAt.$lt = end;
        }
        const baseMatch = {
          storeId,
          ...ACTIVE_RECORD_FILTER,
          ...(Object.keys(createdAt).length ? { createdAt } : {}),
          ...(orderListPaymentFilter(searchParams.get('payment')) || {}),
          ...(orderListSearchFilter(searchParams.get('q')) || {}),
        };
        const match = {
          ...baseMatch,
          ...(orderListStatusFilter(searchParams.get('status')) || {}),
        };
        const sort = orderListSort(searchParams.get('sortBy'), searchParams.get('sortDirection'));

        const [orders, total, statusGroups, pendingShipment, labelReady, packed, returnsRequested] = await Promise.all([
            Order.find(match)
                .populate('addressId')
                .populate({
                    path: 'orderItems.productId',
                    model: 'Product',
                    select: ORDER_LINE_PRODUCT_SELECT,
                })
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Order.countDocuments(match),
            Order.aggregate([
              { $match: baseMatch },
              { $group: { _id: '$status', n: { $sum: 1 } } },
            ]),
            Order.countDocuments({
              ...baseMatch,
              status: { $in: ['ORDER_PLACED', 'PROCESSING'] },
              trackingId: { $in: [null, ''] },
            }),
            Order.countDocuments({
              ...baseMatch,
              'waslah.orderId': { $exists: true, $nin: [null, ''] },
              'waslah.labelDownloadCount': { $in: [null, 0] },
              'waslah.labelPrintedAt': null,
            }),
            Order.countDocuments({ ...baseMatch, 'warehousePacking.packed': true }),
            Order.countDocuments({ ...baseMatch, 'returns.status': 'REQUESTED' }),
        ]);
        const statusCounts = Object.fromEntries(statusGroups.map((row) => [row._id || 'UNKNOWN', row.n]));
        const scopedTotal = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        const awaitingCount = statusCounts.AWAITING_PAYMENT || 0;
        const inactiveCount = (statusCounts.PAYMENT_FAILED || 0)
          + (statusCounts.CANCELLED || 0)
          + (statusCounts.REFUNDED || 0)
          + awaitingCount;
        const counts = {
          ...statusCounts,
          TOTAL: scopedTotal,
          ACTIVE: Math.max(0, scopedTotal - inactiveCount),
          PENDING_PAYMENT: awaitingCount,
          PENDING_SHIPMENT: pendingShipment,
          LABEL_READY: labelReady,
          PACKED: packed,
          RETURN_REQUESTED: returnsRequested,
        };

        const convertedCarts = orders.length
          ? await AbandonedCart.find({
              storeId,
              ...ACTIVE_RECORD_FILTER,
              linkedOrderId: { $in: orders.map((order) => String(order._id)) },
            })
              .select('_id userId email phone status convertedAt convertedBy convertedByName convertedCartTotal cartTotal conversionNote conversionDiscountType conversionDiscountValue conversionPaymentMethod linkedOrderId')
              .lean()
          : [];
        
        debugLog('orders found:', orders.length);
        
        await batchPopulateOrderUsers(orders, { getAuth });
        
        if (orders.length > 0) {
            debugLog('First order after population:', {
                _id: orders[0]._id,
                userId: orders[0].userId,
                userIdType: typeof orders[0].userId,
                shippingAddress: orders[0].shippingAddress,
                isGuest: orders[0].isGuest
            });
        }

        let enrichedOrders = attachConversionToOrders(orders, convertedCarts);

        const bundleRepairUpdates = [];
        enrichedOrders = enrichedOrders.map((order) => {
            const { items, changed } = repairOrderBundleLines(order);
            if (!changed) return order;
            bundleRepairUpdates.push(
                Order.findByIdAndUpdate(order._id, { orderItems: items }).catch((err) => {
                    debugLog('bundle order repair failed for', order._id, err?.message || err);
                }),
            );
            return { ...order, orderItems: items };
        });
        if (bundleRepairUpdates.length) {
            Promise.all(bundleRepairUpdates).catch(() => {});
        }

        if (includeWaslah) {
            try {
                const { syncWaslahStatusForOrders } = await import('@/lib/waslahOrderStatusSync');
                enrichedOrders = await syncWaslahStatusForOrders(enrichedOrders, {
                    max: 24,
                    persist: true,
                    concurrency: 6,
                    staleFirst: true,
                });
            } catch (waslahSyncError) {
                debugLog('Waslah status sync failed:', waslahSyncError?.message || waslahSyncError);
            }
        }

        // Hydrate catalog name/images AFTER Waslah sync. Those paths can
        // re-read lean orders and wipe populated orderItems.productId.
        enrichedOrders = await hydrateOrderItemProducts(enrichedOrders);

        const { excludeReturnPickupCloneOrders } = await import('@/lib/storeReturnLabels');
        enrichedOrders = excludeReturnPickupCloneOrders(enrichedOrders);

        return NextResponse.json({
          orders: enrichedOrders,
          total,
          page,
          limit,
          counts,
        })
    } catch (error) {
        console.error('[ORDER API ERROR]', error);
        debugLog('API error:', error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
