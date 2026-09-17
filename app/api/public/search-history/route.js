import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StoreSearchHistory from '@/models/StoreSearchHistory';
import { resolvePublicStoreId } from '@/lib/emailMarketingLeads';
import {
  STORE_SEARCH_DEDUPE_MS,
  canRecordStoreSearchQuery,
  isManualSearchSource,
  normalizeStoreSearchQuery,
} from '@/lib/storeSearchHistory';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const queryDisplay = normalizeStoreSearchQuery(body?.query || body?.searchTerm || '');
    if (!canRecordStoreSearchQuery(queryDisplay)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await connectDB();
    const storeId = String(body?.storeId || '').trim() || (await resolvePublicStoreId());
    if (!storeId) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const source = String(body?.source || '').trim().toLowerCase();
    if (!isManualSearchSource(source)) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'auto' });
    }

    const userId = String(body?.userId || '').trim();
    const anonymousId = String(body?.anonymousId || '').trim();
    const sessionId = String(body?.sessionId || '').trim();
    const query = queryDisplay.toLowerCase();
    const since = new Date(Date.now() - STORE_SEARCH_DEDUPE_MS);
    const identityMatch = [
      anonymousId ? { anonymousId } : null,
      sessionId ? { sessionId } : null,
    ].filter(Boolean);

    const duplicate = await StoreSearchHistory.findOne({
      storeId,
      query,
      createdAt: { $gte: since },
      ...(identityMatch.length ? { $or: identityMatch } : {}),
    }).select('_id').lean();

    if (duplicate) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'duplicate' });
    }

    await StoreSearchHistory.create({
      storeId,
      query,
      queryDisplay,
      visitorType: userId ? 'customer' : 'guest',
      userId,
      anonymousId,
      sessionId,
      source,
      resultCount: Number.isFinite(Number(body?.resultCount)) ? Number(body.resultCount) : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[public/search-history POST]', error);
    return NextResponse.json({ error: 'Failed to record search' }, { status: 500 });
  }
}
