import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { findOwnedProduct, ownedProductFilter } from '@/lib/ownedProductQuery';
import authSeller from '@/middlewares/authSeller';
import { invalidateStorefrontProductCaches } from '@/lib/cache';
import { getAuth } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const idToken = authHeader.replace('Bearer ', '');
    let userId = null;
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { productId } = await request.json();
    if (!productId || typeof productId !== 'string' || !productId.match(/^[a-fA-F0-9]{24}$/)) {
      return NextResponse.json({ error: 'Product ID required or invalid format' }, { status: 400 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    await dbConnect();

    const product = await findOwnedProduct(storeId, productId, '_id published slug');

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const nextPublished = product.published === false;

    await Product.updateOne(ownedProductFilter(storeId, productId), { $set: { published: nextPublished } });
    invalidateStorefrontProductCaches();
    try {
      if (nextPublished) {
        const { clearProductGone } = await import('@/lib/urlRedirects');
        await clearProductGone(product.slug);
      } else {
        const { recordProductGone } = await import('@/lib/urlRedirects');
        await recordProductGone(product.slug, 'Product discontinued');
      }
    } catch (redirectError) {
      console.error('[url-redirects] product publish', redirectError);
    }

    const slug = String(product.slug || '').trim();
    if (slug) {
      revalidatePath(`/product/${slug}`);
      revalidatePath(`/products/${slug}`);
    }
    revalidatePath('/');
    revalidatePath('/shop');

    return NextResponse.json({
      message: nextPublished ? 'Product is now online' : 'Product is now offline',
      published: nextPublished,
    });
  } catch (error) {
    console.error('[publish-toggle]', error);
    return NextResponse.json({ error: error?.message || 'Failed to update product visibility' }, { status: 400 });
  }
}
