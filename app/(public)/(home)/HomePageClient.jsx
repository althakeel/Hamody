'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { HOME_SECTION_STACK_CLASS } from '@/lib/storefrontCarousel';
import { hasShowcaseBannerImage } from '@/lib/showcaseBannerImages';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { findTopDealsSection } from '@/lib/homeTopDeals';

import HeroBannerSlider from '@/components/HeroBannerSlider';
import ShopShowcaseSection from '@/components/ShopShowcaseSection';
import HomeCategorySections from '@/components/HomeCategorySections';
import SectionReveal from '@/components/SectionReveal';
import Section3 from '@/components/section3';
import LazyMount from '@/components/LazyMount';
const Section4 = dynamic(() => import('@/components/section4'), {
  ssr: false,
  loading: () => <div className="min-h-[240px]" aria-hidden />,
});
const BannerSlider = dynamic(() => import('@/components/BannerSlider'), {
  ssr: false,
  loading: () => null,
});
const BannerSlider2 = dynamic(() => import('@/components/BannerSlider2'), {
  ssr: false,
  loading: () => null,
});
const HomeCategories = dynamic(() => import('@/components/HomeCategories'), {
  ssr: false,
  loading: () => null,
});
const CategoryInterestSection = dynamic(() => import('@/components/CategoryInterestSection'), {
  ssr: false,
  loading: () => null,
});
const RecentSearchProducts = dynamic(() => import('@/components/RecentSearchProducts'), {
  ssr: false,
  loading: () => null,
});
const RecommendedProducts = dynamic(() => import('@/components/RecommendedProducts'), {
  ssr: false,
  loading: () => null,
});

export default function HomePageClient({ initialData }) {
  const { isArabic } = useStorefrontI18n();
  const {
    shopShowcase = { config: null, sectionProducts: [], products: [], categories: [] },
    homeSections = [],
    featuredSections = [],
    featuredSectionsCount = 0,
    topDealsProducts = [],
    storeSettings = {},
    homeCategorySections = [],
  } = initialData || {};

  const shopShowcaseConfig = shopShowcase?.config || null;

  const showHeroCategories = useMemo(
    () =>
      homeSections.some(
        (section) =>
          section?.isActive !== false &&
          (section?.sectionType === 'hero_categories' || section?.section === 'home_categories_slider')
      ),
    [homeSections]
  );

  const secondaryBannerSliderPlacement = useMemo(() => {
    const configured = shopShowcaseConfig?.secondaryBannerSliderPlacement;
    return configured === 'below_top_deals' || configured === 'below_small_banners'
      ? configured
      : 'above_top_deals';
  }, [shopShowcaseConfig]);

  const secondaryBannerSlides = useMemo(() => {
    if (!shopShowcaseConfig) return [];
    return (shopShowcaseConfig.secondaryBannerSliderItems || []).filter((item) => hasShowcaseBannerImage(item));
  }, [shopShowcaseConfig]);

  const showSecondaryBannerAt = (placement) =>
    secondaryBannerSliderPlacement === placement &&
    shopShowcaseConfig?.secondaryBannerSliderEnabled !== false &&
    secondaryBannerSlides.length > 0;

  return (
    <div className={`flex-1 bg-white ${shopShowcaseConfig?.fullWidthBannerEnabled ? '' : 'pt-5 sm:pt-6'}`}>
      {shopShowcaseConfig?.fullWidthBannerEnabled ? null : (
        <HeroBannerSlider showcaseConfig={shopShowcaseConfig} showcaseReady />
      )}
      <h1 className="sr-only">
        {isArabic
          ? 'تسوق المنحوتات التقليدية ومستلزمات التخييم في الإمارات'
          : 'Shop traditional sculptures and outdoor camping in the UAE'}
      </h1>
      <div className={`${HOME_SECTION_STACK_CLASS} w-full min-w-0 max-lg:pb-0 lg:pb-8`}>
        <ShopShowcaseSection
          initialShowcaseData={shopShowcase}
          initialStoreSettings={storeSettings}
          skipInitialFetch
        />
        {showSecondaryBannerAt('below_small_banners') ? (
          <LazyMount rootMargin="100px 0px" minHeight={120}>
            <BannerSlider2 config={shopShowcaseConfig} />
          </LazyMount>
        ) : null}
        {showHeroCategories ? (
          <LazyMount rootMargin="80px 0px" minHeight={72}>
            <HomeCategories />
          </LazyMount>
        ) : null}

        <HomeCategorySections sections={homeCategorySections} />
        {featuredSectionsCount === 0 ? (
          <LazyMount rootMargin="100px 0px" minHeight={140}>
            <BannerSlider config={shopShowcaseConfig} />
          </LazyMount>
        ) : null}
        {showSecondaryBannerAt('above_top_deals') ? (
          <LazyMount rootMargin="100px 0px" minHeight={120}>
            <BannerSlider2 config={shopShowcaseConfig} />
          </LazyMount>
        ) : null}

        <SectionReveal>
          <Section3
            homeSections={homeSections}
            sectionsLoading={false}
            initialProducts={topDealsProducts}
            initialTitle={findTopDealsSection(homeSections)?.title || ''}
          />
        </SectionReveal>

        {showSecondaryBannerAt('below_top_deals') ? (
          <LazyMount rootMargin="100px 0px" minHeight={120}>
            <BannerSlider2 config={shopShowcaseConfig} />
          </LazyMount>
        ) : null}

        {featuredSectionsCount > 0 ? (
          <SectionReveal>
            <LazyMount rootMargin="100px 0px" minHeight={320}>
              <Section4 sections={featuredSections} loading={false} />
            </LazyMount>
          </SectionReveal>
        ) : null}

        <SectionReveal>
          <CategoryInterestSection />
        </SectionReveal>
        <SectionReveal>
          <LazyMount rootMargin="80px 0px" minHeight={200}>
            <RecentSearchProducts />
          </LazyMount>
        </SectionReveal>
        <SectionReveal>
          <LazyMount rootMargin="80px 0px" minHeight={280}>
            <RecommendedProducts />
          </LazyMount>
        </SectionReveal>
      </div>
    </div>
  );
}
