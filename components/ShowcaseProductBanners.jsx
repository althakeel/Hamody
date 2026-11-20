'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { withImageKitDelivery } from '@/lib/imageKitDelivery'
import { hasShowcaseBannerImage, pickShowcaseBannerSources } from '@/lib/showcaseBannerImages'
import { getShowcaseLinkProps } from '@/lib/showcaseBannerLinks'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'

function ProductBannerCard({ banner, className = '' }) {
  const { isArabic } = useStorefrontI18n()
  const linkProps = getShowcaseLinkProps(banner, '')
  const Card = linkProps?.href ? Link : 'div'
  const sources = pickShowcaseBannerSources(banner, isArabic)
  const images = [
    { key: 'mobile', src: sources.mobile, className: 'block md:hidden', width: 360 },
    { key: 'tablet', src: sources.tablet, className: 'hidden md:block lg:hidden', width: 520 },
    { key: 'desktop', src: sources.desktop, className: 'hidden lg:block', width: 640 },
  ].filter((image) => image.src)
  const hasImage = images.length > 0
  const hasTextOverlay =
    !hasImage &&
    (String(banner?.title || '').trim() ||
      String(banner?.subtitle || '').trim() ||
      String(banner?.buttonText || '').trim())

  return (
    <Card {...linkProps} className={`shop-showcase-product-card ${className}`.trim()}>
      {hasImage ? images.map((image) => (
        <img
          key={image.key}
          className={`shop-showcase-product-image ${image.className}`}
          src={withImageKitDelivery(image.src, { width: image.width, quality: 72 })}
          alt={banner?.title || 'Promotional banner'}
          loading="lazy"
          decoding="async"
        />
      )) : (
        <img
          className="shop-showcase-product-image"
          src="/assets/placeholder.png"
          alt={banner?.title || 'Promotional banner'}
          loading="lazy"
          decoding="async"
        />
      )}
      {hasTextOverlay ? (
        <>
          <div className="shop-showcase-product-overlay" />
          <div className="shop-showcase-product-content">
            {String(banner?.title || '').trim() ? (
              <div className="shop-showcase-product-title">{banner.title}</div>
            ) : null}
            {String(banner?.subtitle || '').trim() ? (
              <div className="shop-showcase-product-subtitle">{banner.subtitle}</div>
            ) : null}
            {String(banner?.buttonText || '').trim() ? (
              <span className="shop-showcase-product-button">{banner.buttonText}</span>
            ) : null}
          </div>
        </>
      ) : null}
    </Card>
  )
}

export default function ShowcaseProductBanners({ banners = [] }) {
  const { language } = useStorefrontI18n()
  const visibleBanners = useMemo(
    () =>
      (Array.isArray(banners) ? banners : [])
        .slice(0, 4)
        .filter((banner) => hasShowcaseBannerImage(banner)),
    [banners]
  )

  if (visibleBanners.length === 0) return null

  return (
    <div
      className={`shop-showcase-product-grid shop-showcase-product-grid--count-${visibleBanners.length}`}
      aria-roledescription="carousel"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {visibleBanners.map((banner, index) => (
        <ProductBannerCard key={`showcase-banner-${index}`} banner={banner} />
      ))}
    </div>
  )
}
