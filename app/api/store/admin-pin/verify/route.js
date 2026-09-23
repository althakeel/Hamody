import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { assertAiBulkEditPin } from '@/lib/storeHelpAgentPin';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
    const storeId = await authSeller(decodedToken.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = assertAiBulkEditPin({ pin: body?.pin || '' });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, token: result.token });
  } catch (error) {
    console.error('[admin-pin verify POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to check PIN' }, { status: 500 });
  }
}
