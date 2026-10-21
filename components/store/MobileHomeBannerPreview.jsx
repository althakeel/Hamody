'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, RefreshCw } from 'lucide-react'
import BusyButtonIcon from '@/components/store/BusyButtonIcon'
import {
  BANNER_HOME_SLOTS,
  MOBILE_BANNER_SECTIONS,
  heroFontFamily,
  toPublicBannerSection,
} from '@/lib/mobileBannerLayout'
import { normalizeMobileFeatures, toPreviewMobileFeatures } from '@/lib/mobileFeatures'

const SECTION_ORDER = ['bannerSlider', 'smallBanners', 'promoCards', 'tileBanners']

const SECTION_HREF = {
  bannerSlider: '/store/mobile-features/banners',
  smallBanners: '/store/mobile-features/small-banners',
  promoCards: '/store/mobile-features/promo-cards',
  tileBanners: '/store/mobile-features/tile-banners',
}

function HeroOverlay({ slide, phone = false }) {
  if (!slide?.title && !slide?.subtitle && !slide?.buttonEnabled) return null;
  const align = slide.textAlign || 'left';
  const placeX = slide.contentPosition || 'left';
  const placeY = slide.contentVertical || 'center';
  const self = placeX === 'right' ? 'flex-end' : placeX === 'center' ? 'center' : 'flex-start';
  const pack = placeY === 'top' ? 'flex-start' : placeY === 'bottom' ? 'flex-end' : 'center';
  const hover = slide.hoverAnimation && slide.hoverAnimation !== 'none' ? `hero-hover-${slide.hoverAnimation}` : '';
  const titleSize = phone
    ? Math.max(16, Math.min(22, Math.round((slide.titleSizePx || 32) * 0.58)))
    : Math.max(12, Math.round((slide.titleSizePx || 32) * 0.42));
  const subtitleSize = phone
    ? Math.max(10, Math.min(13, Math.round((slide.subtitleSizePx || 15) * 0.8)))
    : Math.max(9, Math.round((slide.subtitleSizePx || 15) * 0.7));
  return (
    <div
      className={`absolute inset-0 flex flex-col ${phone ? 'px-4 py-4' : 'p-3'}`}
      style={{ justifyContent: pack, fontFamily: heroFontFamily(slide.fontFamily) }}
    >
      <div style={{ alignSelf: self, maxWidth: phone ? '78%' : '82%', textAlign: align }}>
        {slide.title ? (
          <p
            className="font-bold leading-[1.05]"
            style={{
              color: slide.titleColor || '#fff',
              fontSize: titleSize,
              textShadow: '0 1px 2px rgba(0,0,0,0.45)',
            }}
          >
            {slide.title}
          </p>
        ) : null}
        {slide.subtitle ? (
          <p
            className={phone ? 'mt-1.5 leading-snug' : 'mt-1 leading-snug'}
            style={{
              color: slide.subtitleColor || '#e2e8f0',
              fontSize: subtitleSize,
              textShadow: '0 1px 2px rgba(0,0,0,0.45)',
            }}
          >
            {slide.subtitle}
          </p>
        ) : null}
      </div>
      {slide.buttonEnabled && slide.buttonText ? (
        <span
          className={`inline-block font-bold transition ${phone ? 'mt-2.5 px-3 py-1.5 text-[11px] tracking-wide' : 'mt-2 px-2 py-1 text-[9px]'} ${hover}`}
          style={{
            alignSelf: slide.buttonAlign === 'right' ? 'flex-end' : 'flex-start',
            background: slide.buttonColor || '#f97316',
            color: slide.buttonTextColor || '#fff',
            borderRadius: slide.buttonRadiusPx ?? 8,
          }}
        >
          {slide.buttonText}
        </span>
      ) : null}
    </div>
  );
}

function SlideCarousel({
  slides,
  heightPx,
  intervalSeconds,
  emptyLabel,
  phone = false,
  frameWidth = 376,
  frameHeight = 156,
  highlighted = false,
}) {
  const aspectRatio = `${frameWidth} / ${frameHeight}`
  const phoneWidth = `${(frameWidth / 392) * 100}%`
  const [index, setIndex] = useState(0)
  const safeSlides = Array.isArray(slides) ? slides.filter((s) => s?.image || s?.video) : []

  useEffect(() => {
    setIndex(0)
  }, [safeSlides.length, safeSlides[0]?.image, safeSlides[0]?.video])

  useEffect(() => {
    if (safeSlides.length < 2) return undefined
    const ms = Math.max(2, Number(intervalSeconds) || 4) * 1000
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % safeSlides.length)
    }, ms)
    return () => clearInterval(timer)
  }, [safeSlides.length, intervalSeconds])

  if (!safeSlides.length) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed border-slate-300 bg-slate-100 text-slate-400 ${phone ? 'mx-auto text-[11px]' : 'rounded-lg text-[10px]'} ${highlighted ? 'ring-2 ring-sky-500' : ''}`}
        style={phone ? { aspectRatio, width: phoneWidth } : { height: heightPx }}
      >
        {emptyLabel}
      </div>
    )
  }

  const current = safeSlides[index] || safeSlides[0]

  return (
    <div
      className={`relative overflow-hidden bg-slate-900 ${phone ? 'mx-auto rounded-lg' : 'rounded-lg'} ${highlighted ? 'ring-2 ring-sky-500' : ''}`}
      style={phone ? { aspectRatio, width: phoneWidth, maxWidth: phoneWidth, flex: `0 0 ${phoneWidth}` } : { height: heightPx }}
    >
      <style>{`
        .hero-hover-lift:hover { transform: translateY(-2px); }
        .hero-hover-scale:hover { transform: scale(1.06); }
        .hero-hover-fade:hover { opacity: 0.75; }
        .hero-hover-glow:hover { box-shadow: 0 0 12px rgba(255,255,255,0.85); }
      `}</style>
      {current.mediaType === 'video' && current.video ? (
        <video
          key={current.video}
          src={current.video}
          poster={current.image || undefined}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          autoPlay
          loop
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current.image}
          alt={current.title || 'Banner'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {phone ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/45 via-slate-950/10 to-transparent" />
      ) : null}
      <HeroOverlay slide={current} phone={phone} />
      {current.showAdBadge ? (
        <span className="absolute end-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
          Ad
        </span>
      ) : null}
      {safeSlides.length > 1 ? (
        <div className={`absolute inset-x-0 flex justify-center ${phone ? 'bottom-2 gap-1.5' : 'bottom-1.5 gap-1'}`}>
          {safeSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`rounded-full ${phone ? 'h-1.5 w-1.5' : 'h-1 w-1'} ${i === index ? 'bg-white' : 'bg-white/45'}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TileGrid({ tiles }) {
  const list = Array.isArray(tiles) ? tiles.filter((t) => t?.image) : []
  if (!list.length) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 text-[10px] text-slate-400">
        No category tiles
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {list.map((tile, index) => (
        <div
          key={`${tile.image}-${index}`}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          <div className="relative aspect-[4/3] bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tile.image} alt={tile.title || `Tile ${index + 1}`} className="h-full w-full object-cover" />
          </div>
          <div className="space-y-0.5 p-1.5">
            {tile.title ? (
              <p className="truncate text-[10px] font-semibold text-slate-900">{tile.title}</p>
            ) : null}
            {tile.subtitle ? (
              <p className="truncate text-[9px] text-slate-500">{tile.subtitle}</p>
            ) : null}
            {tile.buttonText ? (
              <span className="inline-block rounded bg-sky-600 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                {tile.buttonText}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function HomeGap() {
  return (
    <div className="space-y-1.5 px-3 py-3">
      <div className="h-2 w-2/3 rounded bg-slate-200" />
      <div className="h-8 rounded bg-slate-200" />
    </div>
  )
}

export function HeroSliderPreview({ features, activeKey }) {
  return (
    <div className="flex justify-center">
      <div className="w-[300px] rounded-[2.6rem] border-[11px] border-slate-900 bg-slate-900 shadow-xl">
        <div className="relative overflow-hidden rounded-[1.85rem] bg-white">
          <div className="absolute left-1/2 top-2 z-20 h-[18px] w-[92px] -translate-x-1/2 rounded-full bg-slate-900" />
          <div className="flex aspect-[9/19.5] flex-col overflow-y-auto bg-slate-50">
            <div className="h-8 shrink-0 bg-white" />
            {BANNER_HOME_SLOTS.map((slot, index) => {
              const meta = MOBILE_BANNER_SECTIONS[slot.key]
              const section = features?.[slot.key] || {}
              const slides = Array.isArray(section[meta.listKey]) ? section[meta.listKey] : []
              const active = activeKey === slot.key
              return (
                <div key={slot.key}>
                  {index > 0 ? <HomeGap /> : null}
                  <p className={`px-3 pb-1 text-[10px] font-semibold ${active ? 'text-sky-700' : 'text-slate-400'}`}>
                    {slot.label}
                  </p>
                  <div className="flex justify-center">
                    <SlideCarousel
                      slides={slides.filter((slide) => slide && slide.enabled !== false)}
                      intervalSeconds={slides.length > 1 ? section.slideIntervalSeconds : 0}
                      emptyLabel="Add a slide"
                      phone
                      highlighted={active}
                      frameWidth={meta.frameWidth}
                      frameHeight={meta.frameHeight}
                    />
                  </div>
                </div>
              )
            })}
            <div className="min-h-8 flex-1" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center">
            <span className="h-1 w-24 rounded-full bg-slate-900/80" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Phone-frame preview of app home banners.
 * Matches public API payloads so what you see here is what the mobile app receives.
 *
 * @param {object} props
 * @param {object} [props.features] - Normalized or raw mobileFeatures (optional; when omitted use publicPayload)
 * @param {object} [props.publicPayload] - Already public-shaped sections
 * @param {string} [props.highlightSectionKey] - Emphasize one section while editing
 * @param {boolean} [props.compact]
 * @param {boolean} [props.showEditLinks]
 * @param {() => void} [props.onRefresh]
 * @param {boolean} [props.refreshing]
 */
export default function MobileHomeBannerPreview({
  features,
  publicPayload,
  shopShowcase = null,
  highlightSectionKey = null,
  compact = false,
  showEditLinks = false,
  onRefresh,
  refreshing = false,
}) {
  const payload = useMemo(() => {
    if (publicPayload && typeof publicPayload === 'object') return publicPayload
    return toPreviewMobileFeatures(normalizeMobileFeatures(features || {}), shopShowcase)
  }, [features, publicPayload, shopShowcase])

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">App home preview</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Live preview of your current settings — same images and heights the app API will return after save.
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <BusyButtonIcon busy={refreshing} icon={RefreshCw} size={14} />
            Refresh
          </button>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-[320px]">
        <div className="rounded-[2rem] border-[10px] border-slate-900 bg-slate-900 p-1 shadow-xl">
          <div className="overflow-hidden rounded-[1.35rem] bg-white">
            <div className="flex h-7 items-center justify-center bg-slate-900">
              <div className="h-1.5 w-16 rounded-full bg-slate-700" />
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto bg-slate-50 p-3">
              <div className="mb-1">
                <p className="text-[11px] font-bold text-slate-900">Home</p>
                <p className="text-[9px] text-slate-400">App preview · not the website</p>
              </div>

              {(highlightSectionKey ? SECTION_ORDER.filter((key) => key === highlightSectionKey) : SECTION_ORDER).map((key) => {
                const meta = MOBILE_BANNER_SECTIONS[key]
                const section = payload[key] || toPublicBannerSection(key, {})
                const list = section[meta.listKey] || []
                const visible = Boolean(section.enabled) && list.length > 0
                const highlighted = highlightSectionKey === key

                return (
                  <div
                    key={key}
                    className={`rounded-xl p-1.5 transition ${
                      highlighted
                        ? 'ring-2 ring-sky-500 ring-offset-1'
                        : visible
                          ? 'bg-transparent'
                          : 'border border-dashed border-slate-200 bg-white/60'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        {meta.label}
                      </span>
                      {showEditLinks ? (
                        <Link
                          href={SECTION_HREF[key]}
                          className="text-[9px] font-semibold text-sky-700 hover:underline"
                        >
                          Edit
                        </Link>
                      ) : null}
                    </div>

                    {!visible ? (
                      <div className="flex h-12 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">
                        Hidden (disabled or empty)
                      </div>
                    ) : meta.isTiles ? (
                      <TileGrid tiles={list} />
                    ) : (
                      <SlideCarousel
                        slides={list}
                        heightPx={section.heightPx || meta.defaultHeightPx}
                        intervalSeconds={section.slideIntervalSeconds}
                        emptyLabel={`No ${meta.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                )
              })}

              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-2 py-3 text-center text-[9px] text-slate-400">
                Product / category sections from other home APIs appear below in the app
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
