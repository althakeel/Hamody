function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanHex(value, fallback) {
  const raw = String(value || '').trim();
  const match = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return fallback;
  if (match[1].length === 3) {
    const [r, g, b] = match[1];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return `#${match[1].toLowerCase()}`;
}

function cleanText(value, max, fallback = '') {
  const text = String(value ?? fallback).trim().slice(0, max);
  return text || fallback;
}

export function defaultCouponBanner() {
  return {
    enabled: true,
    couponId: '',
    couponCode: '',
    title: 'Grab your coupon',
    subtitle: 'Stack savings on your favourites',
    titleFont: 'inherit',
    titleSizePx: 18,
    subtitleFont: 'inherit',
    subtitleSizePx: 12,
    titleColor: '#ffffff',
    subtitleColor: '#ddd4f7',
    backgroundColor: '#2a1868',
    cardBackground: '#ffffff',
    codeText: '',
    codeFont: 'inherit',
    codeSizePx: 11,
    codePaddingX: 10,
    codePaddingY: 3,
    codeRadiusPx: 8,
    codeBackground: '#5b46e8',
    codeColor: '#ffffff',
    offerText: '',
    offerColor: '#1e1b4b',
    minOrderText: '',
    minOrderColor: '#94a3b8',
    action: 'copy',
    radiusPx: 16,
  };
}

export function normalizeCouponBanner(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const base = defaultCouponBanner();
  return {
    enabled: source.enabled !== false,
    couponId: String(source.couponId || '').trim().slice(0, 40),
    couponCode: String(source.couponCode || '').trim().toUpperCase().slice(0, 32),
    title: cleanText(source.title, 48, base.title),
    subtitle: cleanText(source.subtitle, 90, ''),
    titleFont: ['inherit', 'poppins', 'montserrat', 'arial', 'georgia'].includes(source.titleFont) ? source.titleFont : base.titleFont,
    titleSizePx: clampInt(source.titleSizePx, 12, 36, base.titleSizePx),
    subtitleFont: ['inherit', 'poppins', 'montserrat', 'arial', 'georgia'].includes(source.subtitleFont) ? source.subtitleFont : base.subtitleFont,
    subtitleSizePx: clampInt(source.subtitleSizePx, 10, 24, base.subtitleSizePx),
    titleColor: cleanHex(source.titleColor, base.titleColor),
    subtitleColor: cleanHex(source.subtitleColor, base.subtitleColor),
    backgroundColor: cleanHex(source.backgroundColor, base.backgroundColor),
    cardBackground: cleanHex(source.cardBackground, base.cardBackground),
    codeText: cleanText(source.codeText, 24, ''),
    codeFont: ['inherit', 'poppins', 'montserrat', 'arial', 'georgia'].includes(source.codeFont) ? source.codeFont : base.codeFont,
    codeSizePx: clampInt(source.codeSizePx, 8, 22, base.codeSizePx),
    codePaddingX: clampInt(source.codePaddingX, 0, 32, base.codePaddingX),
    codePaddingY: clampInt(source.codePaddingY, 0, 20, base.codePaddingY),
    codeRadiusPx: clampInt(source.codeRadiusPx, 0, 24, base.codeRadiusPx),
    codeBackground: cleanHex(source.codeBackground, base.codeBackground),
    codeColor: cleanHex(source.codeColor, base.codeColor),
    offerText: cleanText(source.offerText, 24, ''),
    offerColor: cleanHex(source.offerColor, base.offerColor),
    minOrderText: cleanText(source.minOrderText, 40, ''),
    minOrderColor: cleanHex(source.minOrderColor, base.minOrderColor),
    action: 'copy',
    radiusPx: clampInt(source.radiusPx, 0, 32, base.radiusPx),
  };
}

export function toPublicCouponBanner(input = {}) {
  const section = normalizeCouponBanner(input);
  if (!section.enabled) return { enabled: false };
  const copyCode = section.codeText || section.couponCode;
  return {
    ...section,
    action: 'copy',
    copyCode,
  };
}

export function couponOfferLabel(coupon = {}) {
  const value = Number(coupon.discountValue ?? coupon.discount);
  if (coupon.discountType === 'percentage' && Number.isFinite(value)) return `${value}% OFF`;
  if (coupon.discountType === 'fixed' && Number.isFinite(value)) return `${value} OFF`;
  return String(coupon.title || '').trim().slice(0, 24);
}

export function couponMinOrderLabel(coupon = {}) {
  const min = Number(coupon.minOrderValue ?? coupon.minPrice ?? 0);
  if (!Number.isFinite(min) || min <= 0) return '';
  return `Min. Order ${min}`;
}
