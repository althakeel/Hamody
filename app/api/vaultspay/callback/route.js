import { NextResponse } from 'next/server';
import { handleVaultsPayWebhook } from '@/lib/vaultsPayWebhook';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Store1920 VaultsPay webhook',
  });
}

/** Same handler as /api/webhooks/vaultspay. Sent on each checkout as callBackUrl. */
export async function POST(request) {
  try {
    const result = await handleVaultsPayWebhook(request);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[vaultspay/callback]', error?.message || error);
    return NextResponse.json({ received: true });
  }
}
