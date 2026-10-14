import { preload } from 'react-dom';
import { getHomepageData } from '@/lib/homepageData';
import { HOME_PAGE_METADATA } from '@/lib/homepageSeo';
import { stripImageKitTransforms } from '@/lib/imageKitDelivery';
import HomePageClient from './HomePageClient';

export const revalidate = 120;

export const metadata = HOME_PAGE_METADATA;

export default async function Home() {
  const initialData = await getHomepageData();
  const slides = initialData?.shopShowcase?.config?.fullWidthBannerSliderItems || [];
  const firstSlide = slides.find((slide) => slide?.mobileImage || slide?.image);
  const lcpImage = stripImageKitTransforms(firstSlide?.mobileImage || firstSlide?.image || '');
  if (lcpImage) {
    preload(lcpImage, { as: 'image', fetchPriority: 'high' });
  }
  return <HomePageClient initialData={initialData} />;
}
