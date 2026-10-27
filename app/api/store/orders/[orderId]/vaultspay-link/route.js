import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { getAuth } from '@/lib/firebase-admin';
import authSeller from '@/middlewares/authSeller';
import { ACTIVE_RECORD_FILTER } from '@/lib/storeTrash';
import { isPaymentFailedStoreOrder } from '@/lib/paymentFailedFollowUp';
import { createVaultsPayCheckout } from '@/lib/vaultsPay';
import { buildCustomerSitePath } from '@/lib/appUrl';
import { logPaymentEvent } from '@/lib/paymentTransactionLog';

const LINK_SECONDS = 24 * 60 * 60;

export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const storeId = await authSeller(decodedToken.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findOne({
      _id: orderId,
      storeId: String(storeId),
      ...ACTIVE_RECORD_FILTER,
    }).lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (!isPaymentFailedStoreOrder(order)) {
      return NextResponse.json({ error: 'A new payment link is only for payment failed orders' }, { status: 400 });
    }
    if (order.isPaid === true || String(order.paymentStatus || '').toUpperCase() === 'PAID') {
      return NextResponse.json({ error: 'This order is already paid' }, { status: 400 });
    }
    if (String(order.paymentMethod || '').toUpperCase() !== 'VAULTSPAY') {
      return NextResponse.json({ error: 'This order was not paid with VaultsPay' }, { status: 400 });
    }

    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'This order has no amount to charge' }, { status: 400 });
    }

    const address = order.shippingAddress || {};
    const checkout = await createVaultsPayCheckout({
      amount,
      orderId: String(order._id),
      redirectUrl: buildCustomerSitePath(`/order-success?orderId=${order._id}&vaultspay=1`),
      callbackUrl: buildCustomerSitePath('/api/webhooks/vaultspay'),
      method: 'card',
      expiryInSeconds: LINK_SECONDS,
      customer: {
        email: address.email || order.guestEmail || '',
        phone: address.phone || order.guestPhone || '',
      },
    });

    const expiresAt = new Date(Date.now() + LINK_SECONDS * 1000);
    await Order.updateOne(
      { _id: order._id, storeId: String(storeId), isPaid: { $ne: true } },
      {
        $set: {
          vaultsPayTransactionId: checkout.transactionId,
          vaultsPayPaymentStatus: 'pending',
          vaultsPayPaymentUrl: checkout.url,
          vaultsPayPaymentUrlExpiresAt: expiresAt,
        },
      },
    );

    await logPaymentEvent({
      storeId: String(storeId),
      orderId: String(order._id),
      eventType: 'SESSION_CREATED',
      provider: 'VAULTSPAY',
      providerReference: checkout.transactionId,
      amount,
      status: 'pending',
      actorUserId: decodedToken.uid,
      actorRole: 'seller',
      meta: { source: 'store_regenerate_link' },
    });

    return NextResponse.json({
      success: true,
      url: checkout.url,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[store/orders/vaultspay-link]', error?.message || error);
    const raw = String(error?.message || '');
    const message = /fetch failed|ENOTFOUND|ECONNREFUSED|timeout/i.test(raw)
      ? 'VaultsPay is temporarily unavailable. Please try again.'
      : (raw || 'Could not create a payment link.');
    return NextResponse.json(
      { error: message },
      { status: error?.statusCode && error.statusCode < 500 ? error.statusCode : 502 },
    );
  }
}
