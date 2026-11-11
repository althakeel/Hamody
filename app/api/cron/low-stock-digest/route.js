import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { runAllLowStockDigests } from '@/lib/lowStockDigest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
    const result = await runAllLowStockDigests({ dryRun });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[cron/low-stock-digest]', error);
    return NextResponse.json(
      { error: error?.message || 'Low-stock email digest failed' },
      { status: 500 },
    );
  }
}
