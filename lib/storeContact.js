export const HAMODY_SUPPORT_EMAIL = 'support@hamody.com';
export const HAMODY_CUSTOMER_SUPPORT_PHONE = '8007861920';
export const HAMODY_CUSTOMER_SUPPORT_TEL = 'tel:8007861920';

export const DEFAULT_NAVBAR_PHONE = {
  number: HAMODY_CUSTOMER_SUPPORT_PHONE,
  shortText: '',
  label: 'Toll-free',
  labelAr: 'مجاني',
};

export function digitsOnlyPhone(value = '') {
  return String(value || '').replace(/\D/g, '');
}

export function formatCustomerSupportPhoneDisplay(phone = HAMODY_CUSTOMER_SUPPORT_PHONE) {
  const digits = digitsOnlyPhone(phone);
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return digits || phone;
}

export function normalizeNavbarPhone(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const hasSaved = Object.keys(source).length > 0;
  const number = digitsOnlyPhone(source.number) || HAMODY_CUSTOMER_SUPPORT_PHONE;
  return {
    number,
    shortText: String(source.shortText ?? '').trim().slice(0, 16),
    label: hasSaved ? String(source.label ?? '').trim() : DEFAULT_NAVBAR_PHONE.label,
    labelAr: hasSaved ? String(source.labelAr ?? '').trim() : DEFAULT_NAVBAR_PHONE.labelAr,
  };
}

export function resolveNavbarPhone(raw = {}, language = 'en') {
  const phone = normalizeNavbarPhone(raw);
  const short = phone.shortText || phone.number.slice(0, 3) || phone.number;
  return {
    ...phone,
    short,
    tel: `tel:${phone.number}`,
    displayLabel: String(language).toLowerCase() === 'ar' ? phone.labelAr : phone.label,
  };
}

export function getAdminOrderNotificationEmails() {
  const raw = [
    process.env.ADMIN_EMAIL,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  ].filter(Boolean).join(',');

  const emails = raw
    .replace(/['"]/g, '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(emails)];
}
