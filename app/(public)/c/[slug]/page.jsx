'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import {
  EMAIL_CAMPAIGN_BANNER_MAX_WIDTH,
  campaignPageHasBanner,
  resolveCampaignPageBannerSources,
} from '@/lib/emailCampaignPageHelpers';

export default function CampaignLandingPage() {
  const params = useParams();
  const slug = String(params?.slug || '').trim();
  const { language, isArabic } = useStorefrontI18n();
  const [page, setPage] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/campaign-pages/${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok || !data?.page) {
          setNotFound(true);
          setPage(null);
          setProducts([]);
          return;
        }
        setNotFound(false);
        setPage(data.page);
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setPage(null);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

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

  return (
    <div className="min-h-screen" style={{ background }} dir={isArabic ? 'rtl' : 'ltr'} lang={language}>
      {hasBanner && bannerSources.fallback ? (
        <div className="w-full">
          <div className="mx-auto w-full px-4 sm:px-6" style={{ maxWidth: EMAIL_CAMPAIGN_BANNER_MAX_WIDTH }}>
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
          <div className="border-b border-slate-200/80 bg-white/70 px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">{subtitle}</p> : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-slate-200/80 bg-white/70 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
              {isArabic ? 'عروض مختارة' : 'Selected for you'}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">{subtitle}</p> : null}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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

        <p className="mb-4 text-sm text-slate-500">
          {products.length}{' '}
          {isArabic
            ? (products.length === 1 ? 'منتج' : 'منتجات')
            : (products.length === 1 ? 'product' : 'products')}
        </p>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
            {isArabic ? 'لا توجد منتجات متاحة حالياً.' : 'No products available on this page right now.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
