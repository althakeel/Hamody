import { readAppClientSource } from './appClientSource';

export function normalizeAppDiscount(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const type = source.appDiscountType === 'amount' || source.type === 'amount' ? 'amount' : 'percent';
  const raw = Number(source.appDiscountValue ?? source.value);
  const value = Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) / 100 : 0;
  const enabled = (source.appDiscountEnabled === true || source.enabled === true) && value > 0;
  return {
    appDiscountEnabled: enabled,
    appDiscountType: type,
    appDiscountValue: type === 'percent' ? Math.min(100, value) : value,
  };
}

export function applyAppProductDiscount(salePrice, product = {}) {
  const price = Number(salePrice);
  if (!Number.isFinite(price) || price <= 0) return price;
  const discount = normalizeAppDiscount(product);
  if (!discount.appDiscountEnabled) return price;
  const next = discount.appDiscountType === 'percent'
    ? price * (1 - discount.appDiscountValue / 100)
    : price - discount.appDiscountValue;
  const rounded = Math.max(0, Math.round(next * 100) / 100);
  return rounded < price ? rounded : price;
}

export function isAppCheckoutRequest(request) {
  return readAppClientSource(request).clientChannel === 'app';
}
