import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';
import authSeller from '@/middlewares/authSeller';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { findOwnedProduct } from '@/lib/ownedProductQuery';
import { invalidateStorefrontProductCaches } from '@/lib/cache';

export const dynamic = 'force-dynamic';

function copySlug(baseSlug = '') {
  const root = String(baseSlug || 'product')
    .toLowerCase()
    .replace(/-copy(?:-\d+)?$/i, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'product';
  return root;
}

async function uniqueCopySlug(baseSlug) {
  const root = copySlug(baseSlug);
  let candidate = `${root}-copy`;
  let suffix = 2;
  while (await Product.findOne({ slug: candidate }).select('_id').lean()) {
    candidate = `${root}-copy-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    let userId = null;
    try {
      const decoded = await getAuth().verifyIdToken(authHeader.slice('Bearer '.length));
      userId = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { productId } = await request.json();
    if (!productId || !/^[a-fA-F0-9]{24}$/.test(String(productId))) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    await connectDB();
    const source = await findOwnedProduct(storeId, productId);
    if (!source) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const slug = await uniqueCopySlug(source.slug || source.name);
    const {
      _id,
      __v,
      createdAt,
      updatedAt,
      soldCount,
      legacySourceId,
      zoho,
      ...fields
    } = source;

    const copy = await Product.create({
      ...fields,
      slug,
      soldCount: 0,
      legacySourceId: null,
      zoho: {
        itemId: null,
        sku: null,
        synced: false,
        syncedAt: null,
        lastError: null,
        locationId: null,
        locationName: null,
      },
      storeId,
    });

    invalidateStorefrontProductCaches();
    return NextResponse.json({
      message: 'Product duplicated',
      product: copy.toObject(),
    });
  } catch (error) {
    console.error('[product/duplicate POST]', error);
    return NextResponse.json({ error: error?.message || 'Failed to duplicate product' }, { status: 500 });
  }
}
