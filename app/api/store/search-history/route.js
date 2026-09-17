import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StoreSearchHistory from '@/models/StoreSearchHistory';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { getSearchHistoryRangeStart } from '@/lib/storeSearchHistory';

export const dynamic = 'force-dynamic';

async function getStoreIdFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const decodedToken = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
  return authSeller(decodedToken.uid);
}

export async function GET(request) {
  try {
    const storeId = await getStoreIdFromRequest(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'week';
    const visitorType = String(searchParams.get('visitorType') || '').trim();
    const q = String(searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 25)));
    const startDate = getSearchHistoryRangeStart(range);

    await connectDB();

    const match = { storeId: String(storeId) };
    if (startDate) match.createdAt = { $gte: startDate };
    if (visitorType === 'guest' || visitorType === 'customer') match.visitorType = visitorType;
    if (q) match.query = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };

    const [stats, top, recent, total] = await Promise.all([
      StoreSearchHistory.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            guests: { $sum: { $cond: [{ $eq: ['$visitorType', 'guest'] }, 1, 0] } },
            customers: { $sum: { $cond: [{ $eq: ['$visitorType', 'customer'] }, 1, 0] } },
            queries: { $addToSet: '$query' },
          },
        },
      ]),
      StoreSearchHistory.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            lastAt: { $max: '$createdAt' },
            queryDisplay: { $last: '$queryDisplay' },
          },
        },
        { $sort: { count: -1, lastAt: -1 } },
        { $limit: 25 },
      ]),
      StoreSearchHistory.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StoreSearchHistory.countDocuments(match),
    ]);

    const summary = stats[0] || {};
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      summary: {
        total: summary.total || 0,
        guests: summary.guests || 0,
        customers: summary.customers || 0,
        uniqueQueries: Array.isArray(summary.queries) ? summary.queries.length : 0,
      },
      top: top.map((row) => ({
        query: row.queryDisplay || row._id,
        count: row.count,
        lastAt: row.lastAt,
      })),
      recent: recent.map((row) => ({
        id: String(row._id),
        query: row.queryDisplay || row.query,
        visitorType: row.visitorType || 'guest',
        userId: row.userId || '',
        anonymousId: row.anonymousId || '',
        source: row.source || 'shop',
        resultCount: row.resultCount,
        createdAt: row.createdAt,
      })),
      pagination: {
        page: Math.min(page, totalPages),
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[store/search-history GET]', error);
    return NextResponse.json({ error: 'Failed to load search history' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const storeId = await getStoreIdFromRequest(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const query = String(body?.query || '').trim().toLowerCase();

    await connectDB();
    const storeKey = String(storeId);
    let deletedCount = 0;

    if (id) {
      const result = await StoreSearchHistory.deleteOne({ _id: id, storeId: storeKey });
      deletedCount = result.deletedCount || 0;
    } else if (ids.length) {
      const result = await StoreSearchHistory.deleteMany({
        _id: { $in: ids },
        storeId: storeKey,
      });
      deletedCount = result.deletedCount || 0;
    } else if (query) {
      const result = await StoreSearchHistory.deleteMany({ storeId: storeKey, query });
      deletedCount = result.deletedCount || 0;
    } else {
      return NextResponse.json({ error: 'Choose a search to delete' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, deletedCount });
  } catch (error) {
    console.error('[store/search-history DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete search' }, { status: 500 });
  }
}
