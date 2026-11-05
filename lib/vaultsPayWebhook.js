import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { verifyVaultsPayOrderPayment } from '@/lib/vaultsPayOrderPayment';
import { resolveVaultsPayWebhookIdentifiers } from '@/lib/vaultsPayWebhookPolicy';

async function readWebhookBody(request) {
  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    return Object.fromEntries(new URLSearchParams(text).entries());
  }
  return request.json().catch(() => ({}));
}

export async function handleVaultsPayWebhook(request) {
  const body = request.method === 'GET' ? {} : await readWebhookBody(request);
  const { transactionId, orderId } = resolveVaultsPayWebhookIdentifiers({ body, url: request.url });

  if (!transactionId && !orderId) {
    return { received: true, processed: false, reason: 'missing_reference' };
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

  if (!order?._id) {
    return { received: true, processed: false, reason: 'order_not_found' };
  }

  const result = await verifyVaultsPayOrderPayment(order._id, { source: 'vaultspay_webhook' });
  return {
    received: true,
    processed: true,
    success: result?.success === true,
    pending: result?.pending === true,
    reason: result?.reason || '',
  };
}
