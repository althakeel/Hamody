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
import NewProductTagBadge from '@/components/NewProductTagBadge'
import TimeDeliveryBadge from '@/components/TimeDeliveryBadge'
import FreeShipRotator from '@/components/FreeShipRotator'
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
  deferImages = false,
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
  const { market, convertPrice, formatNumber, formatDisplay } = useStorefrontMarket()
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
  const [imageReady, setImageReady] = useState(priorityImages || !deferImages)
  const cardVideoRef = useRef(null)
  const cardRef = useRef(null)

  useEffect(() => {
    setIsCartHydrated(true)
  }, [])

  useEffect(() => {
    if (priorityImages || !deferImages) {
      setImageReady(true)
      return undefined
    }
    const node = cardRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setImageReady(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setImageReady(true)
        observer.disconnect()
      },
      { root: null, rootMargin: '480px 0px', threshold: 0 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [deferImages, priorityImages, productId])

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
    if (deferImages && !priorityImages && !imageReady) return undefined
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
  }, [cardPreview.type, cardPreview.delayMs, cardPreview.videoSrc, deferImages, imageReady, priorityImages])

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
  }

  const changeQuantity = (event, direction) => {
    event.preventDefault()
    event.stopPropagation()
    const unitPrice = Number(priceNum > 0 ? priceNum : product.price || 0)
    if (direction < 0) {
      pushGtmEcommerceEvent(GTM_EVENTS.REMOVE_FROM_CART, {
        currency: STORE_CURRENCY,
        value: unitPrice,
        items: [productToGa4Item(product, { price: unitPrice, quantity: 1 })],
      })
      dispatch(removeFromCart({ productId: product._id }))
    } else {
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
    }
    dispatch(uploadCart({ getToken }))
  }

  const inCart = isCartHydrated && itemQuantity > 0
  const cartBarClass = inCart
    ? 'translate-y-0 opacity-100 pointer-events-auto'
    : 'translate-y-full opacity-0 pointer-events-none xl:group-hover:translate-y-0 xl:group-hover:opacity-100 xl:group-hover:pointer-events-auto'

  const hasCarouselWidth = /flex-\[0_0|flex-shrink-0|shrink-0|w-\[calc|min-w-\[calc|basis-\[calc/.test(className)
  const hasCustomGridWidth = /w-\[calc/.test(className)
  const useCompactLayout = compact && hasCarouselWidth
  const compactLg = useCompactLayout && compactDesktopOnly
  const compactAll = useCompactLayout && !compactDesktopOnly
  const imageAspectClass = 'aspect-square w-full shrink-0'
  const showCardMedia = priorityImages || !deferImages || imageReady
  const imageLoading = priorityImages ? undefined : (deferImages ? 'eager' : 'lazy')

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
        {showCardMedia && cardPreview.type === 'delayed-video' && !showCardVideo ? (
          <>
            <Image
              src={cardPreview.imageSrc}
              alt={productName}
              fill
              className="object-contain object-center bg-white"
              sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 14vw"
              quality={priorityImages ? 70 : 65}
              priority={priorityImages}
              fetchPriority={priorityImages ? 'high' : 'auto'}
              loading={imageLoading}
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
        ) : showCardMedia && (cardPreview.type === 'video' || (cardPreview.type === 'delayed-video' && showCardVideo)) ? (
          <video
            ref={cardPreview.type === 'delayed-video' ? cardVideoRef : undefined}
            src={cardPreview.videoSrc}
            className="absolute inset-0 h-full w-full object-contain object-center bg-white"
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
          />
        ) : showCardMedia ? (
          <>
            <Image
              src={primaryImage}
              alt={productName}
              fill
              className={`object-contain object-center bg-white ${hasSecondary && hovered ? 'opacity-0' : 'opacity-100'}`}
              sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 14vw"
              quality={priorityImages ? 70 : 65}
              priority={priorityImages}
              fetchPriority={priorityImages ? 'high' : 'auto'}
              loading={imageLoading}
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
                className="absolute inset-0 object-contain object-center bg-white"
                sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 14vw"
                quality={65}
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
        ) : null}

        <NewProductTagBadge product={product} size="card" />

        {!isOutOfStock ? (
          <div
            className={`absolute inset-x-1.5 bottom-1.5 z-20 hidden transition-all duration-500 ease-in-out xl:block ${cartBarClass}`}
            onClick={(event) => event.preventDefault()}
          >
            {inCart ? (
              <div className="flex items-center justify-between overflow-hidden rounded-lg bg-[#C8F404] text-[#05090D]">
                <button
                  type="button"
                  onClick={(event) => changeQuantity(event, -1)}
                  className="inline-flex h-9 w-10 items-center justify-center font-bold transition hover:bg-black/10"
                  aria-label={itemQuantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
                >
                  {itemQuantity === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
                </button>
                <span className="min-w-6 text-center text-sm font-bold">{itemQuantity}</span>
                <button
                  type="button"
                  onClick={(event) => changeQuantity(event, 1)}
                  className="inline-flex h-9 w-10 items-center justify-center font-bold transition hover:bg-black/10"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex h-9 w-full items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-[#C8F404] px-2 text-[11px] font-semibold uppercase text-[#05090D] transition active:scale-[0.98] sm:text-[13px]"
                aria-label={t('common.addToCart')}
              >
                <ShoppingCart size={16} />
                <span>{t('common.addToCart')}</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className={`flex shrink-0 flex-col bg-white ${compactAll ? 'p-1.5' : compactLg ? 'p-2 sm:p-2.5 lg:p-1.5' : 'p-2 sm:p-2.5'}`}>
        <h3 className={`overflow-hidden text-start font-semibold leading-snug tracking-normal text-slate-950 antialiased ${compactAll ? 'text-[11px]' : compactLg ? 'min-h-[2.5em] text-xs sm:text-sm lg:min-h-0 lg:text-[11px]' : 'min-h-[2.5em] text-xs sm:text-sm'}`}>
          <bdi
            dir={getContentDirection(productName)}
            className={`break-words ${compactAll ? 'line-clamp-1' : compactLg ? 'line-clamp-2 lg:line-clamp-1' : 'line-clamp-2'}`}
          >
            {productName}
          </bdi>
        </h3>
        {isOutOfStock ? (
          <p className="mt-1 text-[10px] font-semibold text-slate-500">{t('common.outOfStock')}</p>
        ) : null}

        {karat ? (
          <p className={`mt-1 text-start font-medium leading-none text-amber-800 ${compactAll ? 'text-[10px]' : compactLg ? 'text-[11px] lg:text-[10px]' : 'text-[11px] sm:text-xs'}`}>
            {t('product.karatOnCard', { karat })}
          </p>
        ) : null}

        <div className="mt-1 flex items-center justify-between gap-2">
          {livePrice > 0 ? (
            <div className="flex min-w-0 items-baseline justify-start">
              <span dir="ltr" className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className={`inline-flex items-baseline gap-0.5 font-semibold leading-none tracking-normal text-slate-950 antialiased ${compactAll ? 'text-xs' : compactLg ? 'text-sm sm:text-base lg:text-xs' : 'text-sm sm:text-base'}`}>
                  <CurrencySymbol currency={market.currency} />
                  <span>{formatDisplay(convertedPrice, language)}</span>
                </span>
                {comparePrice > 0 ? (
                  <StruckPrice className="gap-0.5 text-[10px] leading-none text-slate-400 sm:text-xs">
                    <CurrencySymbol currency={market.currency} />
                    <span>{formatDisplay(convertedAED, language)}</span>
                  </StruckPrice>
                ) : null}
                {discount > 0 ? (
                  <span className="whitespace-nowrap text-[10px] font-semibold leading-none text-[#B12F39]">
                    {t('common.offPercent', {
                      discount: formatNumber(discount, language, { maximumFractionDigits: 0 }),
                    })}
                  </span>
                ) : null}
              </span>
            </div>
          ) : <span className="min-w-0 flex-1" />}

          {!isOutOfStock ? (
            <div className="shrink-0 xl:hidden" onClick={(event) => event.preventDefault()}>
              {inCart ? (
                <div className="flex items-center overflow-hidden rounded-full bg-[#C8F404] text-[#05090D] shadow-[0_6px_16px_rgba(5,9,13,0.14)]">
                  <button
                    type="button"
                    onClick={(event) => changeQuantity(event, -1)}
                    className="inline-flex h-9 w-8 items-center justify-center font-bold transition hover:bg-black/10"
                    aria-label={itemQuantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
                  >
                    {itemQuantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                  </button>
                  <span className="min-w-4 text-center text-sm font-bold">{itemQuantity}</span>
                  <button
                    type="button"
                    onClick={(event) => changeQuantity(event, 1)}
                    className="inline-flex h-9 w-8 items-center justify-center font-bold transition hover:bg-black/10"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="group inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-[#05090D] transition duration-200 ease-out [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:bg-[#C8F404] [@media(hover:hover)]:hover:shadow-[0_12px_22px_rgba(5,9,13,0.22)] active:scale-95"
                  aria-label={t('common.addToCart')}
                >
                  <svg
                    viewBox="0 0 576 512"
                    aria-hidden="true"
                    className="h-[18px] w-[18px] fill-current transition duration-200 [@media(hover:hover)]:group-hover:scale-110"
                  >
                    <path d="M528.12 301.319l47.273-208C578.806 78.301 567.391 64 551.99 64H159.208l-9.166-44.81C147.758 8.021 137.93 0 126.529 0H24C10.745 0 0 10.745 0 24v16c0 13.255 10.745 24 24 24h69.883l70.248 343.435C147.325 423.865 163.089 440 181.999 440h280c13.255 0 24-10.745 24-24v-16c0-13.255-10.745-24-24-24H218.741l-6.545-32h293.145c11.4 0 21.228-8.021 23.38-19.202zM196.997 416c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32zm288 0c-17.673 0-32 14.327-32 32s14.327 32 32 32 32-14.327 32-32-14.327-32-32-32z" />
                  </svg>
                </button>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-1.5 flex h-[18px] w-full min-w-0 max-w-full items-center justify-start overflow-hidden">
          {product?.freeShippingEligible || product?.fastDelivery ? (
            <FreeShipRotator
              compact
              labels={[
                ...(product?.freeShippingEligible ? [t('common.freeShip')] : []),
                ...(product?.fastDelivery ? [t('common.fastDelivery')] : []),
              ]}
            />
          ) : null}
        </div>

        <div className="empty:hidden mt-2 mb-1 flex min-w-0 max-w-full justify-start">
          <TimeDeliveryBadge productId={product?._id} arabic={language === 'ar'} className="max-w-full" />
        </div>

        {!compactAll && reviewCount > 0 ? (
          <div className={`flex min-w-0 justify-start ${compactLg ? 'lg:hidden' : ''}`}>
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
