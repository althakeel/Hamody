import { NextResponse } from 'next/server';
import { verifyVaultsPayOrderPayment } from '@/lib/vaultsPayOrderPayment';

export const dynamic = 'force-dynamic';

/** Confirms a hosted card payment with VaultsPay. The return URL alone is not proof. */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body?.orderId || '').trim();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }
    const result = await verifyVaultsPayOrderPayment(orderId, { source: 'vaultspay_return' });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[orders/verify-vaultspay]', error?.message || error);
    return NextResponse.json({ error: 'Failed to verify card payment' }, { status: 500 });
  }
}
