'use client';

import { useEffect, useState } from 'react';
import {
  STOREFRONT_LANGUAGE_EVENT,
  normalizeStorefrontLanguage,
  persistStorefrontLanguage,
  readPersistedStorefrontLanguage,
} from '@/lib/storefrontLanguage';
import { DEFAULT_BNPL_TOP_BAR, normalizeBnplTopBar, resolveBnplPartners, resolveBnplTopBarMetrics } from '@/lib/bnplTopBar';

const BNPL_CACHE_KEY = 'nav:bnpl-topbar:v1';

const safeJsonParse = (value, fallback) => {
  try {
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export default function TopBar({ initialLanguage = 'en' }) {
  const [storefrontLanguage, setStorefrontLanguage] = useState(() => normalizeStorefrontLanguage(initialLanguage));
  const [bnplTopBar, setBnplTopBar] = useState(DEFAULT_BNPL_TOP_BAR);
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
    if (typeof window === 'undefined') return undefined;

    const cached = safeJsonParse(window.sessionStorage.getItem(BNPL_CACHE_KEY), null);
    if (cached && typeof cached === 'object') {
      setBnplTopBar(normalizeBnplTopBar(cached, DEFAULT_BNPL_TOP_BAR));
    }

    let active = true;
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/store/settings', { cache: 'no-store' });
        const data = response.ok ? await response.json() : {};
        if (!active) return;
        const next = normalizeBnplTopBar(data?.bnplTopBar, DEFAULT_BNPL_TOP_BAR);
        setBnplTopBar(next);
        window.sessionStorage.setItem(BNPL_CACHE_KEY, JSON.stringify(next));
      } catch {
        setBnplTopBar(DEFAULT_BNPL_TOP_BAR);
      }
    };

    loadSettings();
    window.addEventListener('navMenuUpdated', loadSettings);
    window.addEventListener('bnplTopBarUpdated', loadSettings);

    return () => {
      active = false;
      window.removeEventListener('navMenuUpdated', loadSettings);
      window.removeEventListener('bnplTopBarUpdated', loadSettings);
    };
  }, []);

  const partners = resolveBnplPartners(bnplTopBar, storefrontLanguage);
  const barMetrics = resolveBnplTopBarMetrics(bnplTopBar);

  useEffect(() => {
    if (partners.length <= 1) {
      setActiveBnplIndex(0);
      return undefined;
    }
    const flipIntervalId = window.setInterval(() => {
      setActiveBnplIndex((current) => (current + 1) % partners.length);
    }, 3500);
    return () => window.clearInterval(flipIntervalId);
  }, [partners.length]);

  if (!partners.length) return null;

  const activeBnplPartner = partners[activeBnplIndex % partners.length];
  const isArabic = storefrontLanguage === 'ar';

  return (
    <div
      data-storefront-topbar
      className="relative z-[1000] flex w-full items-center border-b border-[#e7e7e7] bg-white"
      style={{ minHeight: barMetrics.minHeight, fontSize: barMetrics.fontSize }}
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-center px-3 sm:px-5">
        <div
          key={activeBnplPartner.key}
          className="flex min-w-0 items-center justify-center gap-2 animate-[bnplFlip_560ms_ease-out]"
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          {!bnplLogoError[activeBnplPartner.key] ? (
            <img
              src={activeBnplPartner.logoUrl}
              alt={activeBnplPartner.name}
              className="w-auto shrink-0"
              style={{ height: barMetrics.logoHeight }}
              onError={() => setBnplLogoError((current) => ({ ...current, [activeBnplPartner.key]: true }))}
            />
          ) : (
            <span className="shrink-0 font-bold text-gray-900">{activeBnplPartner.name}</span>
          )}
          <span className="min-w-0 truncate font-medium leading-snug text-gray-700">
            <span className="hidden sm:inline">{activeBnplPartner.desktopText}</span>
            <span className="sm:hidden">{activeBnplPartner.mobileText}</span>
          </span>
        </div>
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
