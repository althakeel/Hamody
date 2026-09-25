import crypto from 'crypto';
import {
  extractProductQuery,
  isWebsiteHelpQuestion,
  normalizeHelpQuestion,
  wantsCustomerLookup,
  wantsCustomerListExport,
  wantsPeriodSalesLookup,
  wantsProductSalesLookup,
} from './storeHelpAgentFacts.js';
import { isHelpHowToQuestion } from './storeHelpPages.js';

export const HELP_ADMIN_UNLOCK_COOKIE = 'store_help_admin';
export const HELP_ADMIN_PIN_PROMPT =
  'Enter the PIN to see sales and customer details. Any store account can use this PIN.';
export const HELP_ADMIN_PIN_WRONG = 'That PIN is not correct. Enter the PIN to continue.';

const UNLOCK_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export function getHelpAdminPin() {
  return String(process.env.STORE_HELP_ADMIN_PIN || '743362').trim();
}

function getUnlockSecret() {
  return (
    process.env.STORE_HELP_UNLOCK_SECRET
    || process.env.NEXTAUTH_SECRET
    || process.env.JWT_SECRET
    || getHelpAdminPin()
  );
}

export const AI_BULK_PIN_SCOPE = 'ai-bulk-edit';
export const AI_BULK_PIN_PROMPT = 'Enter the admin PIN to start AI bulk edit.';
export const AI_BULK_PIN_WRONG = 'That PIN is not correct. Contact IT TEAM if you need help.';

export function isHelpAdminPin(pin = '') {
  const expected = getHelpAdminPin();
  const given = String(pin || '').trim();
  if (!given || given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function createScopedPinToken(scope = 'help-admin', maxAgeMs = UNLOCK_MAX_AGE_MS) {
  const exp = Date.now() + Number(maxAgeMs || UNLOCK_MAX_AGE_MS);
  const payload = Buffer.from(JSON.stringify({ exp, scope: String(scope || '') }), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', getUnlockSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function createHelpAdminUnlockToken() {
  return createScopedPinToken('help-admin', UNLOCK_MAX_AGE_MS);
}

export function isValidScopedPinToken(token = '', scope = 'help-admin') {
  const raw = String(token || '').trim();
  const parts = raw.split('.');
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const expected = crypto.createHmac('sha256', getUnlockSecret()).update(payload).digest('base64url');
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Number(parsed?.exp || 0) <= Date.now()) return false;
    return String(parsed?.scope || 'help-admin') === String(scope || '');
  } catch {
    return false;
  }
}

export function isValidHelpAdminUnlockToken(token = '') {
  return isValidScopedPinToken(token, 'help-admin');
}

export function assertAiBulkEditPin({ pin = '', token = '' } = {}) {
  if (isValidScopedPinToken(token, AI_BULK_PIN_SCOPE)) {
    return { ok: true, token: String(token).trim() };
  }
  if (isHelpAdminPin(pin)) {
    return { ok: true, token: createScopedPinToken(AI_BULK_PIN_SCOPE, 30 * 60 * 1000) };
  }
  return {
    ok: false,
    error: String(pin || '').trim() ? AI_BULK_PIN_WRONG : AI_BULK_PIN_PROMPT,
  };
}

export function wantsSuperAdminHelpDetails(question = '') {
  const text = String(question || '').trim();
  if (!text) return false;
  if (isWebsiteHelpQuestion(text)) return false;
  if (wantsCustomerLookup(text) || wantsCustomerListExport(text)) return true;

  const terms = extractProductQuery(text);
  if (wantsPeriodSalesLookup(text, terms) || wantsProductSalesLookup(text, terms)) return true;

  const normalized = normalizeHelpQuestion(text);
  if (isHelpHowToQuestion(text) && !/\bhow many\b|\bhow much\b/.test(normalized)) {
    return false;
  }

  return /\b(sales|revenue|earnings?|profit|total orders|how many order)\b/.test(normalized);
}

export function resolveHelpQuestionAndPin(body = {}) {
  const raw = String(body?.question || body?.message || '').trim();
  const pending = String(body?.pendingQuestion || '').trim();
  const bodyPin = String(body?.pin || '').trim();

  if (bodyPin) {
    return { question: raw || pending, pin: bodyPin };
  }

  if (/^\d{6}$/.test(raw) && pending) {
    return { question: pending, pin: raw };
  }

  const labeled = raw.match(/\bpin\s*[:=]?\s*(\d{6})\b/i);
  if (labeled) {
    return {
      question: raw.replace(labeled[0], ' ').replace(/\s+/g, ' ').trim() || pending,
      pin: labeled[1],
    };
  }

  return { question: raw, pin: '' };
}

export function applyHelpAdminUnlockCookie(response, token = '') {
  if (!response || !token) return response;
  response.cookies.set(HELP_ADMIN_UNLOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/store/help-agent',
    maxAge: Math.floor(UNLOCK_MAX_AGE_MS / 1000),
  });
  return response;
}

export function readHelpAdminUnlock(request) {
  return isValidHelpAdminUnlockToken(request?.cookies?.get?.(HELP_ADMIN_UNLOCK_COOKIE)?.value || '');
}

export function pinGateHelpQuestion(request, body = {}) {
  const resolved = resolveHelpQuestionAndPin(body);
  const unlockedByCookie = readHelpAdminUnlock(request);
  const pinValid = resolved.pin ? isHelpAdminPin(resolved.pin) : false;
  const pinWrong = Boolean(resolved.pin) && !pinValid;
  const unlocked = unlockedByCookie || pinValid;
  const sensitive = wantsSuperAdminHelpDetails(resolved.question);

  if (sensitive && !unlocked) {
    return {
      ...resolved,
      unlocked: false,
      pinWrong,
      needsPin: true,
      unlockToken: '',
    };
  }

  return {
    ...resolved,
    unlocked,
    pinWrong: false,
    needsPin: false,
    unlockToken: pinValid ? createHelpAdminUnlockToken() : '',
  };
}
