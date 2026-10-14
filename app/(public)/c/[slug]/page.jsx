'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Filter, X } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import ProductFilterSidebar from '@/components/ProductFilterSidebar';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { sortOutOfStockLast } from '@/lib/productVisibility';
import {
  EMAIL_CAMPAIGN_BANNER_MAX_WIDTH,
  campaignPageHasBanner,
  resolveCampaignPageBannerSources,
} from '@/lib/emailCampaignPageHelpers';

const LANDING_PAGE_SIZE = 20;

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
  const { t, language, isArabic } = useStorefrontI18n();
  const [page, setPage] = useState(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const sentinelRef = useRef(null);
  const nextPageRef = useRef(2);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);

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
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/campaign-pages/${encodeURIComponent(slug)}?page=1&limit=${LANDING_PAGE_SIZE}`, {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        const pageDoc = data?.page && typeof data.page === 'object' ? data.page : null;
        if (!response.ok || !pageDoc) {
          setNotFound(true);
          setPage(null);
          setProducts([]);
          setTotal(0);
          setHasMore(false);
          return;
        }
        const firstProducts = stampPageOrder(Array.isArray(data.products) ? data.products : []);
        setNotFound(false);
        setPage(pageDoc);
        setProducts(firstProducts);
        setTotal(Number(data.total) || firstProducts.length);
        hasMoreRef.current = Boolean(data.hasMore);
        setHasMore(Boolean(data.hasMore));
        nextPageRef.current = 2;
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setPage(null);
          setProducts([]);
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
  }, [slug]);

  const loadNextPage = useCallback(async () => {
    if (!slug || loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const pageToLoad = nextPageRef.current;
    try {
      const response = await fetch(
        `/api/public/campaign-pages/${encodeURIComponent(slug)}?page=${pageToLoad}&limit=${LANDING_PAGE_SIZE}`,
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
  }, [slug]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      void loadNextPage();
    }, { root: null, rootMargin: '900px 0px', threshold: 0 });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadNextPage, loading, products.length]);

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

  const accent = page?.accentColor || '#0f766e';
  const background = page?.backgroundColor || '#f8fafc';
  const bannerSources = useMemo(
    () => (page ? resolveCampaignPageBannerSources(page, language) : { desktop: '', tablet: '', mobile: '', fallback: '' }),
    [page, language],
  );
  const hasBanner = Boolean(page && (campaignPageHasBanner(page.banners, page.heroImage) || page.heroImage));
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
      return filters;
    });
  }, []);
  const clearFilters = useCallback(() => {
    setActiveFilters(DEFAULT_FILTERS);
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

  const pageWidthClass = 'mx-auto w-full px-4 sm:px-6';
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

      {hasBanner && bannerSources.fallback ? (
        <div className="w-full">
          <div className={pageWidthClass} style={pageWidthStyle}>
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
                className="block h-auto w-full max-w-full rounded-xl object-contain"
              />
            </picture>
          </div>
          <div className="mt-4 border-b border-slate-200/80 bg-white/70">
            <div className={`${pageWidthClass} py-6`} style={pageWidthStyle}>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">{subtitle}</p> : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-slate-200/80 bg-white/70">
          <div className={`${pageWidthClass} py-8`} style={pageWidthStyle}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
              {isArabic ? 'عروض مختارة' : 'Selected for you'}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">{subtitle}</p> : null}
          </div>
        </div>
      )}

      <div className={`${pageWidthClass} py-8`} style={pageWidthStyle}>
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

        <div className={`mb-4 flex items-center justify-between lg:hidden ${isArabic ? 'flex-row-reverse' : ''}`}>
          <p className="text-sm text-gray-600">
            {t('shop.showingRange', {
              from: filteredProducts.length ? 1 : 0,
              to: filteredProducts.length,
              total: total || filteredProducts.length,
              label: (total || filteredProducts.length) === 1 ? t('common.product') : t('common.products'),
            })}
          </p>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className={`flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${isArabic ? 'flex-row-reverse' : ''}`}
          >
            <Filter size={16} />
            {t('category.filtersAndSort')}
          </button>
        </div>

        <div className="flex gap-6">
          <div className="hidden w-56 shrink-0 lg:block">
            <ProductFilterSidebar
              products={products}
              onFilterChange={handleFilterChange}
              initialFilters={activeFilters}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-4 hidden text-sm text-gray-600 lg:block">
              {t('shop.showingRange', {
                from: filteredProducts.length ? 1 : 0,
                to: filteredProducts.length,
                total: total || filteredProducts.length,
                label: (total || filteredProducts.length) === 1 ? t('common.product') : t('common.products'),
              })}
            </p>

            {filteredProducts.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
                <p className="text-lg text-gray-500">{t('category.noMatch')}</p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-lg bg-orange-500 px-6 py-2 text-white transition hover:bg-orange-600"
                  >
                    {t('category.clearFilters')}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {hasMore ? (
              <div ref={sentinelRef} className="mt-8 flex min-h-16 items-center justify-center py-6 text-sm text-gray-500">
                {loadingMore ? t('category.loadingMore') : null}
              </div>
            ) : null}
          </div>
        </div>

        {mobileFiltersOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label={t('category.closeFilters')}
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className={`absolute top-0 flex h-full w-[min(100%,340px)] flex-col bg-white shadow-xl ${isArabic ? 'left-0' : 'right-0'}`}>
              <div className={`flex items-center justify-between border-b border-gray-200 px-4 py-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <h2 className="text-lg font-semibold text-gray-900">{t('category.filtersAndSort')}</h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label={t('category.closeFilters')}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <ProductFilterSidebar
                  products={products}
                  onFilterChange={handleFilterChange}
                  initialFilters={activeFilters}
                  className="!static !max-h-none !w-full !border-0 !shadow-none"
                />
              </div>
              <div className="border-t border-gray-200 p-4">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  {t('category.showProducts', { count: filteredProducts.length })}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
