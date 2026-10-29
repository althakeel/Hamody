const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  const text = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function redact(value, secrets) {
  let text = String(value || '');
  for (const secret of secrets) {
    if (secret && secret.length > 4) text = text.split(secret).join('[redacted]');
  }
  text = text.replace(/eyJ[A-Za-z0-9_-]{20,}/g, '[jwt]');
  text = text.replace(/"(access_token|token|clientSecret|client_secret)"\s*:\s*"[^"]+"/gi, '"$1":"[redacted]"');
  return text.slice(0, 400);
}

async function tryAuth(url, body, contentType, secrets) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': contentType },
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    const token = json?.data?.access_token || json?.access_token || json?.data?.token || '';
    const stores = Array.isArray(json?.data?.stores) ? json.data.stores.length : 0;
    const channel = json?.data?.stores?.[0]?.channelName || '';
    console.log(JSON.stringify({
      url,
      status: res.status,
      hasToken: Boolean(token),
      stores,
      channel,
      message: redact(json?.message || json?.error || text, secrets),
    }));
    return { ok: res.ok && Boolean(token), token, channel, json };
  } catch (error) {
    console.log(JSON.stringify({
      url,
      error: error.name === 'AbortError' ? 'timeout' : (error.cause?.code || error.message),
    }));
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const env = loadEnv(path.join(__dirname, '.env'));
  const clientId = env.VAULTSPAY_CLIENT_ID || '';
  const clientSecret = env.VAULTSPAY_CLIENT_SECRET || '';
  const secrets = [clientId, clientSecret];
  console.log(JSON.stringify({
    hasId: Boolean(clientId),
    idPrefix: clientId.slice(0, 3),
    hasSecret: Boolean(clientSecret),
  }));

  const form = new URLSearchParams({
    clientId,
    clientSecret,
    currency: 'AED',
    channel: 'web',
  }).toString();

  const bases = [
    'https://testapi.vaultspay.com',
    'https://dashboard.vaultspay.com',
  ];
  for (const base of bases) {
    await tryAuth(`${base}/external/v1/merchant-auth`, form, 'application/x-www-form-urlencoded', secrets);
  }

  const jsonBody = JSON.stringify({ clientId, clientSecret, currency: 'AED', channel: 'web' });
  await tryAuth('https://testapi.vaultspay.com/external/v1/merchant-auth', jsonBody, 'application/json', secrets);

  const legacy = new URLSearchParams({ client_id: clientId, client_secret: clientSecret }).toString();
  await tryAuth('https://noor.vaultspay.ae/sdk/access-token', legacy, 'application/x-www-form-urlencoded', secrets);
  await tryAuth('https://noor.vaultspay.ae/sdk/access-token', JSON.stringify({ client_id: clientId, client_secret: clientSecret }), 'application/json', secrets);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
