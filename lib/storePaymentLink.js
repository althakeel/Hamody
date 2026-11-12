import Order from '@/models/Order';
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

function itemsForCharge(order, amount) {
  const items = lineItems(order);
  const sum = items.reduce((total, item) => total + Number(item.total_amount || 0), 0);
  if (items.length && Math.abs(sum - amount) <= 0.01) return items;
  const label = `Payment for order ${order.shortOrderNumber || ''}`.trim();
  return [{
    name: label,
    description: label,
    sku: `order-${order.shortOrderNumber || order._id}`,
    productId: String(order._id),
    quantity: 1,
    unit_price: amount,
    price: amount,
    total_amount: amount,
  }];
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

export async function issueStorePaymentLink({
  storeId,
  order,
  method,
  amount,
  actor = {},
}) {
  const customer = customerOf(order);
  const items = itemsForCharge(order, amount);
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
  set['paymentLink.amount'] = amount;
  set['paymentLink.expiresAt'] = expiresAt;

  await Order.updateOne(
    { _id: order._id, storeId: String(storeId), isPaid: { $ne: true } },
    { $set: set },
  );

  const sellerName = actor.name || actor.email || 'Seller';
  const linkLabel = method === 'applepay'
    ? 'Apple Pay'
    : method === 'card'
      ? 'Visa / Mastercard'
      : collectedPaymentLabel(provider);
  await appendOrderCommunicationLog(order._id, {
    channel: 'system',
    template: 'payment_link',
    label: `${linkLabel} payment link created for AED ${amount.toFixed(2)}`,
    status: 'sent',
    sentByUid: actor.uid || '',
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
    actorUserId: actor.uid || '',
    actorRole: 'seller',
    meta: { source: 'store_payment_link', previousMethod: order.paymentMethod || '' },
  });

  return {
    provider,
    url,
    amount,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    orderId: String(order._id),
    shortOrderNumber: order.shortOrderNumber || null,
  };
}
