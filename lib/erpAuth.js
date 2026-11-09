import { NextResponse } from 'next/server';

/**
 * ERP integration auth (docs/ERP_INTEGRATION_API.md).
 * Server-to-server: header `x-erp-key` must match env `ERP_API_KEY`.
 */

export function getErpApiKey() {
  return String(process.env.ERP_API_KEY || '').trim();
}

export function isErpKeyValid(request) {
  const configured = getErpApiKey();
  if (!configured) return false;
  const provided = String(request.headers.get('x-erp-key') || '').trim();
  return Boolean(provided) && provided === configured;
}

/**
 * @returns {{ ok: true } | { ok: false, response: import('next/server').NextResponse }}
 */
export function requireErpKey(request) {
  if (!getErpApiKey()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'ERP API key is not configured', code: 'ERP_KEY_NOT_CONFIGURED' },
        { status: 503 },
      ),
    };
  }
  if (!isErpKeyValid(request)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
      ),
    };
  }
  return { ok: true };
}
