const fs = require('fs');
const mongoose = require('mongoose');

function loadEnv() {
  const env = {};
  for (const row of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const idx = row.indexOf('=');
    if (idx <= 0 || row.trim().startsWith('#')) continue;
    env[row.slice(0, idx).trim()] = row.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function pick(data) {
  const allow = ['transactionStatus', 'status', 'paymentStatus', 'transactionAmount', 'amount', 'paidAmount', 'currency', 'currencyCode', 'clientReference', 'transactionId', 'paymentId', 'responseMessage', 'message', 'result'];
  const out = {};
  for (const key of allow) {
    if (data && data[key] != null) out[key] = data[key];
  }
  out.keys = data && typeof data === 'object' ? Object.keys(data) : [];
  return out;
}

async function auth(base, env) {
  const res = await fetch(`${base}/external/v1/merchant-auth`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      clientId: env.VAULTSPAY_CLIENT_ID,
      clientSecret: env.VAULTSPAY_CLIENT_SECRET,
      currency: 'AED',
      channel: 'web',
    }),
  });
  const payload = await res.json().catch(() => ({}));
  return { ok: res.ok, code: payload?.code, message: payload?.message || '', token: payload?.data?.access_token || '' };
}

async function details(base, token, transactionId) {
  const res = await fetch(`${base}/external/v1/get-transaction-details`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', accessToken: token },
    body: JSON.stringify({ transactionId }),
  });
  const payload = await res.json().catch(() => ({}));
  return { http: res.status, code: payload?.code, message: payload?.message || '', data: pick(payload?.data) };
}

async function main() {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);
  const order = await mongoose.connection.db.collection('orders').findOne(
    { shortOrderNumber: 619898 },
    { projection: { vaultsPayTransactionId: 1, total: 1, _id: 1 } },
  );
  const transactionId = String(order?.vaultsPayTransactionId || '');
  const bases = ['https://testapi.vaultspay.com', 'https://ext-api.vaultspay.com'];
  const report = [];
  for (const base of bases) {
    const session = await auth(base, env);
    if (!session.token) {
      report.push({ base, auth: session.message || session.code });
      continue;
    }
    report.push({ base, auth: 'ok', details: await details(base, session.token, transactionId) });
  }
  console.log(JSON.stringify({
    orderId: String(order?._id || ''),
    total: order?.total,
    txnSet: Boolean(transactionId),
    report,
  }, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
