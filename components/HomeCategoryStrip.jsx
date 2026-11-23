'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalizedCategoryName } from '@/lib/categoryLocalization';
import { toPublicCategoryPath } from '@/lib/categorySlug';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

const HIDDEN_SLUGS = new Set(['home-living', 'heating']);

function categoryImage(category) {
  const own = String(category?.image || '').trim();
  if (own) return own;
  const child = (category?.children || []).find((item) => String(item?.image || '').trim());
  return child ? String(child.image).trim() : '';
}

export default function HomeCategoryStrip() {
  const { language, isArabic } = useStorefrontI18n();
  const viewportRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [perView, setPerView] = useState(7);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/categories')
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
      if (!slug || String(category?.parentId || '').trim() || HIDDEN_SLUGS.has(slug)) return [];
      const image = categoryImage(category);
      const title = getLocalizedCategoryName(category, language);
      if (!image || !title) return [];
      return [{
        id: String(category._id || slug),
        href: toPublicCategoryPath(category.slug),
        title,
        image,
      }];
    });
  }, [categories, language]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const update = () => {
      const width = viewport.clientWidth;
      setPerView(width >= 1024 ? 7 : width >= 640 ? 5 : 3);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [cards.length]);

  const maxIndex = Math.max(0, cards.length - perView);
  const safeIndex = Math.min(index, maxIndex);
  const step = `calc((100cqw - 0.75rem * ${perView - 1}) / ${perView} + 0.75rem)`;

  const slide = (direction) => {
    setIndex((current) => {
      const next = Math.min(maxIndex, Math.max(0, current + direction));
      return next;
    });
  };

  if (!cards.length) return null;

  return (
    <section aria-label="Categories" className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
      <div className="relative px-12 @container">
        <div ref={viewportRef} className="overflow-hidden">
          <div
            className="flex gap-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(calc(${isArabic ? safeIndex : -safeIndex} * ${step}))` }}
          >
            {cards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="group flex shrink-0 cursor-pointer flex-col items-center"
                style={{ width: `calc((100cqw - 0.75rem * ${perView - 1}) / ${perView})` }}
              >
                <span className="flex aspect-square w-full items-center justify-center overflow-hidden bg-[#F3EEE6]">
                  <img
                    src={card.image}
                    alt=""
                    className="h-full w-full object-cover mix-blend-darken transition duration-300 group-hover:scale-[1.03]"
                  />
                </span>
                <span className="mt-2 h-[3px] w-7 shrink-0 bg-[#C8F404]" />
                <span className="mt-1.5 block w-full px-1 text-center text-[12px] font-semibold leading-4 text-[#111111]">
                  {card.title}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label="Previous categories"
          onClick={() => slide(isArabic ? 1 : -1)}
          disabled={safeIndex <= 0}
          className={`absolute start-0 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.12)] ${safeIndex > 0 ? '' : 'pointer-events-none opacity-40'}`}
          style={{ top: `calc(((100cqw - 0.75rem * ${perView - 1}) / ${perView}) / 2)` }}
        >
          <ChevronLeft size={18} className="rtl:rotate-180" />
        </button>
        <button
          type="button"
          aria-label="Next categories"
          onClick={() => slide(isArabic ? -1 : 1)}
          disabled={safeIndex >= maxIndex}
          className={`absolute end-0 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.12)] ${safeIndex < maxIndex ? '' : 'pointer-events-none opacity-40'}`}
          style={{ top: `calc(((100cqw - 0.75rem * ${perView - 1}) / ${perView}) / 2)` }}
        >
          <ChevronRight size={18} className="rtl:rotate-180" />
        </button>
      </div>
    </section>
  );
}
