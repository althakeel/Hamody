import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StorePreference from '@/models/StorePreference';
import { checkRateLimit } from '@/lib/apiSecurity';
import { clientIpFromRequest, resolvePublicStoreId } from '@/lib/emailMarketingLeads';

export const dynamic = 'force-dynamic';

const STAT_FIELDS = {
  view: 'views',
  email: 'emails',
  copy: 'copies',
  click: 'clicks',
};

export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request) || 'unknown';
    const rate = checkRateLimit(`home-popup:${ip}`, 40, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const templateId = String(body.templateId || '').trim().slice(0, 40);
    const field = STAT_FIELDS[String(body.type || '')];
    if (!templateId || !field) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    await connectDB();
    const storeId = await resolvePublicStoreId();
    if (!storeId) return NextResponse.json({ ok: false }, { status: 503 });

    await StorePreference.updateOne(
      { storeId, 'appearanceSections.homeWelcomePopup.templates.id': templateId },
      { $inc: { [`appearanceSections.homeWelcomePopup.templates.$.stats.${field}`]: 1 } },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[home-popup-event]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
