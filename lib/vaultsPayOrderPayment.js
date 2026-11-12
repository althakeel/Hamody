import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import {
  getVaultsPayTransaction,
  VAULTSPAY_EXPIRY_SECONDS,
  vaultsPayAmountMatches,
} from '@/lib/vaultsPay';
import { recordTrustedOrderPayment } from '@/lib/orderPaymentVerification';
import { markOrderPaymentSucceeded } from '@/lib/deferredOrderFlow';
import { handlePaymentCancellationRecovery } from '@/lib/paymentCancellationRecovery';
import { sendPaidOrderConfirmationNotifications } from '@/lib/orderConfirmationNotifications';
import { recordPurchaseFromOrder } from '@/lib/serverCustomerTracking';
import { sendMetaPurchaseFromOrder } from '@/lib/metaConversionsApi';
import { schemeFromVaultsPay } from '@/lib/paymentScheme';
import { adoptCollectedPaymentMethod } from '@/lib/collectedOrderPayment';
import { sellerPaymentLinkAmount } from '@/lib/sellerPaymentLink';
import {
  getVaultsPayTerminalFailure,
  isVaultsPayUnpaidTimeout,
} from '@/lib/vaultsPayWebhookPolicy';

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
  const canVerifyCard = method === 'VAULTSPAY'
    || linkProvider === 'VAULTSPAY'
    || Boolean(String(order.vaultsPayTransactionId || '').trim());
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
  if (details.status === 'PENDING') {
    const now = new Date();
    const failedOrders = [];
    for (const row of orders) {
      const expiresAt = row.vaultsPayPaymentUrlExpiresAt
        || new Date(new Date(row.createdAt).getTime() + VAULTSPAY_EXPIRY_SECONDS * 1000);
      if (!isVaultsPayUnpaidTimeout(details.providerStatus, expiresAt, now)) continue;

      const failedOrder = await Order.findOneAndUpdate(
        {
          _id: row._id,
          vaultsPayTransactionId: transactionId,
          isPaid: { $ne: true },
          paymentStatus: { $nin: ['PAID', 'paid', 'Paid'] },
          status: { $in: ['AWAITING_PAYMENT', 'PAYMENT_FAILED'] },
        },
        {
          $set: {
            status: 'PAYMENT_FAILED',
            paymentStatus: 'FAILED',
            isPaid: false,
            vaultsPayPaymentStatus: 'expired',
            cancelReason: 'VaultsPay payment remained unpaid beyond the 30-minute checkout window',
          },
        },
        { new: true },
      ).select('shortOrderNumber').lean();
      if (failedOrder) failedOrders.push(failedOrder);
    }

    return failedOrders.length
      ? {
        success: false,
        failed: true,
        expired: true,
        reason: 'payment_expired',
        failedOrderNumbers: failedOrders.map((row) => row.shortOrderNumber).filter(Boolean),
      }
      : { success: false, pending: true };
  }
  const fromCancelRecovery = String(source).startsWith('payment_cancel');
  const terminalFailure = getVaultsPayTerminalFailure(details.status);
  if (terminalFailure) {
    if (fromCancelRecovery) {
      return {
        success: false,
        failed: true,
        expired: terminalFailure.reason === 'payment_expired',
        reason: terminalFailure.reason,
      };
    }
    const keepCod = orders.some((row) => String(row.paymentMethod || '').toUpperCase() === 'COD');
    for (const row of orders) {
      if (isPaidOrder(row)) continue;
      await Order.findByIdAndUpdate(row._id, {
        vaultsPayPaymentStatus: terminalFailure.paymentStatus,
      }).catch(() => {});
      if (keepCod) continue;
      await handlePaymentCancellationRecovery({
        orderId: String(row._id),
        reason: terminalFailure.recoveryReason,
      });
    }
    return {
      success: false,
      failed: true,
      expired: terminalFailure.reason === 'payment_expired',
      reason: terminalFailure.reason,
    };
  }
  if (details.status !== 'SUCCESS') return { success: false, reason: 'payment_not_captured' };
  if (details.currency !== 'AED') return { success: false, reason: 'currency_mismatch' };

  const expected = money(orders.reduce((sum, row) => {
    const linked = sellerPaymentLinkAmount(row, 'VAULTSPAY');
    return sum + (linked != null ? linked : Number(row.total || 0));
  }, 0));
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
      verifiedAmount: sellerPaymentLinkAmount(row, 'VAULTSPAY') ?? money(row.total),
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

export async function expireDueVaultsPayOrders({ limit = 100, now = new Date() } = {}) {
  await dbConnect();
  const current = new Date(now);
  if (!Number.isFinite(current.getTime())) {
    throw new Error('A valid current time is required to expire VaultsPay orders');
  }
  const legacyCutoff = new Date(current.getTime() - VAULTSPAY_EXPIRY_SECONDS * 1000);
  const dueOrders = await Order.find({
    paymentMethod: 'VAULTSPAY',
    status: 'AWAITING_PAYMENT',
    isPaid: { $ne: true },
    paymentStatus: { $nin: ['PAID', 'paid', 'Paid'] },
    vaultsPayTransactionId: { $exists: true, $nin: [null, ''] },
    $or: [
      { vaultsPayPaymentUrlExpiresAt: { $lte: current } },
      {
        vaultsPayPaymentUrlExpiresAt: { $in: [null] },
        createdAt: { $lte: legacyCutoff },
      },
    ],
  })
    .select('_id vaultsPayTransactionId')
    .sort({ vaultsPayPaymentUrlExpiresAt: 1, createdAt: 1 })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 200))
    .lean();

  const ordersByTransaction = new Map();
  for (const order of dueOrders) {
    const transactionId = String(order.vaultsPayTransactionId || '').trim();
    if (transactionId && !ordersByTransaction.has(transactionId)) {
      ordersByTransaction.set(transactionId, String(order._id));
    }
  }

  const summary = {
    scanned: ordersByTransaction.size,
    paid: 0,
    failed: 0,
    pending: 0,
    errors: 0,
  };
  const transactions = [...ordersByTransaction.values()];
  for (let index = 0; index < transactions.length; index += 5) {
    await Promise.all(transactions.slice(index, index + 5).map(async (orderId) => {
      try {
        const result = await verifyVaultsPayOrderPayment(orderId, {
          source: 'vaultspay_expiry_cron',
        });
        if (result?.success || result?.alreadyPaid) summary.paid += 1;
        else if (result?.failed) summary.failed += 1;
        else summary.pending += 1;
      } catch (error) {
        summary.errors += 1;
        console.error('[vaultspay-expiry] transaction verification failed:', orderId, error?.message || error);
      }
    }));
  }
  return summary;
}
