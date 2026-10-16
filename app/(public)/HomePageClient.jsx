'use client';

import { useMemo } from 'react';
import { HOME_SECTION_STACK_CLASS } from '@/lib/storefrontCarousel';
import { hasShowcaseBannerImage } from '@/lib/showcaseBannerImages';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { findTopDealsSection } from '@/lib/homeTopDeals';

import HeroBannerSlider from '@/components/HeroBannerSlider';
import LatestProducts from '@/components/LatestProducts';
import ShopShowcaseSection from '@/components/ShopShowcaseSection';
import HomeCategories from '@/components/HomeCategories';
import BannerSlider from '@/components/BannerSlider';
import BannerSlider2 from '@/components/BannerSlider2';
import Section3 from '@/components/section3';
import Section4 from '@/components/section4';
import CategoryInterestSection from '@/components/CategoryInterestSection';
import RecentSearchProducts from '@/components/RecentSearchProducts';
import RecommendedProducts from '@/components/RecommendedProducts';

export default function HomePageClient({ initialData }) {
  const { isArabic } = useStorefrontI18n();
  const {
    shopShowcase = { config: null, sectionProducts: [], products: [], categories: [] },
    homeSections = [],
    featuredSections = [],
    featuredSectionsCount = 0,
    featuredProducts = { products: [], sectionTitle: '', sectionDescription: '' },
    topDealsProducts = [],
    appearance = {},
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
    <div className={shopShowcaseConfig?.fullWidthBannerEnabled ? '' : 'pt-5 sm:pt-6'}>
      {shopShowcaseConfig?.fullWidthBannerEnabled ? null : (
        <HeroBannerSlider showcaseConfig={shopShowcaseConfig} showcaseReady />
      )}
      <h1 className="sr-only">
        {isArabic
          ? 'تسوق الإلكترونيات ومنتجات المنزل ونمط الحياة عبر الإنترنت في الإمارات'
          : 'Shop Electronics, Home and Lifestyle Products Online in the UAE'}
      </h1>
      <div className={`${HOME_SECTION_STACK_CLASS} w-full min-w-0 max-lg:pb-0 lg:pb-8`}>
        <ShopShowcaseSection
          initialShowcaseData={shopShowcase}
          initialStoreSettings={storeSettings}
          skipInitialFetch
        />
        {showSecondaryBannerAt('below_small_banners') && <BannerSlider2 config={shopShowcaseConfig} />}
        {showHeroCategories ? <HomeCategories /> : null}
        <LatestProducts
          initialProducts={featuredProducts.products}
          initialSectionTitle={featuredProducts.sectionTitleEn || featuredProducts.sectionTitle}
          initialSectionDescription={
            featuredProducts.sectionDescriptionEn || featuredProducts.sectionDescription
          }
          initialSectionTitleAr={featuredProducts.sectionTitleAr || ''}
          initialSectionDescriptionAr={featuredProducts.sectionDescriptionAr || ''}
          initialLayout={appearance?.homeMenuCategories}
        />
        {featuredSectionsCount === 0 && <BannerSlider config={shopShowcaseConfig} />}
        {showSecondaryBannerAt('above_top_deals') && <BannerSlider2 config={shopShowcaseConfig} />}

        <Section3
          homeSections={homeSections}
          sectionsLoading={false}
          initialProducts={topDealsProducts}
          initialTitle={findTopDealsSection(homeSections)?.title || ''}
        />

        {showSecondaryBannerAt('below_top_deals') && <BannerSlider2 config={shopShowcaseConfig} />}

        {featuredSectionsCount > 0 && (
          <Section4 sections={featuredSections} loading={false} />
        )}

        <CategoryInterestSection />
        <RecentSearchProducts />
        <RecommendedProducts />
      </div>
    </div>
  );
}
