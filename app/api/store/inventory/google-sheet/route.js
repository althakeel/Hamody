import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import {
  getGoogleSheetsInventoryStatus,
  syncStoreInventoryToGoogleSheet,
} from '@/lib/googleSheetsInventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSellerStoreId(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
  const storeId = await authSeller(decodedToken.uid);
  return storeId ? String(storeId) : null;
}

export async function GET(request) {
  try {
    const storeId = await getSellerStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      ...getGoogleSheetsInventoryStatus(),
    });
  } catch (error) {
    console.error('[inventory google-sheet GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to load Google Sheet status' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const storeId = await getSellerStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncStoreInventoryToGoogleSheet(storeId);
    return NextResponse.json({
      ...result,
      message: `Google Sheet updated: ${result.rowCount} inventory row(s), ${result.costRowCount} product cost SKU(s), ${result.nexsoRowCount} Nexso SKU(s), and ${result.supplierRowCount} supplier(s). The sheet is view-only — it does not change the store.`,
    });
  } catch (error) {
    console.error('[inventory google-sheet POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to sync Google Sheet' }, { status: 500 });
  }
}
