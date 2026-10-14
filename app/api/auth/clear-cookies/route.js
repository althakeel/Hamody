import { NextResponse } from 'next/server';
import { clearHelpAdminUnlockCookie } from '@/lib/storeHelpAgentPin';

export const dynamic = 'force-dynamic';

/**
 * Expire cookies set by the server.
 * The help-desk unlock cookie is httpOnly, so a browser script cannot delete it.
 * Language and market stay; those are visitor preferences, not a server session.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearHelpAdminUnlockCookie(response);
  return response;
}
