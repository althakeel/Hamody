import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import AppDevice from '@/models/AppDevice';
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
    const token = String(body?.token || '').trim();
    if (token.length < 20 || token.length > 4096 || /\s/.test(token)) {
      return NextResponse.json({ error: 'A device token is required' }, { status: 400 });
    }

    const source = readAppClientSource(request);
    const bodyPlatform = String(body?.platform || '').trim().toLowerCase();
    const platform = bodyPlatform === 'android' || bodyPlatform === 'ios'
      ? bodyPlatform
      : (source.clientPlatform === 'android' || source.clientPlatform === 'ios' ? source.clientPlatform : '');
    if (!platform) {
      return NextResponse.json({ error: 'platform must be android or ios' }, { status: 400 });
    }

    await connectDB();
    const storeId = String(body?.storeId || '').trim() || await defaultStoreId();
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const anonymousId = String(body?.anonymousId || '').trim().slice(0, 80);
    await AppDevice.updateOne(
      { storeId, token },
      { $set: { platform, anonymousId, lastSeenAt: new Date() }, $setOnInsert: { storeId, token } },
      { upsert: true },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[public/app-device POST]', error);
    return NextResponse.json({ error: 'Could not save this phone' }, { status: 500 });
  }
}
