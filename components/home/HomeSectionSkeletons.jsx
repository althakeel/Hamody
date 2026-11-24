import {
  MOBILE_CAROUSEL_BLEED_CLASS,
  CATEGORY_SLIDER_LAYOUT_CLASS,
  CATEGORY_SLIDER_SIDE_IMAGE_CLASS,
  CATEGORY_SLIDER_PANEL_CLASS,
  HOME_PRODUCT_GRID_CLASS,
  HOME_SECTION_CLASS,
  HOME_SECTION_GRID_INNER_CLASS,
  getCategorySliderProductCardClass,
  getHomeSectionProductCardClass,
} from '@/lib/storefrontCarousel';

export function HomeSectionTitleSkeleton() {
  return (
    <div className="mb-4 sm:mb-5">
      <div className="h-7 w-48 max-w-[60%] animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-4 w-64 max-w-[75%] animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function HomeProductCardSkeleton({ className = 'h-full w-full min-w-0' }) {
  return (
    <div className={`animate-pulse overflow-hidden rounded-[2px] border border-slate-200 bg-white ${className}`}>
      <div className="aspect-square w-full bg-slate-200" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-4/5 rounded bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-200" />
        <div className="h-3 w-2/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function HomeProductGridSkeleton({ count = 6, showTitle = true }) {
  return (
    <section className={HOME_SECTION_CLASS} aria-hidden="true">
      <div className={HOME_SECTION_GRID_INNER_CLASS}>
        {showTitle ? <HomeSectionTitleSkeleton /> : null}
        <div className={HOME_PRODUCT_GRID_CLASS}>
          {Array.from({ length: count }).map((_, index) => (
            <HomeProductCardSkeleton key={`home-grid-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeProductCarouselSkeleton({ count = 6, showTitle = true }) {
  return (
    <section className={HOME_SECTION_CLASS} aria-hidden="true">
      <div className={HOME_SECTION_GRID_INNER_CLASS}>
        {showTitle ? <HomeSectionTitleSkeleton /> : null}
        <div className="flex gap-3 overflow-hidden pb-2">
          {Array.from({ length: count }).map((_, index) => (
            <HomeProductCardSkeleton
              key={`home-carousel-skeleton-${index}`}
              className={getHomeSectionProductCardClass()}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CatalogGridSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <HomeProductCardSkeleton key={`catalog-skeleton-${index}`} />
      ))}
    </div>
  );
}

export function CatalogPageSkeleton({ titleWidth = 'w-48' } = {}) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6" aria-busy="true">
      <div className={`mb-5 h-8 animate-pulse rounded bg-slate-200 ${titleWidth}`} />
      <div className="mb-4 h-4 w-64 max-w-full animate-pulse rounded bg-slate-100" />
      <CatalogGridSkeleton />
    </div>
  );
}

export function CartPageSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
      <div className="space-y-3">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`cart-skeleton-${index}`} className="flex gap-3 rounded-[2px] border border-slate-200 bg-white p-3">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded bg-slate-200" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-[2px] border border-slate-200 bg-slate-100" />
    </div>
  );
}

export function BlogListSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`blog-skeleton-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="aspect-[16/10] animate-pulse bg-slate-200" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BlogArticleSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="aspect-[16/8] animate-pulse rounded-xl bg-slate-200" />
      <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`article-skeleton-${index}`} className="h-4 w-full animate-pulse rounded bg-slate-100" />
      ))}
    </div>
  );
}

export function OrderListSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-3 px-4 py-6 sm:px-6" aria-busy="true">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`order-skeleton-${index}`} className="rounded-[2px] border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="mt-3 h-3 w-48 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-24 animate-pulse rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export function HomeBannerSkeleton() {
  return (
    <section className={HOME_SECTION_CLASS} aria-hidden="true">
      <div className={HOME_SECTION_GRID_INNER_CLASS}>
        <div className="h-[120px] w-full animate-pulse rounded-[2px] bg-slate-200 sm:h-[220px]" />
      </div>
    </section>
  );
}

export function HomeCategoryStripSkeleton({ embedded = false }) {
  return (
    <section className={embedded ? 'w-full min-w-0' : 'mx-auto w-full max-w-[1400px] px-4 sm:px-6'} aria-hidden="true">
      <div className="flex gap-[14px] overflow-hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`category-strip-skeleton-${index}`}
            className={`min-w-0 flex-1 flex-col items-center ${index > 4 ? 'hidden sm:flex' : 'flex'} ${index > 5 ? 'sm:max-lg:hidden' : ''}`}
          >
            <div className="aspect-[127/110] w-full animate-pulse rounded-[12px] bg-[#F4F6F8]" />
            <div className="mt-[7px] h-3 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="mt-1 h-3 w-3/5 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeCategoryProductSectionSkeleton() {
  return (
    <section className={HOME_SECTION_CLASS} aria-hidden="true">
      <div className={HOME_SECTION_GRID_INNER_CLASS}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="h-7 w-40 max-w-[50%] animate-pulse rounded bg-slate-200 sm:h-8" />
          <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <HomeProductCardSkeleton
              key={`home-category-product-skeleton-${index}`}
              className={getHomeSectionProductCardClass()}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeCategoryRowSkeleton({ count = 10 }) {
  return (
    <section className={HOME_SECTION_CLASS} aria-hidden="true">
      <div className={`${HOME_SECTION_GRID_INNER_CLASS} max-w-[1400px]`}>
        <div className="flex gap-4 overflow-hidden md:gap-6">
          {Array.from({ length: count }).map((_, index) => (
            <div key={`home-category-skeleton-${index}`} className="flex w-24 shrink-0 flex-col items-center md:flex-1">
              <div className="h-20 w-20 animate-pulse rounded-lg bg-slate-200 md:h-24 md:w-24" />
              <div className="mt-2 h-3 w-12 animate-pulse rounded bg-slate-100 md:w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeExploreInterestsSkeleton({ productCount = 6 }) {
  return (
    <section className={HOME_SECTION_CLASS} aria-hidden="true">
      <div className={HOME_SECTION_GRID_INNER_CLASS}>
        <HomeSectionTitleSkeleton />
        <div className="mb-5 flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`home-chip-skeleton-${index}`}
              className="h-10 w-28 shrink-0 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
        <div className={HOME_PRODUCT_GRID_CLASS}>
          {Array.from({ length: productCount }).map((_, index) => (
            <HomeProductCardSkeleton key={`home-interest-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeSideImageSliderSkeleton({
  withSideImage = true,
  cardsPerRow = 5,
  showTitle = true,
}) {
  const cardCount = cardsPerRow === 5 ? 5 : 6;
  const cardWidthClass = getCategorySliderProductCardClass(cardsPerRow);

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden" aria-hidden="true">
      <div className={withSideImage ? CATEGORY_SLIDER_LAYOUT_CLASS : ''}>
        {withSideImage ? (
          <div className={`${CATEGORY_SLIDER_SIDE_IMAGE_CLASS} animate-pulse bg-slate-200`} />
        ) : null}

        <div className={`min-w-0 ${CATEGORY_SLIDER_PANEL_CLASS} rounded-2xl px-3 py-3`} style={{ backgroundColor: 'var(--skeleton-panel-bg, #f3f0ff)' }}>
          {showTitle ? <HomeSectionTitleSkeleton /> : null}
          <div className={`${MOBILE_CAROUSEL_BLEED_CLASS} flex gap-3 overflow-hidden pb-2`}>
            {Array.from({ length: cardCount }).map((_, index) => (
              <HomeProductCardSkeleton
                key={`home-side-slider-card-${index}`}
                className={cardWidthClass}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeCategorySlidersSkeleton({ sections = 2 }) {
  return (
    <section className={HOME_SECTION_CLASS} aria-hidden="true">
      <div className={`${HOME_SECTION_GRID_INNER_CLASS} space-y-4 lg:space-y-8`}>
        {Array.from({ length: sections }).map((_, index) => (
          <HomeSideImageSliderSkeleton key={`home-slider-skeleton-${index}`} withSideImage={index === 0} />
        ))}
      </div>
    </section>
  );
}
