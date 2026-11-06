'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Filter, X } from 'lucide-react';
import CampaignSaleProductCard from '@/components/CampaignSaleProductCard';
import Campaign1111Hero from '@/components/Campaign1111Hero';
import ProductFilterSidebar from '@/components/ProductFilterSidebar';
import CampaignPageBannerSlider from '@/components/CampaignPageBannerSlider';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { sortOutOfStockLast } from '@/lib/productVisibility';
import {
  EMAIL_CAMPAIGN_BANNER_MAX_WIDTH,
  campaignPageHasBanner,
  resolveCampaignPageBannerSources,
} from '@/lib/emailCampaignPageHelpers';

const LANDING_PAGE_SIZE = 20;
const GRID_PAGE_SIZE = 20;

const DEFAULT_FILTERS = {
  categories: [],
  priceRange: { min: 0, max: 100000 },
  rating: 0,
  inStock: false,
  sortBy: 'popularity',
};

function stampPageOrder(products, start = 0) {
  return products.map((product, index) => ({ ...product, pageOrder: start + index }));
}

function applyProductFilters(products, activeFilters) {
  return products.filter((product) => {
    if (activeFilters.categories.length > 0) {
      const productCategories = [
        product.category,
        ...(Array.isArray(product.categories) ? product.categories : []),
      ].filter(Boolean);
      const hasMatchingCategory = productCategories.some((cat) => activeFilters.categories.includes(cat));
      if (!hasMatchingCategory) return false;
    }

    const price = Number(product.price || 0);
    if (price < activeFilters.priceRange.min || price > activeFilters.priceRange.max) return false;

    if (activeFilters.rating > 0 && (Number(product.averageRating) || 0) < activeFilters.rating) return false;

    if (activeFilters.inStock && product.inStock === false) return false;

    return true;
  });
}

function sortProducts(products, sortBy) {
  const sorted = [...products];
  const byPage = (a, b) => (a.pageOrder || 0) - (b.pageOrder || 0);
  let ordered = sorted;

  switch (sortBy) {
    case 'price-low-high':
      ordered = sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0) || byPage(a, b));
      break;
    case 'price-high-low':
      ordered = sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0) || byPage(a, b));
      break;
    case 'rating':
      ordered = sorted.sort((a, b) => (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0) || byPage(a, b));
      break;
    case 'discount':
      ordered = sorted.sort((a, b) => {
        const discountA = a.AED > a.price ? ((a.AED - a.price) / a.AED) * 100 : 0;
        const discountB = b.AED > b.price ? ((b.AED - b.price) / b.AED) * 100 : 0;
        return discountB - discountA || byPage(a, b);
      });
      break;
    case 'popularity':
      ordered = sorted.sort((a, b) => (Number(b.ratingCount) || 0) - (Number(a.ratingCount) || 0) || byPage(a, b));
      break;
    case 'newest':
    default:
      ordered = sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) || byPage(a, b));
      break;
  }

  return sortOutOfStockLast(ordered);
}

export default function CampaignLandingPage() {
  const params = useParams();
  const slug = String(params?.slug || '').trim();
  const pathname = usePathname();
  const urlPrefix = pathname?.startsWith('/pages/') ? 'pages' : 'c';
  const { t, language, isArabic } = useStorefrontI18n();
  const [page, setPage] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsBySection, setProductsBySection] = useState({});
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [visibleCount, setVisibleCount] = useState(GRID_PAGE_SIZE);
  const [scrollLoading, setScrollLoading] = useState(false);
  const gridTopRef = useRef(null);
  const sentinelRef = useRef(null);
  const nextPageRef = useRef(2);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const visibleCountRef = useRef(GRID_PAGE_SIZE);
  const scrollLoadingRef = useRef(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!mobileFiltersOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    nextPageRef.current = 2;
    hasMoreRef.current = false;
    setActiveFilters(DEFAULT_FILTERS);
    setMobileFiltersOpen(false);
    setVisibleCount(GRID_PAGE_SIZE);
    visibleCountRef.current = GRID_PAGE_SIZE;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/campaign-pages/${encodeURIComponent(slug)}?prefix=${urlPrefix}&page=1&limit=${LANDING_PAGE_SIZE}`, {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        const pageDoc = data?.page && typeof data.page === 'object' ? data.page : null;
        if (!response.ok || !pageDoc) {
          setNotFound(true);
          setPage(null);
          setProducts([]);
          setProductsBySection({});
          setTotal(0);
          setHasMore(false);
          return;
        }
        const sectionMap = data.productsBySection && typeof data.productsBySection === 'object'
          ? data.productsBySection
          : {};
        const sectionFlat = Object.values(sectionMap)
          .flatMap((list) => (Array.isArray(list) ? list : []))
          .filter((item) => item?.id || item?._id);
        const sectionUnique = [];
        const seenSection = new Set();
        sectionFlat.forEach((item) => {
          const id = String(item.id || item._id);
          if (!id || seenSection.has(id)) return;
          seenSection.add(id);
          sectionUnique.push(item);
        });
        const firstProducts = stampPageOrder(
          sectionUnique.length
            ? sectionUnique
            : (Array.isArray(data.products) ? data.products : []),
        );
        setNotFound(false);
        setPage(pageDoc);
        setProducts(firstProducts);
        setProductsBySection(sectionMap);
        setTotal(sectionUnique.length || Number(data.total) || firstProducts.length);
        // Section grids already return their full product lists on page 1.
        const more = sectionUnique.length ? false : Boolean(data.hasMore);
        hasMoreRef.current = more;
        setHasMore(more);
        nextPageRef.current = 2;
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setPage(null);
          setProducts([]);
          setProductsBySection({});
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, urlPrefix]);

  const loadNextPage = useCallback(async () => {
    if (!slug || loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const pageToLoad = nextPageRef.current;
    try {
      const response = await fetch(
        `/api/public/campaign-pages/${encodeURIComponent(slug)}?prefix=${urlPrefix}&page=${pageToLoad}&limit=${LANDING_PAGE_SIZE}`,
        { cache: 'no-store' },
      );
      const data = await response.json().catch(() => ({}));
      const incoming = stampPageOrder(Array.isArray(data.products) ? data.products : [], (pageToLoad - 1) * LANDING_PAGE_SIZE);
      setProducts((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...incoming.filter((item) => item?.id && !seen.has(item.id))];
      });
      hasMoreRef.current = Boolean(data.hasMore);
      setHasMore(Boolean(data.hasMore));
      nextPageRef.current = pageToLoad + 1;
    } catch {
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [slug, urlPrefix]);

  const title = useMemo(() => {
    if (!page) return '';
    if (isArabic && page.titleAr) return page.titleAr;
    return page.title || '';
  }, [page, isArabic]);

  const subtitle = useMemo(() => {
    if (!page) return '';
    if (isArabic && page.subtitleAr) return page.subtitleAr;
    return page.subtitle || '';
  }, [page, isArabic]);

  const is1111 = slug === '11-11' || String(page?.slug || '') === '11-11';
  const accent = is1111 ? '#18181b' : (page?.accentColor || '#0f766e');
  const background = is1111 ? '#f7f7f8' : (page?.backgroundColor || '#f8fafc');
  const design = page?.design || null;
  const titleSizeClass = design?.titleSize === 'large'
    ? 'text-3xl sm:text-4xl'
    : design?.titleSize === 'small'
      ? 'text-xl sm:text-2xl'
      : 'text-2xl sm:text-3xl';
  const titleStyle = design
    ? { color: design.titleColor || '#0f172a', textAlign: design.titleAlignment || 'left' }
    : undefined;
  const gridColumnsClass = {
    2: 'grid-cols-2 md:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  }[is1111 ? 5 : design?.gridColumns] || (is1111 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4');
  const bannerSources = useMemo(
    () => (page ? resolveCampaignPageBannerSources(page, language) : { desktop: '', tablet: '', mobile: '', fallback: '' }),
    [page, language],
  );
  const hasBanner = Boolean(page && (campaignPageHasBanner(page.banners, page.heroImage) || page.heroImage));
  const pageSections = Array.isArray(page?.sections) ? page.sections : [];
  const hasBuilderSections = pageSections.length > 0;
  const hasConfiguredSlider = pageSections.some(
    (section) => section.type === 'bannerSlider' && Array.isArray(section.slides) && section.slides.length > 0,
  );
  const handleFilterChange = useCallback((filters) => {
    setActiveFilters((current) => {
      const sameCategories = current.categories.join('|') === (filters.categories || []).join('|');
      const unchanged = sameCategories
        && current.sortBy === filters.sortBy
        && current.inStock === filters.inStock
        && current.rating === filters.rating
        && current.priceRange.min === filters.priceRange.min
        && current.priceRange.max === filters.priceRange.max;
      if (unchanged) return current;
      setVisibleCount(GRID_PAGE_SIZE);
      visibleCountRef.current = GRID_PAGE_SIZE;
      return filters;
    });
  }, []);
  const clearFilters = useCallback(() => {
    setVisibleCount(GRID_PAGE_SIZE);
    visibleCountRef.current = GRID_PAGE_SIZE;
    setActiveFilters(DEFAULT_FILTERS);
  }, []);
  const revealMoreProducts = useCallback((totalAvailable) => {
    if (scrollLoadingRef.current) return;
    if (visibleCountRef.current >= totalAvailable) return;
    scrollLoadingRef.current = true;
    setScrollLoading(true);
    window.setTimeout(() => {
      setVisibleCount((current) => {
        const next = Math.min(current + GRID_PAGE_SIZE, totalAvailable);
        visibleCountRef.current = next;
        return next;
      });
      scrollLoadingRef.current = false;
      setScrollLoading(false);
    }, 120);
  }, []);
  const filteredProducts = useMemo(
    () => sortProducts(applyProductFilters(products, activeFilters), activeFilters.sortBy),
    [products, activeFilters],
  );
  const hasActiveFilters = activeFilters.categories.length > 0
    || activeFilters.rating > 0
    || activeFilters.inStock
    || activeFilters.sortBy !== 'popularity'
    || activeFilters.priceRange.min > 0
    || activeFilters.priceRange.max < 100000;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      if (hasMoreRef.current) {
        void loadNextPage();
        return;
      }
      if (visibleCountRef.current < filteredProducts.length) {
        revealMoreProducts(filteredProducts.length);
      }
    }, { root: null, rootMargin: '700px 0px', threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [
    filteredProducts.length,
    hasMore,
    loadNextPage,
    loading,
    products.length,
    revealMoreProducts,
    visibleCount,
  ]);

  if (loading) {
    return (
      <div className="min-h-[50vh] px-4 py-10" style={{ background }}>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-10 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] animate-pulse rounded-lg bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {isArabic ? 'الصفحة غير موجودة' : 'Page not found'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isArabic
            ? 'قد تكون هذه الحملة منتهية أو غير منشورة.'
            : 'This campaign page may have ended or is not published.'}
        </p>
        <Link
          href="/shop"
          className="mt-6 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {isArabic ? 'تسوق الآن' : 'Continue shopping'}
        </Link>
      </div>
    );
  }

  const pageWidthClass = is1111
    ? 'mx-auto w-full px-2 sm:px-4 lg:px-6'
    : 'mx-auto w-full px-4 sm:px-6';
  const pageWidthStyle = { maxWidth: EMAIL_CAMPAIGN_BANNER_MAX_WIDTH };

  return (
    <div className="min-h-screen" style={{ background }} dir={isArabic ? 'rtl' : 'ltr'} lang={language}>
      <div className={`${pageWidthClass} pt-4 sm:pt-5`} style={pageWidthStyle}>
        <nav
          aria-label="Breadcrumb"
          className={`mb-3 flex flex-wrap items-center gap-1 text-sm text-gray-500 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}
        >
          <Link href="/" className="hover:text-orange-600 transition-colors">
            {t('category.home')}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-800">{title}</span>
        </nav>
      </div>

      {hasBanner && bannerSources.fallback && !hasConfiguredSlider && !is1111 ? (
        <div className="w-full">
          <div className={pageWidthClass} style={pageWidthStyle}>
            <div className="overflow-hidden rounded-2xl shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)] ring-1 ring-black/5">
              <picture>
                {bannerSources.desktop ? (
                  <source media="(min-width: 1024px)" srcSet={bannerSources.desktop} />
                ) : null}
                {bannerSources.tablet ? (
                  <source media="(min-width: 768px)" srcSet={bannerSources.tablet} />
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerSources.fallback}
                  alt=""
                  className="block h-auto w-full max-w-full object-contain"
                />
              </picture>
            </div>
          </div>
          <div className="mt-4 border-b border-black/5" style={{ background: `linear-gradient(180deg, ${accent}12 0%, transparent 100%)` }}>
            <div className={`${pageWidthClass} py-6`} style={pageWidthStyle}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
                {isArabic ? 'عرض خاص' : 'Limited-time drop'}
              </p>
              <h1 className={`mt-1 font-bold tracking-tight ${design ? titleSizeClass : 'text-2xl sm:text-3xl'}`} style={titleStyle}>{title}</h1>
              {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">{subtitle}</p> : null}
            </div>
          </div>
        </div>
      ) : !is1111 ? (
        <div
          className="border-b border-black/5"
          style={{ background: `linear-gradient(135deg, ${accent}18 0%, #ffffff 55%)` }}
        >
          <div className={`${pageWidthClass} py-8 sm:py-10`} style={pageWidthStyle}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
              {isArabic ? 'عروض مختارة' : 'Selected for you'}
            </p>
            <h1 className={`mt-2 font-bold tracking-tight ${design ? titleSizeClass : 'text-2xl sm:text-3xl'}`} style={titleStyle}>
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={`${pageWidthClass} min-h-[70vh] ${is1111 ? 'py-4 sm:py-6' : 'py-8'}`} style={pageWidthStyle}>
        {page.ctaLabel && page.ctaUrl ? (
          <div className="mb-6">
            <a
              href={page.ctaUrl}
              className="inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: accent }}
            >
              {page.ctaLabel}
            </a>
          </div>
        ) : null}

        {hasBuilderSections ? (
          <style>{`
            .campaign-page-grid { grid-template-columns: repeat(var(--campaign-mobile-columns), minmax(0, 1fr)); }
            @media (min-width: 768px) { .campaign-page-grid { grid-template-columns: repeat(var(--campaign-tablet-columns), minmax(0, 1fr)); } }
            @media (min-width: 1024px) { .campaign-page-grid { grid-template-columns: repeat(var(--campaign-desktop-columns), minmax(0, 1fr)); } }
          `}</style>
        ) : null}

        {hasBuilderSections ? (
            <div className="space-y-8">
              {pageSections.map((section, index) => {
                const sectionDesign = section.style || {};
                const widthMap = { narrow: 720, normal: 960, wide: 1200, full: EMAIL_CAMPAIGN_BANNER_MAX_WIDTH };
                const hasSectionBg = Boolean(sectionDesign.backgroundColor);
                const sectionStyle = {
                  maxWidth: widthMap[sectionDesign.contentWidth] || EMAIL_CAMPAIGN_BANNER_MAX_WIDTH,
                  marginInline: 'auto',
                  padding: is1111 ? 0 : `${Number(sectionDesign.padding ?? 16)}px`,
                  backgroundColor: sectionDesign.backgroundColor || 'transparent',
                  color: sectionDesign.textColor || undefined,
                  textAlign: sectionDesign.alignment || 'left',
                  borderRadius: hasSectionBg ? 20 : undefined,
                  overflow: hasSectionBg ? 'hidden' : undefined,
                };
                if (section.type === 'bannerSlider') {
                  if (is1111) {
                    return (
                      <section key={section.id || `banner-${index}`} className="min-w-0">
                        <Campaign1111Hero
                          products={filteredProducts.length ? filteredProducts : products}
                          isArabic={isArabic}
                        />
                      </section>
                    );
                  }
                  return (
                    <section key={section.id || `banner-${index}`} style={sectionStyle}>
                      <CampaignPageBannerSlider slides={section.slides} title={title} className="overflow-hidden" />
                    </section>
                  );
                }
                if (section.type === 'textBlock') {
                  if (is1111) return null;
                  const textSize = section.textSize === 'large' ? 'text-base sm:text-lg' : section.textSize === 'small' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base';
                  const headingSize = section.textSize === 'large'
                    ? 'text-2xl sm:text-4xl tracking-tight'
                    : section.textSize === 'small'
                      ? 'text-lg'
                      : 'text-xl sm:text-2xl';
                  return (
                    <section key={section.id || `text-${index}`} style={sectionStyle}>
                      {section.heading ? <h2 className={`mb-2 font-bold ${headingSize}`}>{section.heading}</h2> : null}
                      <p className={`${textSize} whitespace-pre-line leading-relaxed opacity-95`}>{section.content}</p>
                    </section>
                  );
                }
                if (section.type === 'image') {
                  if (is1111 && String(section.imageUrl || '').includes('/banners/11-11')) return null;
                  if (!section.imageUrl) return null;
                  const image = (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={section.imageUrl} alt={section.alt || ''} className={`mx-auto max-h-[560px] w-full ${section.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} />
                  );
                  return (
                    <section key={section.id || `image-${index}`} style={sectionStyle}>
                      {section.linkUrl ? <a href={section.linkUrl}>{image}</a> : image}
                    </section>
                  );
                }
                if (section.type === 'button') {
                  if (is1111) return null;
                  if (!section.label || !section.url) return null;
                  const sizeClass = section.size === 'large' ? 'px-7 py-3.5 text-base' : section.size === 'small' ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm';
                  return (
                    <section key={section.id || `button-${index}`} style={sectionStyle}>
                      <a
                        href={section.url}
                        className={`inline-flex rounded-full font-semibold ${sizeClass} ${section.variant === 'outline' ? 'border-2 bg-transparent' : 'text-white'}`}
                        style={{
                          borderColor: accent,
                          color: section.variant === 'outline' ? accent : '#fff',
                          backgroundColor: section.variant === 'outline' ? 'transparent' : accent,
                        }}
                      >
                        {section.label}
                      </a>
                    </section>
                  );
                }
                if (section.type === 'video') {
                  if (!section.videoUrl) return null;
                  return (
                    <section key={section.id || `video-${index}`} style={sectionStyle}>
                      <iframe
                        src={section.videoUrl}
                        title={section.caption || 'Campaign video'}
                        className="aspect-video w-full rounded-lg"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                      {section.caption ? <p className="mt-2 text-sm">{section.caption}</p> : null}
                    </section>
                  );
                }
                if (section.type === 'spacer') {
                  return (
                    <div
                      key={section.id || `spacer-${index}`}
                      aria-hidden="true"
                      style={{ height: `${Number(section.height) || 48}px`, backgroundColor: sectionDesign.backgroundColor || 'transparent' }}
                    />
                  );
                }
                if (section.type !== 'productGrid') return null;
                const sectionProducts = Object.prototype.hasOwnProperty.call(productsBySection, String(section.id || ''))
                  ? productsBySection[String(section.id || '')]
                  : filteredProducts;
                const visibleGridProducts = sortProducts(
                  applyProductFilters(sectionProducts, activeFilters),
                  activeFilters.sortBy,
                );
                const columns = Number(section.gridColumns || design?.gridColumns || (is1111 ? 5 : 4));
                const desktopColumns = Math.min(6, Math.max(2, is1111 ? 5 : columns));
                const tabletColumns = Math.min(6, Math.max(1, Number(section.tabletGridColumns || design?.tabletGridColumns || (is1111 ? 3 : 3))));
                const mobileColumns = Math.min(3, Math.max(1, Number(section.mobileGridColumns || design?.mobileGridColumns || 2)));
                const isFirstGrid = index === pageSections.findIndex((item) => item.type === 'productGrid');
                const isLastGrid = !pageSections.slice(index + 1).some((item) => item.type === 'productGrid');
                const displayTotal = visibleGridProducts.length;
                const safeVisible = Math.min(visibleCount, displayTotal || GRID_PAGE_SIZE);
                const pagedProducts = visibleGridProducts.slice(0, safeVisible);
                const rangeFrom = pagedProducts.length ? 1 : 0;
                const rangeTo = pagedProducts.length;
                const canScrollMore = safeVisible < displayTotal;
                return (
                  <section
                    key={section.id || `products-${index}`}
                    id={isFirstGrid ? 'deals-grid' : undefined}
                    ref={isFirstGrid ? gridTopRef : undefined}
                    className="min-w-0"
                    style={{
                      ...sectionStyle,
                      backgroundColor: is1111 ? 'transparent' : sectionStyle.backgroundColor,
                    }}
                  >
                    {is1111 ? (
                      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-3">
                        <div>
                          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                            {isArabic ? 'كل عروض 11.11' : 'All 11.11 deals'}
                          </h2>
                          <p className="mt-1 text-sm text-zinc-500">
                            {t('shop.showingRange', {
                              from: rangeFrom,
                              to: rangeTo,
                              total: displayTotal,
                              label: displayTotal === 1 ? t('common.product') : t('common.products'),
                            })}
                          </p>
                        </div>
                        {isFirstGrid ? (
                          <button
                            type="button"
                            onClick={() => setMobileFiltersOpen(true)}
                            className="inline-flex items-center gap-2 border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                          >
                            <Filter size={15} />
                            {t('category.filtersAndSort')}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <div
                          className="mb-5 overflow-hidden rounded-2xl border border-black/5 px-5 py-6 text-center text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] sm:px-8"
                          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)` }}
                        >
                          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            {section.title || title}
                          </h2>
                        </div>
                        {isFirstGrid ? (
                          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
                            <p className="text-sm font-medium text-slate-700">
                              {t('shop.showingRange', {
                                from: rangeFrom,
                                to: rangeTo,
                                total: displayTotal,
                                label: displayTotal === 1 ? t('common.product') : t('common.products'),
                              })}
                            </p>
                            <button
                              type="button"
                              onClick={() => setMobileFiltersOpen(true)}
                              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                              style={{ background: accent }}
                            >
                              <Filter size={15} />
                              {t('category.filtersAndSort')}
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}

                    {pagedProducts.length ? (
                      <div
                        className={`campaign-page-grid grid items-stretch ${is1111 ? 'gap-2 sm:gap-3 lg:gap-4' : ''}`}
                        style={{
                          ...(is1111
                            ? {}
                            : { gap: `${Math.max(16, Number(section.gridGap || design?.gridGap || 16))}px` }),
                          '--campaign-mobile-columns': mobileColumns,
                          '--campaign-tablet-columns': tabletColumns,
                          '--campaign-desktop-columns': desktopColumns,
                        }}
                      >
                        {pagedProducts.map((product, productIndex) => (
                          <CampaignSaleProductCard
                            key={`${section.id || index}-${product.id}-${productIndex}`}
                            product={product}
                            accent={accent}
                            itemListId={`campaign-${slug}`}
                            itemListName={title || 'Campaign'}
                            itemListIndex={productIndex}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
                        <p className="text-lg text-gray-500">{t('category.noMatch')}</p>
                      </div>
                    )}

                    {isLastGrid && (canScrollMore || hasMore) ? (
                      <div ref={sentinelRef} className="mt-8 flex min-h-20 flex-col items-center justify-center gap-3 py-6">
                        {(scrollLoading || loadingMore) ? (
                          <p className="text-sm text-slate-500">{t('category.loadingMore')}</p>
                        ) : canScrollMore ? (
                          <button
                            type="button"
                            onClick={() => revealMoreProducts(displayTotal)}
                            className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                          >
                            {isArabic ? 'عرض المزيد' : 'Load more'}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                );
            })}
          </div>
        ) : null}

        {!hasBuilderSections ? (
          <>
            {is1111 ? (
              <div className="mb-6">
                <Campaign1111Hero
                  products={filteredProducts.length ? filteredProducts : products}
                  isArabic={isArabic}
                />
              </div>
            ) : (
              <div
                className="mb-5 overflow-hidden rounded-2xl border border-black/5 px-5 py-6 text-center text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] sm:px-8"
                style={{ background: 'linear-gradient(135deg, #0b1220 0%, #1e293b 55%, #0f172a 100%)' }}
              >
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
              </div>
            )}

            {(() => {
              const legacyTotal = filteredProducts.length;
              const legacyVisible = Math.min(visibleCount, legacyTotal || GRID_PAGE_SIZE);
              const legacyPaged = filteredProducts.slice(0, legacyVisible);
              const canScrollMore = legacyVisible < legacyTotal;
              return (
                <>
                  <div
                    ref={gridTopRef}
                    id="deals-grid"
                    className={`mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-3 ${isArabic ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={isArabic ? 'text-right' : 'text-left'}>
                      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                        {isArabic ? 'كل عروض 11.11' : 'All 11.11 deals'}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        {t('shop.showingRange', {
                          from: legacyPaged.length ? 1 : 0,
                          to: legacyPaged.length,
                          total: legacyTotal,
                          label: legacyTotal === 1 ? t('common.product') : t('common.products'),
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileFiltersOpen(true)}
                      className={`inline-flex items-center gap-2 border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 ${isArabic ? 'flex-row-reverse' : ''}`}
                    >
                      <Filter size={15} />
                      {t('category.filtersAndSort')}
                    </button>
                  </div>

                  {legacyPaged.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                      <p className="text-lg text-gray-500">{t('category.noMatch')}</p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-4 rounded-full px-6 py-2 text-white"
                          style={{ background: accent }}
                        >
                          {t('category.clearFilters')}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      className={`grid items-stretch ${design ? gridColumnsClass : 'grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'}`}
                      style={design ? { gap: `${Math.max(16, design.gridGap || 16)}px` } : undefined}
                    >
                      {legacyPaged.map((product, productIndex) => (
                        <CampaignSaleProductCard
                          key={product.id}
                          product={product}
                          accent={accent}
                          itemListId={`campaign-${slug}`}
                          itemListName={title || 'Campaign'}
                          itemListIndex={productIndex}
                        />
                      ))}
                    </div>
                  )}

                  {canScrollMore || hasMore ? (
                    <div ref={sentinelRef} className="mt-8 flex min-h-20 flex-col items-center justify-center gap-3 py-6">
                      {(scrollLoading || loadingMore) ? (
                        <p className="text-sm text-slate-500">{t('category.loadingMore')}</p>
                      ) : canScrollMore ? (
                        <button
                          type="button"
                          onClick={() => revealMoreProducts(legacyTotal)}
                          className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                          {isArabic ? 'عرض المزيد' : 'Load more'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              );
            })()}
          </>
        ) : null}

      </div>

      {portalReady && mobileFiltersOpen
        ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-stretch justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label={t('category.closeFilters')}
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('category.filtersAndSort')}
              className={`relative flex h-full w-full max-w-full flex-col bg-white shadow-2xl sm:w-[min(100%,380px)] ${isArabic ? 'mr-auto' : 'ml-auto'}`}
            >
              <div className={`flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <h2 className="text-lg font-semibold text-zinc-900">{t('category.filtersAndSort')}</h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
                  aria-label={t('category.closeFilters')}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3">
                <ProductFilterSidebar
                  products={products}
                  onFilterChange={handleFilterChange}
                  initialFilters={activeFilters}
                  embedded
                />
              </div>
              <div className="shrink-0 border-t border-zinc-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full rounded-md bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  {t('category.showProducts', { count: filteredProducts.length })}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}
