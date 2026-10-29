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

function redact(text, secrets) {
  let out = String(text || '');
  for (const secret of secrets) {
    if (secret && secret.length > 4) out = out.split(secret).join('[redacted]');
  }
  return out.replace(/eyJ[A-Za-z0-9_-]{20,}/g, '[jwt]').slice(0, 500);
}

async function main() {
  const env = loadEnv(path.join(__dirname, '.env'));
  const secrets = [env.VAULTSPAY_CLIENT_ID, env.VAULTSPAY_CLIENT_SECRET];
  const base = 'https://testapi.vaultspay.com';
  const authRes = await fetch(`${base}/external/v1/merchant-auth`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      clientId: env.VAULTSPAY_CLIENT_ID,
      clientSecret: env.VAULTSPAY_CLIENT_SECRET,
      currency: 'AED',
      channel: 'web',
    }),
  });
  const auth = await authRes.json();
  const token = auth?.data?.access_token || '';
  const channelName = auth?.data?.stores?.[0]?.channelName || '';
  console.log(JSON.stringify({ authStatus: authRes.status, hasToken: Boolean(token), channelName }));

  const methodsRes = await fetch(`${base}/external/v1/get-vaultspay-allowed-payment-methods`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', accessToken: token },
    body: JSON.stringify({ currencyCode: 'AED', channelName }),
  });
  const methodsText = await methodsRes.text();
  const methods = JSON.parse(methodsText);
  const codes = (methods?.data || []).map((row) => ({
    code: row.code,
    name: row.name || row.methodName || row.title || '',
  }));
  console.log(JSON.stringify({ methodsStatus: methodsRes.status, codes, message: redact(methods?.message, secrets) }));

  const schemaCodes = (methods?.data || []).map((row) => row.code).filter(Boolean);
  const payRes = await fetch(`${base}/external/v1/initialize-merchant-payment`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', accessToken: token },
    body: JSON.stringify({
      amount: 1,
      currency: 'AED',
      clientReference: 'probe-do-not-pay',
      redirectUrl: 'https://example.com/order-success',
      callBackUrl: 'https://example.com/api/vaultspay/callback',
      expiryInSeconds: 900,
      channelName,
      schemaCode: JSON.stringify(schemaCodes),
    }),
  });
  const payText = await payRes.text();
  let pay;
  try { pay = JSON.parse(payText); } catch { pay = { message: payText }; }
  const paymentUrl = String(pay?.data?.paymentUrl || '');
  let urlHost = '';
  try { urlHost = paymentUrl ? new URL(paymentUrl).host : ''; } catch { urlHost = 'bad-url'; }
  console.log(JSON.stringify({
    payStatus: payRes.status,
    message: redact(pay?.message, secrets),
    dataKeys: pay?.data ? Object.keys(pay.data) : [],
    hasPaymentUrl: Boolean(paymentUrl),
    urlHost,
    hasPaymentId: Boolean(pay?.data?.paymentId),
  }));
}

main().catch((error) => {
  console.error(error.cause?.code || error.message);
  process.exit(1);
});
