import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { invalidateCategoryCaches } from '@/lib/categoryCache';
import { normalizeMerchandisedProductIds } from '@/lib/categoryPageData';

async function verifyStoreSeller(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
    const storeId = await authSeller(decodedToken.uid);
    if (!storeId) {
      return { error: NextResponse.json({ error: 'Not authorized' }, { status: 401 }) };
    }
    return { userId: decodedToken.uid };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

async function loadProducts(ids = []) {
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (!objectIds.length) return [];

  const products = await Product.find({ _id: { $in: objectIds } })
    .select('_id name sku images externalImages price inStock')
    .lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export async function GET(request, { params }) {
  try {
    const auth = await verifyStoreSeller(request);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    const category = await Category.findById(String(id || '').trim())
      .select('name merchandisedProductIds')
      .lean();
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const productIds = normalizeMerchandisedProductIds(category.merchandisedProductIds);
    const products = await loadProducts(productIds);
    return NextResponse.json({
      productIds: products.map((product) => String(product._id)),
      products,
    });
  } catch (error) {
    console.error('[category merchandise GET]', error);
    return NextResponse.json({ error: 'Failed to load product order' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await verifyStoreSeller(request);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    const category = await Category.findById(String(id || '').trim());
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const productIds = normalizeMerchandisedProductIds(body?.productIds);
    await Category.updateOne(
      { _id: category._id },
      { $set: { merchandisedProductIds: productIds } },
    );
    invalidateCategoryCaches();

    const products = await loadProducts(productIds);
    return NextResponse.json({
      productIds: products.map((product) => String(product._id)),
      products,
    });
  } catch (error) {
    console.error('[category merchandise PUT]', error);
    return NextResponse.json({ error: 'Failed to save product order' }, { status: 500 });
  }
}
