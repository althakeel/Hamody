'use client';

import { useEffect, useMemo, useState } from 'react';
import CampaignSaleProductCard from '@/components/CampaignSaleProductCard';

const INTERVAL_MS = 3000;

export default function CampaignRotatingProductGrid({
  products = [],
  accent = '#0f172a',
  pageSize = 4,
  itemListId = 'campaign-sale',
  itemListName = 'Campaign sale',
  mobileColumns = 2,
  tabletColumns = 3,
  desktopColumns = 4,
  gap = 16,
}) {
  const list = useMemo(
    () => (Array.isArray(products) ? products.filter((item) => item?.slug && item?.name) : []),
    [products],
  );
  const safePageSize = Math.max(2, Math.min(pageSize, list.length || pageSize));
  const [pageIndex, setPageIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);

  const pageCount = Math.max(1, Math.ceil(list.length / safePageSize));

  useEffect(() => {
    setPageIndex(0);
  }, [list.length, safePageSize]);

  useEffect(() => {
    if (list.length <= safePageSize || paused) return undefined;
    const timer = window.setInterval(() => {
      setAnimating(true);
      window.setTimeout(() => {
        setPageIndex((current) => (current + 1) % pageCount);
        setAnimating(false);
      }, 220);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [list.length, safePageSize, pageCount, paused]);

  if (!list.length) return null;

  const start = (pageIndex * safePageSize) % list.length;
  const visible = [];
  for (let i = 0; i < Math.min(safePageSize, list.length); i += 1) {
    visible.push(list[(start + i) % list.length]);
  }

  return (
    <div
      className="space-y-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: pageCount }).map((_, index) => (
          <button
            key={`dot-${index}`}
            type="button"
            aria-label={`Show products set ${index + 1}`}
            aria-current={index === pageIndex ? 'true' : undefined}
            onClick={() => setPageIndex(index)}
            className={`h-2.5 rounded-full transition-all ${
              index === pageIndex ? 'w-7 bg-[#d4af37]' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>

      <div
        className={`campaign-page-grid grid items-stretch transition-all duration-300 ${
          animating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{
          gap: `${gap}px`,
          '--campaign-mobile-columns': mobileColumns,
          '--campaign-tablet-columns': tabletColumns,
          '--campaign-desktop-columns': desktopColumns,
        }}
      >
        {visible.map((product, productIndex) => (
          <CampaignSaleProductCard
            key={`${pageIndex}-${product.id || product._id}-${productIndex}`}
            product={product}
            accent={accent}
            itemListId={itemListId}
            itemListName={itemListName}
            itemListIndex={start + productIndex}
          />
        ))}
      </div>

    </div>
  );
}
