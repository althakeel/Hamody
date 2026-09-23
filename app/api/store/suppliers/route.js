import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Supplier from '@/models/Supplier';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { normalizeSupplier, toStoreSupplier } from '@/lib/supplierHelpers';
import { storeIdMatch } from '@/lib/supplierServer';

export const dynamic = 'force-dynamic';

async function requireSeller(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    const storeId = await authSeller(decoded.uid);
    if (!storeId) {
      return { error: NextResponse.json({ error: 'Not authorized as seller' }, { status: 403 }) };
    }
    return { storeId, uid: decoded.uid };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export async function GET(request) {
  try {
    const auth = await requireSeller(request);
    if (auth.error) return auth.error;

    await connectDB();
    const suppliers = await Supplier.find({ storeId: storeIdMatch(auth.storeId) })
      .sort({ name: 1, updatedAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json({
      success: true,
      suppliers: suppliers.map(toStoreSupplier),
    });
  } catch (error) {
    console.error('[suppliers GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to load suppliers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireSeller(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = normalizeSupplier(body);
    if (!parsed.name) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
    }

    await connectDB();
    const supplier = await Supplier.create({
      storeId: auth.storeId,
      ...parsed,
      createdBy: auth.uid || '',
    });

    return NextResponse.json({
      success: true,
      supplier: toStoreSupplier(supplier.toObject()),
    }, { status: 201 });
  } catch (error) {
    console.error('[suppliers POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to create supplier' }, { status: 500 });
  }
}
