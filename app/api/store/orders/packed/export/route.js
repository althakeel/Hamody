import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { getDubaiDateParts } from '@/lib/storeOrdersByProductDates';
import { listPackedOrdersForDubaiDay } from '@/lib/warehouseOrderPacking';
import { buildPackedOrdersPdfBuffer } from '@/lib/storePackedOrdersPdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/store/orders/packed/export?date=YYYY-MM-DD
 * Packed-orders PDF for one Dubai day. Arabic customer names use an Arabic font.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storeId = await authSeller(decodedToken.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateKey = String(searchParams.get('date') || getDubaiDateParts().date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return NextResponse.json({ error: 'Choose a valid day.' }, { status: 400 });
    }

    await connectDB();
    const orders = await listPackedOrdersForDubaiDay(storeId, dateKey);
    if (!orders.length) {
      return NextResponse.json(
        { error: `No packed orders on ${dateKey}.` },
        { status: 404 },
      );
    }

    const buffer = buildPackedOrdersPdfBuffer(orders, { dateKey });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="packed-orders-${dateKey}.pdf"`,
        'X-Packed-Count': String(orders.length),
      },
    });
  } catch (error) {
    console.error('[store/orders/packed/export]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to export packed orders PDF' },
      { status: 500 },
    );
  }
}
