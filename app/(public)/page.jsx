import { Suspense } from 'react';
import { preload } from 'react-dom';
import { getHomepageData } from '@/lib/homepageData';
import { HOME_PAGE_METADATA } from '@/lib/homepageSeo';
import { stripImageKitTransforms } from '@/lib/imageKitDelivery';
import HomePageClient from './HomePageClient';
import HomeLoading from './loading';

export const revalidate = 180;

export const metadata = HOME_PAGE_METADATA;

async function HomeContent() {
  const initialData = await getHomepageData();
  const slides = initialData?.shopShowcase?.config?.fullWidthBannerSliderItems || [];
  const firstSlide = slides.find((slide) => slide?.mobileImage || slide?.image);
  const lcpImage = stripImageKitTransforms(firstSlide?.mobileImage || firstSlide?.image || '');
  if (lcpImage) {
    preload(lcpImage, { as: 'image', fetchPriority: 'high' });
  }
  return <HomePageClient initialData={initialData} />;
}

export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}
