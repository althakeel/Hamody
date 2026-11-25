import { NextResponse } from 'next/server';
import { getPublicFeaturedSections } from '@/lib/publicFeaturedSections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STOREFRONT_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
};

export async function GET() {
  try {
    const payload = await getPublicFeaturedSections();
    return NextResponse.json(payload, {
      status: 200,
      headers: STOREFRONT_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching featured sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}
