import { notFound, redirect } from 'next/navigation';
import CategoryPageView from '@/components/category/CategoryPageView';
import {
  resolveCategoryByPathSegments,
  getCategoryProducts,
  getCategoryHeaderStats,
  getPublishedCategoryProductCounts,
  CATEGORY_PRODUCTS_PAGE_SIZE,
} from '@/lib/categoryPageData';
import { categoryProductCount } from '@/lib/categoryProductStats';
import {
  buildBreadcrumbListJsonLd,
  buildCategoryCollectionJsonLd,
  buildCategoryPageMetadata,
} from '@/lib/categorySeo';
import { buildCategoryUrl } from '@/lib/categorySlug';

export const revalidate = 300;

/**
 * Puts Store → Categories SEO fields into the document <head>
 * (title, meta description, canonical, Open Graph, Twitter).
 */
export async function generateMetadata({ params }) {
  const { slug = [] } = await params;
  const resolved = await resolveCategoryByPathSegments(slug);
  if (!resolved) notFound();

  const { category, chain } = resolved;
  const metadata = buildCategoryPageMetadata(category, chain);
  const counts = await getPublishedCategoryProductCounts();
  if (categoryProductCount(counts, category._id) === 0) {
    return {
      ...metadata,
      robots: { index: false, follow: true },
    };
  }
  return metadata;
}

export default async function CategoryPage({ params }) {
  const { slug = [] } = await params;

  const resolved = await resolveCategoryByPathSegments(slug);
  if (!resolved) notFound();

  const { category, chain, children, all = [], pathRedirect = false } = resolved;

  // Legacy / incomplete category paths → canonical matched category URL.
  if (pathRedirect) {
    redirect(buildCategoryUrl(chain));
  }

  const [{ products, total }, headerStats, counts] = await Promise.all([
    getCategoryProducts(category._id, {
      page: 1,
      limit: CATEGORY_PRODUCTS_PAGE_SIZE,
      allCategories: all,
    }),
    getCategoryHeaderStats(category._id, { allCategories: all }),
    getPublishedCategoryProductCounts(),
  ]);
  const visibleChildren = (children || []).filter(
    (child) => categoryProductCount(counts, child._id) > 0,
  );
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd(chain);
  const collectionJsonLd = buildCategoryCollectionJsonLd(category, chain);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <CategoryPageView
        category={category}
        chain={chain}
        children={visibleChildren}
        products={products}
        total={total}
        headerStats={headerStats}
      />
    </div>
  );
}
