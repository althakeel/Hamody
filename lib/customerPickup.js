export const CUSTOMER_PICKUP_METHOD = 'customer_pickup';

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
