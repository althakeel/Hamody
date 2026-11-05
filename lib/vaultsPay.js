const DEFAULT_BASE = 'https://testapi.vaultspay.com';
const LIVE_BASE = 'https://ext-api.vaultspay.com';
export const VAULTSPAY_EXPIRY_SECONDS = 30 * 60;
export const VAULTSPAY_CALLBACK_PATH = '/api/vaultspay/callback';
const PAID_GATEWAY_STATUSES = new Set(['SUCCESS', 'CAPTURED', 'PAID', 'COMPLETED']);
const FAILED_GATEWAY_STATUSES = new Set(['FAILED', 'DECLINED', 'REJECTED']);
const EXPIRED_GATEWAY_STATUSES = new Set(['EXPIRED']);
const CANCELLED_GATEWAY_STATUSES = new Set([
  'CANCELLED',
  'CANCELED',
  'CANCEL',
  'VOID',
  'VOIDED',
  'ABANDONED',
]);

function apiBase() {
  const raw = String(
    process.env.VAULTSPAY_API_BASE
    || process.env.VAULTSPAY_BASE_URL
    || process.env.VAULTSPAY_API_BASE_URL
    || DEFAULT_BASE,
  ).trim().replace(/\/$/, '');
  try {
    const host = new URL(raw).hostname.toLowerCase();
    // api.vaultspay.com does not exist. Calling it is what shows
    // "Card payment is temporarily unavailable" on the live site.
    if (host === 'api.vaultspay.com') return LIVE_BASE;
  } catch {
    return DEFAULT_BASE;
  }
  return raw;
}

function credentials() {
  const clientId = String(process.env.VAULTSPAY_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.VAULTSPAY_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    const error = new Error('Card payment is not configured.');
    error.statusCode = 503;
    throw error;
  }
  return { clientId, clientSecret };
}

function gatewayError(message, statusCode = 502) {
  const raw = String(message || 'Card payment could not be started.');
  const text = /client id or client secret details not found/i.test(raw)
    ? 'VaultsPay does not recognize this merchant login on the live server. The saved client ID belongs to the test account, so a customer payment link cannot be created until the live client ID and secret are saved.'
    : raw;
  const error = new Error(text.slice(0, 240));
  error.statusCode = statusCode;
  return error;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function postVaultsPay(path, { token, json, form } = {}) {
  let response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(json
          ? { 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/x-www-form-urlencoded' }),
        ...(token ? { accessToken: token } : {}),
      },
      body: json ? JSON.stringify(json) : new URLSearchParams(form).toString(),
    });
  } catch (error) {
    console.error('[vaultspay] request failed', apiBase(), error?.cause?.code || error?.message || error);
    throw gatewayError('Card payment is temporarily unavailable. Please try again.');
  }

  const payload = await readJson(response);
  if (!response.ok || (payload?.code && Number(payload.code) >= 400)) {
    throw gatewayError(payload?.message || 'Card payment could not be started.', response.status || 502);
  }
  return payload;
}

async function authenticate() {
  const { clientId, clientSecret } = credentials();
  const fields = {
    clientId,
    clientSecret,
    currency: 'AED',
    channel: String(process.env.VAULTSPAY_CHANNEL || 'web').trim() || 'web',
  };
  let host = '';
  try {
    host = new URL(apiBase()).hostname.toLowerCase();
  } catch {
    host = '';
  }
  // The test host rejects form login. The live host accepts form login.
  const payload = await postVaultsPay('/external/v1/merchant-auth', (
    host === 'testapi.vaultspay.com' ? { json: fields } : { form: fields }
  ));
  const token = String(payload?.data?.access_token || '').trim();
  const channelName = String(payload?.data?.stores?.[0]?.channelName || '').trim();
  if (!token || !channelName) {
    throw gatewayError('Card payment could not be authorized.');
  }
  return { token, channelName };
}

function schemaCodesForCheckout(methods = [], method = 'card') {
  const rows = (Array.isArray(methods) ? methods : []).filter((row) => {
    const name = String(row?.name || row?.methodName || '');
    return row?.code && !/test/i.test(name);
  });
  const nameOf = (row) => String(row.name || row.methodName || '');
  const matchers = {
    card: (name) => /visa|master|card/i.test(name) && !/google|apple/i.test(name),
    googlepay: (name) => /google\s*pay/i.test(name),
    applepay: (name) => /apple\s*pay/i.test(name),
  };
  const requested = Array.isArray(method) ? method : [method];
  const codes = [];
  for (const key of requested) {
    const matcher = matchers[key] || matchers.card;
    const code = rows.find((row) => matcher(nameOf(row)))?.code;
    if (code) codes.push(String(code));
  }
  return [...new Set(codes)];
}

export async function createVaultsPayCheckout({
  amount,
  currency = 'AED',
  orderId,
  orderNumber,
  redirectUrl,
  callbackUrl,
  customer = {},
  method = 'card',
  methods,
  expiryInSeconds = VAULTSPAY_EXPIRY_SECONDS,
} = {}) {
  const charge = Number(amount);
  if (!Number.isFinite(charge) || charge <= 0) {
    throw gatewayError('Card payment amount is invalid.', 400);
  }
  const callback = String(callbackUrl || '').trim();
  try {
    const parsed = new URL(callback);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
  } catch {
    throw gatewayError('A valid VaultsPay callback URL is required.', 400);
  }
  const { token, channelName } = await authenticate();
  const allowed = await postVaultsPay('/external/v1/get-vaultspay-allowed-payment-methods', {
    token,
    json: { currencyCode: currency, channelName },
  });
  const requestedMethods = Array.isArray(methods) && methods.length
    ? methods.filter((item) => ['card', 'googlepay', 'applepay'].includes(item))
    : [['card', 'googlepay', 'applepay'].includes(method) ? method : 'card'];
  const schemaCodes = schemaCodesForCheckout(allowed?.data, requestedMethods);
  if (!schemaCodes.length) {
    const only = requestedMethods.length === 1 ? requestedMethods[0] : '';
    const label = only === 'applepay' ? 'Apple Pay' : only === 'googlepay' ? 'Google Pay' : 'Card payment';
    throw gatewayError(`${label} is not available right now.`);
  }

  const reference = String(orderNumber || orderId || '').trim();
  const customerName = String(customer.name || '').trim().slice(0, 120);
  const customerEmail = String(customer.email || '').trim().slice(0, 180);
  const customerMobile = String(customer.phone || '').trim().slice(0, 30);

  const payload = await postVaultsPay('/external/v1/initialize-merchant-payment', {
    token,
    json: {
      amount: Number(charge.toFixed(2)),
      currency,
      clientReference: reference,
      redirectUrl,
      callBackUrl: callback,
      expiryInSeconds: Math.min(86400, Math.max(60, Math.round(Number(expiryInSeconds) || VAULTSPAY_EXPIRY_SECONDS))),
      channelName,
      schemaCode: JSON.stringify(schemaCodes),
      ...(customerName ? { customerName } : {}),
      ...(customerEmail ? { customerEmail } : {}),
      ...(customerMobile ? { customerMobile } : {}),
    },
  });

  const url = String(payload?.data?.paymentUrl || '').trim();
  const transactionId = String(payload?.data?.paymentId || '').trim();
  if (!url || !transactionId) {
    throw gatewayError('Card payment did not return a payment page.');
  }
  return { url, transactionId };
}

export function readVaultsPayMoney(value) {
  if (value && typeof value === 'object') {
    return {
      amount: Number(value.value),
      currency: String(value.currency || '').trim().toUpperCase(),
    };
  }
  return { amount: Number(value), currency: '' };
}

export function vaultsPayAmountMatches(expected, reported) {
  const expectedAmount = Number(expected);
  const { amount: raw } = readVaultsPayMoney(reported);
  if (!Number.isFinite(expectedAmount) || !Number.isFinite(raw)) return false;
  const major = Number(raw.toFixed(2));
  if (Math.abs(expectedAmount - major) <= 0.01) return true;
  if (Number.isInteger(raw) && raw >= 100) {
    const minor = Number((raw / 100).toFixed(2));
    if (Math.abs(expectedAmount - minor) <= 0.01) return true;
  }
  return false;
}

export function normalizeVaultsPayStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (PAID_GATEWAY_STATUSES.has(normalized)) return 'SUCCESS';
  if (FAILED_GATEWAY_STATUSES.has(normalized)) return 'FAILED';
  if (EXPIRED_GATEWAY_STATUSES.has(normalized)) return 'EXPIRED';
  if (CANCELLED_GATEWAY_STATUSES.has(normalized)) return 'CANCELLED';
  return 'PENDING';
}

export async function getVaultsPayTransaction(transactionId) {
  const id = String(transactionId || '').trim();
  if (!id) throw gatewayError('Card payment reference is missing.', 400);
  const { token } = await authenticate();
  const payload = await postVaultsPay('/external/v1/get-transaction-details', {
    token,
    json: { transactionId: id },
  });
  const data = payload?.data || payload || {};
  const customer = data.customerDetails && typeof data.customerDetails === 'object' ? data.customerDetails : {};
  const card = data.card && typeof data.card === 'object' ? data.card : {};
  const schemeText = (...values) => {
    for (const value of values) {
      const text = String(value || '').trim();
      if (!text || /\d/.test(text)) continue;
      return text.slice(0, 40);
    }
    return '';
  };
  const capture = readVaultsPayMoney(data.captureAmount);
  const transaction = readVaultsPayMoney(data.transactionAmount ?? data.amount ?? data.paidAmount);
  const charged = Number.isFinite(capture.amount) ? capture : transaction;
  const providerStatus = String(data.transactionStatus || data.status || '').trim();
  return {
    status: normalizeVaultsPayStatus(providerStatus),
    providerStatus,
    amount: charged.amount,
    currency: charged.currency || String(data.currency || data.currencyCode || 'AED').trim().toUpperCase(),
    transactionId: String(data.transactionId || '').trim(),
    clientReference: String(data.clientReference || '').trim(),
    cardBrand: schemeText(card.brand, customer.cardBrand, customer.brand, data.cardBrand, data.paymentBrand),
    methodName: schemeText(data.paymentMethodName, data.methodName, data.schemaName, customer.paymentMethod),
  };
}
