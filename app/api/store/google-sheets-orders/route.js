import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import {
  getGoogleSheetsOrdersConfig,
  syncOrdersToGoogleSheet,
} from '@/lib/googleSheetsOrders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

    const config = getGoogleSheetsOrdersConfig();
    return NextResponse.json({
      success: true,
      configured: config.configured,
      spreadsheetId: config.spreadsheetId,
      spreadsheetUrl: config.spreadsheetUrl,
      tab: config.tab,
      clientEmail: config.clientEmail,
    });
  } catch (error) {
    console.error('[store google-sheets-orders GET]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load Google Sheet status' },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const storeId = await getSellerStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncOrdersToGoogleSheet();
    return NextResponse.json({
      ...result,
      message: `Google Sheet synced: ${result.rowCount || 0} order row(s) updated.`,
    });
  } catch (error) {
    console.error('[store google-sheets-orders POST]', error);
    return NextResponse.json(
      { error: error?.message || 'Google Sheets order sync failed' },
      { status: 500 },
    );
  }
}
