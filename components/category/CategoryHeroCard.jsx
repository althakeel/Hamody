'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star, Truck } from 'lucide-react';

const DESCRIPTION_PREVIEW_LENGTH = 220;

function StarRow({ rating = 0 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = rating >= value;
        return (
          <Star
            key={value}
            size={14}
            className={filled ? 'text-amber-500' : 'text-slate-300'}
            fill={filled ? 'currentColor' : 'none'}
            strokeWidth={1.8}
          />
        );
      })}
    </span>
  );
}

export default function CategoryHeroCard({
  name,
  image,
  description = '',
  descriptionRtl = false,
  stats = {},
  t,
  isArabic = false,
  hideImage = false,
  eyebrow = '',
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);
  const productCount = Number(stats.productCount) || 0;
  const reviewCount = Number(stats.reviewCount) || 0;
  const averageRating = Number(stats.averageRating) || 0;
  const fastDeliveryPercent = Number(stats.fastDeliveryPercent) || 0;
  const locale = isArabic ? 'ar-AE' : 'en';
  const imageSrc = String(image || '').trim();
  const showImage = !hideImage && Boolean(imageSrc) && !imageFailed;
  const fullDescription = String(description || '').trim();
  const canCollapse = fullDescription.length > DESCRIPTION_PREVIEW_LENGTH;
  const visibleDescription = useMemo(() => {
    if (!fullDescription || expanded || !canCollapse) return fullDescription;
    return `${fullDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`;
  }, [canCollapse, expanded, fullDescription]);

  return (
    <section className="mb-4 md:mb-6" aria-label={name}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white md:rounded-3xl">
        <div className={`flex items-center gap-3 p-3 md:items-start md:gap-6 md:p-7 ${isArabic ? 'flex-row-reverse' : ''}`}>
          {showImage ? (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 md:h-32 md:w-32 md:rounded-2xl">
              <img
                src={imageSrc}
                alt={name}
                className="h-full w-full object-cover object-center"
                onError={() => setImageFailed(true)}
              />
            </div>
          ) : null}

          <div className={`min-w-0 flex-1 text-start ${isArabic ? 'text-end' : ''}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-600 md:text-xs md:tracking-[0.18em]">
              {eyebrow || t('category.category')}
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 md:mt-1 md:text-4xl">
              {name}
            </h1>

            <div className={`mt-2 flex flex-wrap items-center gap-1.5 md:mt-4 md:gap-2 ${isArabic ? 'justify-end' : 'justify-start'}`}>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 md:px-3 md:py-1 md:text-sm">
                {t('category.productsAvailable', {
                  count: productCount.toLocaleString(locale),
                })}
              </span>

              {reviewCount > 0 ? (
                <span dir="ltr" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 md:gap-1.5 md:px-3 md:py-1 md:text-sm">
                  <StarRow rating={averageRating} />
                  <span>
                    {t('category.reviewsSummary', {
                      rating: averageRating.toFixed(1),
                      count: reviewCount.toLocaleString(locale),
                    })}
                  </span>
                </span>
              ) : null}

              {fastDeliveryPercent > 0 ? (
                <span className={`inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700 md:gap-1.5 md:px-3 md:py-1 md:text-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Truck size={12} className="md:h-3.5 md:w-3.5" />
                  {t('category.fastShippingPercent', { percent: fastDeliveryPercent })}
                </span>
              ) : null}
            </div>

            {fullDescription ? (
              <div
                className={`mt-4 text-sm leading-6 text-slate-600 ${descriptionRtl ? 'text-right' : ''}`}
                dir={descriptionRtl ? 'rtl' : 'ltr'}
              >
                <p>{visibleDescription}</p>
                {canCollapse ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((current) => !current)}
                    className="mt-1 font-semibold text-orange-600 hover:text-orange-700"
                  >
                    {expanded ? t('category.showLess') : t('category.continueReading')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
