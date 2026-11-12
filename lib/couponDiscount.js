/** Money off a merchandise subtotal. A percentage cap is a ceiling, not the discount. */
export function computeCouponDiscount(coupon, subtotal) {
  const base = Math.max(0, Number(subtotal) || 0);
  if (!coupon || base <= 0) return 0;

  const type = String(coupon.discountType || '').toLowerCase();
  const value = Number(coupon.discountValue ?? coupon.discount ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;

  let amount = 0;
  if (type === 'percentage' || type === 'percent') {
    amount = (base * value) / 100;
    const cap = Number(coupon.maxDiscount);
    if (Number.isFinite(cap) && cap > 0) amount = Math.min(amount, cap);
  } else {
    amount = value;
  }

  if (!Number.isFinite(amount) || amount < 0) amount = 0;
  return Number(Math.min(base, amount).toFixed(2));
}
