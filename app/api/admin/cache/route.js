import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuth } from '@/lib/firebase-admin';
import authAdmin from '@/middlewares/authAdmin';
import {
  getWebsiteCacheSettings,
  purgeWebsiteCache,
  saveWebsiteCacheSettings,
} from '@/lib/websiteCachePurge';

export const dynamic = 'force-dynamic';

async function requireSuperAdmin(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const decoded = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
    const isAdmin = await authAdmin(decoded.uid, decoded.email);
    if (!isAdmin) {
      return { error: NextResponse.json({ error: 'Super admin only' }, { status: 403 }) };
    }
    return { email: decoded.email || '' };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export async function GET(request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (admin.error) return admin.error;

    await connectDB();
    const settings = await getWebsiteCacheSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[admin/cache GET]', error);
    return NextResponse.json({ error: error?.message || 'Failed to load cache settings' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (admin.error) return admin.error;

    const body = await request.json();
    await connectDB();
    const settings = await saveWebsiteCacheSettings({
      defaultScope: body?.defaultScope,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[admin/cache PATCH]', error);
    return NextResponse.json({ error: error?.message || 'Failed to save cache settings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await requireSuperAdmin(request);
    if (admin.error) return admin.error;

    const body = await request.json().catch(() => ({}));
    await connectDB();
    const settings = await purgeWebsiteCache({
      scope: body?.scope,
      actorEmail: admin.email,
    });
    return NextResponse.json({
      ok: true,
      message: settings.lastScope === 'all'
        ? 'All website cache was cleared.'
        : 'Storefront cache was cleared.',
      settings,
    });
  } catch (error) {
    console.error('[admin/cache POST]', error);
    return NextResponse.json({ error: error?.message || 'Failed to clear cache' }, { status: 500 });
  }
}
