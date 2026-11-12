import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { getAuth } from '@/lib/firebase-admin';
import authSeller from '@/middlewares/authSeller';
import { ACTIVE_RECORD_FILTER } from '@/lib/storeTrash';
import { parseSellerPaymentAmount } from '@/lib/sellerPaymentLink';
import { issueStorePaymentLink } from '@/lib/storePaymentLink';

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
    if (!storeId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const method = String(body?.method || '').trim().toLowerCase();
    if (!['card', 'applepay', 'tabby', 'tamara'].includes(method)) {
      return NextResponse.json({ error: 'Choose Visa / Mastercard, Apple Pay, Tabby, or Tamara' }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findOne({
      _id: orderId,
      storeId: String(storeId),
      ...ACTIVE_RECORD_FILTER,
    }).populate('orderItems.productId').lean();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.isPaid === true || String(order.paymentStatus || '').toUpperCase() === 'PAID') {
      return NextResponse.json({ error: 'This order is already paid' }, { status: 400 });
    }
    const orderTotal = Number(order.total);
    const requestedAmount = body?.amount;
    const customAmount = requestedAmount == null || requestedAmount === ''
      ? null
      : parseSellerPaymentAmount(requestedAmount);
    if ((requestedAmount != null && requestedAmount !== '') && customAmount == null) {
      return NextResponse.json(
        { error: 'Enter an amount from 1 to 100,000 AED' },
        { status: 400 },
      );
    }
    const amount = customAmount ?? orderTotal;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'This order has no amount to charge' }, { status: 400 });
    }

    const link = await issueStorePaymentLink({
      storeId,
      order,
      method,
      amount,
      actor: decodedToken,
    });

    return NextResponse.json({ success: true, ...link });
  } catch (error) {
    console.error('[store/orders/payment-link]', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Could not create a payment link.' },
      { status: error?.statusCode && error.statusCode < 500 ? error.statusCode : 502 },
    );
  }
}
