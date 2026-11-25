'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { HOME_SECTION_BLOCK_HEADING_CLASS, HOME_SECTION_GRID_INNER_CLASS } from '@/lib/storefrontCarousel';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

const LOGO_SIZE = 80;
const LOGO_GAP = 24;

function plateColor(red, green, blue) {
  const luminance = (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);
  if (luminance > 170) return '#FFFFFF';
  if (luminance < 55) return '#111111';
  return `rgb(${red}, ${green}, ${blue})`;
}

function BrandLogo({ src, onEmpty }) {
  const [frame, setFrame] = useState(null);
  const onEmptyRef = useRef(onEmpty);
  onEmptyRef.current = onEmpty;

  useEffect(() => {
    let cancelled = false;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const width = image.naturalWidth || 1;
        const height = image.naturalHeight || 1;
        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0);
        const { data } = context.getImageData(0, 0, width, height);
        const pixel = (x, y) => {
          const index = (y * width + x) * 4;
          return [data[index], data[index + 1], data[index + 2], data[index + 3]];
        };
        const corners = [
          pixel(0, 0),
          pixel(width - 1, 0),
          pixel(0, height - 1),
          pixel(width - 1, height - 1),
        ].filter((entry) => entry[3] > 20);
        const transparentPlate = corners.length < 3;
        const mat = corners.length
          ? corners
            .reduce((sum, entry) => [sum[0] + entry[0], sum[1] + entry[1], sum[2] + entry[2]], [0, 0, 0])
            .map((value) => Math.round(value / corners.length))
          : null;
        const matchesPlate = (red, green, blue) => (
          mat
          && Math.abs(red - mat[0]) + Math.abs(green - mat[1]) + Math.abs(blue - mat[2]) < 54
        );
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        let lightMinX = width;
        let lightMinY = height;
        let lightMaxX = 0;
        let lightMaxY = 0;
        let luminanceTotal = 0;
        let inkCount = 0;
        let lightCount = 0;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            if (data[index + 3] < 20) continue;
            const luminance = (data[index] * 0.2126) + (data[index + 1] * 0.7152) + (data[index + 2] * 0.0722);
            const isPlate = !transparentPlate && matchesPlate(data[index], data[index + 1], data[index + 2]);
            if (isPlate) continue;
            const isLight = luminance > 232;
            if (isLight) {
              lightCount += 1;
              if (x < lightMinX) lightMinX = x;
              if (y < lightMinY) lightMinY = y;
              if (x > lightMaxX) lightMaxX = x;
              if (y > lightMaxY) lightMaxY = y;
              continue;
            }
            luminanceTotal += luminance;
            inkCount += 1;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
        const hasInk = inkCount > 24 && maxX >= minX && maxY >= minY;
        const hasLightMark = !hasInk && lightCount > 24 && lightMaxX >= lightMinX && lightMaxY >= lightMinY;
        if (!hasInk && !hasLightMark) {
          if (!cancelled) onEmptyRef.current?.();
          return;
        }
        if (!hasInk) {
          minX = lightMinX;
          minY = lightMinY;
          maxX = lightMaxX;
          maxY = lightMaxY;
        } else {
          const isInkPixel = (x, y) => {
            const index = (y * width + x) * 4;
            if (data[index + 3] < 20) return false;
            const luminance = (data[index] * 0.2126) + (data[index + 1] * 0.7152) + (data[index + 2] * 0.0722);
            return luminance <= 232;
          };
          const edgeHasInk = (axis, at) => {
            let hits = 0;
            let total = 0;
            if (axis === 'x') {
              for (let x = minX; x <= maxX; x += 2) {
                total += 1;
                if (isInkPixel(x, at)) hits += 1;
              }
            } else {
              for (let y = minY; y <= maxY; y += 2) {
                total += 1;
                if (isInkPixel(at, y)) hits += 1;
              }
            }
            return total > 0 && hits / total >= 0.04;
          };
          let guard = 0;
          while (guard < 80 && maxX - minX > 12 && maxY - minY > 12) {
            const shrinkTop = !edgeHasInk('x', minY);
            const shrinkBottom = !edgeHasInk('x', maxY);
            const shrinkLeft = !edgeHasInk('y', minX);
            const shrinkRight = !edgeHasInk('y', maxX);
            if (!shrinkTop && !shrinkBottom && !shrinkLeft && !shrinkRight) break;
            if (shrinkTop) minY += 2;
            if (shrinkBottom) maxY -= 2;
            if (shrinkLeft) minX += 2;
            if (shrinkRight) maxX -= 2;
            guard += 1;
          }
        }
        const averageLuminance = hasInk ? luminanceTotal / inkCount : 255;
        const background = hasLightMark || averageLuminance > 165
          ? '#111111'
          : (transparentPlate ? '#FFFFFF' : plateColor(mat[0], mat[1], mat[2]));
        const pad = 2;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(width - sx, maxX - minX + 1 + pad * 2);
        const sh = Math.min(height - sy, maxY - minY + 1 + pad * 2);
        const cropped = document.createElement('canvas');
        cropped.width = sw;
        cropped.height = sh;
        cropped.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
        if (!cancelled) setFrame({ src: cropped.toDataURL('image/png'), background });
      } catch {
        if (!cancelled) onEmptyRef.current?.();
      }
    };
    image.onerror = () => {
      if (!cancelled) onEmptyRef.current?.();
    };
    image.src = /^https?:\/\//i.test(src)
      ? `/api/public/brand-logo?src=${encodeURIComponent(src)}`
      : src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const background = frame?.background || '#FFFFFF';

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        backgroundColor: background,
        border: background === '#FFFFFF' ? '1px solid #E6E8EC' : '1px solid transparent',
      }}
    >
      <img
        src={frame?.src || src}
        alt=""
        draggable={false}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export default function CategoryInterestSection() {
  const { t, language, isArabic } = useStorefrontI18n();
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const [brands, setBrands] = useState([]);
  const [ready, setReady] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [emptyIds, setEmptyIds] = useState([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/public/brands?fresh=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { brands: [] }))
      .then((data) => {
        if (!active) return;
        setBrands(Array.isArray(data?.brands) ? data.brands : []);
      })
      .catch(() => {
        if (active) setBrands([]);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    return brands.flatMap((brand) => {
      const image = String(brand?.image || '').trim();
      const href = String(brand?.path || '').trim();
      const title = String(language === 'ar' ? brand?.nameAr || brand?.name : brand?.name || '').trim();
      if (!image || !href || !title) return [];
      return [{
        id: String(brand.id || brand.slug || title),
        href,
        title,
        image,
      }];
    });
  }, [brands, language]);

  const visibleCards = useMemo(
    () => cards.filter((card) => !emptyIds.includes(card.id)),
    [cards, emptyIds],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const update = () => setViewportWidth(viewport.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [ready, visibleCards.length]);

  const sequence = useMemo(() => {
    if (!visibleCards.length) return [];
    const slot = LOGO_SIZE + LOGO_GAP;
    const repeats = Math.max(1, Math.ceil(Math.max(viewportWidth, slot) / (visibleCards.length * slot)));
    return Array.from({ length: repeats }, () => visibleCards).flat();
  }, [visibleCards, viewportWidth]);

  const marqueeDuration = `${Math.max(28, sequence.length * 2.4)}s`;

  if (ready && visibleCards.length === 0 && emptyIds.length >= cards.length) return null;

  return (
    <section className="w-full min-w-0 overflow-x-clip" aria-label={t('topBrands.title')}>
      <div className={HOME_SECTION_GRID_INNER_CLASS}>
        <h2 className={`${HOME_SECTION_BLOCK_HEADING_CLASS} mb-5`}>
          {t('topBrands.title')}
        </h2>

        <style>{`
          @keyframes hamody-brand-marquee {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(-50%, 0, 0); }
          }
          .hamody-brand-marquee {
            animation: hamody-brand-marquee var(--brand-marquee-duration, 42s) linear infinite;
          }
          .hamody-brand-marquee-rtl {
            animation: hamody-brand-marquee var(--brand-marquee-duration, 42s) linear infinite reverse;
          }
          .hamody-brand-marquee:hover,
          .hamody-brand-marquee-rtl:hover {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .hamody-brand-marquee,
            .hamody-brand-marquee-rtl { animation: none; }
          }
        `}</style>
        <div ref={viewportRef} className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-12 bg-gradient-to-r from-white to-transparent rtl:bg-gradient-to-l sm:w-16" />
          <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-12 bg-gradient-to-l from-white to-transparent rtl:bg-gradient-to-r sm:w-16" />
          <div
            ref={trackRef}
            className={`flex w-max items-center ${isArabic ? 'hamody-brand-marquee-rtl' : 'hamody-brand-marquee'}`}
            style={{ '--brand-marquee-duration': marqueeDuration }}
          >
            {(ready ? [0, 1] : [0]).map((copy) => (
              <div key={copy} className="flex shrink-0 items-center gap-6 pe-6" dir={isArabic ? 'rtl' : 'ltr'}>
                {(ready ? sequence : Array.from({ length: 8 }, (_, item) => ({ id: `skeleton-${item}` }))).map((card, index) => (
                  ready ? (
                    <Link
                      key={`${copy}-${index}-${card.id}`}
                      href={card.href}
                      aria-label={card.title}
                      className="flex shrink-0 items-center opacity-90 transition-opacity duration-300 hover:opacity-100"
                    >
                      <BrandLogo
                        src={card.image}
                        onEmpty={() => {
                          setEmptyIds((current) => (
                            current.includes(card.id) ? current : [...current, card.id]
                          ));
                        }}
                      />
                    </Link>
                  ) : (
                    <div
                      key={card.id}
                      className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-slate-100"
                    />
                  )
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
