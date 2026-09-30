const PAYMENT_LIMIT_FIELDS = {
  cod: 'maxCODAmount',
  card: 'maxCardAmount',
  tabby: 'maxTabbyAmount',
  tamara: 'maxTamaraAmount',
  vaultspay: 'maxVaultsPayAmount',
  googlepay: 'maxVaultsPayAmount',
  applepay: 'maxVaultsPayAmount',
};

const PAYMENT_ENABLE_FIELDS = {
  cod: 'enableCOD',
  card: 'enableCard',
  tabby: 'enableTabby',
  tamara: 'enableTamara',
  vaultspay: 'enableVaultsPay',
  googlepay: 'enableVaultsPayGooglePay',
  applepay: 'enableVaultsPayApplePay',
};

const PAYMENT_LIMIT_LABELS = {
  cod: 'Cash on Delivery',
  card: 'Card payment',
  tabby: 'Tabby',
  tamara: 'Tamara',
  vaultspay: 'Card payment',
  googlepay: 'Google Pay',
  applepay: 'Apple Pay',
};

export function normalizeCheckoutPaymentLimitKey(paymentMethod = '') {
  const raw = String(paymentMethod || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'cod' || raw.includes('cash')) return 'cod';
  if (raw === 'tabby') return 'tabby';
  if (raw === 'tamara') return 'tamara';
  if (raw === 'vaultspay' || raw === 'vaults-pay' || raw === 'vaults_pay') return 'vaultspay';
  if (raw === 'googlepay' || raw === 'google-pay' || raw === 'google_pay') return 'googlepay';
  if (raw === 'applepay' || raw === 'apple-pay' || raw === 'apple_pay') return 'applepay';
  if (['card', 'stripe', 'razorpay', 'upi', 'netbanking', 'online', 'prepaid'].includes(raw)) {
    return 'card';
  }
  return '';
}

/** Missing/undefined enable flags default to on (backward compatible). */
export function isPaymentMethodEnabled(shippingSetting, method = '') {
  const key = normalizeCheckoutPaymentLimitKey(method);
  if ((key === 'googlepay' || key === 'applepay') && shippingSetting?.enableVaultsPay === false) {
    return false;
  }
  const field = PAYMENT_ENABLE_FIELDS[key];
  if (!field) return true;
  return shippingSetting?.[field] !== false;
}

export function getPaymentMethodMaxAmount(shippingSetting, method = '') {
  const key = normalizeCheckoutPaymentLimitKey(method);
  const field = PAYMENT_LIMIT_FIELDS[key];
  if (!field) return 0;

  const value = Number(shippingSetting?.[field] || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function isPaymentMethodOverLimit(shippingSetting, method, orderAmount) {
  const maxAmount = getPaymentMethodMaxAmount(shippingSetting, method);
  if (maxAmount <= 0) return false;
  const amount = Number(orderAmount) || 0;
  return amount > maxAmount;
}

export function getPaymentMethodLimitError(
  shippingSetting,
  paymentMethod,
  orderAmount,
  { hasPersonalizedOfferItem = false } = {},
) {
  const key = normalizeCheckoutPaymentLimitKey(paymentMethod);
  if (!key) return null;

  if (key === 'cod') {
    if (hasPersonalizedOfferItem) {
      return 'Cash on Delivery is not available for personalized offer products. Please use online payment.';
    }
  }

  if (!isPaymentMethodEnabled(shippingSetting, key)) {
    const label = PAYMENT_LIMIT_LABELS[key] || 'This payment method';
    return `${label} is not available.`;
  }

  if (!isPaymentMethodOverLimit(shippingSetting, key, orderAmount)) return null;

  const maxAmount = getPaymentMethodMaxAmount(shippingSetting, key);
  const label = PAYMENT_LIMIT_LABELS[key] || 'This payment method';
  return `${label} is not available for orders above AED ${maxAmount}.`;
}
