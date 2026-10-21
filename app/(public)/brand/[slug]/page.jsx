import { notFound } from 'next/navigation';
import BrandPageView from '@/components/brand/BrandPageView';
import {
  brandPagePath,
  findPublicBrandPage,
  getBrandHeaderStats,
  getBrandProducts,
  BRAND_PRODUCTS_PAGE_SIZE,
} from '@/lib/brandPage';
import { buildAbsoluteUrl } from '@/lib/sitemapData';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug = '' } = await params;
  const brand = await findPublicBrandPage(slug);
  if (!brand) return { title: 'Brand Not Found | Store1920' };
  const title = brand.metaTitle || brand.name || 'Brand';
  const description = brand.metaDescription || brand.description || '';
  const canonical = buildAbsoluteUrl(brandPagePath(brand.slug || slug));
  return {
    title: `${title} | Store1920`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Store1920`,
      description,
      url: canonical,
    },
  };
}

export default async function BrandPublicPage({ params }) {
  const { slug = '' } = await params;
  const brand = await findPublicBrandPage(slug);
  if (!brand) notFound();

  const [productResult, stats] = await Promise.all([
    getBrandProducts(brand.name, { page: 1, limit: BRAND_PRODUCTS_PAGE_SIZE }),
    getBrandHeaderStats(brand.name),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <BrandPageView
        brand={JSON.parse(JSON.stringify(brand))}
        products={productResult.products || []}
        total={productResult.total || 0}
        stats={stats}
      />
    </div>
  );
}
