import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { getAuth } from '@/lib/firebase-admin';
import authSeller from '@/middlewares/authSeller';
import { ACTIVE_RECORD_FILTER } from '@/lib/storeTrash';
import {
  VAULTSPAY_CALLBACK_PATH,
  VAULTSPAY_EXPIRY_SECONDS,
  createVaultsPayCheckout,
} from '@/lib/vaultsPay';
import { createTabbySession, buildTabbyBuyerHistory } from '@/lib/tabby';
import { createTamaraSession } from '@/lib/tamara';
import { buildCustomerSitePath } from '@/lib/appUrl';
import { formatPaymentProviderOrderReference } from '@/lib/orderPaymentReference';
import { appendOrderCommunicationLog } from '@/lib/orderCommunicationLog';
import { collectedPaymentLabel } from '@/lib/collectedOrderPayment';
import { logPaymentEvent } from '@/lib/paymentTransactionLog';

function lineItems(order) {
  return (order.orderItems || []).map((item, index) => {
    const product = item.productId && typeof item.productId === 'object' ? item.productId : null;
    const name = item.name || product?.name || 'Product';
    const price = Number(item.price || 0);
    const quantity = Math.max(1, Number(item.quantity || 1));
    return {
      name,
      description: name,
      sku: item.sku || product?.sku || `item-${index + 1}`,
      productId: String(product?._id || item.productId || `item-${index + 1}`),
      quantity,
      unit_price: price,
      price,
      total_amount: Number((price * quantity).toFixed(2)),
    };
  });
}

function customerOf(order) {
  const address = order.shippingAddress || {};
  const name = address.name || order.guestName || 'Customer';
  const parts = String(name).trim().split(/\s+/);
  return {
    name,
    firstName: parts[0] || 'Customer',
    lastName: parts.slice(1).join(' ') || '-',
    email: address.email || order.guestEmail || '',
    phone: address.phone || order.guestPhone || '',
    phoneCode: address.phoneCode || order.alternatePhoneCode || '+971',
    address,
  };
}

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
    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'This order has no amount to charge' }, { status: 400 });
    }

    const customer = customerOf(order);
    const items = lineItems(order);
    const reference = formatPaymentProviderOrderReference(order) || String(order._id);
    const origin = buildCustomerSitePath('');
    let url = '';
    let provider = '';
    let expiresAt = null;
    const set = {
      'paymentLink.createdAt': new Date(),
    };

    if (method === 'card' || method === 'applepay') {
      const scheme = method === 'applepay' ? 'Apple Pay' : 'Card';
      const checkout = await createVaultsPayCheckout({
        amount,
        orderId: String(order._id),
        orderNumber: order.shortOrderNumber || '',
        redirectUrl: buildCustomerSitePath(`/order-success?orderId=${order._id}&vaultspay=1`),
        callbackUrl: buildCustomerSitePath(VAULTSPAY_CALLBACK_PATH),
        method,
        expiryInSeconds: VAULTSPAY_EXPIRY_SECONDS,
        customer,
      });
      url = checkout.url;
      provider = 'VAULTSPAY';
      expiresAt = new Date(Date.now() + VAULTSPAY_EXPIRY_SECONDS * 1000);
      Object.assign(set, {
        vaultsPayTransactionId: checkout.transactionId,
        vaultsPayPaymentStatus: 'pending',
        vaultsPayPaymentUrl: url,
        vaultsPayPaymentUrlExpiresAt: expiresAt,
        paymentScheme: scheme,
      });
    } else if (method === 'tabby') {
      const session = await createTabbySession({
        orderId: reference,
        amount,
        buyer: customer,
        shippingAddress: customer.address,
        items,
        successUrl: buildCustomerSitePath(`/order-success?orderId=${order._id}&tabby=1`),
        cancelUrl: buildCustomerSitePath(`/order-failed?orderId=${order._id}&reason=Tabby%20payment%20cancelled`),
        failureUrl: buildCustomerSitePath(`/order-failed?orderId=${order._id}&reason=Tabby%20payment%20failed`),
        buyerHistory: buildTabbyBuyerHistory(null, 0),
        orderHistory: [],
      });
      url = session.web_url;
      provider = 'TABBY';
      Object.assign(set, { tabbyPaymentId: session.payment_id });
    } else {
      const session = await createTamaraSession({
        orderId: reference,
        amount,
        siteUrl: origin || 'https://www.store1920.com',
        consumer: {
          first_name: customer.firstName,
          last_name: customer.lastName,
          email: customer.email,
          phone_number: customer.phone,
        },
        shippingAddress: {
          first_name: customer.firstName,
          last_name: customer.lastName,
          line1: customer.address.street || customer.address.address || customer.address.line1 || 'UAE',
          city: customer.address.city || 'Dubai',
          country_code: 'AE',
          phone_number: customer.phone,
        },
        items,
        successUrl: buildCustomerSitePath(`/order-success?orderId=${order._id}&tamara=1`),
        failureUrl: buildCustomerSitePath(`/order-failed?orderId=${order._id}&reason=Tamara%20payment%20failed`),
        cancelUrl: buildCustomerSitePath(`/order-failed?orderId=${order._id}&reason=Tamara%20payment%20cancelled`),
        notificationUrl: buildCustomerSitePath('/api/webhooks/tamara'),
        description: `Order ${order.shortOrderNumber || ''}`.trim(),
      });
      url = session.checkout_url;
      provider = 'TAMARA';
      Object.assign(set, { tamaraOrderId: session.tamara_order_id });
    }

    set['paymentLink.provider'] = provider;
    set['paymentLink.url'] = url;
    set['paymentLink.expiresAt'] = expiresAt;

    await Order.updateOne(
      { _id: order._id, storeId: String(storeId), isPaid: { $ne: true } },
      { $set: set },
    );

    const sellerName = decodedToken.name || decodedToken.email || 'Seller';
    const linkLabel = method === 'applepay'
      ? 'Apple Pay'
      : method === 'card'
        ? 'Visa / Mastercard'
        : collectedPaymentLabel(provider);
    await appendOrderCommunicationLog(order._id, {
      channel: 'system',
      template: 'payment_link',
      label: `${linkLabel} payment link created`,
      status: 'sent',
      sentByUid: decodedToken.uid,
      sentByName: sellerName,
      details: url,
    });
    await logPaymentEvent({
      storeId: String(storeId),
      orderId: String(order._id),
      eventType: 'SESSION_CREATED',
      provider,
      providerReference: set.vaultsPayTransactionId || set.tabbyPaymentId || set.tamaraOrderId || '',
      amount,
      status: 'pending',
      actorUserId: decodedToken.uid,
      actorRole: 'seller',
      meta: { source: 'store_payment_link', previousMethod: order.paymentMethod || '' },
    });

    return NextResponse.json({
      success: true,
      provider,
      url,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });
  } catch (error) {
    console.error('[store/orders/payment-link]', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Could not create a payment link.' },
      { status: error?.statusCode && error.statusCode < 500 ? error.statusCode : 502 },
    );
  }
}
