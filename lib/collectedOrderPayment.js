import Order from '@/models/Order';
import { appendOrderCommunicationLog } from '@/lib/orderCommunicationLog';

const PROVIDER_LABELS = {
  VAULTSPAY: 'Card',
  TABBY: 'Tabby',
  TAMARA: 'Tamara',
};

export function collectedPaymentLabel(provider) {
  return PROVIDER_LABELS[String(provider || '').toUpperCase()] || 'Payment';
}

/** When a COD order is collected online, switch it to that method and keep a history line. */
export async function adoptCollectedPaymentMethod(orderId, provider) {
  const method = String(provider || '').trim().toUpperCase();
  if (!orderId || !PROVIDER_LABELS[method]) return;

  const order = await Order.findById(orderId).select('paymentMethod paymentScheme shortOrderNumber').lean();
  if (!order) return;
  const previous = String(order.paymentMethod || '').trim().toUpperCase();
  if (previous === method) return;

  const scheme = String(order.paymentScheme || '').trim();
  const label = method === 'VAULTSPAY' && scheme && scheme !== 'Card' ? scheme : collectedPaymentLabel(method);

  await Order.findByIdAndUpdate(orderId, { paymentMethod: method });
  if (previous === 'COD' || previous === 'CASH_ON_DELIVERY') {
    await appendOrderCommunicationLog(orderId, {
      channel: 'system',
      template: 'payment_collected',
      label: `Paid with ${label}`,
      status: 'sent',
      sentByName: 'System',
      details: `This order was cash on delivery. The customer paid with ${label}, so it is now paid.`,
    });
  }
}
