const DEFAULT_BASE = 'https://testapi.vaultspay.com';
const LIVE_BASE = 'https://ext-api.vaultspay.com';
const PAID_GATEWAY_STATUSES = new Set(['SUCCESS', 'CAPTURED', 'PAID']);
const FAILED_GATEWAY_STATUSES = new Set(['FAILED', 'DECLINED', 'REJECTED']);
const CANCELLED_GATEWAY_STATUSES = new Set([
  'CANCELLED',
  'CANCELED',
  'CANCEL',
  'EXPIRED',
  'VOID',
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
  const error = new Error(String(message || 'Card payment could not be started.').slice(0, 180));
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
  const payload = await postVaultsPay('/external/v1/merchant-auth', {
    form: {
      clientId,
      clientSecret,
      currency: 'AED',
      channel: String(process.env.VAULTSPAY_CHANNEL || 'web').trim() || 'web',
    },
  });
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
  const matcher = matchers[method] || matchers.card;
  const code = rows.find((row) => matcher(nameOf(row)))?.code;
  return code ? [String(code)] : [];
}

export async function createVaultsPayCheckout({
  amount,
  currency = 'AED',
  orderId,
  redirectUrl,
  callbackUrl,
  customer = {},
  method = 'card',
} = {}) {
  const charge = Number(amount);
  if (!Number.isFinite(charge) || charge <= 0) {
    throw gatewayError('Card payment amount is invalid.', 400);
  }
  const { token, channelName } = await authenticate();
  const methods = await postVaultsPay('/external/v1/get-vaultspay-allowed-payment-methods', {
    token,
    json: { currencyCode: currency, channelName },
  });
  const walletMethod = ['card', 'googlepay', 'applepay'].includes(method) ? method : 'card';
  const schemaCodes = schemaCodesForCheckout(methods?.data, walletMethod);
  if (!schemaCodes.length) {
    const label = walletMethod === 'googlepay' ? 'Google Pay' : walletMethod === 'applepay' ? 'Apple Pay' : 'Card payment';
    throw gatewayError(`${label} is not available right now.`);
  }

  const payload = await postVaultsPay('/external/v1/initialize-merchant-payment', {
    token,
    json: {
      amount: Number(charge.toFixed(2)),
      currency,
      clientReference: String(orderId || ''),
      redirectUrl,
      callBackUrl: callbackUrl,
      expiryInSeconds: 900,
      channelName,
      schemaCode: JSON.stringify(schemaCodes),
      ...(customer.email ? { customerEmail: String(customer.email) } : {}),
      ...(customer.phone ? { customerMobile: String(customer.phone) } : {}),
    },
  });

  const url = String(payload?.data?.paymentUrl || '').trim();
  const transactionId = String(payload?.data?.paymentId || '').trim();
  if (!url || !transactionId) {
    throw gatewayError('Card payment did not return a payment page.');
  }
  return { url, transactionId };
}

function normalizeGatewayStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (PAID_GATEWAY_STATUSES.has(normalized)) return 'SUCCESS';
  if (FAILED_GATEWAY_STATUSES.has(normalized)) return 'FAILED';
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
  const data = payload?.data || {};
  return {
    status: normalizeGatewayStatus(data.transactionStatus || data.status),
    amount: Number(data.transactionAmount),
    currency: String(data.currency || '').trim().toUpperCase(),
    transactionId: String(data.transactionId || '').trim(),
    clientReference: String(data.clientReference || '').trim(),
  };
}
