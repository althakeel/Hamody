const SCHEME_LABELS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  master: 'Mastercard',
  amex: 'Amex',
  americanexpress: 'Amex',
  mada: 'mada',
  applepay: 'Apple Pay',
  googlepay: 'Google Pay',
  card: 'Card',
  tabby: 'Tabby',
  tamara: 'Tamara',
  cod: 'COD',
};

function compactKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Short scheme name only. A card number is never a valid label. */
export function paymentSchemeLabel(value) {
  const key = compactKey(value);
  if (!key || /\d/.test(key)) return '';
  const compact = key.replace(/\s+/g, '');
  return SCHEME_LABELS[key] || SCHEME_LABELS[compact] || '';
}

export function schemeFromVaultsPay({ walletMethod, cardBrand, methodName } = {}) {
  const hints = [methodName, walletMethod, cardBrand].map(paymentSchemeLabel).filter(Boolean);
  const wallet = hints.find((label) => label === 'Apple Pay' || label === 'Google Pay');
  if (wallet) return wallet;
  const brand = hints.find((label) => label !== 'Card');
  return brand || 'Card';
}
