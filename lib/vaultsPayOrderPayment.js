import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { getVaultsPayTransaction, vaultsPayAmountMatches } from '@/lib/vaultsPay';
import { recordTrustedOrderPayment } from '@/lib/orderPaymentVerification';
import { markOrderPaymentSucceeded } from '@/lib/deferredOrderFlow';
import { handlePaymentCancellationRecovery } from '@/lib/paymentCancellationRecovery';
import { sendPaidOrderConfirmationNotifications } from '@/lib/orderConfirmationNotifications';
import { recordPurchaseFromOrder } from '@/lib/serverCustomerTracking';
import { sendMetaPurchaseFromOrder } from '@/lib/metaConversionsApi';
import { schemeFromVaultsPay } from '@/lib/paymentScheme';
import { adoptCollectedPaymentMethod } from '@/lib/collectedOrderPayment';

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : NaN;
}

function isPaidOrder(order) {
  return order?.isPaid === true || String(order?.paymentStatus || '').toUpperCase() === 'PAID';
}

async function runPaidSideEffects(order, source) {
  try {
    await recordPurchaseFromOrder({
      order,
      trackingContext: order.trackingContext || {},
      attribution: order.attribution || {},
      userId: order.userId || null,
      isGuest: Boolean(order.isGuest),
      source,
    });
  } catch (error) {
    console.error('[vaultspay] purchase tracking failed:', order?._id, error?.message || error);
  }
  try {
    await sendPaidOrderConfirmationNotifications(order._id);
  } catch (error) {
    console.error('[vaultspay] confirmation failed:', order?._id, error?.message || error);
  }
  try {
    await sendMetaPurchaseFromOrder(order, { paymentMethod: 'VAULTSPAY' });
  } catch (error) {
    console.error('[vaultspay] purchase event failed:', order?._id, error?.message || error);
  }
}

export async function verifyVaultsPayOrderPayment(orderId, { source = 'vaultspay_verify', cardBrand = '' } = {}) {
  const normalizedOrderId = String(orderId || '').trim();
  if (!normalizedOrderId) return { success: false, reason: 'missing_order_id' };

  await dbConnect();
  const order = await Order.findById(normalizedOrderId).lean();
  if (!order || order.deletedAt) return { success: false, reason: 'order_not_found' };
  const method = String(order.paymentMethod || '').toUpperCase();
  const linkProvider = String(order.paymentLink?.provider || '').toUpperCase();
  const canVerifyCard = method === 'VAULTSPAY' || linkProvider === 'VAULTSPAY';
  if (!canVerifyCard) {
    return { success: false, reason: 'not_card_payment' };
  }

  const transactionId = String(order.vaultsPayTransactionId || '').trim();
  if (!transactionId) return { success: false, reason: 'missing_transaction' };

  const group = await Order.find({
    vaultsPayTransactionId: transactionId,
    deletedAt: null,
  }).lean();
  const orders = group.length ? group : [order];
  if (orders.every(isPaidOrder)) return { success: true, alreadyPaid: true };

  let details = await getVaultsPayTransaction(transactionId);
  if (details.status === 'PENDING' && source === 'vaultspay_return') {
    for (let attempt = 0; attempt < 4 && details.status === 'PENDING'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      details = await getVaultsPayTransaction(transactionId);
    }
  }
  if (details.status === 'PENDING') return { success: false, pending: true };
  const fromCancelRecovery = String(source).startsWith('payment_cancel');
  if (details.status === 'FAILED' || details.status === 'CANCELLED') {
    if (fromCancelRecovery) {
      return {
        success: false,
        failed: true,
        reason: details.status === 'CANCELLED' ? 'payment_cancelled' : 'payment_failed',
      };
    }
    const cancelled = details.status === 'CANCELLED';
    const keepCod = orders.some((row) => String(row.paymentMethod || '').toUpperCase() === 'COD');
    for (const row of orders) {
      if (isPaidOrder(row)) continue;
      await Order.findByIdAndUpdate(row._id, {
        vaultsPayPaymentStatus: cancelled ? 'cancelled' : 'failed',
      }).catch(() => {});
      if (keepCod) continue;
      await handlePaymentCancellationRecovery({
        orderId: String(row._id),
        reason: cancelled ? 'Card payment was cancelled' : 'Card payment failed',
      });
    }
    return {
      success: false,
      failed: true,
      reason: cancelled ? 'payment_cancelled' : 'payment_failed',
    };
  }
  if (details.status !== 'SUCCESS') return { success: false, reason: 'payment_not_captured' };
  if (details.currency !== 'AED') return { success: false, reason: 'currency_mismatch' };

  const expected = money(orders.reduce((sum, row) => sum + Number(row.total || 0), 0));
  if (!vaultsPayAmountMatches(expected, details.amount)) {
    return { success: false, reason: 'amount_mismatch' };
  }

  const reference = String(details.clientReference || '').trim();
  if (reference) {
    const allowed = new Set(
      orders.flatMap((row) => [String(row._id), String(row.shortOrderNumber || '')].filter(Boolean)),
    );
    if (!allowed.has(reference)) return { success: false, reason: 'reference_mismatch' };
  }

  for (const row of orders) {
    const wasPaid = isPaidOrder(row);
    // Card orders stay AWAITING_PAYMENT until VaultsPay confirms them.
    // Trusted proof only accepts ORDER_PLACED, so place the order first.
    const placed = await markOrderPaymentSucceeded(String(row._id), { paymentStatus: 'PAID' });
    if (!placed) {
      return { success: false, pending: true, reason: 'order_not_ready' };
    }
    const proof = await recordTrustedOrderPayment(String(row._id), {
      provider: 'VAULTSPAY',
      providerReference: transactionId,
      source,
      verifiedAmount: money(row.total),
      currency: 'AED',
      allowUnenrolledWithoutAutoShipment: true,
    });
    if (proof?.verified !== true) {
      return { success: false, reason: proof?.reason || 'proof_failed' };
    }
    const paymentScheme = schemeFromVaultsPay({
      walletMethod: row.paymentScheme,
      cardBrand: details.cardBrand || cardBrand,
      methodName: details.methodName,
    });
    await Order.findByIdAndUpdate(row._id, {
      vaultsPayPaymentStatus: 'paid',
      ...(paymentScheme ? { paymentScheme } : {}),
    }).catch(() => {});
    await adoptCollectedPaymentMethod(row._id, 'VAULTSPAY');
    if (!wasPaid) {
      const paidOrder = proof.order || row;
      await runPaidSideEffects(paidOrder, source);
    }
  }

  return { success: true, paymentVerified: true };
}
