import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { syncOrdersToGoogleSheet } from '@/lib/googleSheetsOrders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncOrdersToGoogleSheet();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[cron/google-sheets-orders]', error);
    return NextResponse.json(
      { error: error?.message || 'Google Sheets order sync failed' },
      { status: 500 },
    );
  }
}
