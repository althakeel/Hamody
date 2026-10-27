import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { paymentSchemeLabel } from '@/lib/paymentScheme';
import { verifyVaultsPayOrderPayment } from '@/lib/vaultsPayOrderPayment';

function firstValue(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

async function readWebhookBody(request) {
  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    return Object.fromEntries(new URLSearchParams(text).entries());
  }
  return request.json().catch(() => ({}));
}

export async function handleVaultsPayWebhook(request) {
  const url = new URL(request.url);
  const body = request.method === 'GET' ? {} : await readWebhookBody(request);
  const transactionId = firstValue(
    body?.vpTransactionId,
    body?.transactionId,
    body?.transaction_id,
    body?.paymentId,
    body?.payment_id,
    url.searchParams.get('vpTransactionId'),
    url.searchParams.get('transactionId'),
    url.searchParams.get('paymentId'),
  );
  const orderId = firstValue(
    body?.clientReference,
    body?.orderId,
    body?.order_id,
    url.searchParams.get('orderId'),
    url.searchParams.get('clientReference'),
  );

  if (!transactionId && !orderId) {
    return { received: true };
  }

  await dbConnect();
  let order = null;
  if (transactionId) {
    order = await Order.findOne({ vaultsPayTransactionId: transactionId, deletedAt: null })
      .select('_id')
      .lean();
  }
  if (!order && /^[a-f0-9]{24}$/i.test(orderId)) {
    order = await Order.findOne({
      _id: orderId,
      paymentMethod: 'VAULTSPAY',
      deletedAt: null,
    }).select('_id').lean();
  }
  if (!order && /^\d{3,12}$/.test(orderId)) {
    order = await Order.findOne({
      shortOrderNumber: Number(orderId),
      paymentMethod: 'VAULTSPAY',
      deletedAt: null,
    }).select('_id').lean();
  }

  if (order?._id) {
    await verifyVaultsPayOrderPayment(order._id, { source: 'vaultspay_webhook' });
  }

    await verifyVaultsPayOrderPayment(order._id, {
      source: 'vaultspay_webhook',
      cardBrand,
    });
}
