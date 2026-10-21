import { NextResponse } from 'next/server';
import { listPublicSavedBrands } from '@/lib/brandPage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const brands = await listPublicSavedBrands();
    return NextResponse.json({ brands });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Failed to load brands' }, { status: 500 });
  }
}
