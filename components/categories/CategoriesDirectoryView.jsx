'use client';

import Link from 'next/link';
import { decodeHtmlEntities } from '@/lib/displayText';
import { getLocalizedCategoryName } from '@/lib/categoryLocalization';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { resolveCategoryHref } from '@/lib/categoryTreeUtils';
import RecentlyViewedSection from '@/components/categories/RecentlyViewedSection';

function getCategoryLabel(category, language) {
  return decodeHtmlEntities(getLocalizedCategoryName(category, language));
}

function CategoryHref({ category, ancestors = [], className, children }) {
  const href = resolveCategoryHref(ancestors, category);
  if (!href || href === '/shop') {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function findCategoryImage(category, childrenByParent) {
  const own = String(category?.image || '').trim();
  if (own) return own;
  const children = childrenByParent[String(category?._id)] || [];
  for (const child of children) {
    const nested = findCategoryImage(child, childrenByParent);
    if (nested) return nested;
  }
  return '';
}

function EmptyCategoriesState({ t, isArabic }) {
  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-[1400px] flex-col items-center justify-center px-4 py-20 text-center"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <p className="text-xl font-semibold text-[#05090D]">{t('categories.emptyTitle')}</p>
      <p className="mt-2 max-w-md text-sm text-[#05090D]/70">{t('categories.emptySubtitle')}</p>
    </div>
  );
}

export default function CategoriesDirectoryView({
  parentCategories,
  childrenByParent,
}) {
  const { t, language, isArabic } = useStorefrontI18n();

  if (!parentCategories.length) {
    return <EmptyCategoriesState t={t} isArabic={isArabic} />;
  }

  return (
    <div className="min-h-screen bg-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className="bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
          <span className="inline-flex items-center rounded-full bg-[#F8FEE6] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#5E6870]">
            {parentCategories.length} {t('shop.categories')}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#05090D] sm:text-4xl">
            {t('categories.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#05090D]/75">
            {t('categories.subtitle', { count: parentCategories.length })}
          </p>

          <nav className="mt-6 grid max-w-3xl grid-cols-2 gap-4" aria-label={t('categories.title')}>
            {parentCategories.map((parent) => {
              const label = getCategoryLabel(parent, language);
              const image = findCategoryImage(parent, childrenByParent);
              return (
                <CategoryHref
                  key={parent._id}
                  category={parent}
                  className="group overflow-hidden rounded-2xl border border-[#E2E7E8] bg-white transition hover:border-[#05090D]"
                >
                  <span className="block aspect-[4/3] overflow-hidden bg-[#F8FEE6]">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-3xl font-semibold text-[#05090D]">
                        {label.trim().charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="block px-3 py-2.5 text-sm font-semibold text-[#05090D] group-hover:text-[#05090D]">
                    {label}
                  </span>
                </CategoryHref>
              );
            })}
          </nav>
        </div>
      </section>
      <RecentlyViewedSection />
    </div>
  );
}
