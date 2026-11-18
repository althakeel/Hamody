'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import { getCarouselProductCardClass, getCategorySliderProductCardClass, MOBILE_CAROUSEL_BLEED_CLASS, PRODUCT_CARD_CAROUSEL_GAP_CLASS } from '@/lib/storefrontCarousel'
import { useHorizontalCarouselDrag } from '@/lib/useHorizontalCarouselDrag'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'
import { DEFAULT_CATEGORY_SLIDER_AUTO_SLIDE_INTERVAL_MS } from '@/lib/categorySliderTheme'
import {
  buildAutoSlideLoopProducts,
  capCarouselProducts,
  getAutoSlidePixelsPerMs,
  measureAutoSlideLoopWidth,
  wrapAutoSlideOffset,
} from '@/lib/categorySliderAutoSlide'

function getArrowVisibilityClass({ showArrows, showMobileArrows }) {
  if (showArrows && showMobileArrows) return 'flex'
  if (showMobileArrows) return 'flex lg:hidden'
  if (showArrows) return 'hidden lg:flex'
  return 'hidden'
}

export default function ProductCarousel({
  products = [],
  priorityCount = 4,
  className = '',
  showArrows = true,
  showMobileArrows = true,
  compactBottom = false,
  compact = false,
  compactDesktopOnly = false,
  edgeBleed = true,
  arrowsOutside = false,
  cardsPerRow = 6,
  autoSlide = false,
  autoSlideIntervalMs = DEFAULT_CATEGORY_SLIDER_AUTO_SLIDE_INTERVAL_MS,
  cardWidthVariant = 'default',
  leading = null,
}) {
  const { isArabic } = useStorefrontI18n()
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(() => products.length > cardsPerRow)
  const rootRef = useRef(null)
  const isInViewRef = useRef(true)
  const isHoverPausedRef = useRef(false)
  const isTouchPausedRef = useRef(false)
  const isDraggingRef = useRef(false)
  const dragSuppressClickRef = useRef(false)
  const manualDragRef = useRef(null)
  const loopWidthRef = useRef(0)
  const autoSlideOffsetRef = useRef(0)
  const autoSlideStepRef = useRef(0)
  const autoSlideReadyRef = useRef(false)
  const transformTrackRef = useRef(null)

  const cappedProducts = useMemo(() => capCarouselProducts(products), [products])
  const isCategorySlider = cardWidthVariant === 'categorySlider'
  const useTransformAutoSlide = autoSlide && cappedProducts.length > 1
  /** Transform auto-slide only works reliably in LTR; manual scroll mirrors in Arabic RTL. */
  const carouselDir = isCategorySlider
    ? (useTransformAutoSlide ? 'ltr' : (isArabic ? 'rtl' : 'ltr'))
    : undefined

  const displayProducts = useMemo(
    () => (useTransformAutoSlide ? buildAutoSlideLoopProducts(cappedProducts) : cappedProducts),
    [cappedProducts, useTransformAutoSlide]
  )

  const {
    scrollRef,
    isDragging,
    handlePointerDown,
    handleCardClick,
    scrollLeft,
    scrollRight,
    getSnapStep,
    trackClassName,
    trackStyle,
  } = useHorizontalCarouselDrag({
    enableSnap: !autoSlide,
    enableMobileSnap: !isCategorySlider,
    mobileVerticalScrollPriority: isCategorySlider,
    lockMobileToVerticalTouch: false,
  })

  isDraggingRef.current = isDragging

  const applyTransformOffset = useCallback((offset) => {
    const track = transformTrackRef.current
    if (!track) return
    track.style.transform = `translate3d(${-offset}px, 0, 0)`
  }, [])

  const measureAutoSlideMetrics = useCallback(() => {
    const measureTarget = useTransformAutoSlide ? transformTrackRef.current : scrollRef.current
    if (!measureTarget || !useTransformAutoSlide) {
      loopWidthRef.current = 0
      autoSlideStepRef.current = 0
      autoSlideReadyRef.current = false
      return
    }

    const card = measureTarget.firstElementChild
    const cardWidth = card?.getBoundingClientRect().width || 0
    const styles = window.getComputedStyle(measureTarget)
    const gap = parseFloat(styles.columnGap || styles.gap || '12') || 12
    autoSlideStepRef.current = cardWidth > 0 ? cardWidth + gap : getSnapStep()

    const loopWidth = measureAutoSlideLoopWidth(measureTarget, cappedProducts.length)
    loopWidthRef.current = loopWidth
    autoSlideReadyRef.current = loopWidth > 0 && autoSlideStepRef.current > 0

    if (autoSlideReadyRef.current) {
      autoSlideOffsetRef.current = wrapAutoSlideOffset(autoSlideOffsetRef.current, loopWidth)
      applyTransformOffset(autoSlideOffsetRef.current)
    }
  }, [applyTransformOffset, cappedProducts.length, getSnapStep, scrollRef, useTransformAutoSlide])

  useLayoutEffect(() => {
    measureAutoSlideMetrics()

    const resizeTarget = useTransformAutoSlide ? transformTrackRef.current : scrollRef.current
    if (!resizeTarget) {
      window.addEventListener('resize', measureAutoSlideMetrics)
      return () => window.removeEventListener('resize', measureAutoSlideMetrics)
    }

    let resizeRaf = null
    const scheduleMeasure = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null
        measureAutoSlideMetrics()
      })
    }

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleMeasure)
      : null

    observer?.observe(resizeTarget)
    window.addEventListener('resize', scheduleMeasure)

    return () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [measureAutoSlideMetrics, displayProducts.length, cardsPerRow, useTransformAutoSlide])

  useEffect(() => {
    if (!autoSlide) return undefined

    const container = useTransformAutoSlide
      ? transformTrackRef.current?.parentElement
      : scrollRef.current

    if (!container) return undefined

    const pause = () => {
      isTouchPausedRef.current = true
      isHoverPausedRef.current = true
    }

    const resume = () => {
      window.setTimeout(() => {
        isTouchPausedRef.current = false
        isHoverPausedRef.current = false
      }, 350)
    }

    container.addEventListener('touchstart', pause, { passive: true })
    container.addEventListener('touchend', resume, { passive: true })
    container.addEventListener('touchcancel', resume, { passive: true })

    return () => {
      container.removeEventListener('touchstart', pause)
      container.removeEventListener('touchend', resume)
      container.removeEventListener('touchcancel', resume)
    }
  }, [autoSlide, scrollRef, useTransformAutoSlide])

  const handleTrackPointerDown = (event) => {
    if (event.pointerType === 'touch') return
    handlePointerDown(event)
  }

  const endManualDrag = (event) => {
    const drag = manualDragRef.current
    if (!drag || (event && event.pointerId !== drag.pointerId)) return
    if (drag.dragging) {
      dragSuppressClickRef.current = true
      window.setTimeout(() => {
        dragSuppressClickRef.current = false
      }, 140)
    }
    manualDragRef.current = null
    isDraggingRef.current = false
    window.setTimeout(() => {
      isTouchPausedRef.current = false
    }, 400)
  }

  const handleAutoSlidePointerDown = (event) => {
    if (!useTransformAutoSlide || event.button !== 0) return
    const target = event.target
    if (target?.closest?.('button, input, select, textarea, a[data-carousel-ignore-drag]')) return

    isTouchPausedRef.current = true
    isDraggingRef.current = false
    manualDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: autoSlideOffsetRef.current,
      dragging: false,
    }
  }

  const handleAutoSlidePointerMove = (event) => {
    const drag = manualDragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return

    const walkX = event.clientX - drag.startX
    const walkY = event.clientY - drag.startY
    const threshold = event.pointerType === 'touch' ? 12 : 6

    if (!drag.dragging) {
      if (Math.abs(walkX) < threshold && Math.abs(walkY) < threshold) return
      if (Math.abs(walkY) > Math.abs(walkX)) {
        manualDragRef.current = null
        isTouchPausedRef.current = false
        return
      }
      drag.dragging = true
      isDraggingRef.current = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    event.preventDefault()
    autoSlideOffsetRef.current = wrapAutoSlideOffset(
      drag.startOffset - walkX,
      loopWidthRef.current
    )
    applyTransformOffset(autoSlideOffsetRef.current)
  }

  const handleAutoSlideCardClick = (event) => {
    if (dragSuppressClickRef.current) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    handleCardClick(event)
  }

  useEffect(() => {
    if (useTransformAutoSlide) return undefined

    let scrollRaf = null
    const updateScrollState = () => {
      const container = scrollRef.current
      if (!container) return
      const maxScroll = container.scrollWidth - container.clientWidth
      setCanScrollLeft(container.scrollLeft > 1)
      setCanScrollRight(maxScroll > 1 && container.scrollLeft < maxScroll - 1)
    }
    const scheduleScrollState = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null
        updateScrollState()
      })
    }

    updateScrollState()
    const container = scrollRef.current
    container?.addEventListener('scroll', scheduleScrollState, { passive: true })
    window.addEventListener('resize', scheduleScrollState)
    const observer = typeof ResizeObserver !== 'undefined' && container
      ? new ResizeObserver(scheduleScrollState)
      : null
    if (observer && container) observer.observe(container)

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
      container?.removeEventListener('scroll', scheduleScrollState)
      window.removeEventListener('resize', scheduleScrollState)
      observer?.disconnect()
    }
  }, [cappedProducts, displayProducts, scrollRef, cardsPerRow, autoSlide, useTransformAutoSlide])

  useEffect(() => {
    if (!useTransformAutoSlide) return undefined

    const node = rootRef.current
    const syncInView = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        isInViewRef.current = false
        return
      }
      if (!node) {
        isInViewRef.current = true
        return
      }
    }

    let observer = null
    if (node && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          const intersecting = entries.some((entry) => entry.isIntersecting)
          isInViewRef.current =
            intersecting && (typeof document === 'undefined' || document.visibilityState !== 'hidden')
        },
        { rootMargin: '80px 0px', threshold: 0.01 },
      )
      observer.observe(node)
    } else {
      isInViewRef.current = true
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        isInViewRef.current = false
      } else {
        syncInView()
        if (node) {
          const rect = node.getBoundingClientRect()
          const vh = window.innerHeight || 0
          isInViewRef.current = rect.bottom > -80 && rect.top < vh + 80
        } else {
          isInViewRef.current = true
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [useTransformAutoSlide])

  useEffect(() => {
    if (!useTransformAutoSlide) return undefined

    let rafId = null
    let lastTimestamp = performance.now()

    const tick = (timestamp) => {
      rafId = requestAnimationFrame(tick)

      if (!autoSlideReadyRef.current || !isInViewRef.current) {
        lastTimestamp = timestamp
        return
      }

      if (isHoverPausedRef.current || isTouchPausedRef.current || isDraggingRef.current) {
        lastTimestamp = timestamp
        return
      }

      const deltaMs = Math.max(timestamp - lastTimestamp, 0)
      lastTimestamp = timestamp

      const loopWidth = loopWidthRef.current
      const step = autoSlideStepRef.current
      if (loopWidth <= 0 || step <= 0) return

      const pixelsPerMs = getAutoSlidePixelsPerMs(step, autoSlideIntervalMs)
      autoSlideOffsetRef.current = wrapAutoSlideOffset(
        autoSlideOffsetRef.current + pixelsPerMs * deltaMs,
        loopWidth
      )

      applyTransformOffset(autoSlideOffsetRef.current)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [applyTransformOffset, autoSlideIntervalMs, cappedProducts.length, cardsPerRow, useTransformAutoSlide])

  if (!cappedProducts.length && !leading) return null

  const resolvedTransformTrackClassName = [
    'flex w-full min-w-0 will-change-transform [backface-visibility:hidden]',
    PRODUCT_CARD_CAROUSEL_GAP_CLASS,
    compactBottom ? 'pb-0' : 'pb-2',
  ].filter(Boolean).join(' ')

  const autoSlideViewportClassName = [
    'w-full min-w-0 overflow-hidden',
    compactBottom ? 'pb-0' : 'pb-2',
    isCategorySlider ? 'cursor-grab touch-pan-y select-none active:cursor-grabbing max-md:[touch-action:pan-y]' : 'cursor-grab select-none active:cursor-grabbing',
  ].filter(Boolean).join(' ')

  const resolvedTrackStyle = useTransformAutoSlide
    ? { ...trackStyle, backfaceVisibility: 'hidden' }
    : trackStyle

  const arrowsVisible = showArrows || showMobileArrows
  const arrowVisibilityClass = getArrowVisibilityClass({ showArrows, showMobileArrows })
  const outsideArrows = arrowsOutside && arrowsVisible && !autoSlide
  const bleedClass = edgeBleed ? MOBILE_CAROUSEL_BLEED_CLASS : ''
  const cardClassName = cardWidthVariant === 'categorySlider'
    ? getCategorySliderProductCardClass(cardsPerRow)
    : getCarouselProductCardClass(cardsPerRow)

  const baseTrackClassName = [
    compactBottom ? trackClassName.replace(' pb-2', ' pb-0') : trackClassName,
    'w-full min-w-0',
  ].filter(Boolean).join(' ')

  const productNodes = displayProducts.map((product, index) => (
    <ProductCard
      key={`${product._id || product.id || product.slug || index}-${index}`}
      product={product}
      className={cardClassName}
      onCardClick={useTransformAutoSlide ? handleAutoSlideCardClick : handleCardClick}
      priorityImages={index < priorityCount}
      compact={compact}
      compactDesktopOnly={compactDesktopOnly}
    />
  ))

  return (
    <div
      ref={rootRef}
      dir={carouselDir}
      className={`relative w-full min-w-0 max-lg:overflow-visible lg:overflow-x-clip ${outsideArrows ? 'px-16' : ''} ${bleedClass} ${className}`.trim()}
      onMouseEnter={() => { isHoverPausedRef.current = true }}
      onMouseLeave={() => { isHoverPausedRef.current = false }}
    >
      {arrowsVisible && canScrollLeft && !autoSlide ? (
        <button
          type="button"
          onClick={scrollLeft}
          className={`absolute top-[38%] z-10 -translate-y-1/2 rounded-full border border-gray-100 bg-white p-2 shadow-lg transition-all hover:bg-gray-50 active:scale-95 ${outsideArrows ? 'start-2' : 'start-1 lg:start-0'} ${arrowVisibilityClass}`}
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} className="text-gray-800" />
        </button>
      ) : null}

      {useTransformAutoSlide ? (
        <div
          className={autoSlideViewportClassName}
          onPointerDown={handleAutoSlidePointerDown}
          onPointerMove={handleAutoSlidePointerMove}
          onPointerUp={endManualDrag}
          onPointerCancel={endManualDrag}
        >
        <div
          ref={transformTrackRef}
          role="region"
          aria-label="Product carousel"
          dir={carouselDir}
          className={resolvedTransformTrackClassName}
          style={resolvedTrackStyle}
        >
            {leading ? <div className={cardClassName}>{leading}</div> : null}
            {productNodes}
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          role="region"
          aria-label="Product carousel"
          dir={carouselDir}
          onPointerDown={handleTrackPointerDown}
          className={baseTrackClassName}
          style={resolvedTrackStyle}
        >
          {leading ? <div className={cardClassName}>{leading}</div> : null}
          {productNodes}
        </div>
      )}

      {arrowsVisible && canScrollRight && !autoSlide ? (
        <button
          type="button"
          onClick={scrollRight}
          className={`absolute top-[38%] z-10 -translate-y-1/2 rounded-full border border-gray-100 bg-white p-2 shadow-lg transition-all hover:bg-gray-50 active:scale-95 ${outsideArrows ? 'end-2' : 'end-1 lg:end-0'} ${arrowVisibilityClass}`}
          aria-label="Scroll right"
        >
          <ChevronRight size={18} className="text-gray-800" />
        </button>
      ) : null}
    </div>
  )
}
