function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeReviewEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getId(value) {
  if (value && typeof value === 'object') {
    return String(value._id || value.id || value).trim();
  }
  return String(value || '').trim();
}

export function orderContainsReviewProduct(order, productId) {
  const expectedId = String(productId || '').trim();
  if (!expectedId) return false;

  const items = [
    ...(Array.isArray(order?.orderItems) ? order.orderItems : []),
    ...(Array.isArray(order?.items) ? order.items : []),
  ];

  return items.some((item) => (
    getId(item?.productId) === expectedId
    || getId(item?.id) === expectedId
  ));
}

export function getOrderReviewIdentity(order) {
  const address = order?.shippingAddress || {};
  return {
    name: String(
      order?.guestName
      || address.name
      || address.fullName
      || address.fullname
      || '',
    ).trim(),
    email: normalizeReviewEmail(
      order?.guestEmail
      || address.email
      || address.Email
      || '',
    ),
  };
}

export function reviewNamesMatch(orderName, submittedName) {
  const expectedName = normalizeText(orderName);
  return !expectedName || expectedName === normalizeText(submittedName);
}
