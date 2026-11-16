'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from '@/components/SafeNextImage';
import Link from 'next/link';
import { getLocalizedProductName } from '@/lib/displayText';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { useStorefrontMarket } from '@/lib/useStorefrontMarket';
import { PLACEHOLDER_IMAGE as PLACEHOLDER } from '@/lib/mediaUrls';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { getProductPath } from '@/lib/productUrl';
import CurrencySymbol from '@/components/CurrencySymbol';

const TARGET_MS = Date.parse('2026-11-11T23:59:00+04:00');
const ROTATE_MS = 4000;
const FEATURED_COUNT = 5;

function getParts(nowMs) {
  const diff = Math.max(0, TARGET_MS - nowMs);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    ended: diff <= 0,
  };
}

function productImage(product) {
  return getProductThumbnailUrl(product) || product?.image || PLACEHOLDER;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="min-w-[2.5rem] text-center text-xl font-semibold tabular-nums tracking-tight text-white sm:min-w-[2.75rem] sm:text-2xl">
        {pad(value)}
      </span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/55">
        {label}
      </span>
    </div>
  );
}

function CountdownSep() {
  return (
    <span className="self-start pt-0.5 text-lg font-light text-white/35 sm:pt-1 sm:text-xl" aria-hidden>
      :
    </span>
  );
}

export default function Campaign1111Hero({
  products = [],
  isArabic = false,
}) {
  const { language } = useStorefrontI18n();
  const { convertPrice, formatNumber } = useStorefrontMarket();
  const list = useMemo(
    () => (Array.isArray(products) ? products.filter((item) => item?.slug && item?.name) : []),
    [products],
  );
  const [now, setNow] = useState(() => Date.now());
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const parts = useMemo(() => getParts(now), [now]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (list.length <= FEATURED_COUNT || paused) return undefined;
    const timer = window.setInterval(() => {
      setStart((current) => (current + 1) % list.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [list.length, paused]);

  const visible = list.length
    ? Array.from({ length: Math.min(FEATURED_COUNT, list.length) }, (_, offset) => (
      list[(start + offset) % list.length]
    )).filter(Boolean)
    : [];

  return (
    <section className="overflow-hidden border border-zinc-200 bg-[#0c0c0e] text-white">
      <div
        className={`flex flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-8 lg:py-7 ${isArabic ? 'lg:flex-row-reverse' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className={`shrink-0 ${isArabic ? 'text-right' : 'text-left'}`}>
          <p className="text-xs font-medium text-white/50">
            {isArabic ? 'عرض خاص · hamody.com' : 'hamody.com exclusive'}
          </p>
          <h1 className="mt-1 text-[2.75rem] font-semibold leading-none tracking-tight sm:text-5xl">
            11.11 <span className="font-normal text-white/80">{isArabic ? 'تخفيضات' : 'Sale'}</span>
          </h1>
          <p className="mt-2 max-w-sm text-sm text-white/60">
            {isArabic
              ? 'خصومات لفترة محدودة. ينتهي 11 نوفمبر، 11:59 مساءً.'
              : 'Limited-time discounts. Ends 11 Nov, 11:59 PM.'}
          </p>

          {!parts.ended ? (
            <div className={`mt-4 flex items-end gap-2.5 sm:gap-3 ${isArabic ? 'justify-end' : ''}`}>
              <CountdownUnit value={parts.days} label={isArabic ? 'يوم' : 'Days'} />
              <CountdownSep />
              <CountdownUnit value={parts.hours} label={isArabic ? 'ساعة' : 'Hrs'} />
              <CountdownSep />
              <CountdownUnit value={parts.minutes} label={isArabic ? 'دقيقة' : 'Min'} />
              <CountdownSep />
              <CountdownUnit value={parts.seconds} label={isArabic ? 'ثانية' : 'Sec'} />
            </div>
          ) : (
            <p className="mt-4 text-sm font-medium text-amber-300">
              {isArabic ? 'انتهى العرض — تسوّق المتبقي' : 'Sale ended — shop remaining stock'}
            </p>
          )}

          <a
            href="#deals-grid"
            className="mt-5 inline-flex items-center bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            {isArabic ? 'تصفّح كل العروض' : 'Browse all deals'}
          </a>
        </div>

        <div className="hidden min-w-0 flex-1 md:block">
          {visible.length ? (
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-5 lg:gap-3">
              {visible.map((product, index) => {
                const name = getLocalizedProductName(product, language, product.name || '');
                const price = Number(product.price || product.AED || 0);
                const href = getProductPath(product);
                const hideOnTablet = index >= 3;
                return (
                  <Link
                    key={`${product.id || product._id}-${start}-${index}`}
                    href={href}
                    className={`group flex flex-col bg-white text-zinc-900 transition hover:bg-zinc-50 ${hideOnTablet ? 'hidden lg:flex' : ''}`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-zinc-100">
                      <Image
                        src={productImage(product)}
                        alt={name}
                        fill
                        sizes="(max-width: 1024px) 30vw, 140px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 px-2.5 py-2.5">
                      <p className="line-clamp-2 text-[11px] font-medium leading-snug text-zinc-700 sm:text-xs">
                        {name}
                      </p>
                      {price > 0 ? (
                        <p className="mt-auto text-sm font-semibold text-zinc-900">
                          <CurrencySymbol /> {formatNumber(convertPrice(price))}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
