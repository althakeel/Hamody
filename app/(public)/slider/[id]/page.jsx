import { notFound, redirect } from 'next/navigation';
import CategorySliderGridPage from '@/components/CategorySliderGridPage';
import { loadCategorySliderGrid } from '@/lib/categorySliderPublicPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id = '' } = await params;
  const data = await loadCategorySliderGrid(id);
  if (!data || data.redirectTo) return { title: 'Store1920' };
  const title = data.slider.title || 'Store1920';
  const description = data.slider.subtitle || title;
  return {
    title: `${title} | Store1920`,
    description,
  };
}

export default async function CategorySliderPublicPage({ params }) {
  const { id = '' } = await params;
  const data = await loadCategorySliderGrid(id);
  if (!data) notFound();
  if (data.redirectTo) redirect(data.redirectTo);

  return (
    <CategorySliderGridPage
      slider={data.slider}
      products={JSON.parse(JSON.stringify(data.products))}
    />
  );
}
