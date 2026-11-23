'use client'

import Link from 'next/link'
import ProductCarousel from '@/components/ProductCarousel'
import { HOME_SECTION_CLASS, HOME_SECTION_GRID_INNER_CLASS } from '@/lib/storefrontCarousel'
import { getLocalizedCategoryName } from '@/lib/categoryLocalization'
import { toPublicCategoryPath } from '@/lib/categorySlug'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'
import SectionReveal from '@/components/SectionReveal'

export default function HomeCategorySections({ sections = [] }) {
  const { language, t } = useStorefrontI18n()
  const list = (Array.isArray(sections) ? sections : []).filter(
    (section) => Array.isArray(section?.products) && section.products.length > 0,
  )

  if (!list.length) return null

  return (
    <>
      {list.map((section) => {
        const title = getLocalizedCategoryName(section, language)
        if (!title) return null
        const href = toPublicCategoryPath(section.slug)
        const listedCount = section.products.length
        const totalCount = Number(section.productCount) || listedCount
        const hasMoreThanShown = totalCount > 5 || listedCount > 5
        return (
          <section key={section._id || section.slug} className={HOME_SECTION_CLASS}>
            <div className={HOME_SECTION_GRID_INNER_CLASS}>
              <SectionReveal>
                <div className={`mb-4 flex items-center justify-between gap-3 ${hasMoreThanShown ? 'px-[3.25rem]' : ''}`}>
                  <h2 className="text-base font-semibold text-black sm:text-lg md:text-[28px]">
                    <Link href={href} className="hover:opacity-80">
                      {title}
                    </Link>
                  </h2>
                  {hasMoreThanShown ? (
                    <Link
                      href={href}
                      className="shrink-0 border-b border-black pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-black sm:text-xs"
                    >
                      {t('categories.seeAll')}
                    </Link>
                  ) : null}
                </div>
              </SectionReveal>
              <SectionReveal className="w-full min-w-0" delay={90}>
                <ProductCarousel
                  products={section.products}
                  cardsPerRow={5}
                  showArrows={hasMoreThanShown}
                  showMobileArrows={hasMoreThanShown}
                  alwaysShowArrows={hasMoreThanShown}
                  arrowVariant={hasMoreThanShown ? 'namshi' : 'default'}
                  edgeBleed={false}
                  priorityCount={2}
                />
              </SectionReveal>
            </div>
          </section>
        )
      })}
    </>
  )
}
