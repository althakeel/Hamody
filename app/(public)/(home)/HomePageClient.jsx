'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { HOME_SECTION_STACK_CLASS } from '@/lib/storefrontCarousel';
import { hasShowcaseBannerImage } from '@/lib/showcaseBannerImages';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { findTopDealsSection, isTopDealsVisibleOnWebsite } from '@/lib/homeTopDeals';
import {
  HomeBannerSkeleton,
  HomeCategoryRowSkeleton,
  HomeCategorySlidersSkeleton,
  HomeProductGridSkeleton,
} from '@/components/home/HomeSectionSkeletons';

import BannerSliderDirect from '@/components/BannerSlider';
import HeroBannerSlider from '@/components/HeroBannerSlider';
import ShopShowcaseSection from '@/components/ShopShowcaseSection';
import FeaturedProductsSection from '@/components/LatestProducts';
import SectionReveal from '@/components/SectionReveal';
import Section3 from '@/components/section3';
import CategoryInterestSection from '@/components/CategoryInterestSection';
import RecommendedProducts from '@/components/RecommendedProducts';
import BrandsBannerProducts from '@/components/BrandsBannerProducts';
const Section4 = dynamic(() => import('@/components/section4'), {
  ssr: false,
  loading: () => <HomeCategorySlidersSkeleton />,
});
const BannerSlider = dynamic(() => import('@/components/BannerSlider'), {
  ssr: false,
  loading: () => <HomeBannerSkeleton />,
});
const BannerSlider2 = dynamic(() => import('@/components/BannerSlider2'), {
  ssr: false,
  loading: () => <HomeBannerSkeleton />,
});
const HomeCategories = dynamic(() => import('@/components/HomeCategories'), {
  ssr: false,
  loading: () => <HomeCategoryRowSkeleton />,
});
const RecentSearchProducts = dynamic(() => import('@/components/RecentSearchProducts'), {
  ssr: false,
  loading: () => <HomeProductGridSkeleton count={5} />,
});

export default function HomePageClient({ initialData }) {
  const { isArabic } = useStorefrontI18n();
  const {
    shopShowcase = { config: null, sectionProducts: [], products: [], categories: [] },
    homeSections = [],
    featuredSections = [],
    featuredSectionsCount = 0,
    featuredProducts = { products: [] },
    appearance = {},
    topDealsProducts = [],
    storeSettings = {},
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

  const showBanner2 = useMemo(() => {
    if (!shopShowcaseConfig || shopShowcaseConfig.secondaryBannerSliderEnabled === false) return false;
    return (shopShowcaseConfig.secondaryBannerSliderItems || []).some((item) => hasShowcaseBannerImage(item));
  }, [shopShowcaseConfig]);

  const showPrimaryBanner =
    featuredSectionsCount === 0 &&
    shopShowcaseConfig?.bannerSliderEnabled !== false &&
    (shopShowcaseConfig?.bannerSliderItems || []).some((item) => hasShowcaseBannerImage(item));

  const topDealsSection = findTopDealsSection(homeSections);
  const showTopDeals = isTopDealsVisibleOnWebsite(topDealsSection) && topDealsProducts.length > 0;

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
      <div className={`${HOME_SECTION_STACK_CLASS} w-full min-w-0 pb-8`}>
        <ShopShowcaseSection
          initialShowcaseData={shopShowcase}
          initialStoreSettings={storeSettings}
          skipInitialFetch
        />
        <SectionReveal>
          <FeaturedProductsSection
            initialProducts={featuredProducts?.products || []}
            initialLayout={{
              ...(appearance?.homeMenuCategories || {}),
              itemsPerRow: featuredProducts?.columns || appearance?.homeMenuCategories?.itemsPerRow,
              rows: featuredProducts?.rows || appearance?.homeMenuCategories?.rows,
            }}
            sectionTitle={featuredProducts?.sectionTitle || ''}
            sectionTitleAr={featuredProducts?.sectionTitleAr || ''}
            sectionDescription={featuredProducts?.sectionDescription || ''}
            sectionDescriptionAr={featuredProducts?.sectionDescriptionAr || ''}
          />
        </SectionReveal>
        {(shopShowcaseConfig?.brandsBannerHidden !== true
          && (shopShowcaseConfig?.brandsBannerItems || []).some((item) => hasShowcaseBannerImage(item))) ? (
          <BannerSliderDirect variant="brands" config={shopShowcaseConfig} />
        ) : null}
        {shopShowcaseConfig?.brandsBannerHidden !== true ? (
          <BrandsBannerProducts
            products={shopShowcase?.brandsBannerProducts || []}
            title={shopShowcaseConfig?.brandsBannerProductsTitle || ''}
            titleAr={shopShowcaseConfig?.brandsBannerProductsTitleAr || ''}
          />
        ) : null}
        <SectionReveal>
          <CategoryInterestSection />
        </SectionReveal>
        {showHeroCategories ? (
          <HomeCategories />
        ) : null}

        {showPrimaryBanner ? (
          <BannerSlider config={shopShowcaseConfig} />
        ) : null}

        {showTopDeals ? (
          <SectionReveal>
            <Section3
              homeSections={homeSections}
              sectionsLoading={false}
              initialProducts={topDealsProducts}
              initialTitle={topDealsSection?.title || ''}
            />
          </SectionReveal>
        ) : null}

        {featuredSectionsCount > 0 ? (
          <SectionReveal>
            <Section4 sections={featuredSections} loading={false} />
          </SectionReveal>
        ) : null}

        {showBanner2 ? (
          <BannerSlider2 config={shopShowcaseConfig} />
        ) : null}

        <SectionReveal>
          <RecentSearchProducts />
        </SectionReveal>
        <SectionReveal>
          <RecommendedProducts initialProducts={initialData?.recommendedProducts || []} />
        </SectionReveal>
      </div>
    </div>
  );
}
