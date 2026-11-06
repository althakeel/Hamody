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

const INTERVAL_MS = 3000;

function productImage(product) {
  return getProductThumbnailUrl(product) || product?.image || PLACEHOLDER;
}

function RotatingGlassCard({
  product,
  label,
  offsetClass = '',
  opacityClass = 'bg-white/85',
  animKey,
  isArabic,
}) {
  const { language } = useStorefrontI18n();
  const { convertPrice, formatNumber } = useStorefrontMarket();
  if (!product) {
    return (
      <div className={`relative flex h-[260px] w-[160px] items-center justify-center rounded-[28px] border border-white/50 ${opacityClass} shadow-2xl backdrop-blur-md sm:h-[320px] sm:w-[200px] ${offsetClass}`}>
        <span className="text-lg font-bold tracking-[0.2em] text-slate-800">{label}</span>
      </div>
    );
  }

  const name = getLocalizedProductName(product, language, product.name || '');
  const price = Number(product.price || product.AED || 0);
  const href = getProductPath(product);

  return (
    <Link
      href={href}
      className={`group relative block h-[260px] w-[160px] overflow-hidden rounded-[28px] border border-white/55 ${opacityClass} shadow-[0_25px_60px_-28px_rgba(0,0,0,0.55)] backdrop-blur-md transition duration-500 hover:-translate-y-1 sm:h-[320px] sm:w-[200px] ${offsetClass}`}
    >
      <div
        key={animKey}
        className="absolute inset-0 opacity-0"
        style={{ animation: 'campaignFadeUp 500ms ease forwards' }}
      >
        <Image
          src={productImage(product)}
          alt={name}
          fill
          sizes="200px"
          className="object-cover opacity-90 transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220]/85 via-[#0b1220]/20 to-transparent" />
        <div className={`absolute inset-x-0 bottom-0 p-4 ${isArabic ? 'text-right' : 'text-left'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">{label}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{name}</p>
          {price > 0 ? (
            <p className="mt-2 text-sm font-bold text-white">
              <CurrencySymbol /> {formatNumber(convertPrice(price))}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function CampaignGlassProductRotator({
  products = [],
  title = '11.11',
  subtitle = '',
  isArabic = false,
}) {
  const list = useMemo(
    () => (Array.isArray(products) ? products.filter((item) => item?.slug && item?.name) : []),
    [products],
  );
  const [pairIndex, setPairIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (list.length < 2 || paused) return undefined;
    const timer = window.setInterval(() => {
      setPairIndex((current) => (current + 1) % list.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [list.length, paused]);

  if (!list.length) return null;

  const left = list[pairIndex % list.length];
  const right = list[(pairIndex + 1) % list.length];
  const labels = isArabic ? ['تقنية', 'منزل'] : ['TECH', 'HOME'];

  return (
    <section
      className="relative overflow-hidden rounded-[28px] px-4 py-10 sm:px-8 sm:py-12"
      style={{
        background: 'radial-gradient(circle at 20% 20%, #334155 0%, transparent 42%), radial-gradient(circle at 80% 30%, #1e293b 0%, transparent 40%), linear-gradient(135deg, #0b1220 0%, #1e293b 55%, #0f172a 100%)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute -left-10 top-8 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -right-8 bottom-0 h-64 w-64 rounded-full bg-[#d4af37]/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-8 lg:flex-row lg:justify-between">
        <div className={`max-w-md text-white ${isArabic ? 'text-right lg:order-2' : 'text-left'}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
            {isArabic ? 'يوم العزاب' : 'Singles Day'}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {title || (isArabic ? 'عروض 11.11' : '11.11 Sale')}
          </h2>
          {subtitle ? <p className="mt-3 text-sm text-slate-300 sm:text-base">{subtitle}</p> : (
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              {isArabic
                ? 'اختيارات مميزة من عروض يوم العزاب.'
                : 'Featured picks from the Singles Day sale.'}
            </p>
          )}
        </div>

        <div className="relative flex h-[340px] w-full max-w-md items-center justify-center sm:h-[380px]">
          <div className="absolute inset-0 rounded-full bg-[#d4af37]/10 blur-3xl" />
          <div className="relative flex items-end gap-4 sm:gap-6">
            <RotatingGlassCard
              product={left}
              label={labels[0]}
              offsetClass="-translate-y-6"
              opacityClass="bg-white/90"
              animKey={`left-${pairIndex}-${left?.id || left?._id}`}
              isArabic={isArabic}
            />
            <RotatingGlassCard
              product={right}
              label={labels[1]}
              offsetClass="translate-y-4"
              opacityClass="bg-white/70"
              animKey={`right-${pairIndex}-${right?.id || right?._id}`}
              isArabic={isArabic}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes campaignFadeUp {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </section>
  );
}
