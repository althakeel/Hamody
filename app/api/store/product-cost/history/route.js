import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProductCostHistory from '@/models/ProductCostHistory';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { formatProductCostHistoryRow } from '@/lib/productCostHistory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    const storeId = await authSeller(decoded.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));

    await connectDB();
    const query = { storeId: String(storeId) };
    if (q) {
      query.$or = [
        { productName: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { actorName: { $regex: q, $options: 'i' } },
      ];
    }

    const [rows, total] = await Promise.all([
      ProductCostHistory.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ProductCostHistory.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      items: rows.map(formatProductCostHistoryRow),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('[product-cost history GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to load cost history' }, { status: 500 });
  }
}
