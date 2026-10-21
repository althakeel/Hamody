import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import AppDevice from '@/models/AppDevice';
import AppPushNotification from '@/models/AppPushNotification';
import { normalizeAppPush } from '@/lib/appPush';
import { sendAppPushBatch } from '@/lib/sendAppPush';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function sellerStoreId(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    return authSeller(decoded.uid);
  } catch {
    return null;
  }
}

function present(row) {
  return {
    id: String(row._id),
    title: row.title,
    body: row.body,
    imageUrl: row.imageUrl || '',
    buttonText: row.buttonText || '',
    path: row.path || '/',
    audience: row.audience,
    successCount: row.successCount || 0,
    failureCount: row.failureCount || 0,
    targetCount: row.targetCount || 0,
    error: row.error || '',
    sentAt: row.sentAt,
  };
}

export async function GET(request) {
  try {
    const storeId = await sellerStoreId(request);
    if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const storeKey = String(storeId);
    const [android, ios, notifications] = await Promise.all([
      AppDevice.countDocuments({ storeId: storeKey, platform: 'android' }),
      AppDevice.countDocuments({ storeId: storeKey, platform: 'ios' }),
      AppPushNotification.find({ storeId: storeKey }).sort({ sentAt: -1 }).limit(20).lean(),
    ]);
    return NextResponse.json({
      devices: { android, ios, total: android + ios },
      notifications: notifications.map(present),
    });
  } catch (error) {
    console.error('[store/app-notifications GET]', error);
    return NextResponse.json({ error: 'Could not load notifications' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const storeId = await sellerStoreId(request);
    if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const message = normalizeAppPush(await request.json().catch(() => ({})));
    if (message.error) return NextResponse.json({ error: message.error }, { status: 400 });

    await connectDB();
    const storeKey = String(storeId);
    const deviceQuery = { storeId: storeKey };
    if (message.audience !== 'all') deviceQuery.platform = message.audience;
    const devices = await AppDevice.find(deviceQuery).select('token').lean();
    const tokens = devices.map((device) => device.token);

    let result = { successCount: 0, failureCount: 0, invalidTokens: [] };
    let error = '';
    if (tokens.length) {
      try {
        result = await sendAppPushBatch(tokens, message);
      } catch (sendError) {
        error = 'Firebase could not deliver this notification. Check that Cloud Messaging is enabled.';
        console.error('[store/app-notifications POST]', sendError);
      }
    }
    if (result.invalidTokens.length) {
      await AppDevice.deleteMany({ storeId: storeKey, token: { $in: result.invalidTokens } });
    }

    const saved = await AppPushNotification.create({
      storeId: storeKey,
      ...message,
      successCount: result.successCount,
      failureCount: result.failureCount,
      targetCount: tokens.length,
      error,
      sentAt: new Date(),
    });

    return NextResponse.json({
      notification: present(saved),
      devices: tokens.length,
    });
  } catch (error) {
    console.error('[store/app-notifications POST]', error);
    return NextResponse.json({ error: 'Could not send this notification' }, { status: 500 });
  }
}
