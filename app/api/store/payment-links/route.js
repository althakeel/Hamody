import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { getAuth } from '@/lib/firebase-admin';
import authSeller from '@/middlewares/authSeller';
import { allocateShortOrderNumber } from '@/lib/orderNumber';
import { parseSellerPaymentAmount } from '@/lib/sellerPaymentLink';
import { issueStorePaymentLink } from '@/lib/storePaymentLink';

const METHODS = ['card', 'applepay', 'tabby', 'tamara'];

function paymentMethodFor(method) {
  if (method === 'tabby') return 'TABBY';
  if (method === 'tamara') return 'TAMARA';
  return 'VAULTSPAY';
}

export async function POST(request) {
  let createdId = null;
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

    const body = await request.json().catch(() => ({}));
    const method = String(body?.method || '').trim().toLowerCase();
    if (!METHODS.includes(method)) {
      return NextResponse.json({ error: 'Choose Visa / Mastercard, Apple Pay, Tabby, or Tamara' }, { status: 400 });
    }
    const amount = parseSellerPaymentAmount(body?.amount);
    if (amount == null) {
      return NextResponse.json({ error: 'Enter an amount from 1 to 100,000 AED' }, { status: 400 });
    }

    const name = String(body?.name || '').trim().slice(0, 120) || 'Customer';
    const email = String(body?.email || '').trim().slice(0, 180);
    const phone = String(body?.phone || '').replace(/[^\d]/g, '').slice(0, 15);
    if ((method === 'tabby' || method === 'tamara') && (!email || !email.includes('@') || phone.length < 8)) {
      return NextResponse.json(
        { error: 'Tabby and Tamara need the customer email and UAE mobile number.' },
        { status: 400 },
      );
    }

    await connectDB();
    const order = await Order.create({
      storeId: String(storeId),
      total: amount,
      shippingFee: 0,
      status: 'AWAITING_PAYMENT',
      paymentMethod: paymentMethodFor(method),
      paymentStatus: 'PENDING',
      isPaid: false,
      isGuest: true,
      guestName: name,
      guestEmail: email,
      guestPhone: phone,
      shippingAddress: {
        name,
        email,
        phone,
        phoneCode: '+971',
        city: 'Dubai',
        country: 'United Arab Emirates',
        street: 'Payment link',
      },
      orderItems: [{
        name: 'Payment',
        price: amount,
        quantity: 1,
      }],
      notes: 'Created from a payment link',
      fulfillmentStockReservationRequired: false,
    });
    createdId = order._id;
    order.shortOrderNumber = await allocateShortOrderNumber(String(storeId));
    await order.save();

    const link = await issueStorePaymentLink({
      storeId,
      order: order.toObject(),
      method,
      amount,
      actor: decodedToken,
    });

    return NextResponse.json({
      success: true,
      createdOrder: true,
      ...link,
      shortOrderNumber: order.shortOrderNumber,
    });
  } catch (error) {
    if (createdId) {
      await Order.deleteOne({ _id: createdId }).catch(() => {});
    }
    console.error('[store/payment-links]', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Could not create a payment link.' },
      { status: error?.statusCode && error.statusCode < 500 ? error.statusCode : 502 },
    );
  }
}
