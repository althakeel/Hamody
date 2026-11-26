import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { findOwnedProduct, ownedProductFilter } from '@/lib/ownedProductQuery';
import authSeller from '@/middlewares/authSeller';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const { getAuth } = await import('@/lib/firebase-admin');
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storeId = await authSeller(decodedToken.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized as seller' }, { status: 401 });
    }

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    await dbConnect();

    const product = await findOwnedProduct(storeId, productId, '_id fastDelivery');

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const nextValue = !product.fastDelivery;
    await Product.updateOne(ownedProductFilter(storeId, productId), { $set: { fastDelivery: nextValue } });

    return NextResponse.json({
      message: nextValue ? 'Fast delivery enabled' : 'Fast delivery disabled',
      fastDelivery: nextValue,
    });
  } catch (error) {
    console.error('Error toggling fast delivery:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
