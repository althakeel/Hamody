import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import AppPushNotification from '@/models/AppPushNotification';
import { isTrustedAppRequest } from '@/lib/appSecurity';

export const dynamic = 'force-dynamic';

async function defaultStoreId() {
  let store = await Store.findOne({ isActive: true, status: 'approved' }).select('_id').lean();
  if (!store) {
    store = await Store.findOne({ status: { $ne: 'rejected' } }).select('_id').sort({ createdAt: 1 }).lean();
  }
  if (!store) store = await Store.findOne().select('_id').sort({ createdAt: 1 }).lean();
  return store?._id ? String(store._id) : '';
}

export async function GET(request) {
  try {
    if (!isTrustedAppRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const platform = String(searchParams.get('platform') || '').toLowerCase();
    await connectDB();
    const storeId = String(searchParams.get('storeId') || '').trim() || await defaultStoreId();
    if (!storeId) return NextResponse.json({ notifications: [] });

    const audience = platform === 'android' || platform === 'ios' ? { $in: ['all', platform] } : { $in: ['all', 'android', 'ios'] };
    const rows = await AppPushNotification.find({ storeId, audience })
      .sort({ sentAt: -1 })
      .limit(20)
      .select('title body imageUrl buttonText path audience sentAt')
      .lean();

    return NextResponse.json({
      notifications: rows.map((row) => ({
        id: String(row._id),
        title: row.title,
        body: row.body,
        imageUrl: row.imageUrl || '',
        buttonText: row.buttonText || '',
        path: row.path || '/',
        audience: row.audience,
        sentAt: row.sentAt,
      })),
    });
  } catch (error) {
    console.error('[public/app-notifications GET]', error);
    return NextResponse.json({ notifications: [] }, { status: 500 });
  }
}
