'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HOME_SECTION_GRID_INNER_CLASS } from '@/lib/storefrontCarousel';
import { cleanDisplayText } from '@/lib/displayText';
import { getLocalizedCategoryName } from '@/lib/categoryLocalization';
import { toPublicCategoryPath } from '@/lib/categorySlug';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

const HIDDEN_SLUGS = new Set(['home-living']);
const SLIDE_SPEED_PX_PER_SEC = 42;

function categoryImage(category, records) {
  const own = String(category?.image || '').trim();
  if (own) return own;
  const id = String(category?._id || '');
  const child = records.find(
    (item) => String(item?.parentId || '') === id && String(item?.image || '').trim(),
  );
  return child ? String(child.image).trim() : '';
}

function cardSubtitle(category, language, t) {
  const description = cleanDisplayText(
    language === 'ar' ? category?.descriptionAr || category?.description : category?.description,
  );
  if (description) {
    const sentence = description.split(/(?<=[.!?])\s/)[0].trim();
    return sentence.length > 88 ? `${sentence.slice(0, 85).trim()}…` : sentence;
  }
  const count = Number(category?.productCount) || 0;
  return count > 0 ? t('category.productCount', { count }) : '';
}

function cardWidthFor(viewportWidth) {
  if (viewportWidth >= 1024) return Math.max(180, (viewportWidth - 64) / 5.15);
  if (viewportWidth >= 768) return Math.max(180, (viewportWidth - 48) / 3.2);
  if (viewportWidth >= 640) return Math.max(168, (viewportWidth - 32) / 2.15);
  return Math.max(220, viewportWidth * 0.72);
}

export default function CategoryInterestSection() {
  const { t, language, isArabic } = useStorefrontI18n();
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [sectionEnabled, setSectionEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [settingsResponse, categoriesResponse] = await Promise.all([
          fetch('/api/store/explore-interests/public').catch(() => null),
          fetch('/api/categories'),
        ]);
        if (!active) return;
        if (settingsResponse?.ok) {
          const settings = await settingsResponse.json();
          setSectionEnabled(typeof settings?.enabled === 'boolean' ? settings.enabled : true);
        }
        if (categoriesResponse?.ok) {
          const data = await categoriesResponse.json();
          setRecords(Array.isArray(data?.categories) ? data.categories : []);
        }
      } catch {
        if (active) setRecords([]);
      } finally {
        if (active) setReady(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    const seen = new Set();
    return records.flatMap((category) => {
      const slug = String(category?.slug || '').trim().toLowerCase();
      const id = String(category?._id || slug);
      if (!slug || !id || seen.has(id) || HIDDEN_SLUGS.has(slug)) return [];
      seen.add(id);
      const title = getLocalizedCategoryName(category, language);
      if (!title) return [];
      return [{
        id,
        href: toPublicCategoryPath(category.slug),
        title,
        subtitle: cardSubtitle(category, language, t),
        image: categoryImage(category, records),
      }];
    });
  }, [language, records, t]);

  const loopCards = cards.length > 1 ? [...cards, ...cards] : cards;

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || cards.length < 2) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let last = 0;
    let offset = 0;
    let paused = reduceMotion;
    let loopWidth = 0;

    const measure = () => {
      const width = cardWidthFor(viewport.clientWidth);
      viewport.style.setProperty('--explore-card', `${Math.round(width)}px`);
      const count = cards.length;
      const children = track.children;
      const styles = window.getComputedStyle(track);
      const gap = parseFloat(styles.columnGap || styles.gap || '16') || 16;
      let measured = 0;
      for (let index = 0; index < count && index < children.length; index += 1) {
        measured += children[index].getBoundingClientRect().width;
        if (index < count - 1) measured += gap;
      }
      loopWidth = measured > 0 ? measured + gap : 0;
    };

    const tick = (now) => {
      if (!last) last = now;
      const dt = Math.min(48, now - last);
      last = now;
      if (!paused) {
        if (loopWidth <= 8) measure();
      }
      if (!paused && loopWidth > 8) {
        const delta = (SLIDE_SPEED_PX_PER_SEC * dt) / 1000;
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
    viewport.addEventListener('pointerenter', pause);
    viewport.addEventListener('pointerleave', resume);
    viewport.addEventListener('pointerdown', pause);
    viewport.addEventListener('pointerup', resume);
    viewport.addEventListener('pointercancel', resume);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener('pointerenter', pause);
      viewport.removeEventListener('pointerleave', resume);
      viewport.removeEventListener('pointerdown', pause);
      viewport.removeEventListener('pointerup', resume);
      viewport.removeEventListener('pointercancel', resume);
    };
  }, [cards, isArabic, ready]);

  if (!sectionEnabled || (ready && cards.length === 0)) return null;

  return (
    <section className="w-full min-w-0 overflow-x-clip">
      <div className={`${HOME_SECTION_GRID_INNER_CLASS} rounded-2xl bg-[#C8F404] py-8`}>
        <h2 className="mb-5 text-center text-xl font-extrabold uppercase tracking-wide text-[#05090D] sm:mb-6 sm:text-2xl">
          {t('exploreInterests.title')}
        </h2>

        <div ref={viewportRef} className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex w-max gap-4"
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {(ready ? loopCards : Array.from({ length: 5 }, (_, index) => ({ id: `skeleton-${index}` }))).map((card, index) => (
              ready ? (
                <Link
                  key={`${card.id}-${index}`}
                  href={card.href}
                  data-explore-card
                  style={{ width: 'var(--explore-card, 240px)' }}
                  className="shrink-0 overflow-hidden rounded-2xl border border-[#E2E7E8] bg-white shadow-sm"
                >
                  <div className="relative aspect-[4/3] bg-[#F2F5F5]">
                    {card.image ? (
                      <Image
                        src={card.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 240px, 70vw"
                        className="object-contain p-3"
                      />
                    ) : null}
                  </div>
                  <div className="px-3 py-3">
                    <p className="line-clamp-1 text-sm font-bold text-[#05090D]">{card.title}</p>
                    {card.subtitle ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#5E6870]">{card.subtitle}</p>
                    ) : null}
                  </div>
                </Link>
              ) : (
                <div
                  key={card.id}
                  style={{ width: 'var(--explore-card, 240px)' }}
                  className="shrink-0 overflow-hidden rounded-2xl border border-[#E2E7E8] bg-white"
                >
                  <div className="aspect-[4/3] animate-pulse bg-[#F2F5F5]" />
                  <div className="space-y-2 px-3 py-3">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#F2F5F5]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[#F2F5F5]" />
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
