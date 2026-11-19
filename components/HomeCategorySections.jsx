'use client'

import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import ProductCarousel from '@/components/ProductCarousel'
import {
  HOME_SECTION_CLASS,
  HOME_SECTION_GRID_INNER_CLASS,
  HOME_SECTION_TITLE_CLASS,
  PRODUCT_CARD_GRID_CLASS_5,
  homepageTwoRowItemClass,
} from '@/lib/storefrontCarousel'
import { getLocalizedCategoryName } from '@/lib/categoryLocalization'
import { toPublicCategoryPath } from '@/lib/categorySlug'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'
import SectionReveal from '@/components/SectionReveal'

const CAROUSEL_SECTION_SLUGS = new Set(['outdoor-camping'])

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
        if (CAROUSEL_SECTION_SLUGS.has(String(section.slug || '').trim().toLowerCase())) {
          return (
            <section key={section._id || section.slug} className="w-full bg-[#EFFCC4]">
              <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
                <SectionReveal>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold uppercase tracking-wide text-black sm:text-2xl">
                      <Link href={href} className="hover:opacity-80">
                        {title}
                      </Link>
                    </h2>
                    <Link
                      href={href}
                      className="inline-flex shrink-0 items-center rounded-full bg-[#C8F404] px-4 py-1.5 text-sm font-semibold text-[#05090D] transition hover:opacity-90"
                    >
                      {t('categories.viewAll')}
                    </Link>
                  </div>
                </SectionReveal>
                <SectionReveal className="w-full min-w-0" delay={90}>
                  <ProductCarousel
                    products={section.products}
                    cardsPerRow={5}
                    showArrows
                    showMobileArrows
                    arrowsOutside
                    edgeBleed={false}
                    priorityCount={2}
                  />
                </SectionReveal>
              </div>
            </section>
          )
        }
        return (
          <section key={section._id || section.slug} className={HOME_SECTION_CLASS}>
            <div className={HOME_SECTION_GRID_INNER_CLASS}>
              <SectionReveal>
                <h2 className={HOME_SECTION_TITLE_CLASS}>
                  <Link href={href} className="hover:opacity-80">
                    {title}
                  </Link>
                </h2>
              </SectionReveal>
              <div className={PRODUCT_CARD_GRID_CLASS_5}>
                {section.products.map((product, index) => (
                  <SectionReveal key={product._id || product.id || `${section.slug}-${index}`} className={`h-full min-w-0 ${homepageTwoRowItemClass(index, 5)}`} delay={(index % 5) * 60}>
                    <ProductCard
                      product={product}
                      priorityImages={index < 2}
                    />
                  </SectionReveal>
                ))}
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}
