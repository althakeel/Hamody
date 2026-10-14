export const CUSTOMER_PICKUP_METHOD = 'customer_pickup';

export const CUSTOMER_PICKUP_SCOPES = ['all', 'include', 'exclude'];

function normalizeSku(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeCustomerPickupSkus(values) {
  const source = Array.isArray(values)
    ? values
    : String(values || '').split(/[\s,;]+/);
  const seen = new Set();
  const skus = [];
  source.forEach((value) => {
    const sku = normalizeSku(value);
    if (!sku || seen.has(sku) || skus.length >= 400) return;
    seen.add(sku);
    skus.push(sku);
  });
  return skus;
}

export function normalizeCustomerPickupRule(store = {}) {
  const rawScope = store?.customerPickupScope ?? store?.scope;
  const scope = CUSTOMER_PICKUP_SCOPES.includes(rawScope) ? rawScope : 'all';
  const enabled = store?.enabled !== undefined
    ? store.enabled !== false
    : store?.customerPickupEnabled !== false;
  return {
    enabled,
    scope,
    skus: normalizeCustomerPickupSkus(store?.customerPickupSkus ?? store?.skus),
  };
}

function lineSkuSet(line = {}) {
  return [line.sku, line.variantSku]
    .map(normalizeSku)
    .filter(Boolean);
}

/** Pickup is one choice for the whole cart. Every line must be allowed. */
export function isCustomerPickupAllowedForLines(rule, lines = []) {
  const normalized = normalizeCustomerPickupRule(rule);
  if (!normalized.enabled) return false;
  if (normalized.scope === 'all') return true;

  const listed = new Set(normalized.skus);
  const groups = (Array.isArray(lines) ? lines : []).map(lineSkuSet);

  if (normalized.scope === 'include') {
    if (!listed.size || !groups.length) return false;
    return groups.every((skus) => skus.some((sku) => listed.has(sku)));
  }

  return groups.every((skus) => skus.length === 0 || skus.every((sku) => !listed.has(sku)));
}

export const CUSTOMER_PICKUP_ADDRESS = {
  line: '18 Maleha St - Warehouses Land - Industrial Area - Sharjah',
  street: '18 Maleha St',
  area: 'Warehouses Land',
  district: 'Industrial Area',
  city: 'Sharjah',
  state: 'Sharjah',
  country: 'United Arab Emirates',
};

export function isCustomerPickupOrder(order = {}) {
  return order?.customerPickup === true
    || String(order?.fulfillmentMode || '') === CUSTOMER_PICKUP_METHOD
    || String(order?.shippingMethod || '') === CUSTOMER_PICKUP_METHOD;
}

export function customerPickupMapQuery() {
  return encodeURIComponent(CUSTOMER_PICKUP_ADDRESS.line);
}

export function customerPickupMapEmbedUrl() {
  return `https://maps.google.com/maps?q=${customerPickupMapQuery()}&hl=en&z=16&output=embed`;
}

export function customerPickupMapLink() {
  return `https://www.google.com/maps/search/?api=1&query=${customerPickupMapQuery()}`;
}

export function customerPickupLocationFields() {
  return {
    street: CUSTOMER_PICKUP_ADDRESS.street,
    city: CUSTOMER_PICKUP_ADDRESS.city,
    state: CUSTOMER_PICKUP_ADDRESS.state,
    district: CUSTOMER_PICKUP_ADDRESS.district,
    country: CUSTOMER_PICKUP_ADDRESS.country,
    zip: '',
    pincode: '',
    pickupLocation: CUSTOMER_PICKUP_ADDRESS.line,
  };
}

export function buildCustomerPickupShippingAddress(contact = {}) {
  return {
    name: String(contact.name || '').trim(),
    email: String(contact.email || '').trim(),
    phone: String(contact.phone || '').replace(/\D/g, ''),
    phoneCode: contact.phoneCode || '+971',
    alternatePhone: contact.alternatePhone || '',
    alternatePhoneCode: contact.alternatePhoneCode || '',
    ...customerPickupLocationFields(),
  };
}

export function customerPickupEmailBanner() {
  return `<div style="margin:0 0 20px;padding:16px 18px;border:2px solid #b45309;background:#fffbeb;">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#92400e;font-weight:700;">Customer pickup chosen</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#111111;">Collect from<br><strong>${CUSTOMER_PICKUP_ADDRESS.line}</strong></p>
  </div>`;
}
