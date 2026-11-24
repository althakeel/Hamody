'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalizedCategoryName } from '@/lib/categoryLocalization';
import { toPublicCategoryPath } from '@/lib/categorySlug';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { readableUploadUrl } from '@/lib/readableUploadUrl';

const CARD_WIDTH = 127;
const CARD_HEIGHT = 110;
const IMAGE_SIZE = 80;
const CARD_GAP = 14;
const ITEM_HEIGHT = 145;
const PHONE_MAX_WIDTH = 640;
const PHONE_PER_VIEW = 5;

function readStripLayout(width, count) {
  const total = Math.max(1, count || 1);
  const compact = width > 0 && width < PHONE_MAX_WIDTH;
  const perView = compact
    ? Math.min(PHONE_PER_VIEW, total)
    : Math.max(1, Math.min(Math.floor((width + CARD_GAP) / (CARD_WIDTH + CARD_GAP)) || 1, total));
  const cardWidth = compact
    ? Math.max(1, (width - CARD_GAP * (perView - 1)) / perView)
    : CARD_WIDTH;
  const scale = cardWidth / CARD_WIDTH;
  return {
    compact,
    perView,
    cardWidth,
    cardHeight: CARD_HEIGHT * scale,
    imageSize: IMAGE_SIZE * scale,
    itemHeight: CARD_HEIGHT * scale + (ITEM_HEIGHT - CARD_HEIGHT),
    radius: 12 * scale,
  };
}

function categoryImage(category) {
  const own = String(category?.image || '').trim();
  if (own) return own;
  const child = (category?.children || []).find((item) => String(item?.image || '').trim());
  return child ? String(child.image).trim() : '';
}

function categoryHref(category) {
  const url = String(category?.url || '').trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/') && !url.startsWith('/category/')) return url;
  return toPublicCategoryPath(category.slug);
}

export default function HomeCategoryStrip({ embedded = false }) {
  const { language, isArabic } = useStorefrontI18n();
  const viewportRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [layout, setLayout] = useState(() => readStripLayout(PHONE_MAX_WIDTH, PHONE_PER_VIEW));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/categories?includeHidden=1', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { categories: [] }))
      .then((data) => {
        if (!active) return;
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    return categories.flatMap((category) => {
      const slug = String(category?.slug || '').trim().toLowerCase();
      if (!slug || String(category?.parentId || '').trim()) return [];
      const title = getLocalizedCategoryName(category, language);
      if (!title) return [];
      const image = categoryImage(category);
      return [{
        id: String(category._id || slug),
        href: categoryHref(category),
        title,
        image: image ? readableUploadUrl(image) : '',
      }];
    });
  }, [categories, language]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const update = () => {
      setLayout(readStripLayout(viewport.clientWidth, cards.length));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [cards.length]);

  const maxIndex = Math.max(0, cards.length - layout.perView);
  const safeIndex = Math.min(index, maxIndex);
  const step = `${layout.cardWidth + CARD_GAP}px`;
  const imageCenter = `${layout.cardHeight / 2}px`;

  const slide = (direction) => {
    setIndex((current) => {
      const next = Math.min(maxIndex, Math.max(0, current + direction));
      return next;
    });
  };

  if (!cards.length) return null;

  const canSlide = maxIndex > 0;

  return (
    <section aria-label="Categories" className={embedded ? 'w-full min-w-0' : 'mx-auto w-full max-w-[1400px] px-4 sm:px-6'}>
      <div className={`relative ${layout.compact || !canSlide ? '' : 'px-12'}`}>
        <div ref={viewportRef} className="overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ gap: CARD_GAP, transform: `translateX(calc(${isArabic ? safeIndex : -safeIndex} * ${step}))` }}
          >
            {cards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="group flex shrink-0 cursor-pointer flex-col items-center"
                style={{ width: layout.cardWidth, height: layout.itemHeight }}
              >
                <span
                  className="flex w-full shrink-0 items-center justify-center overflow-hidden bg-[#F4F6F8]"
                  style={{ height: layout.cardHeight, borderRadius: layout.radius }}
                >
                  {card.image ? (
                    <img
                      src={card.image}
                      alt=""
                      className="object-contain transition duration-300 group-hover:scale-[1.04]"
                      style={{ width: layout.imageSize, height: layout.imageSize }}
                    />
                  ) : (
                    <span className="text-xl font-semibold text-slate-400">{card.title.slice(0, 1)}</span>
                  )}
                </span>
                <span className={`mt-[7px] line-clamp-2 h-7 w-full text-center font-medium leading-[14px] text-[#3f3f46] ${layout.compact ? 'text-[11px]' : 'text-[12px]'}`}>
                  {card.title}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {canSlide ? (
        <>
        <button
          type="button"
          aria-label="Previous categories"
          onClick={() => slide(isArabic ? 1 : -1)}
          disabled={safeIndex <= 0}
          className={`absolute start-0 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.12)] ${layout.compact ? 'h-7 w-7' : 'h-10 w-10'} ${safeIndex > 0 ? '' : 'pointer-events-none opacity-40'}`}
          style={{ top: imageCenter }}
        >
          <ChevronLeft size={layout.compact ? 14 : 18} className="rtl:rotate-180" />
        </button>
        <button
          type="button"
          aria-label="Next categories"
          onClick={() => slide(isArabic ? -1 : 1)}
          disabled={safeIndex >= maxIndex}
          className={`absolute end-0 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.12)] ${layout.compact ? 'h-7 w-7' : 'h-10 w-10'} ${safeIndex < maxIndex ? '' : 'pointer-events-none opacity-40'}`}
          style={{ top: imageCenter }}
        >
          <ChevronRight size={layout.compact ? 14 : 18} className="rtl:rotate-180" />
        </button>
        </>
        ) : null}
      </div>
    </section>
  );
}
