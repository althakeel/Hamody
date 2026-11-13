"use client"

import React, { useEffect, useRef, useState } from 'react'
import Image from '@/components/SafeNextImage'
import Link from 'next/link'
import { FaStar } from 'react-icons/fa'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { addToCart, uploadCart, removeFromCart } from '@/lib/features/cart/cartSlice'
import { useStorefrontMarket } from '@/lib/useStorefrontMarket'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'

import { getLocalizedProductName } from '@/lib/displayText'
import { getContentDirection } from '@/lib/storefrontLanguage'
import { showStorefrontActionToast } from '@/lib/storefrontActionToast'
import { PLACEHOLDER_IMAGE as PLACEHOLDER } from '@/lib/mediaUrls'
import {
  getImageUrlAt,
  getProductThumbnailUrl,
  normalizeProductImages,
  resolveCardVideoPreview,
} from '@/lib/productMedia'
import { PRODUCT_CARD_CELL_CLASS, PRODUCT_CARD_SHELL_CLASS } from '@/lib/storefrontCarousel'
import { trackProductAddToCart } from '@/lib/ecommerceTracking'
import { registerItemListImpression, trackSelectItem } from '@/lib/ga4Ecommerce'
import { pushGtmEcommerceEvent } from '@/lib/pushGtmEcommerceEvent'
import { productToGa4Item } from '@/lib/ga4Item'
import { isStorefrontProductInStock } from '@/lib/productVisibility'
import { GTM_EVENTS } from '@/lib/gtmEvents'
import { STORE_CURRENCY } from '@/lib/storeCurrency'
import { getProductPath } from '@/lib/productUrl'
import CurrencySymbol, { StruckPrice } from '@/components/CurrencySymbol'
import TimeDeliveryBadge from '@/components/TimeDeliveryBadge'
import { extractProductKarat } from '@/lib/productKarat'
import { cardImageSrc } from '@/lib/cardImage'

const parseAmount = (value) => {
  const num = Number(String(value ?? '').replace(/[^0-9.]/g, ''))
  return Number.isNaN(num) ? 0 : num
}

const getSalePrice = (product) => parseAmount(
  product.price ??
  product.salePrice ?? product.sale_price ??
  product.discountedPrice ?? product.discounted_price ??
  product.sellingPrice ?? product.selling_price ??
  product.offerPrice ?? product.offer_price ??
  product.currentPrice ?? product.current_price
)

const getAEDPrice = (product) => parseAmount(
  product.AED ??
  product.mrp ??
  product.compareAtPrice ?? product.compare_at_price ??
  product.originalPrice ?? product.original_price ??
  product.listPrice ?? product.list_price ??
  product.basePrice ?? product.base_price ??
  product.regularPrice ?? product.regular_price
)

const ProductCard = ({
  product,
  priorityImages = false,
  className = '',
  onCardClick,
  compact = false,
  compactDesktopOnly = false,
  itemListId,
  itemListName,
  itemListIndex,
}) => {
  if (!product || typeof product !== 'object') return null
  if (!product.name) return null
  if (!product.slug) return null

  if (
    product.hasOwnProperty('quantity') &&
    product.hasOwnProperty('price') &&
    product.hasOwnProperty('variantOptions')
  ) {
    return null
  }

  if (typeof product.quantity === 'number' && product.quantity > 0 && !product.categories) {
    return null
  }

  if (typeof product._id !== 'string' && typeof product._id !== 'object') {
    return null
  }

  const dispatch = useDispatch()
  const pathname = usePathname()
  const { getToken } = useAuth()
  const { market, convertPrice, formatNumber } = useStorefrontMarket()
  const { t, language } = useStorefrontI18n()
  const productId = String(product._id || '')
  // Subscribe only to this product's qty so cart updates don't re-render every card.
  const itemQuantity = useSelector((state) => {
    const cartEntry = state.cart.cartItems?.[productId]
    if (!cartEntry) return 0
    if (typeof cartEntry === 'number') return cartEntry
    if (typeof cartEntry === 'object' && typeof cartEntry.quantity === 'number') return cartEntry.quantity
    return 0
  })
  const [hovered, setHovered] = useState(false)
  const [showCardVideo, setShowCardVideo] = useState(false)
  const [isCartHydrated, setIsCartHydrated] = useState(false)
  const cardVideoRef = useRef(null)
  const cardRef = useRef(null)

  useEffect(() => {
    setIsCartHydrated(true)
  }, [])

  useEffect(() => {
    // Skip per-card observers on dense homepage grids unless a list id is provided.
    if (!productId || !itemListId) return undefined
    const node = cardRef.current
    const report = () => {
      registerItemListImpression(product, {
        itemListId,
        itemListName,
        index: itemListIndex,
        pathname,
      })
    }

    if (!node || typeof IntersectionObserver === 'undefined') {
      report()
      return undefined
    }

    let reported = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (reported || !entries.some((entry) => entry.isIntersecting)) return
        reported = true
        report()
        observer.disconnect()
      },
      { rootMargin: '80px 0px', threshold: 0.2 },
    )
    observer.observe(node)
    return () => observer.disconnect()
    // Intentionally keyed by product id — avoid re-firing when parent re-creates the product object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, itemListId, itemListName, itemListIndex, pathname])

  let priceNum = getSalePrice(product)
  let AEDNum = getAEDPrice(product)
  const explicitDiscount = parseAmount(
    product.discountPercent ?? product.discount_percent ??
    product.discountPercentage ?? product.discount_percentage ??
    product.discount
  )

  if (priceNum === 0 && AEDNum > 0 && explicitDiscount > 0) {
    priceNum = +(AEDNum * (1 - explicitDiscount / 100)).toFixed(2)
  }
  if (AEDNum === 0 && priceNum > 0 && explicitDiscount > 0) {
    AEDNum = +(priceNum / (1 - explicitDiscount / 100)).toFixed(2)
  }

  const discount = AEDNum > priceNum && priceNum > 0
    ? Math.round(((AEDNum - priceNum) / AEDNum) * 100)
    : explicitDiscount > 0
      ? Math.round(explicitDiscount)
      : 0

  const livePrice = priceNum > 0 ? priceNum : AEDNum
  const comparePrice = priceNum > 0 && AEDNum > priceNum ? AEDNum : 0
  const convertedPrice = convertPrice(livePrice)
  const convertedAED = convertPrice(comparePrice)
  const karat = extractProductKarat(product)
  const isOutOfStock = !isStorefrontProductInStock(product)

  const ratingValue = Math.round(Number(product.averageRating) || 0)
  const reviewCount = Math.max(0, Number(product.ratingCount ?? product.reviewCount) || 0)

  const fallbackName = product.name || product.title || t('common.untitledProduct')
  const productName = getLocalizedProductName(product, language, fallbackName)

  const primaryRaw = getProductThumbnailUrl(product)
  const secondaryRaw = getImageUrlAt(product?.images, 1)
  const primaryImage = cardImageSrc(primaryRaw)
  const secondaryImage = cardImageSrc(secondaryRaw)
  const cardPreviewRaw = resolveCardVideoPreview(product)
  const cardPreview = {
    ...cardPreviewRaw,
    imageSrc: cardImageSrc(cardPreviewRaw.imageSrc),
  }
  const hasSecondary = cardPreviewRaw.type === 'image' &&
    secondaryRaw !== PLACEHOLDER &&
    secondaryRaw !== primaryRaw &&
    normalizeProductImages(product.images).length > 1

  useEffect(() => {
    setShowCardVideo(false)
  }, [product._id, cardPreview.type, cardPreview.videoSrc])

  useEffect(() => {
    if (cardPreview.type !== 'delayed-video') return undefined

    const video = cardVideoRef.current
    if (!video) return undefined

    let delayTimer

    const startDelayTimer = () => {
      delayTimer = window.setTimeout(() => {
        setShowCardVideo(true)
      }, cardPreview.delayMs)
    }

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startDelayTimer()
    } else {
      video.addEventListener('canplaythrough', startDelayTimer, { once: true })
      video.load()
    }

    return () => {
      if (delayTimer) window.clearTimeout(delayTimer)
      video.removeEventListener('canplaythrough', startDelayTimer)
    }
  }, [cardPreview.type, cardPreview.delayMs, cardPreview.videoSrc])

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) {
      toast.error(t('common.outOfStock'))
      return
    }
    const unitPrice = Number(priceNum > 0 ? priceNum : product.price || 0)
    trackProductAddToCart({
      product,
      productId: product._id,
      name: product.name || product.title || 'Product',
      price: unitPrice,
      quantity: 1,
      currency: STORE_CURRENCY,
    })
    dispatch(addToCart({
      productId: product._id,
      price: priceNum > 0 ? priceNum : undefined,
    }))
    dispatch(uploadCart({ getToken }))
    showStorefrontActionToast({
      variant: 'cart',
      title: t('product.addedToCartToast'),
      subtitle: t('product.addedToCartSubtitle'),
      actionLabel: t('product.viewCart'),
      actionHref: '/cart',
    })
  }

  const renderCartControl = () => {
    if (isOutOfStock) {
      return (
        <div className="rounded-full bg-gray-200 px-2 py-1 text-center text-[10px] font-semibold leading-tight text-gray-600">
          {t('common.outOfStock')}
        </div>
      )
    }

    if (isCartHydrated && itemQuantity > 0) {
      return (
        <div
          className="inline-flex items-center justify-center gap-0.5 rounded-[10px] px-0.5 py-0.5 shadow-sm"
          style={{ backgroundColor: '#C9963B' }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const unitPrice = Number(priceNum > 0 ? priceNum : product.price || 0)
              pushGtmEcommerceEvent(GTM_EVENTS.REMOVE_FROM_CART, {
                currency: STORE_CURRENCY,
                value: unitPrice,
                items: [productToGa4Item(product, { price: unitPrice, quantity: 1 })],
              })
              dispatch(removeFromCart({ productId: product._id }))
              dispatch(uploadCart({ getToken }))
            }}
            className="inline-flex h-7 w-6 items-center justify-center rounded-sm text-white/95 transition hover:bg-white/15"
            title={itemQuantity === 1 ? 'Delete' : 'Decrease'}
          >
            {itemQuantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
          </button>
          <span className="min-w-[14px] text-center text-xs font-semibold text-white">{itemQuantity}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const unitPrice = Number(priceNum > 0 ? priceNum : product.price || 0)
              trackProductAddToCart({
                product,
                productId: product._id,
                name: product.name || product.title || 'Product',
                price: unitPrice,
                quantity: 1,
                currency: STORE_CURRENCY,
              })
              dispatch(addToCart({
                productId: product._id,
                price: priceNum > 0 ? priceNum : undefined,
              }))
              dispatch(uploadCart({ getToken }))
            }}
            className="inline-flex h-7 w-6 items-center justify-center rounded-sm text-white/95 transition hover:bg-white/15"
            title="Add more"
          >
            <Plus size={13} />
          </button>
        </div>
      )
    }

    return (
      <button
        type="button"
        onClick={handleAddToCart}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none ring-0 transition-opacity duration-200 hover:opacity-70 focus:outline-none focus-visible:outline-none active:scale-95"
        aria-label={t('common.addToCart')}
      >
        <Plus size={18} className="text-[#1F5C4A]" strokeWidth={2.4} />
      </button>
    )
  }

  const hasCarouselWidth = /flex-\[0_0|flex-shrink-0|shrink-0|w-\[calc|min-w-\[calc|basis-\[calc/.test(className)
  const hasCustomGridWidth = /w-\[calc/.test(className)
  const useCompactLayout = compact && hasCarouselWidth
  const compactLg = useCompactLayout && compactDesktopOnly
  const compactAll = useCompactLayout && !compactDesktopOnly
  const imageAspectClass = 'aspect-square w-full shrink-0'

  return (
    <Link
      ref={cardRef}
      href={getProductPath(product)}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      onClick={(event) => {
        trackSelectItem(product, {
          itemListId,
          itemListName,
          index: itemListIndex,
          pathname,
        })
        onCardClick?.(event)
      }}
      onMouseEnter={hasSecondary ? () => setHovered(true) : undefined}
      onMouseLeave={hasSecondary ? () => setHovered(false) : undefined}
      className={`group ${PRODUCT_CARD_SHELL_CLASS} transition-colors duration-200 ${hasCarouselWidth ? 'hover:shadow-sm' : 'shadow-none hover:bg-slate-50/80'} ${hasCarouselWidth ? '' : hasCustomGridWidth ? 'min-w-0' : PRODUCT_CARD_CELL_CLASS} ${compactAll ? 'h-full' : ''} ${className}`.trim()}
    >
      <div className={`relative w-full shrink-0 overflow-hidden bg-white ${imageAspectClass}`}>
        {cardPreview.type === 'delayed-video' && !showCardVideo ? (
          <>
            <Image
              src={cardPreview.imageSrc}
              alt={productName}
              fill
              className="object-cover object-center scale-110"
              sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 14vw"
              quality={priorityImages ? 70 : 55}
              priority={priorityImages}
              loading={priorityImages ? undefined : 'lazy'}
              onError={(e) => {
                const img = e.currentTarget
                if (img.dataset.fallback === '1') {
                  img.src = PLACEHOLDER
                  return
                }
                img.dataset.fallback = '1'
                img.src = cardPreviewRaw.imageSrc || PLACEHOLDER
              }}
            />
            <video
              ref={cardVideoRef}
              src={cardPreview.videoSrc}
              className="pointer-events-none absolute h-0 w-0 opacity-0"
              muted
              playsInline
              preload="none"
              aria-hidden="true"
            />
          </>
        ) : cardPreview.type === 'video' || (cardPreview.type === 'delayed-video' && showCardVideo) ? (
          <video
            ref={cardPreview.type === 'delayed-video' ? cardVideoRef : undefined}
            src={cardPreview.videoSrc}
            className="absolute inset-0 h-full w-full min-h-full min-w-full object-cover object-center scale-110"
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
          />
        ) : (
          <>
            <Image
              src={primaryImage}
              alt={productName}
              fill
              className={`object-cover object-center scale-110 ${hasSecondary ? 'transition-opacity duration-500' : ''} ${hasSecondary && hovered ? 'opacity-0' : 'opacity-100'}`}
              sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 14vw"
              quality={priorityImages ? 70 : 55}
              priority={priorityImages}
              loading={priorityImages ? undefined : 'lazy'}
              onError={(e) => {
                const img = e.currentTarget
                if (img.dataset.fallback === '1') {
                  img.src = PLACEHOLDER
                  return
                }
                img.dataset.fallback = '1'
                img.src = primaryRaw
              }}
            />
            {hasSecondary && hovered ? (
              <Image
                src={secondaryImage}
                alt=""
                fill
                className="absolute inset-0 object-cover object-center scale-110"
                sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 14vw"
                quality={55}
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget
                  if (img.dataset.fallback === '1') {
                    img.src = PLACEHOLDER
                    return
                  }
                  img.dataset.fallback = '1'
                  img.src = secondaryRaw
                }}
              />
            ) : null}
          </>
        )}

      </div>

      <div className={`flex shrink-0 flex-col ${compactAll ? 'p-1.5' : compactLg ? 'p-2 sm:p-2.5 lg:p-1.5' : 'p-2 sm:p-2.5'}`}>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={`overflow-hidden text-start font-semibold leading-tight text-slate-900 ${compactAll ? 'mb-1 text-[10px]' : compactLg ? 'mb-1 min-h-[2.5em] text-xs sm:text-sm lg:min-h-0 lg:text-[10px]' : 'mb-1 min-h-[2.5em] text-xs sm:text-sm'}`}>
              <bdi
                dir={getContentDirection(productName)}
                className={`break-words ${compactAll ? 'line-clamp-1' : compactLg ? 'line-clamp-2 lg:line-clamp-1' : 'line-clamp-2'}`}
              >
                {productName}
              </bdi>
            </h3>

            {karat ? (
              <p className={`mb-1 text-start font-medium leading-none text-amber-800 ${compactAll ? 'text-[10px]' : compactLg ? 'text-[11px] lg:text-[10px]' : 'text-[11px] sm:text-xs'}`}>
                {t('product.karatOnCard', { karat })}
              </p>
            ) : null}

            {livePrice > 0 ? (
              <div className="flex min-w-0 flex-nowrap items-baseline justify-start gap-x-1.5 overflow-hidden">
                <span dir="ltr" className="inline-flex min-w-0 flex-nowrap items-baseline gap-x-1.5 overflow-hidden">
                  <span className={`inline-flex shrink-0 items-baseline gap-0.5 font-semibold leading-none text-slate-950 ${compactAll ? 'text-xs' : compactLg ? 'text-sm sm:text-base lg:text-xs' : 'text-sm sm:text-base'}`}>
                    <CurrencySymbol currency={market.currency} />
                    <span>{formatNumber(convertedPrice, language, { maximumFractionDigits: 0 })}</span>
                  </span>
                  {comparePrice > 0 ? (
                    <StruckPrice className="shrink-0 gap-0.5 text-[10px] leading-none text-slate-400 sm:text-xs">
                      <CurrencySymbol currency={market.currency} />
                      <span>{formatNumber(convertedAED, language, { maximumFractionDigits: 0 })}</span>
                    </StruckPrice>
                  ) : null}
                </span>
                {discount > 0 ? (
                  <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold leading-none text-[#9C6E20] sm:text-xs">
                    {t('common.offPercent', {
                      discount: formatNumber(discount, language, { maximumFractionDigits: 0 }),
                    })}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 self-center">
            {renderCartControl()}
          </div>
        </div>

        <div className="mt-2 mb-1 flex min-w-0 max-w-full justify-start">
          <TimeDeliveryBadge productId={product?._id} arabic={language === 'ar'} className="max-w-full" />
        </div>

        {!compactAll ? (
          <div className={`flex min-h-[14px] min-w-0 justify-start ${compactLg ? 'lg:hidden' : ''}`}>
            {reviewCount > 0 ? (
              <span dir="ltr" className="inline-flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    size={9}
                    className={i < ratingValue ? 'text-yellow-400' : 'text-gray-300'}
                  />
                ))}
                <span className="min-w-0 truncate text-[9px] text-gray-500 sm:text-xs">
                  ({reviewCount})
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

export default ProductCard
