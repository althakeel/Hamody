import { NextResponse } from 'next/server';
import { handleVaultsPayWebhook } from '@/lib/vaultsPayWebhook';

export const dynamic = 'force-dynamic';

/** VaultsPay dashboard URL check. Payment status is never trusted from this request. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Store1920 VaultsPay webhook',
    methods: ['card', 'applepay', 'googlepay'],
  });
}

/** Server notification for card, Apple Pay, and Google Pay. */
export async function POST(request) {
  try {
    const result = await handleVaultsPayWebhook(request);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[webhooks/vaultspay]', error?.message || error);
    return NextResponse.json({ received: true });
  }
}
