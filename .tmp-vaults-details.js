const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function summarize(value, depth = 0) {
  if (value == null || depth > 3) return typeof value;
  if (Array.isArray(value)) return value.slice(0, 3).map((item) => summarize(item, depth + 1));
  if (typeof value !== 'object') return typeof value === 'string' ? `str:${value.slice(0, 40)}` : value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (/card|email|phone|name|token|secret|pan|cvv/i.test(key)) {
      out[key] = '[hidden]';
      continue;
    }
    out[key] = summarize(child, depth + 1);
  }
  return out;
}

async function main() {
  const env = loadEnv(path.join(__dirname, '.env'));
  const base = 'https://testapi.vaultspay.com';
  const authRes = await fetch(`${base}/external/v1/merchant-auth`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: env.VAULTSPAY_CLIENT_ID,
      clientSecret: env.VAULTSPAY_CLIENT_SECRET,
      currency: 'AED',
      channel: 'web',
    }),
  });
  const auth = await authRes.json();
  const token = auth.data.access_token;
  const payRes = await fetch(`${base}/external/v1/initialize-merchant-payment`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', accessToken: token },
    body: JSON.stringify({
      amount: 1,
      currency: 'AED',
      clientReference: 'probe-details',
      redirectUrl: 'https://example.com/order-success',
      callBackUrl: 'https://example.com/api/vaultspay/callback',
      expiryInSeconds: 900,
      channelName: 'web',
      schemaCode: JSON.stringify(['SCM_01']),
    }),
  });
  const pay = await payRes.json();
  const paymentId = pay?.data?.paymentId || '';
  const detailsRes = await fetch(`${base}/external/v1/get-transaction-details`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', accessToken: token },
    body: JSON.stringify({ transactionId: paymentId }),
  });
  const details = await detailsRes.json();
  console.log(JSON.stringify({
    detailsStatus: detailsRes.status,
    message: details?.message,
    shape: summarize(details),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.cause?.code || error.message);
  process.exit(1);
});
