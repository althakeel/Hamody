import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GoogleAuth } from 'google-auth-library';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Only load simple keys from .env — service account comes from the JSON file
// so we do not break the private key by parsing the huge inline env JSON.
loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '.env.local'));

function parseSpreadsheetId(value = '') {
  const raw = String(value || '').trim();
  const fromUrl = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return fromUrl?.[1] || raw;
}

function normalizeServiceAccount(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const key = String(parsed.private_key || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();
  if (!parsed.client_email || !key.includes('BEGIN')) return null;
  return {
    ...parsed,
    private_key: key.endsWith('\n') ? key : `${key}\n`,
  };
}

function parseServiceAccountJson(raw) {
  const inline = String(raw || '').trim();
  if (!inline.startsWith('{')) return null;
  try {
    return normalizeServiceAccount(JSON.parse(inline));
  } catch {
    return null;
  }
}

function loadServiceAccountFromFile(pathHint) {
  const candidates = [
    pathHint,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    resolve(process.cwd(), 'firebase-service-account.json'),
    resolve(process.cwd(), 'service-account.json'),
  ].filter(Boolean);

  for (const filePath of candidates) {
    try {
      if (!existsSync(filePath)) continue;
      return normalizeServiceAccount(JSON.parse(readFileSync(filePath, 'utf8')));
    } catch {
      // try next
    }
  }
  return null;
}

function loadSheetsServiceAccount() {
  return (
    loadServiceAccountFromFile(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
    || loadServiceAccountFromFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    || parseServiceAccountJson(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON)
    || parseServiceAccountJson(process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON)
    || parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  );
}

async function getToken(sa) {
  const auth = new GoogleAuth({
    credentials: sa,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  const t = await client.getAccessToken();
  return typeof t === 'string' ? t : t?.token;
}

async function getValues(tok, id, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`${data?.error?.message || res.status} for ${range}`);
  return data.values || [];
}

function a1(tab, range) {
  return `'${String(tab).replace(/'/g, "''")}'!${range}`;
}

const sa = loadSheetsServiceAccount();
if (!sa) {
  console.error('No Google service account found in env');
  process.exit(1);
}

const tok = await getToken(sa);
const now = new Date();

const invId = parseSpreadsheetId(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '');
const invTab = String(process.env.GOOGLE_SHEETS_TAB || 'Inventory').trim() || 'Inventory';

console.log('=== INVENTORY SHEET ===');
console.log({
  spreadsheetId: invId,
  tab: invTab,
  url: invId ? `https://docs.google.com/spreadsheets/d/${invId}/edit` : '',
  clientEmail: sa.client_email,
  checkedAt: now.toISOString(),
});

if (!invId) {
  console.log('GOOGLE_SHEETS_SPREADSHEET_ID missing');
} else {
  try {
    const rows = await getValues(tok, invId, a1(invTab, 'A1:H6'));
    console.log('Title row:', rows[0]?.[0] || '(empty)');
    console.log('Headers:', (rows[1] || []).join(' | '));
    console.log('Sample rows:');
    for (const r of rows.slice(2, 6)) {
      console.log(`  ${r?.[0]} | stock ${r?.[2]} | synced ${r?.[7]}`);
    }
    const syncCol = await getValues(tok, invId, a1(invTab, 'H3:H'));
    const syncTimes = syncCol.map((r) => r?.[0]).filter(Boolean);
    const unique = [...new Set(syncTimes)].sort();
    const latest = unique.at(-1) || null;
    console.log('Data rows:', syncTimes.length);
    console.log('Synced at (unique):', unique);
    console.log('Latest Synced at (UTC):', latest || '(none)');
    if (latest) {
      const ageMs = now.getTime() - new Date(latest.replace(' ', 'T') + 'Z').getTime();
      const ageMin = Math.round(ageMs / 60000);
      console.log('Age:', Number.isFinite(ageMin) ? `${ageMin} minutes` : 'unknown');
      console.log('Status:', ageMin <= 60 ? 'UPDATED (within last hour)' : ageMin <= 24 * 60 ? 'UPDATED earlier today / recent' : 'STALE — may need Sync');
    }
  } catch (e) {
    console.error('Inventory read failed:', e.message);
  }
}

const ordId = String(process.env.GOOGLE_SHEETS_ORDERS_SPREADSHEET_ID || '').trim();
const dash = String(process.env.GOOGLE_SHEETS_ORDERS_DASHBOARD_TAB || 'Summary').trim() || 'Summary';

console.log('\n=== ORDERS SHEET ===');
console.log({
  spreadsheetId: ordId,
  dashboardTab: dash,
  url: ordId ? `https://docs.google.com/spreadsheets/d/${ordId}/edit` : '',
});

if (ordId) {
  try {
    const summary = await getValues(tok, ordId, a1(dash, 'A1:B15'));
    console.log('Summary preview:');
    summary.forEach((r) => console.log(' ', (r || []).join(' | ')));
  } catch (e) {
    console.error('Orders summary read failed:', e.message);
  }
}
