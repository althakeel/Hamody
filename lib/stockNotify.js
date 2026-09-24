import {
  cleanPhoneDigits,
  getPhoneValidationMessage,
  isValidPhoneNumber,
  stripEmbeddedCountryCode,
} from './phoneValidation.js';
import { UAE_PHONE_CODE } from '../assets/countryCodes.js';

export function normalizeNotifyEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

export function normalizeNotifyPhone(value = '', phoneCode = UAE_PHONE_CODE) {
  const local = stripEmbeddedCountryCode(cleanPhoneDigits(value), phoneCode);
  if (!local) return '';
  const national = local.startsWith('0') ? local.slice(1) : local;
  return `${phoneCode}${national}`;
}

export function isValidNotifyEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeNotifyEmail(value));
}

export function parseNotifyContact({ email, phone, phoneCode } = {}) {
  const nextEmail = normalizeNotifyEmail(email);
  const code = String(phoneCode || UAE_PHONE_CODE).trim() || UAE_PHONE_CODE;
  const local = cleanPhoneDigits(phone);
  const hasEmail = isValidNotifyEmail(nextEmail);
  const hasPhone = Boolean(local);

  if (!hasEmail && !hasPhone) {
    return { error: 'Enter an email or phone number.' };
  }
  if (nextEmail && !hasEmail) {
    return { error: 'Enter a valid email address.' };
  }
  if (hasPhone && !isValidPhoneNumber(local, code)) {
    return { error: getPhoneValidationMessage(code) };
  }

  const nextPhone = hasPhone ? normalizeNotifyPhone(local, code) : '';

  return {
    email: hasEmail ? nextEmail : '',
    phone: nextPhone,
    contactKey: hasEmail ? `email:${nextEmail}` : `phone:${nextPhone}`,
  };
}

export function toStoreNotifyRequest(doc = {}, product = null) {
  const id = String(doc._id || doc.id || '');
  const image = Array.isArray(product?.images) ? String(product.images[0] || '') : '';
  const slug = String(product?.slug || product?._id || doc.productId || '').trim();
  return {
    id,
    productId: String(doc.productId || ''),
    productName: String(product?.name || doc.productName || ''),
    sku: String(doc.sku || product?.sku || ''),
    email: String(doc.email || ''),
    phone: String(doc.phone || ''),
    status: doc.status === 'notified' ? 'notified' : 'pending',
    createdAt: doc.createdAt || null,
    image,
    productHref: slug ? `/product/${slug}` : '',
    inStock: product ? product.inStock !== false : null,
    stockQuantity: product ? Number(product.stockQuantity || 0) : null,
  };
}
