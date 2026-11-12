const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

/** Seller-typed amount for a shareable card or Tabby link. */
export function parseSellerPaymentAmount(value) {
  if (value == null || value === '') return null;
  const amount = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(amount)) return null;
  const rounded = Number(amount.toFixed(2));
  if (rounded < MIN_AMOUNT || rounded > MAX_AMOUNT) return null;
  return rounded;
}

/** Amount stored on the order when this provider link was created. */
export function sellerPaymentLinkAmount(order, provider) {
  const link = order?.paymentLink || {};
  const amount = Number(link.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const expectedProvider = String(provider || '').trim().toUpperCase();
  const linkProvider = String(link.provider || '').trim().toUpperCase();
  if (expectedProvider && linkProvider !== expectedProvider) return null;
  return Number(amount.toFixed(2));
}
