'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Truck } from 'lucide-react';
import { useInfiniteBannerCarousel } from '@/lib/useInfiniteBannerCarousel';
import { withImageKitDelivery } from '@/lib/imageKitDelivery';
import { hasShowcaseBannerImage, pickShowcaseBannerSources } from '@/lib/showcaseBannerImages';
import { getShowcaseLinkProps } from '@/lib/showcaseBannerLinks';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

function getDisplayImageUrl(value, width = 1400) {
  return withImageKitDelivery(value, { width, quality: 72 });
}

function buildSlidesSignature(slides = [], language = 'en') {
  return `${language}|${slides.map((slide) => [
    slide.id || '',
    slide.sources?.desktop || '',
    slide.sources?.wide || '',
    slide.sources?.tablet || '',
    slide.sources?.mobile || '',
  ].join(':')).join('|')}`;
}

function BannerTextOverlay({ fallback, showTruckIcon = false }) {
  if (!fallback) return null;

  const showTitle = fallback.showTitle && String(fallback.title || '').trim();
  const showSubtitle = fallback.showSubtitle && String(fallback.subtitle || '').trim();
  const showCta = fallback.showCta && String(fallback.ctaText || '').trim();
  if (!showTitle && !showSubtitle && !showCta) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center px-5 py-4 sm:px-8">
      <div className="max-w-[360px] rounded-xl bg-black/10 px-3 py-2 backdrop-blur-[1.5px]">
        {showTitle ? (
          <p className="text-[22px] font-black leading-[1.05] tracking-tight text-white sm:text-[28px]">
            {fallback.title}
          </p>
        ) : null}
        {showSubtitle ? (
          <p className="mt-2 text-[13px] font-medium text-white/90 sm:text-[15px]">
            {fallback.subtitle}
          </p>
        ) : null}
        {showCta ? (
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold shadow-sm"
            style={{ backgroundColor: fallback.ctaBgColor, color: fallback.ctaTextColor }}
          >
            {showTruckIcon ? <Truck size={16} /> : <Search size={16} />}
            <span>{fallback.ctaText}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ShowcaseDeviceImages({
  sources,
  alt,
  loading,
  fetchPriority,
  widths,
  onError,
  fillHeight = false,
  fit = 'cover',
  bleed = false,
  natural = false,
}) {
  const images = [
    { key: 'mobile', src: sources.mobile, className: 'block md:hidden', width: widths.mobile },
    { key: 'tablet', src: sources.tablet, className: 'hidden md:block lg:hidden', width: widths.tablet },
    { key: 'desktop', src: sources.desktop, className: sources.wide ? 'hidden lg:block min-[1401px]:hidden' : 'hidden lg:block', width: widths.desktop },
    { key: 'wide', src: sources.wide, className: 'hidden min-[1401px]:block', width: widths.wide || 2560 },
  ];

  return images.map((image) => {
    if (!image.src) return null;
    const displaySrc = getDisplayImageUrl(image.src, image.width);
    return (
      <img
        key={image.key}
        src={displaySrc}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        draggable={false}
        onError={() => onError(image.src)}
        className={natural
          ? `pointer-events-none block h-auto w-full max-w-none ${image.className}`
          : `pointer-events-none absolute inset-0 h-full w-full max-w-none object-center ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${bleed ? 'scale-[1.03]' : ''} ${image.className}`}
      />
    );
  });
}

export default function ShowcaseLargeBannerSlider({
  slides = [],
  interval = 4000,
  enabled = true,
  gridRow,
  bannerVariant,
  bannerHeight,
  fallback = null,
  showTruckIcon = false,
}) {
  const { language, isArabic } = useStorefrontI18n();
  const bannerRowClassName = [
    'group relative overflow-hidden border-0 bg-transparent shadow-none shop-showcase-banner-row',
    bannerVariant === 'full' ? 'rounded-none' : 'rounded-xl',
    bannerVariant === 'main' ? 'shop-showcase-banner-row--main' : '',
    bannerVariant === 'secondary' ? 'shop-showcase-banner-row--secondary' : '',
    bannerVariant === 'full' ? 'shop-showcase-banner-row--full' : '',
    bannerVariant === 'lower' ? 'shop-showcase-banner-row--lower' : '',
  ].filter(Boolean).join(' ');

  const desktopWidth = bannerVariant === 'full' ? 1400 : bannerVariant === 'secondary' ? 1100 : 1400;
  const deviceWidths = {
    mobile: 800,
    tablet: 1100,
    desktop: desktopWidth,
    wide: 2560,
  };
  const fullBannerStyle = bannerVariant === 'full'
    ? { height: 'auto', maxHeight: 'none', width: '100%', maxWidth: 'none', borderRadius: 0 }
    : bannerVariant === 'lower' && bannerHeight
      ? { height: '100%', maxHeight: '100%', width: '100%', maxWidth: '100%', borderRadius: 0 }
      : {};

  const activeSlides = useMemo(
    () => slides
      .map((slide) => {
        if (!hasShowcaseBannerImage(slide)) return null;
        const sources = pickShowcaseBannerSources(slide, isArabic);
        if (!sources.desktop && !sources.wide && !sources.tablet && !sources.mobile) return null;
        return {
          ...slide,
          sources,
        };
      })
      .filter(Boolean),
    [slides, isArabic],
  );

  const slidesSignature = useMemo(
    () => buildSlidesSignature(activeSlides, language),
    [activeSlides, language],
  );

  const [failedImages, setFailedImages] = useState(() => new Set());

  const visibleSlides = useMemo(
    () => activeSlides.filter((slide) => {
      const urls = [slide.sources.desktop, slide.sources.wide, slide.sources.tablet, slide.sources.mobile];
      return urls.some((url) => url && !failedImages.has(url));
    }),
    [activeSlides, failedImages],
  );

  const {
    loopSlides,
    slideCount,
    slideWidthPercent,
    trackRef,
    trackStyle,
    activeDotIndex,
    handleTrackTransitionEnd,
    goToSlide,
    viewportHandlers,
    shouldSuppressClick,
    cursorClass,
  } = useInfiniteBannerCarousel({
    slides: visibleSlides,
    enabled: enabled && visibleSlides.length > 1,
    interval,
    pauseOnHover: true,
  });

  useEffect(() => {
    setFailedImages(new Set());
  }, [slidesSignature]);

  const handleImageError = useCallback((imageUrl) => {
    if (!imageUrl) return;
    setFailedImages((current) => {
      if (current.has(imageUrl)) return current;
      const next = new Set(current);
      next.add(imageUrl);
      return next;
    });
  }, []);

  if (!visibleSlides.length) {
    if (!fallback || bannerVariant === 'full') return null;

    return (
      <Link
        href={fallback.href || '/shop'}
        className={bannerRowClassName}
        style={{ gridRow, ...fullBannerStyle }}
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${fallback.accent}`} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/26 via-black/6 to-transparent" />
        <BannerTextOverlay fallback={fallback} showTruckIcon={showTruckIcon} />
      </Link>
    );
  }

  const currentSlide = visibleSlides[activeDotIndex] || visibleSlides[0];
  const linkProps = getShowcaseLinkProps(currentSlide, fallback?.href || '/shop');
  const BannerWrap = linkProps?.href ? Link : 'div';

  const handleLinkClick = (event) => {
    if (shouldSuppressClick()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <BannerWrap
      {...(linkProps || {})}
      className={`${bannerRowClassName} ${cursorClass} select-none`.trim()}
      style={{ gridRow, ...fullBannerStyle }}
      dir="ltr"
      onClick={linkProps?.href ? handleLinkClick : undefined}
      onDragStart={(event) => event.preventDefault()}
    >
      <div className={`${bannerVariant === 'full' ? 'relative h-auto w-full' : bannerVariant === 'lower' ? 'relative h-full w-full' : 'absolute inset-0'} overflow-hidden touch-pan-y`} dir="ltr" {...viewportHandlers}>
        <div
          ref={trackRef}
          className="flex h-full min-h-full will-change-transform select-none"
          dir="ltr"
          onTransitionEnd={handleTrackTransitionEnd}
          style={trackStyle}
        >
          {loopSlides.map((slide, slideIndex) => (
            <div
              key={`${slide.id || slide.sources?.desktop || slideIndex}-${slideIndex}`}
              className="relative h-full min-h-full shrink-0 grow-0 overflow-hidden"
              style={{ width: `${slideWidthPercent}%` }}
            >
              <ShowcaseDeviceImages
                sources={slide.sources}
                alt={slide.alt || fallback?.title || 'Showcase banner'}
                loading={slideIndex <= 1 ? 'eager' : 'lazy'}
                fetchPriority={slideIndex === 0 ? 'high' : 'auto'}
                widths={deviceWidths}
                onError={handleImageError}
                fillHeight={bannerVariant === 'lower'}
                fit="cover"
                natural={bannerVariant === 'full'}
              />
            </div>
          ))}
        </div>
      </div>

      {bannerVariant === 'full' ? (
        <BannerTextOverlay fallback={fallback} showTruckIcon={showTruckIcon} />
      ) : null}

      {enabled && slideCount > 1 ? (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2" data-banner-ignore-drag>
          {visibleSlides.map((slide, dotIndex) => (
            <button
              key={`dot-${slide.id || dotIndex}`}
              type="button"
              aria-label={`Show banner ${dotIndex + 1}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToSlide(dotIndex);
              }}
              className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
                activeDotIndex === dotIndex
                  ? 'w-7 bg-white shadow-sm'
                  : 'w-2.5 bg-white/45 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      ) : null}
    </BannerWrap>
  );
}
