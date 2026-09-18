import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { compileEmailBlocksMjml, compileMjmlToHtml } from '@/lib/emailMjml';

export const dynamic = 'force-dynamic';

async function requireSeller(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
    const storeId = await authSeller(decoded.uid);
    if (!storeId) {
      return { error: NextResponse.json({ error: 'Not authorized as seller' }, { status: 403 }) };
    }
    return { storeId };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export async function POST(request) {
  try {
    const seller = await requireSeller(request);
    if (seller.error) return seller.error;

    const body = await request.json();
    if (Array.isArray(body?.blocks)) {
      const compiled = await compileEmailBlocksMjml(body.blocks);
      return NextResponse.json({
        blocks: compiled.blocks,
        errors: compiled.errors,
      });
    }

    const markup = String(body?.mjml || body?.html || '');
    const compiled = await compileMjmlToHtml(markup);
    return NextResponse.json(compiled);
  } catch (error) {
    console.error('[email-marketing mjml POST]', error);
    return NextResponse.json({ error: error?.message || 'Failed to compile MJML' }, { status: 500 });
  }
}
