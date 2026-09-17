import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductVisualIndex from '@/models/ProductVisualIndex';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { isGeminiConfigured } from '@/configs/gemini';
import {
  getVisualIndexStatus,
  indexProductVisual,
} from '@/lib/productVisualIndex';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function getStoreIdFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const decodedToken = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
  return authSeller(decodedToken.uid);
}

export async function GET(request) {
  try {
    const storeId = await getStoreIdFromRequest(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const status = await getVisualIndexStatus(Product, ProductVisualIndex);
    return NextResponse.json({
      ...status,
      configured: isGeminiConfigured(),
    });
  } catch (error) {
    console.error('[store/image-search GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to load image search status' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const storeId = await getStoreIdFromRequest(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isGeminiConfigured()) {
      return NextResponse.json({ error: 'Gemini is not configured' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const mode = String(body?.mode || 'missing') === 'all' ? 'all' : 'missing';
    const limit = Math.min(12, Math.max(1, Number(body?.limit) || 8));

    await connectDB();
    const status = await getVisualIndexStatus(Product, ProductVisualIndex);
    const targetIds = mode === 'all'
      ? (await Product.find({ images: { $exists: true, $not: { $size: 0 } } }).select('_id').limit(limit).lean())
        .map((product) => String(product._id))
      : status.missingIds.slice(0, limit);

    const products = await Product.find({ _id: { $in: targetIds } }).select('_id images image').lean();
    let indexed = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];

    for (const product of products) {
      try {
        const result = await indexProductVisual(product, ProductVisualIndex);
        if (result?.skipped) skipped += 1;
        else indexed += 1;
      } catch (error) {
        failed += 1;
        if (errors.length < 5) errors.push(error.message || 'Index failed');
      }
    }

    const nextStatus = await getVisualIndexStatus(Product, ProductVisualIndex);
    return NextResponse.json({
      ...nextStatus,
      configured: true,
      batch: { indexed, skipped, failed, errors, mode },
    });
  } catch (error) {
    console.error('[store/image-search POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to train image search' }, { status: 500 });
  }
}
