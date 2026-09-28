import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import StockNotifyRequest from '@/models/StockNotifyRequest';
import { verifyStoreSeller } from '@/lib/storeSellerAuth';
import { toStoreNotifyRequest } from '@/lib/stockNotify';
import { ACTIVE_RECORD_FILTER, buildTrashMeta } from '@/lib/storeTrash';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await verifyStoreSeller(request);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 25)));
    const status = String(searchParams.get('status') || '').trim();

    const filter = { storeId: String(auth.storeId), ...ACTIVE_RECORD_FILTER };
    if (status === 'pending' || status === 'notified') filter.status = status;
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { productName: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      StockNotifyRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StockNotifyRequest.countDocuments(filter),
    ]);

    const productIds = [...new Set(items.map((row) => String(row.productId || '').trim()).filter(Boolean))];
    const objectIds = productIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const products = objectIds.length
      ? await Product.find({ _id: { $in: objectIds }, storeId: String(auth.storeId) })
        .select('name slug sku images inStock stockQuantity')
        .lean()
      : [];
    const productById = new Map(products.map((product) => [String(product._id), product]));

    return NextResponse.json({
      success: true,
      items: items.map((row) => toStoreNotifyRequest(row, productById.get(String(row.productId)))),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('[store/notify-list GET]', error);
    return NextResponse.json({ error: 'Failed to load notify list.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const auth = await verifyStoreSeller(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    const status = body?.status === 'notified' ? 'notified' : 'pending';
    if (!id) {
      return NextResponse.json({ error: 'Request id is required.' }, { status: 400 });
    }

    await connectDB();
    const doc = await StockNotifyRequest.findOneAndUpdate(
      { _id: id, storeId: String(auth.storeId) },
      { $set: { status } },
      { new: true },
    ).lean();

    if (!doc) {
      return NextResponse.json({ error: 'Notify request not found.' }, { status: 404 });
    }

    const product = mongoose.Types.ObjectId.isValid(String(doc.productId || ''))
      ? await Product.findOne({ _id: doc.productId, storeId: String(auth.storeId) })
        .select('name slug sku images inStock stockQuantity')
        .lean()
      : null;

    return NextResponse.json({ success: true, item: toStoreNotifyRequest(doc, product) });
  } catch (error) {
    console.error('[store/notify-list PATCH]', error);
    return NextResponse.json({ error: 'Failed to update notify request.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await verifyStoreSeller(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Request id is required.' }, { status: 400 });
    }

    await connectDB();
    const doc = await StockNotifyRequest.findOneAndUpdate(
      { _id: id, storeId: String(auth.storeId), ...ACTIVE_RECORD_FILTER },
      { $set: buildTrashMeta(auth.userId, auth.userName || auth.email) },
      { new: true },
    ).lean();

    if (!doc) {
      return NextResponse.json({ error: 'Notify request not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[store/notify-list DELETE]', error);
    return NextResponse.json({ error: 'Failed to move notify request to trash.' }, { status: 500 });
  }
}
