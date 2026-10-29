const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnv(path.join(process.cwd(), '.env'));

const { createVaultsPayCheckout } = await import('./lib/vaultsPay.js');
const result = await createVaultsPayCheckout({
  amount: 1,
  orderId: 'probe-module',
  redirectUrl: 'https://example.com/order-success',
  callbackUrl: 'https://example.com/api/vaultspay/callback',
});
const host = new URL(result.url).host;
console.log(JSON.stringify({
  hasUrl: result.url.startsWith('https://'),
  host,
  hasTransactionId: Boolean(result.transactionId),
}));
