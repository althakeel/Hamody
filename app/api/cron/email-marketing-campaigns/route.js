import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { drainEmailMarketingQueue, runDueEmailMarketingCampaigns } from '@/lib/runEmailMarketingCampaigns';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
    const result = dryRun
      ? await runDueEmailMarketingCampaigns({ dryRun: true })
      : await drainEmailMarketingQueue({ maxMs: 240000 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[cron/email-marketing-campaigns]', error);
    return NextResponse.json(
      { error: error?.message || 'Email marketing campaign cron failed' },
      { status: 500 },
    );
  }
}
