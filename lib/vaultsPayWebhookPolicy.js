function firstValue(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

export function resolveVaultsPayWebhookIdentifiers({ body = {}, url = '' } = {}) {
  const parsedUrl = new URL(url);
  return {
    transactionId: firstValue(
      body?.vpTransactionId,
      body?.transactionId,
      body?.transaction_id,
      body?.paymentId,
      body?.payment_id,
      parsedUrl.searchParams.get('vpTransactionId'),
      parsedUrl.searchParams.get('transactionId'),
      parsedUrl.searchParams.get('paymentId'),
    ),
    orderId: firstValue(
      body?.clientReference,
      body?.orderId,
      body?.order_id,
      parsedUrl.searchParams.get('orderId'),
      parsedUrl.searchParams.get('clientReference'),
    ),
  };
}

export function getVaultsPayTerminalFailure(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'EXPIRED') {
    return {
      paymentStatus: 'expired',
      reason: 'payment_expired',
      recoveryReason: 'Card payment expired',
    };
  }
  if (normalized === 'CANCELLED') {
    return {
      paymentStatus: 'cancelled',
      reason: 'payment_cancelled',
      recoveryReason: 'Card payment was cancelled',
    };
  }
  if (normalized === 'FAILED') {
    return {
      paymentStatus: 'failed',
      reason: 'payment_failed',
      recoveryReason: 'Card payment failed',
    };
  }
  return null;
}

export function isVaultsPayUnpaidTimeout(providerStatus, expiresAt, now = new Date()) {
  const expiry = new Date(expiresAt);
  const current = new Date(now);
  const status = String(providerStatus || '').trim().toUpperCase();
  return (status === 'PENDING' || status.includes('INITIAT'))
    && Number.isFinite(expiry.getTime())
    && Number.isFinite(current.getTime())
    && expiry.getTime() <= current.getTime();
}
