'use client';

import ProductCard from '@/components/ProductCard';
import { HOME_SECTION_INNER_CLASS } from '@/lib/storefrontCarousel';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { getContentDirection } from '@/lib/storefrontLanguage';
import { getLocalizedCategorySliderSubtitle, getLocalizedCategorySliderTitle } from '@/lib/categorySliderCopy';

export default function CategorySliderGridPage({ slider, products = [] }) {
  const { language } = useStorefrontI18n();
  const title = getLocalizedCategorySliderTitle(slider, language);
  const subtitle = getLocalizedCategorySliderSubtitle(slider, language);

  return (
    <div className={`${HOME_SECTION_INNER_CLASS} py-8`}>
      <h1 className="text-start text-2xl font-bold text-slate-900 sm:text-3xl">
        <bdi dir={getContentDirection(title)}>{title}</bdi>
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-3xl text-start text-sm text-slate-500 sm:text-base">
          <bdi dir={getContentDirection(subtitle)}>{subtitle}</bdi>
        </p>
      ) : null}
      {products.length ? (
        <div className="mt-6 grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={String(product._id)} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-slate-500">{language === 'ar' ? 'لا توجد منتجات في هذه القائمة.' : 'No products in this list.'}</p>
      )}
    </div>
  );
}
