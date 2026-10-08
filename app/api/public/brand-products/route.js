import { NextResponse } from 'next/server';
import { findPublicBrandPage, getBrandProducts, BRAND_PRODUCTS_PAGE_SIZE } from '@/lib/brandPage';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = String(searchParams.get('slug') || '').trim();
    const brand = await findPublicBrandPage(slug);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const parsedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const parsedLimit = Number.parseInt(searchParams.get('limit') || String(BRAND_PRODUCTS_PAGE_SIZE), 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, BRAND_PRODUCTS_PAGE_SIZE)
      : BRAND_PRODUCTS_PAGE_SIZE;

    const result = await getBrandProducts(brand.name, { page, limit });
    return NextResponse.json({
      products: result.products || [],
      total: Number(result.total) || 0,
      page: Number(result.page) || page,
      limit: Number(result.limit) || limit,
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Failed to load products' }, { status: 500 });
  }
}
