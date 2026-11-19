'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { HOME_SECTION_CLASS, HOME_SECTION_GRID_INNER_CLASS } from '@/lib/storefrontCarousel';
import { cleanDisplayText } from '@/lib/displayText';
import { getLocalizedCategoryName } from '@/lib/categoryLocalization';
import { toPublicCategoryPath } from '@/lib/categorySlug';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

const HIDDEN_SLUGS = new Set(['home-living']);

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

export default function CategoryInterestSection() {
  const { t, language, isArabic } = useStorefrontI18n();
  const scrollRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [manualCategoryIds, setManualCategoryIds] = useState([]);
  const [sectionEnabled, setSectionEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
          setManualCategoryIds(
            Array.isArray(settings?.categoryIds)
              ? settings.categoryIds.map((id) => String(id || '').trim()).filter(Boolean)
              : [],
          );
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
    const visible = records.filter((category) => {
      const slug = String(category?.slug || '').trim().toLowerCase();
      if (!slug || HIDDEN_SLUGS.has(slug)) return false;
      return Number(category?.productCount) > 0 || manualCategoryIds.includes(String(category?._id || ''));
    });
    const byId = new Map(visible.map((category) => [String(category._id || ''), category]));
    const chosen = manualCategoryIds.length
      ? manualCategoryIds.map((id) => byId.get(String(id))).filter(Boolean)
      : visible.filter((category) => categoryImage(category, records));

    return chosen.map((category) => ({
      id: String(category._id || category.slug),
      href: toPublicCategoryPath(category.slug),
      title: getLocalizedCategoryName(category, language),
      subtitle: cardSubtitle(category, language, t),
      image: categoryImage(category, records),
    })).filter((card) => card.title);
  }, [language, manualCategoryIds, records, t]);

  useEffect(() => {
    const track = scrollRef.current;
    if (!track) return undefined;
    const update = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const left = Math.abs(track.scrollLeft);
      setCanScrollLeft(left > 4);
      setCanScrollRight(maxScroll - left > 4);
    };
    update();
    track.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => {
      track.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [cards.length]);

  const scrollByCard = (direction) => {
    const track = scrollRef.current;
    if (!track) return;
    const card = track.querySelector('[data-explore-card]');
    const amount = (card?.getBoundingClientRect().width || 220) + 16;
    const sign = isArabic ? -1 : 1;
    track.scrollBy({ left: sign * direction * amount, behavior: 'smooth' });
  };

  if (!sectionEnabled || (ready && cards.length === 0)) return null;

  const EndChevrons = isArabic ? ChevronsLeft : ChevronsRight;

  return (
    <section className={HOME_SECTION_CLASS}>
      <div className={HOME_SECTION_GRID_INNER_CLASS}>
        <div className="relative mb-5 flex items-center justify-center sm:mb-6">
          <h2 className="text-center text-xl font-extrabold uppercase tracking-wide text-[#05090D] sm:text-2xl">
            {t('exploreInterests.title')}
          </h2>
          {canScrollRight ? (
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              className="absolute end-0 inline-flex items-center text-[#05090D] transition hover:opacity-70"
              aria-label={t('exploreInterests.scrollRight')}
            >
              <EndChevrons size={22} strokeWidth={2.4} />
            </button>
          ) : null}
        </div>

        <div className="relative lg:px-12">
          {canScrollLeft ? (
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              className="absolute start-1 top-[38%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E2E7E8] bg-white text-[#05090D] shadow-md transition hover:bg-[#F8FAFA] lg:start-0"
              aria-label={t('exploreInterests.scrollLeft')}
            >
              <ChevronLeft size={18} />
            </button>
          ) : null}

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide"
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {ready
              ? cards.map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  data-explore-card
                  className="w-[78%] shrink-0 overflow-hidden rounded-2xl border border-[#E2E7E8] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-[46%] md:w-[32%] lg:w-[calc((100%-4rem)/5)]"
                >
                  <div className="relative aspect-[3/4] bg-[#F2F5F5]">
                    {card.image ? (
                      <Image
                        src={card.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 18vw, 70vw"
                        className="object-cover"
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
              ))
              : Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`explore-skeleton-${index}`}
                  className="w-[78%] shrink-0 overflow-hidden rounded-2xl border border-[#E2E7E8] bg-white sm:w-[46%] md:w-[32%] lg:w-[calc((100%-4rem)/5)]"
                >
                  <div className="aspect-[3/4] animate-pulse bg-[#F2F5F5]" />
                  <div className="space-y-2 px-3 py-3">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#F2F5F5]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[#F2F5F5]" />
                  </div>
                </div>
              ))}
          </div>

          {canScrollRight ? (
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              className="absolute end-1 top-[38%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E2E7E8] bg-white text-[#05090D] shadow-md transition hover:bg-[#F8FAFA] lg:end-0"
              aria-label={t('exploreInterests.scrollRight')}
            >
              <ChevronRight size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
