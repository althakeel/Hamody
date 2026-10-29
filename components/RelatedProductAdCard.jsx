'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from '@/components/SafeNextImage';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { useStorefrontMarket } from '@/lib/useStorefrontMarket';
import { getLocalizedProductName } from '@/lib/displayText';
import { getContentDirection } from '@/lib/storefrontLanguage';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { getProductPath } from '@/lib/productUrl';
import { slugifyCategory } from '@/lib/categorySlug';
import { PLACEHOLDER_IMAGE } from '@/lib/mediaUrls';
import { RELATED_AD_MARKETPLACES } from '@/lib/relatedProductAd';
import CurrencySymbol from '@/components/CurrencySymbol';

function parseAmount(value) {
  const num = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isNaN(num) ? 0 : num;
}

const THEMES = {
  brand: {
    shell: 'bg-[#f3f4f6]',
    link: 'text-[#1a56db]',
    express: 'bg-[#FEEE00] text-slate-900',
  },
  noon: {
    name: 'Noon',
    shell: 'bg-[#FFF6B8]',
    link: 'text-slate-900',
    express: 'bg-[#FEEE00] text-slate-900',
  },
  jomla: {
    name: 'Jomla',
    shell: 'bg-[#FDE8E7]',
    link: 'text-[#B31217]',
    express: 'bg-[#FEEE00] text-slate-900',
  },
  amazon: {
    name: 'Amazon',
    shell: 'bg-[#FFF1DC]',
    link: 'text-[#C45500]',
    express: 'bg-[#FF9900] text-slate-900',
  },
};

function MarketplaceMark({ theme, initials }) {
  if (theme === 'noon') {
    return <img src="/logo/noon.png" alt="" className="h-8 w-auto max-w-[88px] object-contain" />;
  }
  if (theme === 'jomla') {
    return (
      <span className="inline-flex h-9 items-center rounded-lg bg-[#E52D27] px-1.5">
        <img src="/logo/jomla.png" alt="" className="h-5 w-auto object-contain" />
      </span>
    );
  }
  if (theme === 'amazon') {
    return (
      <span className="inline-flex h-9 items-center rounded-lg bg-[#232F3E] px-1.5">
        <img src="/logo/amazon.png" alt="" className="h-6 w-auto object-contain" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEEE00] text-[11px] font-extrabold uppercase tracking-tight text-slate-900">
      {initials}
    </span>
  );
}

export default function RelatedProductAdCard({
  product,
  headline = '',
  marketplaces = [],
  links = {},
}) {
  const { t, language } = useStorefrontI18n();
  const { market, convertPrice, formatNumber } = useStorefrontMarket();
  const frames = RELATED_AD_MARKETPLACES.filter((item) => marketplaces.includes(item));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [frames.join('|')]);

  useEffect(() => {
    if (frames.length < 2) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % frames.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [frames.join('|')]);

  if (!product?.slug && !product?._id) return null;

  const themeKey = frames.length ? frames[index % frames.length] : 'brand';
  const theme = THEMES[themeKey] || THEMES.brand;
  const name = getLocalizedProductName(product, language) || product.name || '';
  const brand = String(language === 'ar' ? (product.brandAr || product.brand) : product.brand || '').trim();
  const line = String(headline || '').trim();
  const heading = theme.name
    ? (line ? `${theme.name}: ${line}` : theme.name)
    : (line ? (brand ? `${brand}: ${line}` : line) : (brand || name));
  const brandSlug = slugifyCategory(brand);
  const productHref = getProductPath(product);
  const externalHref = String(links[themeKey] || '').trim();
  const shopHref = theme.name ? (externalHref || productHref) : (brandSlug ? `/brand/${brandSlug}` : productHref);
  const shopExternal = Boolean(theme.name && externalHref);
  const shopLabel = theme.name
    ? t('product.adShopOn', { name: theme.name })
    : (brand ? t('product.shopBrand', { brand }) : t('product.viewAllLink'));
  const imageSrc = getProductThumbnailUrl(product, { fallback: PLACEHOLDER_IMAGE });
  const sale = parseAmount(product.price);
  const regular = parseAmount(product.AED || product.mrp);
  const price = sale > 0 ? sale : regular;
  const initials = (brand || 'Ad').replace(/[^A-Za-z0-9\u0600-\u06FF]/g, '').slice(0, 2).toUpperCase() || 'AD';

  const shopLinkClass = `mt-0.5 inline-flex items-center text-[12px] font-medium hover:underline ${theme.link}`;
  const shopLink = shopExternal ? (
    <a href={shopHref} target="_blank" rel="noopener noreferrer" className={shopLinkClass}>
      {shopLabel}
      <span aria-hidden="true" className="ms-1">{'>'}</span>
    </a>
  ) : (
    <Link href={shopHref} className={shopLinkClass}>
      {shopLabel}
      <span aria-hidden="true" className="ms-1">{'>'}</span>
    </Link>
  );

  return (
    <article data-related-product-ad data-ad-theme={themeKey} className={`w-full max-w-full overflow-hidden rounded-2xl p-3 ${theme.shell}`}>
      <div className="flex items-start gap-2.5">
        <MarketplaceMark theme={themeKey} initials={initials} />
        <div className="min-w-0 pt-0.5">
          <p className="line-clamp-2 text-[13px] font-bold leading-tight text-slate-900">{heading}</p>
          {shopLink}
        </div>
      </div>

      <div className="relative mt-2.5 rounded-xl bg-white p-2.5 pb-6 shadow-sm">
        <Link href={productHref} className="flex gap-2.5">
          <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-lg bg-white">
            <Image src={imageSrc} alt="" fill className="object-contain" sizes="84px" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="line-clamp-2 text-[12px] font-medium leading-snug text-slate-900">
              <bdi dir={getContentDirection(name)}>{name}</bdi>
            </h3>
            {price > 0 ? (
              <p dir="ltr" className="mt-1.5 inline-flex items-baseline text-[15px] font-bold text-slate-950">
                <CurrencySymbol currency={market.currency} className="me-0.5 text-[13px]" />
                <span>
                  {formatNumber(convertPrice(price), language, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </p>
            ) : null}
            <span className={`mt-1.5 inline-flex w-fit rounded-sm px-1.5 py-0.5 text-[11px] font-semibold lowercase leading-none ${theme.express}`}>
              {t('product.adExpress')}
            </span>
          </div>
        </Link>
        <span className="pointer-events-none absolute bottom-2 end-2.5 text-[11px] text-slate-400">{t('product.adLabel')}</span>
      </div>
    </article>
  );
}
