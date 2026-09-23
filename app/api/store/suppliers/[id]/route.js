import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Supplier from '@/models/Supplier';
import Product from '@/models/Product';
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

export async function PATCH(request, { params }) {
  try {
    const auth = await requireSeller(request);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = normalizeSupplier(body);
    if (!parsed.name) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
    }

    await connectDB();
    const supplier = await Supplier.findOneAndUpdate(
      { _id: id, storeId: storeIdMatch(auth.storeId) },
      { $set: parsed },
      { new: true },
    ).lean();

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, supplier: toStoreSupplier(supplier) });
  } catch (error) {
    console.error('[suppliers PATCH]', error);
    return NextResponse.json({ error: error.message || 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireSeller(request);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });
    }

    await connectDB();
    const deleted = await Supplier.findOneAndDelete({ _id: id, storeId: storeIdMatch(auth.storeId) });
    if (!deleted) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    await Product.collection.updateMany(
      {
        $or: [
          { supplierId: id },
          { supplierIds: id },
        ],
      },
      {
        $set: { supplierId: null, supplierName: '' },
        $pull: { supplierIds: id, supplierNames: deleted.name },
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[suppliers DELETE]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete supplier' }, { status: 500 });
  }
}
