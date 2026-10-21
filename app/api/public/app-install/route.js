import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import AppInstall from '@/models/AppInstall';
import { readAppClientSource } from '@/lib/appClientSource';
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

export async function POST(request) {
  try {
    if (!isTrustedAppRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const anonymousId = String(body?.anonymousId || '').trim();
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(anonymousId)) {
      return NextResponse.json({ error: 'anonymousId is required' }, { status: 400 });
    }

    const fromRequest = readAppClientSource(request);
    const bodyPlatform = String(body?.platform || '').trim().toLowerCase();
    const platform = bodyPlatform === 'android' || bodyPlatform === 'ios'
      ? bodyPlatform
      : (fromRequest.clientPlatform === 'android' || fromRequest.clientPlatform === 'ios'
        ? fromRequest.clientPlatform
        : 'unknown');
    const saysApp = fromRequest.clientChannel === 'app' || platform === 'android' || platform === 'ios';
    if (!saysApp) {
      return NextResponse.json({ error: 'Send this from the app' }, { status: 400 });
    }

    await connectDB();
    const storeId = String(body?.storeId || '').trim() || await defaultStoreId();
    if (!storeId) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const now = new Date();
    await AppInstall.updateOne(
      { storeId, anonymousId },
      {
        $setOnInsert: { storeId, anonymousId, firstSeenAt: now },
        $set: { platform, lastSeenAt: now },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[public/app-install POST]', error);
    return NextResponse.json({ error: 'Could not save this install' }, { status: 500 });
  }
}
