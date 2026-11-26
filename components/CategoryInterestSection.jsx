'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { HOME_SECTION_BLOCK_HEADING_CLASS, HOME_SECTION_GRID_INNER_CLASS } from '@/lib/storefrontCarousel';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

const LOGO_SIZE = 80;
const LOGO_GAP = 24;

function sharpLogoSrc(src) {
  const value = String(src || '').trim();
  if (!value.includes('/api/media/')) return value;
  return `${value}${value.includes('?') ? '&' : '?'}logo=1`;
}

function BrandLogo({ src, onEmpty }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"
      style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
    >
      <img
        src={sharpLogoSrc(src)}
        alt=""
        width={320}
        height={320}
        draggable={false}
        className="h-full w-full object-contain"
        onError={() => onEmpty?.()}
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
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
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
                      className="flex shrink-0 items-center"
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
