import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { buildProductTemplateWorkbook } from '@/lib/productTemplateExport';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storeId = await authSeller(decoded.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized as seller' }, { status: 403 });
    }

    const workbook = buildProductTemplateWorkbook();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `store-product-template-${dateStamp}.xlsx`;

    return new NextResponse(workbook, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[POST /api/store/product/export-template]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to export template' },
      { status: 500 },
    );
  }
}
