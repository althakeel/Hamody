'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'
import ProductCard from '@/components/ProductCard'
import ProductCarousel from '@/components/ProductCarousel'
import { HOME_SECTION_CLASS, HOME_SECTION_TITLE_CLASS, getHomeSectionProductCardClass } from '@/lib/storefrontCarousel'
import { HomeProductCardSkeleton } from '@/components/home/HomeSectionSkeletons'
import { localizeField } from '@/lib/storefrontLanguage'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'
import { FEATURED_PRODUCT_MAX, clampFeaturedColumns, clampFeaturedRows, featuredVisibleCount } from '@/lib/featuredProductLimit'
import { filterStorefrontInStockProducts } from '@/lib/productVisibility'

function normalizeLayoutStyle(style) {
  if (style === 'carousel' || style === 'horizontal') return 'carousel'
  return 'grid'
}

// Featured selection component (only show admin-selected featured products)
const BestSelling = ({
  initialProducts = null,
  initialLayout = null,
  sectionTitle = '',
  sectionTitleAr = '',
  sectionDescription = '',
  sectionDescriptionAr = '',
}) => {
  // Homepage SSR already applies published/in-stock filters — trust that list.
  const hasInitialProducts = Array.isArray(initialProducts) && initialProducts.length > 0
  const { language } = useStorefrontI18n()
  const [sectionCopy, setSectionCopy] = useState({
    sectionTitle,
    sectionTitleAr,
    sectionDescription,
    sectionDescriptionAr,
  })
  const [featuredProducts, setFeaturedProducts] = useState(hasInitialProducts ? initialProducts : [])
  const [isLoading, setIsLoading] = useState(!hasInitialProducts)
  const [error, setError] = useState(null)
  const [layoutSettings, setLayoutSettings] = useState(() => {
    const homeMenu = initialLayout || {}
    return {
      style: normalizeLayoutStyle(homeMenu.style),
      itemsPerRow: clampFeaturedColumns(homeMenu.itemsPerRow),
      rows: clampFeaturedRows(homeMenu.rows),
    }
  })
  const fetchControllerRef = useRef(null)
  const retryTimerRef = useRef(null)
  const featuredProductsLengthRef = useRef(hasInitialProducts ? initialProducts.length : 0)
  const isCarousel = layoutSettings.style === 'carousel'

  const fetchFeaturedAndSectionText = useCallback(async () => {
      fetchControllerRef.current?.abort()
      const controller = new AbortController()
      fetchControllerRef.current = controller
      const shouldShowSectionLoader = featuredProductsLengthRef.current === 0

      try {
        if (shouldShowSectionLoader) {
          setIsLoading(true)
        }
        setError(null)

        const noStore = { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        const [{ data: featuredData }, { data: appearanceData }] = await Promise.all([
          axios.get('/api/store/featured-products', {
            params: { includeProducts: true, limit: FEATURED_PRODUCT_MAX, fresh: Date.now() },
            headers: noStore,
            signal: controller.signal,
            timeout: 15000
          }),
          axios.get('/api/store/appearance/sections/public', {
            params: { fresh: Date.now() },
            headers: noStore,
            signal: controller.signal,
            timeout: 10000
          }).catch(() => ({ data: {} }))
        ])

        if (controller.signal.aborted) return

        const homeMenu = appearanceData?.homeMenuCategories || {}
        setLayoutSettings((prev) => ({
          style: normalizeLayoutStyle(homeMenu.style) || prev.style,
          itemsPerRow: clampFeaturedColumns(
            featuredData?.columns ?? homeMenu.itemsPerRow,
            prev.itemsPerRow,
          ),
          rows: clampFeaturedRows(featuredData?.rows ?? homeMenu.rows, prev.rows),
        }))

        setSectionCopy({
          sectionTitle: featuredData?.sectionTitle || '',
          sectionTitleAr: featuredData?.sectionTitleAr || '',
          sectionDescription: featuredData?.sectionDescription || '',
          sectionDescriptionAr: featuredData?.sectionDescriptionAr || '',
        })

        const resolvedProducts = filterStorefrontInStockProducts(
          (Array.isArray(featuredData.products) ? featuredData.products : [])
            .filter((product) => product?.published !== false)
        )
        if (resolvedProducts.length > 0) {
          featuredProductsLengthRef.current = resolvedProducts.length
          setFeaturedProducts(resolvedProducts)
          return
        }

        if (featuredProductsLengthRef.current > 0) return

        // Fetch featured product IDs from store settings
        const productIds = featuredData.productIds || []

        if (!productIds.length) {
          setFeaturedProducts([])
          setIsLoading(false)
          return
        }

        // Fetch actual product documents
        const { data: productsData } = await axios.post('/api/products/batch', { productIds }, {
          signal: controller.signal,
          timeout: 15000
        })
        if (controller.signal.aborted) return
        const products = filterStorefrontInStockProducts(productsData.products || [])
        if (!products.length && featuredProductsLengthRef.current > 0) return

        featuredProductsLengthRef.current = products.length
        setFeaturedProducts(products)
      } catch (err) {
        if (axios.isCancel(err) || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
          return
        }

        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to load featured products', err)
        }

        // Auto-retry once after 3 seconds (handles cold-start DB timeouts)
        if (featuredProductsLengthRef.current === 0) {
          retryTimerRef.current = setTimeout(() => {
            fetchFeaturedAndSectionText()
          }, 3000)
          return
        }

        setError('Could not load featured products')
      } finally {
        if (fetchControllerRef.current === controller) {
          fetchControllerRef.current = null
          if (!controller.signal.aborted) {
            setIsLoading(false)
          }
        }
      }
    }, [])

  useEffect(() => {
    return () => {
      fetchControllerRef.current?.abort()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  useEffect(() => {
    // Always refresh. The first HTML can be a cached English copy.
    fetchFeaturedAndSectionText()
  }, [fetchFeaturedAndSectionText])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const applyLivePayload = (payload) => {
      const nextLayout = payload?.layout
      if (nextLayout && typeof nextLayout === 'object') {
        setLayoutSettings((prev) => ({
          style: normalizeLayoutStyle(nextLayout.style) || prev.style,
          itemsPerRow: clampFeaturedColumns(nextLayout.itemsPerRow, prev.itemsPerRow),
          rows: clampFeaturedRows(nextLayout.rows, prev.rows),
        }))
      }
    }

    const handleStorage = (event) => {
      if (event.key !== 'featuredSectionLive' || !event.newValue) return
      try {
        applyLivePayload(JSON.parse(event.newValue))
      } catch {
        // ignore malformed storage payload
      }
    }

    const handleLiveUpdate = (event) => {
      applyLivePayload(event?.detail)
      // Also refresh products and canonical API values in background.
      fetchFeaturedAndSectionText()
    }

    // On mount, use latest live payload if present.
    try {
      const cached = window.localStorage.getItem('featuredSectionLive')
      if (cached) applyLivePayload(JSON.parse(cached))
    } catch {
      // ignore malformed cache
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('featuredSectionLiveUpdate', handleLiveUpdate)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('featuredSectionLiveUpdate', handleLiveUpdate)
    }
  }, [fetchFeaturedAndSectionText])

  const visibleProducts = featuredProducts.slice(
    0,
    featuredVisibleCount(layoutSettings.itemsPerRow, layoutSettings.rows),
  )
  const desktopColumns = clampFeaturedColumns(layoutSettings.itemsPerRow)
  const filledColumns = Math.min(
    desktopColumns,
    Math.max(1, visibleProducts.length || desktopColumns),
  )
  const displayTitle = localizeField(sectionCopy, 'sectionTitle', language)
  const displayDescription = localizeField(sectionCopy, 'sectionDescription', language)

  if (!isLoading && !error && featuredProducts.length === 0) return null

  return (
    <section aria-label={displayTitle || 'Featured products'} className={`${HOME_SECTION_CLASS} relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6`}>
      {displayTitle || displayDescription ? (
        <div className="mb-4">
          {displayTitle ? (
            <h2 className={`${HOME_SECTION_TITLE_CLASS} ${displayDescription ? '!mb-1' : ''}`}>{displayTitle}</h2>
          ) : null}
          {displayDescription ? <p className="mt-1 text-sm text-slate-500">{displayDescription}</p> : null}
        </div>
      ) : null}
      {isCarousel ? (
        <div>
          {isLoading && featuredProducts.length === 0 ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, idx) => (
                <HomeProductCardSkeleton key={idx} className={getHomeSectionProductCardClass()} />
              ))}
            </div>
          ) : (
            <ProductCarousel
              products={visibleProducts}
              priorityCount={2}
              cardsPerRow={clampFeaturedColumns(layoutSettings.itemsPerRow)}
              showArrows
              showMobileArrows
              edgeBleed={false}
            />
          )}
        </div>
      ) : (
        <div
          className="featured-products-grid grid items-stretch gap-3"
          style={{ '--desktop-cols': String(filledColumns) }}
        >
          {isLoading && featuredProducts.length === 0
            ? Array.from({ length: 4 }).map((_, idx) => (
                <HomeProductCardSkeleton key={idx} />
              ))
            : visibleProducts.map((product, index) => (
                <ProductCard key={product._id || product.id} product={product} priorityImages={index < 2} />
              ))}
        </div>
      )}

      <style jsx>{`
        .featured-products-grid {
          grid-template-columns: repeat(${Math.min(2, filledColumns)}, minmax(0, 1fr));
        }
        @media (min-width: 640px) {
          .featured-products-grid {
            grid-template-columns: repeat(${Math.min(3, filledColumns)}, minmax(0, 1fr));
          }
        }
        @media (min-width: 1024px) {
          .featured-products-grid {
            grid-template-columns: repeat(${Math.min(4, filledColumns)}, minmax(0, 1fr));
          }
        }
        @media (min-width: 1280px) {
          .featured-products-grid {
            grid-template-columns: repeat(var(--desktop-cols), minmax(0, 1fr));
          }
        }
      `}</style>

      {error && (
        <div className="mt-6 text-center text-sm text-red-500">{error}</div>
      )}
    </section>
  )
}

export default BestSelling
