'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, Truck } from 'lucide-react';
import { useInfiniteBannerCarousel } from '@/lib/useInfiniteBannerCarousel';
import { stripImageKitTransforms, withImageKitDelivery } from '@/lib/imageKitDelivery';
import { hasShowcaseBannerImage, pickShowcaseBannerSources } from '@/lib/showcaseBannerImages';
import { getShowcaseLinkProps } from '@/lib/showcaseBannerLinks';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { bannerArrowHoverClass, normalizeBannerArrowSettings } from '@/lib/shopShowcaseLargeBanners';

function getDisplayImageUrl(value, width = 1400, quality = 72, keepOriginal = false) {
  if (keepOriginal) return stripImageKitTransforms(value);
  return withImageKitDelivery(value, { width, quality });
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

const ARROW_SIZE_CLASS = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

const ARROW_ICON_SIZE = { sm: 14, md: 18, lg: 22 };

function BannerArrowButton({ direction, label, onClick, arrow }) {
  const settings = normalizeBannerArrowSettings({
    bannerArrowStyle: arrow?.style,
    bannerArrowColor: arrow?.color,
    bannerArrowBgColor: arrow?.bgColor,
    bannerArrowSize: arrow?.size,
    bannerArrowHover: arrow?.hover,
    bannerArrowHoverColor: arrow?.hoverColor,
    bannerArrowHoverBgColor: arrow?.hoverBg,
  });
  const size = settings.bannerArrowSize;
  const styleName = settings.bannerArrowStyle;
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  const shapeClass = styleName === 'square'
    ? 'rounded-none'
    : styleName === 'rounded'
      ? 'rounded-xl'
      : styleName === 'pill'
        ? 'rounded-full !w-12'
        : 'rounded-full';

  return (
    <span className={`absolute top-1/2 z-10 -translate-y-1/2 ${direction === 'prev' ? 'left-3' : 'right-3'}`}>
      <button
        type="button"
        aria-label={label}
        data-banner-ignore-drag
        onClick={onClick}
        className={`banner-arrow-btn flex items-center justify-center shadow-md ${ARROW_SIZE_CLASS[size]} ${styleName === 'plain' ? 'shadow-none' : shapeClass} ${bannerArrowHoverClass(settings.bannerArrowHover, direction)}`}
        style={{
          '--banner-arrow-color': settings.bannerArrowColor,
          '--banner-arrow-bg': styleName === 'plain' || styleName === 'outline' ? 'transparent' : settings.bannerArrowBgColor,
          '--banner-arrow-border': styleName === 'outline' ? settings.bannerArrowBgColor : 'transparent',
          '--banner-arrow-hover-color': settings.bannerArrowHoverColor,
          '--banner-arrow-hover-bg': styleName === 'plain' ? 'transparent' : settings.bannerArrowHoverBgColor,
          borderWidth: styleName === 'outline' ? 2 : 0,
          borderStyle: 'solid',
        }}
      >
        <Icon size={ARROW_ICON_SIZE[size]} />
      </button>
    </span>
  );
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
  displayQuality = 72,
  keepOriginal = false,
  intrinsicWidth,
  intrinsicHeight,
}) {
  const images = [
    { key: 'mobile', src: sources.mobile, className: 'hidden max-md:block', width: widths.mobile, naturalWidth: intrinsicWidth || 768, naturalHeight: intrinsicHeight || 280 },
    { key: 'tablet', src: sources.tablet, className: 'hidden md:max-lg:block', width: widths.tablet, naturalWidth: intrinsicWidth || 1024, naturalHeight: intrinsicHeight || 240 },
    { key: 'desktop', src: sources.desktop, className: sources.wide ? 'hidden lg:max-[1400px]:block' : 'hidden lg:block', width: widths.desktop, naturalWidth: intrinsicWidth || 1920, naturalHeight: intrinsicHeight || 400 },
    { key: 'wide', src: sources.wide, className: 'hidden min-[1401px]:block', width: widths.wide || 2560, naturalWidth: intrinsicWidth || 1920, naturalHeight: intrinsicHeight || 400 },
  ];

  return images.map((image) => {
    if (!image.src) return null;
    const displaySrc = getDisplayImageUrl(image.src, image.width, displayQuality, keepOriginal);
    return (
      <img
        key={image.key}
        src={displaySrc}
        alt={alt}
        width={natural ? undefined : image.naturalWidth}
        height={natural ? undefined : image.naturalHeight}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        draggable={false}
        onError={() => onError(image.src)}
        className={natural
          ? `pointer-events-none block h-auto w-full max-w-none ${image.className}`
          : `pointer-events-none absolute inset-0 h-full w-full max-w-none object-center ${fit === 'contain' ? 'object-contain' : fit === 'fill' ? 'object-fill' : 'object-cover'} ${bleed ? 'scale-[1.03]' : ''} ${image.className}`}
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
  arrow = null,
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

  const isFullBleed = bannerVariant === 'full';
  // Cap widths/quality so hero LCP does not download multi‑MB originals on every visit.
  const desktopWidth = isFullBleed ? 1920 : bannerVariant === 'secondary' ? 1100 : 1400;
  const displayQuality = isFullBleed ? 75 : 72;
  const deviceWidths = {
    mobile: isFullBleed ? 960 : 800,
    tablet: isFullBleed ? 1400 : 1100,
    desktop: desktopWidth,
    wide: isFullBleed ? 1920 : 1600,
  };
  const fullBannerStyle = bannerVariant === 'full'
    ? { width: '100%', maxWidth: 'none', borderRadius: 0 }
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
    goNext,
    goPrev,
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
  const fadeHero = isFullBleed && visibleSlides.length > 1;
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
      <div className={`${bannerVariant === 'full' ? 'absolute inset-0 h-full w-full' : bannerVariant === 'lower' ? 'relative h-full w-full' : 'absolute inset-0'} overflow-hidden touch-pan-y`} dir="ltr" {...viewportHandlers}>
        {fadeHero ? (
          <div className="pointer-events-none absolute inset-0">
            {visibleSlides.map((slide, index) => (
              <img
                key={`fade-${slide.id || slide.sources?.desktop || index}`}
                src={slide.sources.wide || slide.sources.desktop}
                alt={index === activeDotIndex ? (slide.alt || fallback?.title || 'Showcase banner') : ''}
                width={1024}
                height={304}
                draggable={false}
                className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  index === activeDotIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        ) : null}
        <div
          ref={trackRef}
          className={`flex h-full min-h-full select-none ${fadeHero ? 'opacity-0' : ''} ${bannerVariant === 'full' ? '' : 'will-change-transform'}`}
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
              {isFullBleed ? (
                <img
                  src={slide.sources.wide || slide.sources.desktop}
                  srcSet={[
                    slide.sources.mobile && slide.sources.mobile !== (slide.sources.wide || slide.sources.desktop)
                      ? `${slide.sources.mobile} 1024w`
                      : '',
                    slide.sources.wide || slide.sources.desktop
                      ? `${slide.sources.wide || slide.sources.desktop} 3072w`
                      : '',
                  ].filter(Boolean).join(', ')}
                  sizes="100vw"
                  alt={slide.alt || fallback?.title || 'Showcase banner'}
                  width={1024}
                  height={304}
                  loading={slideIndex === (visibleSlides.length > 1 ? 1 : 0) ? 'eager' : 'lazy'}
                  fetchPriority={slideIndex === (visibleSlides.length > 1 ? 1 : 0) ? 'high' : 'auto'}
                  decoding="async"
                  draggable={false}
                  onError={() => handleImageError(slide.sources.wide || slide.sources.desktop)}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
              <ShowcaseDeviceImages
                sources={slide.sources}
                alt={slide.alt || fallback?.title || 'Showcase banner'}
                loading={slideIndex === (visibleSlides.length > 1 ? 1 : 0) ? 'eager' : 'lazy'}
                fetchPriority={slideIndex === (visibleSlides.length > 1 ? 1 : 0) ? 'high' : 'auto'}
                widths={deviceWidths}
                onError={handleImageError}
                fillHeight={bannerVariant === 'lower'}
                fit="cover"
                natural={false}
                displayQuality={displayQuality}
                keepOriginal={false}
              />
              )}
            </div>
          ))}
        </div>
      </div>

      {bannerVariant === 'full' ? (
        <BannerTextOverlay fallback={fallback} showTruckIcon={showTruckIcon} />
      ) : null}

      {enabled && slideCount > 1 ? (
        <>
          <BannerArrowButton
            direction="prev"
            label="Previous banner"
            arrow={arrow}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              goPrev();
            }}
          />
          <BannerArrowButton
            direction="next"
            label="Next banner"
            arrow={arrow}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              goNext();
            }}
          />
        </>
      ) : null}

      {enabled && slideCount > 1 ? (
        <div className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5" data-banner-ignore-drag>
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
              className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                activeDotIndex === dotIndex
                  ? 'w-4 bg-white shadow-sm'
                  : 'w-1.5 bg-white/45 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      ) : null}
    </BannerWrap>
  );
}
