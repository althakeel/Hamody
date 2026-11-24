'use client'

import React, { useEffect, useMemo, useState } from 'react'
import SafeNextImage from '@/components/SafeNextImage'
import Link from 'next/link'
import ProductCarousel from '@/components/ProductCarousel'
import {
  CATEGORY_SLIDER_SIDE_IMAGE_CLASS,
  CATEGORY_SLIDER_LAYOUT_CLASS,
  HOME_SECTION_CLASS,
  HOME_SECTION_GRID_INNER_CLASS,
  CATEGORY_SLIDER_PANEL_CLASS,
  SIDE_IMAGE_SLIDER_PANEL_CLASS,
  getSideImageLayoutCardsPerRow,
  getCategorySliderProductCardClass,
} from '@/lib/storefrontCarousel'
import { normalizeCategorySliderBackground, normalizeCategorySliderSideImagePosition, normalizeCategorySliderAutoSlide, normalizeCategorySliderAutoSlideInterval, filterCategorySliderProducts } from '@/lib/categorySliderTheme'
import { HomeSideImageSliderSkeleton } from '@/components/home/HomeSectionSkeletons'
import CategorySliderBanner from '@/components/CategorySliderBanner'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'
import { getContentDirection } from '@/lib/storefrontLanguage'
import { getLocalizedCategorySliderSideImage, getLocalizedCategorySliderSubtitle, getLocalizedCategorySliderTitle } from '@/lib/categorySliderCopy'
import { capCarouselProducts } from '@/lib/categorySliderAutoSlide'

const Section4 = ({ sections: initialSections = null, loading: loadingProp = false }) => {
  const shouldSelfFetch = initialSections == null
  const [sections, setSections] = useState(Array.isArray(initialSections) ? initialSections : [])
  const [loading, setLoading] = useState(loadingProp || shouldSelfFetch)

  useEffect(() => {
    let cancelled = false

    fetch('/api/public/featured-sections')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setSections(Array.isArray(data.sections) ? data.sections : [])
      })
      .catch(() => {
        if (!cancelled && !Array.isArray(initialSections)) setSections([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialSections])

  if (loading) {
    return (
      <div className={HOME_SECTION_CLASS}>
        <div className={`${HOME_SECTION_GRID_INNER_CLASS} space-y-8`}>
          {Array.from({ length: 2 }).map((_, index) => (
            <HomeSideImageSliderSkeleton key={`section4-skeleton-${index}`} withSideImage={index === 0} />
          ))}
        </div>
      </div>
    )
  }

  if (!sections || sections.length === 0) return null

  return (
    <div className={HOME_SECTION_CLASS}>
      <div className={`${HOME_SECTION_GRID_INNER_CLASS} space-y-8`}>
        {sections.map((section, sectionIdx) => {
          const isBanner = String(section?.sectionType || '').toLowerCase() === 'banner'
          const key = section._id || section.id || sectionIdx
          const body = isBanner ? (
            <CategorySliderBanner section={section} />
          ) : (
            <HorizontalSlider section={section} priority={sectionIdx === 0} />
          )

          return (
            <div key={key}>
              {body}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SkeletonLoader = ({ hasSideImage = false, cardsPerRow = 6 }) => {
  if (hasSideImage) {
    return <HomeSideImageSliderSkeleton withSideImage cardsPerRow={cardsPerRow} showTitle={false} />
  }

  return (
    <div className="flex gap-3 overflow-hidden pb-2">
      {[...Array(cardsPerRow === 5 ? 5 : 6)].map((_, idx) => (
        <div
          key={idx}
          className={`${getCategorySliderProductCardClass(cardsPerRow)} overflow-hidden rounded-[2px] border border-gray-100 bg-white animate-pulse`}
        >
          <div className="aspect-square w-full bg-gray-100" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-4/5 rounded bg-gray-100" />
            <div className="h-4 w-1/2 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

function resolveSectionProducts(section) {
  const products = Array.isArray(section?.products) ? section.products : []
  return filterCategorySliderProducts(products, section?.showOutOfStock)
}

const HorizontalSlider = ({ section, priority = false }) => {
  const { language, t } = useStorefrontI18n()
  const title = getLocalizedCategorySliderTitle(section, language)
  const subtitle = getLocalizedCategorySliderSubtitle(section, language)
  const embeddedProducts = useMemo(
    () => capCarouselProducts(resolveSectionProducts(section)),
    [section.products, section.showOutOfStock],
  )
  const cappedProductIds = useMemo(() => {
    const ids = Array.isArray(section.productIds)
      ? section.productIds.map((id) => String(id || '').trim()).filter(Boolean)
      : []
    return ids.slice(0, 12)
  }, [section.productIds])
  const hasResolvedCatalog = Array.isArray(section?.products) && (section.products.length > 0 || cappedProductIds.length === 0)
  const [sectionProducts, setSectionProducts] = useState(embeddedProducts)
  const [loading, setLoading] = useState(
    () => !hasResolvedCatalog && embeddedProducts.length === 0 && cappedProductIds.length > 0
  )
  const productIdsKey = useMemo(() => cappedProductIds.join(','), [cappedProductIds])

  useEffect(() => {
    if (hasResolvedCatalog || embeddedProducts.length > 0) {
      setSectionProducts(embeddedProducts)
      setLoading(false)
      return undefined
    }

    let cancelled = false

    const resolveProducts = async () => {
      if (!cappedProductIds.length) {
        if (!cancelled) {
          setSectionProducts([])
          setLoading(false)
        }
        return
      }

      setLoading(true)

      try {
        const response = await fetch('/api/products/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: cappedProductIds }),
        })

        if (response.ok) {
          const data = await response.json()
          if (!cancelled) {
            setSectionProducts(capCarouselProducts(filterCategorySliderProducts(
              Array.isArray(data?.products) ? data.products : [],
              section.showOutOfStock,
            )))
            setLoading(false)
          }
          return
        }
      } catch {
        // Fall through to empty state.
      }

      if (!cancelled) {
        setSectionProducts([])
        setLoading(false)        
      }
    }

    resolveProducts()

    return () => {
      cancelled = true
    }
  }, [hasResolvedCatalog, cappedProductIds, embeddedProducts, productIdsKey, section.showOutOfStock])

  if (sectionProducts.length === 0 && !loading) return null

  const sideImage = getLocalizedCategorySliderSideImage(section, language)
  const hasSideImage = Boolean(sideImage)
  const sideImagePosition = normalizeCategorySliderSideImagePosition(section.sideImagePosition)
  const imageFirst = sideImagePosition === 'left'
  const cardsPerRow = getSideImageLayoutCardsPerRow(hasSideImage, section.cardsPerRow)
  const panelBackground = normalizeCategorySliderBackground(section.backgroundColor)
  const viewAllHref = String(section.viewAllHref || '').trim()
  const viewAllExternal = /^https?:\/\//i.test(viewAllHref)
  const viewAllClass = 'inline-flex shrink-0 items-center gap-1 pt-0.5 text-sm font-semibold text-slate-900 hover:text-blue-700'
  const sideImageHref = String(section.sideImageHref || '').trim()
  const sideImageExternal = /^https?:\/\//i.test(sideImageHref)
  const shouldAutoSlide =
    sectionProducts.length > 1 &&
    normalizeCategorySliderAutoSlide(section.autoSlide)

  const sideImageMedia = (
    <SafeNextImage
      src={sideImage}
      alt={title || 'Featured collection'}
      fill
      className="object-contain"
      sizes="(max-width: 1023px) 100vw, (min-width: 1536px) 320px, (min-width: 1280px) 280px, 240px"
      priority={false}
    />
  )

  const sideImageBlock = hasSideImage ? (
    sideImageHref ? (
      sideImageExternal ? (
        <a
          href={sideImageHref}
          className={`${CATEGORY_SLIDER_SIDE_IMAGE_CLASS} block transition hover:opacity-95`}
          aria-label={title || 'Open linked page'}
        >
          {sideImageMedia}
        </a>
      ) : (
        <Link
          href={sideImageHref}
          className={`${CATEGORY_SLIDER_SIDE_IMAGE_CLASS} block transition hover:opacity-95`}
          aria-label={title || 'Open linked page'}
        >
          {sideImageMedia}
        </Link>
      )
    ) : (
      <div className={CATEGORY_SLIDER_SIDE_IMAGE_CLASS}>
        {sideImageMedia}
      </div>
    )
  ) : null

  const sliderPanel = (
    <div
      className={`min-w-0 w-full ${hasSideImage ? SIDE_IMAGE_SLIDER_PANEL_CLASS : CATEGORY_SLIDER_PANEL_CLASS} rounded-2xl px-3 py-3 xl:px-4 xl:py-4`}
      style={{ backgroundColor: panelBackground }}
    >
      <div className={`${hasSideImage ? 'mb-3 shrink-0 lg:mb-2' : 'mb-3 lg:mb-5'}`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className={`min-w-0 text-start font-bold text-gray-900 ${hasSideImage ? 'text-lg lg:line-clamp-1 lg:text-base xl:text-lg' : 'text-xl lg:text-2xl'}`}>
            <bdi dir={getContentDirection(title)}>{title}</bdi>
          </h2>
          {viewAllHref ? (
            viewAllExternal ? (
              <a href={viewAllHref} className={viewAllClass}>
                {t('navbar.viewAll')}
                <span aria-hidden="true">›</span>
              </a>
            ) : (
              <Link href={viewAllHref} className={viewAllClass}>
                {t('navbar.viewAll')}
                <span aria-hidden="true">›</span>
              </Link>
            )
          ) : null}
        </div>
        {subtitle ? (
          <p
            className={`text-start text-gray-500 ${hasSideImage ? 'mt-0.5 line-clamp-2 text-xs lg:line-clamp-1 lg:text-[10px] xl:text-xs' : 'mt-0.5 text-xs lg:text-sm'}`}
          >
            <bdi dir={getContentDirection(subtitle)}>{subtitle}</bdi>
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className={`px-0 ${hasSideImage ? 'min-h-0 flex-1' : ''}`}>
          <SkeletonLoader hasSideImage={hasSideImage} cardsPerRow={cardsPerRow} />
        </div>
      ) : (
        <div className="min-w-0 w-full overflow-hidden">
          <ProductCarousel
            products={sectionProducts}
            priorityCount={priority ? (hasSideImage ? 4 : 3) : 0}
            cardsPerRow={cardsPerRow}
            cardWidthVariant="categorySlider"
            autoSlide={shouldAutoSlide}
            autoSlideIntervalMs={normalizeCategorySliderAutoSlideInterval(section.autoSlideIntervalMs)}
            showArrows={!shouldAutoSlide}
            showMobileArrows={!shouldAutoSlide}
            edgeBleed={!hasSideImage}
            className="w-full min-w-0"
          />
        </div>
      )}
    </div>
  )

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className={hasSideImage ? CATEGORY_SLIDER_LAYOUT_CLASS : ''}>
        {imageFirst ? sideImageBlock : null}
        {sliderPanel}
        {!imageFirst ? sideImageBlock : null}
      </div>
    </div>
  )
}

export default Section4
