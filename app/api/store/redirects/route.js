import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { listUrlRedirects, saveManualUrlRedirect } from '@/lib/urlRedirects';

async function verifyStoreSeller(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
    const storeId = await authSeller(decodedToken.uid);
    if (!storeId) {
      return { error: NextResponse.json({ error: 'Not authorized' }, { status: 401 }) };
    }
    return { storeId };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export async function GET(request) {
  const auth = await verifyStoreSeller(request);
  if (auth.error) return auth.error;

  try {
    const redirects = await listUrlRedirects();
    return NextResponse.json({ redirects });
  } catch (error) {
    console.error('[url-redirects GET]', error);
    return NextResponse.json({ error: 'Failed to load redirects' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await verifyStoreSeller(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const redirect = await saveManualUrlRedirect({
      fromPath: body?.fromPath,
      toPath: body?.toPath,
      statusCode: body?.statusCode,
      note: body?.note,
    });
    return NextResponse.json({ redirect }, { status: 201 });
  } catch (error) {
    const message = error?.message || 'Failed to save redirect';
    const status = /already exists|must be different|cannot be redirected|Enter a path|not found/i.test(message) ? 400 : 500;
    if (status === 500) console.error('[url-redirects POST]', error);
    return NextResponse.json({ error: message }, { status });
  }
}
