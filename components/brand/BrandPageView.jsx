'use client';

import Link from 'next/link';
import { CreditCard, ShieldCheck, Truck, Wallet } from 'lucide-react';
import CategoryBanner from '@/components/category/CategoryBanner';
import CategoryHeroCard from '@/components/category/CategoryHeroCard';
import CategoryProductsPanel from '@/components/category/CategoryProductsPanel';
import { getCategoryBannerUrls } from '@/lib/categoryBanners';
import { getLocalizedCategoryDescription, getLocalizedCategoryName } from '@/lib/categoryLocalization';
import { decodeHtmlEntities } from '@/lib/displayText';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

export default function BrandPageView({
  brand,
  products = [],
  total = 0,
  stats = {},
}) {
  const { t, language } = useStorefrontI18n();
  const isArabic = language === 'ar';
  const name = decodeHtmlEntities(getLocalizedCategoryName(brand, language));
  const localizedDescription = getLocalizedCategoryDescription(brand, language);
  const banners = getCategoryBannerUrls(brand, { isArabic });
  const slug = String(brand?.slug || '').trim();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-4 sm:px-6 md:py-8" dir={isArabic ? 'rtl' : 'ltr'}>
      <nav className={`mb-4 text-sm text-slate-500 ${isArabic ? 'text-right' : ''}`} aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-800">{t('category.home')}</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{name}</span>
      </nav>

      {banners.hasBanner ? (
        <CategoryBanner
          desktopSrc={banners.desktop}
          tabletSrc={banners.tablet}
          mobileSrc={banners.mobile}
          alt={name}
        />
      ) : null}

      <CategoryHeroCard
        name={name}
        image={brand?.image || ''}
        description={decodeHtmlEntities(localizedDescription.text)}
        descriptionRtl={localizedDescription.isRtl}
        stats={stats}
        t={t}
        isArabic={isArabic}
      />

      {products.length > 0 || Number(total) > 0 ? (
        <CategoryProductsPanel
          moreProductsHref={slug ? `/api/public/brand-products?slug=${encodeURIComponent(slug)}` : ''}
          products={products}
          totalCount={total}
        />
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 text-lg">{t('category.noProducts')}</p>
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 pt-8 sm:grid-cols-4">
        {[
          { icon: ShieldCheck, label: t('category.trust.warranty') },
          { icon: Truck, label: t('category.trust.freeDelivery') },
          { icon: Wallet, label: t('category.trust.cod') },
          { icon: CreditCard, label: t('category.trust.instalments') },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 ${isArabic ? 'flex-row-reverse text-right' : ''}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Icon size={16} strokeWidth={1.9} />
            </span>
            <span className="font-medium leading-snug">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
