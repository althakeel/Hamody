import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { processWaslahScheduledStatusSync } from '@/lib/waslahScheduledStatusSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Vercel cron: poll Waslah POST /orders/history every 5 minutes.
 * A shipment is checked again 2 minutes after its last successful look-up.
 * Batches ~10 shipments per call with a delay between batches.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}, or Vercel cron headers when the secret is unset.
 */
export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await processWaslahScheduledStatusSync();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('[cron/waslah-sync-status]', error);
    return NextResponse.json(
      { error: error?.message || 'Waslah status sync cron failed' },
      { status: 500 },
    );
  }
}
