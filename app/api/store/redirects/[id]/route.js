import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { deleteUrlRedirect, saveManualUrlRedirect } from '@/lib/urlRedirects';

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

export async function PUT(request, { params }) {
  const auth = await verifyStoreSeller(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const redirect = await saveManualUrlRedirect({
      id,
      fromPath: body?.fromPath,
      toPath: body?.toPath,
      statusCode: body?.statusCode,
      note: body?.note,
    });
    return NextResponse.json({ redirect });
  } catch (error) {
    const message = error?.message || 'Failed to save redirect';
    const status = /already exists|must be different|cannot be redirected|Enter a path|not found/i.test(message) ? 400 : 500;
    if (status === 500) console.error('[url-redirects PUT]', error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request, { params }) {
  const auth = await verifyStoreSeller(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deleteUrlRedirect(id);
    return NextResponse.json({ message: 'Redirect deleted' });
  } catch (error) {
    const message = error?.message || 'Failed to delete redirect';
    const status = /not found|required/i.test(message) ? 400 : 500;
    if (status === 500) console.error('[url-redirects DELETE]', error);
    return NextResponse.json({ error: message }, { status });
  }
}
