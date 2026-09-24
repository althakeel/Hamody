'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Phone } from 'lucide-react';
import { isProductDetailPath } from '@/lib/productUrl';
import {
  STORE1920_CUSTOMER_SUPPORT_PHONE,
  STORE1920_CUSTOMER_SUPPORT_TEL,
  formatCustomerSupportPhoneDisplay,
} from '@/lib/storeContact';
// import tabbyLogo from '@/assets/payments/tabby.webp';
import tamaraLogo from '@/assets/payments/tamara.webp';
import {
  STOREFRONT_LANGUAGE_EVENT,
  normalizeStorefrontLanguage,
  persistStorefrontLanguage,
  readPersistedStorefrontLanguage,
} from '@/lib/storefrontLanguage';
import { translateStaticText } from '@/lib/useStorefrontI18n';

const BNPL_PARTNERS = [
  { key: 'tamara', name: 'Tamara', nameAr: 'تمارا', logoUrl: tamaraLogo.src, logoWidth: 74 },
  // { key: 'tabby', name: 'Tabby', nameAr: 'تابي', logoUrl: tabbyLogo.src, logoWidth: 62 },
];

export default function TopBar({ initialLanguage = 'en' }) {
  const router = useRouter();
  const pathname = usePathname();
  const hideBnplBanner = isProductDetailPath(pathname);
  const [storefrontLanguage, setStorefrontLanguage] = useState(() => normalizeStorefrontLanguage(initialLanguage));
  const [activeBnplIndex, setActiveBnplIndex] = useState(0);
  const [bnplLogoError, setBnplLogoError] = useState({ tamara: false, tabby: false });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncLanguage = () => {
      const language = readPersistedStorefrontLanguage(initialLanguage);
      setStorefrontLanguage(language);
      persistStorefrontLanguage(language, { userChosen: false, dispatchEvent: false });
    };

    const handleLanguageChange = (event) => {
      const nextLanguage = event?.detail?.language;
      setStorefrontLanguage(normalizeStorefrontLanguage(nextLanguage));
    };

    syncLanguage();
    window.addEventListener(STOREFRONT_LANGUAGE_EVENT, handleLanguageChange);

    return () => {
      window.removeEventListener(STOREFRONT_LANGUAGE_EVENT, handleLanguageChange);
    };
  }, [initialLanguage]);

  useEffect(() => {
    if (hideBnplBanner) return undefined;
    const flipIntervalId = window.setInterval(() => {
      setActiveBnplIndex((current) => (current + 1) % BNPL_PARTNERS.length);
    }, 3500);
    return () => window.clearInterval(flipIntervalId);
  }, [hideBnplBanner]);

  const activeBnplPartner = BNPL_PARTNERS[activeBnplIndex];
  const isArabic = storefrontLanguage === 'ar';
  const t = (key) => translateStaticText(key, storefrontLanguage);
  const activeBnplPartnerName = isArabic ? activeBnplPartner.nameAr : activeBnplPartner.name;
  const paymentCount = activeBnplPartner.key === 'tabby' ? 12 : 4;
  const bnplBannerDesktop = isArabic
    ? (activeBnplPartner.key === 'tabby'
      ? `قسّم مشترياتك إلى ${paymentCount} دفعة شهرية مع ${activeBnplPartnerName}`
      : `قسّم مشترياتك إلى ${paymentCount} دفعات مع ${activeBnplPartnerName}`)
    : (activeBnplPartner.key === 'tabby'
      ? `Split your purchase into ${paymentCount} monthly payments with ${activeBnplPartnerName}`
      : `Split your purchase into ${paymentCount} payments with ${activeBnplPartnerName}`);
  const bnplBannerMobile = isArabic
    ? `ادفع على ${paymentCount} دفعات مع ${activeBnplPartnerName}`
    : `Pay in ${paymentCount} with ${activeBnplPartnerName}`;

  return (
    <div data-storefront-topbar className="relative z-[1000] w-full border-b border-[#e7e7e7] bg-white text-xs">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 px-2 py-1.5 sm:gap-3 sm:px-5 sm:py-1">
        <a
          href={STORE1920_CUSTOMER_SUPPORT_TEL}
          dir="ltr"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50/80 px-2 py-1 no-underline transition hover:border-slate-300 hover:bg-white sm:gap-2 sm:px-2.5 sm:py-1"
          aria-label={`${t('topbar.support')} ${STORE1920_CUSTOMER_SUPPORT_PHONE}`}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 sm:h-[18px] sm:w-[18px]">
            <Phone className="h-2.5 w-2.5 text-amber-600 sm:h-3 sm:w-3" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className="whitespace-nowrap text-[11px] font-semibold tabular-nums leading-none tracking-[0.04em] text-slate-800 sm:text-xs">
            <bdi dir="ltr">{formatCustomerSupportPhoneDisplay(STORE1920_CUSTOMER_SUPPORT_PHONE)}</bdi>
          </span>
        </a>

        {!hideBnplBanner ? (
          <div
            key={activeBnplPartner.key}
            className="flex min-w-0 items-center justify-center gap-1 animate-[bnplFlip_560ms_ease-out] sm:gap-2"
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {!bnplLogoError[activeBnplPartner.key] ? (
              <img
                src={activeBnplPartner.logoUrl}
                alt={activeBnplPartner.name}
                className="h-auto w-9 shrink-0 sm:w-[74px]"
                onError={() => setBnplLogoError((current) => ({ ...current, [activeBnplPartner.key]: true }))}
              />
            ) : (
              <span className="shrink-0 text-[9px] font-bold text-gray-900 sm:text-xs">{activeBnplPartner.name}</span>
            )}
            <span className="min-w-0 truncate text-[9px] leading-none text-gray-700 sm:text-xs sm:leading-snug">
              <span className="hidden sm:inline">{bnplBannerDesktop}</span>
              <span className="sm:hidden">{bnplBannerMobile}</span>
            </span>
          </div>
        ) : (
          <div aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={() => router.push('/track-order')}
          className="flex shrink-0 items-center rounded-md border border-[#e2e2e2] bg-white px-1.5 py-1 text-[11px] font-medium whitespace-nowrap sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
        >
          <span className="hidden sm:inline" role="img" aria-label="track order">🛒</span>
          <span className="sm:hidden">{t('topbar.track')}</span>
          <span className="hidden sm:inline">{t('topbar.trackOrder')}</span>
        </button>
      </div>

      <style>{`
        @keyframes bnplFlip {
          0% { opacity: 0; transform: rotateX(58deg) translateY(-4px); }
          100% { opacity: 1; transform: rotateX(0deg) translateY(0); }
        }
      `}</style>
    </div>
  );
}
