import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { expireDueVaultsPayOrders } from '@/lib/vaultsPayOrderPayment';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await expireDueVaultsPayOrders();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('[cron/vaultspay-expiry]', error);
    return NextResponse.json(
      { error: error?.message || 'VaultsPay expiry check failed' },
      { status: 500 },
    );
  }
}
