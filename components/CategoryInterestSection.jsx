'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { HOME_SECTION_BLOCK_HEADING_CLASS, HOME_SECTION_GRID_INNER_CLASS } from '@/lib/storefrontCarousel';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

const LOGO_HEIGHT = 52;

function BrandLogo({ src }) {
  const [frame, setFrame] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const natural = { src, width: image.naturalWidth || 1, height: image.naturalHeight || 1 };
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        context.drawImage(image, 0, 0);
        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        let hasColor = false;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index + 3] < 16) continue;
          if (data[index] < 245 || data[index + 1] < 245 || data[index + 2] < 245) {
            hasColor = true;
            break;
          }
        }
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            if (data[index + 3] < 16) continue;
            if (hasColor && data[index] > 245 && data[index + 1] > 245 && data[index + 2] > 245) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
        if (maxX < minX || maxY < minY) {
          if (!cancelled) setFrame(natural);
          return;
        }
        const pad = 4;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(width - sx, maxX - minX + 1 + pad * 2);
        const sh = Math.min(height - sy, maxY - minY + 1 + pad * 2);
        const cropped = document.createElement('canvas');
        cropped.width = sw;
        cropped.height = sh;
        cropped.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
        if (!cancelled) setFrame({ src: cropped.toDataURL('image/png'), width: sw, height: sh });
      } catch {
        if (!cancelled) setFrame(natural);
      }
    };
    image.onerror = () => {
      if (!cancelled) setFrame({ src, width: 1, height: 1 });
    };
    image.src = /^https?:\/\//i.test(src)
      ? `/api/public/brand-logo?src=${encodeURIComponent(src)}`
      : src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const width = frame
    ? Math.min(168, Math.max(48, Math.round((frame.width / frame.height) * LOGO_HEIGHT)))
    : 120;

  return (
    <img
      src={frame?.src || src}
      alt=""
      style={{ height: LOGO_HEIGHT, width }}
      className="block object-contain"
    />
  );
}

export default function CategoryInterestSection() {
  const { t, language, isArabic } = useStorefrontI18n();
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const [brands, setBrands] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/public/brands')
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

  const marqueeDuration = `${Math.max(36, cards.length * 3.5)}s`;

  if (ready && cards.length === 0) return null;

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
              <div key={copy} className="flex items-center gap-12 pe-12" dir={isArabic ? 'rtl' : 'ltr'}>
                {(ready ? cards : Array.from({ length: 8 }, (_, item) => ({ id: `skeleton-${item}` }))).map((card) => (
                  ready ? (
                    <Link
                      key={`${copy}-${card.id}`}
                      href={card.href}
                      aria-label={card.title}
                      className="flex h-[52px] shrink-0 items-center opacity-90 transition-opacity duration-300 hover:opacity-100"
                    >
                      <BrandLogo src={card.image} />
                    </Link>
                  ) : (
                    <div
                      key={card.id}
                      className="h-[52px] w-24 shrink-0 animate-pulse rounded-md bg-slate-100"
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
