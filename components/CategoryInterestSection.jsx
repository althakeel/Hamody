'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { HOME_SECTION_GRID_INNER_CLASS } from '@/lib/storefrontCarousel';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

const SCROLL_SPEED = 42;
const LOGO_SLOT_CLASS = 'flex h-10 w-[140px] shrink-0 items-center justify-center';

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
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            if (data[index + 3] < 16) continue;
            if (data[index] < 18 && data[index + 1] < 18 && data[index + 2] < 18) continue;
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

  return (
    <img
      src={frame?.src || src}
      alt=""
      className="max-h-full max-w-full object-contain"
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

  const looping = cards.length > 1;
  const loopCards = looping ? [...cards, ...cards] : cards;

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !looping) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let last = 0;
    let offset = 0;
    let paused = reduceMotion;
    let loopWidth = 0;

    const measure = () => {
      const gap = parseFloat(window.getComputedStyle(track).columnGap || '12') || 12;
      let measured = 0;
      const count = cards.length;
      for (let index = 0; index < count && index < track.children.length; index += 1) {
        measured += track.children[index].getBoundingClientRect().width;
        if (index < count - 1) measured += gap;
      }
      loopWidth = measured > 0 ? measured + gap : 0;
    };

    const tick = (now) => {
      if (!last) last = now;
      const dt = Math.min(32, now - last);
      last = now;
      if (loopWidth <= 8) measure();
      if (!paused && loopWidth > 8) {
        const delta = (SCROLL_SPEED * dt) / 1000;
        offset += isArabic ? delta : -delta;
        if (!isArabic && offset <= -loopWidth) offset += loopWidth;
        if (isArabic && offset >= loopWidth) offset -= loopWidth;
        track.style.transform = `translate3d(${offset}px, 0, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      if (reduceMotion) return;
      paused = false;
      last = 0;
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    viewport.addEventListener('pointerenter', pause);
    viewport.addEventListener('pointerleave', resume);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener('pointerenter', pause);
      viewport.removeEventListener('pointerleave', resume);
      track.style.transform = '';
    };
  }, [cards.length, isArabic, looping, ready]);

  if (ready && cards.length === 0) return null;

  return (
    <section className="w-full min-w-0 overflow-x-clip" aria-label={t('topBrands.title')}>
      <div className={HOME_SECTION_GRID_INNER_CLASS}>
        <h2 className="mb-2 text-base font-bold text-[#111111]">
          {t('topBrands.title')}
        </h2>

        <div ref={viewportRef} className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex w-max items-center gap-8"
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {(ready ? loopCards : Array.from({ length: 8 }, (_, item) => ({ id: `skeleton-${item}` }))).map((card, index) => (
              ready ? (
                <Link
                  key={`${card.id}-${index}`}
                  href={card.href}
                  aria-label={card.title}
                  className={LOGO_SLOT_CLASS}
                >
                  <BrandLogo src={card.image} />
                </Link>
              ) : (
                <div
                  key={card.id}
                  className="h-10 w-[140px] shrink-0 animate-pulse rounded-lg bg-slate-100"
                />
              )
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
