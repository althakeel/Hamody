'use client';

import {
  getOrCreateAnonymousId,
  getOrCreateSessionId,
  getTrackingStoreId,
} from '@/lib/trackingClient';
import { canRecordStoreSearchQuery, normalizeStoreSearchQuery } from '@/lib/storeSearchHistory';

export async function recordStorefrontSearch(rawQuery, {
  source = 'shop',
  userId = '',
  resultCount = null,
} = {}) {
  const query = normalizeStoreSearchQuery(rawQuery);
  if (!canRecordStoreSearchQuery(query)) return;

  try {
    const storeId = await getTrackingStoreId();
    await fetch('/api/public/search-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        query,
        source,
        userId: userId ? String(userId) : '',
        anonymousId: getOrCreateAnonymousId(),
        sessionId: getOrCreateSessionId(),
        resultCount: Number.isFinite(Number(resultCount)) ? Number(resultCount) : null,
      }),
      keepalive: true,
    });
  } catch {
    // Search logging must never block the shopper.
  }
}
