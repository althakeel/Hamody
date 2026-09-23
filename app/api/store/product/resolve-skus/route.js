import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { resolveDashboardAccess } from '@/lib/storeAccessControl';
import { canBulkEditProducts } from '@/lib/productSaveGuards';
import { findStoreProductsBySkus } from '@/lib/productBulkSku';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
    const storeId = await authSeller(decodedToken.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await resolveDashboardAccess(decodedToken.uid, decodedToken);
    if (!canBulkEditProducts(access)) {
      return NextResponse.json({
        error: 'You do not have permission to bulk edit products. Ask the store owner to enable Bulk edit products in Team Access.',
      }, { status: 403 });
    }

    const body = await request.json();
    await connectDB();
    const result = await findStoreProductsBySkus(Product, storeId, body?.skus || body?.sku || '');

    return NextResponse.json({
      success: true,
      ...result,
      message: result.productIds.length
        ? `Found ${result.productIds.length} product(s)`
        : 'No products match those SKUs',
    });
  } catch (error) {
    console.error('[resolve-skus POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to find products by SKU' }, { status: 500 });
  }
}
