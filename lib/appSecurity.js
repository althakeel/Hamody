import { timingSafeEqual } from 'crypto';

function readHeader(request, name) {
  return String(request?.headers?.get?.(name) || '').trim();
}

function sameSecret(left = '', right = '') {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (!a.length || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isTrustedAppRequest(request) {
  const expectedId = String(process.env.STORE1920_APP_ID || '').trim();
  const expectedKey = String(process.env.APP_SECURITY_KEY || '').trim();
  if (!expectedId || !expectedKey) return false;

  const appId = readHeader(request, 'x-store1920-app-id');
  const appKey = readHeader(request, 'x-store1920-app-key');
  return sameSecret(appId, expectedId) && sameSecret(appKey, expectedKey);
}
