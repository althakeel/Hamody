'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useStorefrontMarket } from '@/lib/useStorefrontMarket';
import { DEFAULT_NAVBAR_LANGUAGE, normalizeNavbarLanguage, resolveNavbarLanguageTrigger } from '@/lib/storefrontMarket';
import CurrencySymbol from '@/components/CurrencySymbol';
import {
  STOREFRONT_LANGUAGE_EVENT,
  normalizeStorefrontLanguage,
  persistStorefrontLanguage,
  readPersistedStorefrontLanguage,
} from '@/lib/storefrontLanguage';

const GCC_MARKETS = [
  { code: 'AE', countryName: 'United Arab Emirates', countryNameAr: 'الإمارات العربية المتحدة', currency: 'AED', flag: '🇦🇪' },
  { code: 'SA', countryName: 'Saudi Arabia', countryNameAr: 'المملكة العربية السعودية', currency: 'SAR', flag: '🇸🇦' },
  { code: 'QA', countryName: 'Qatar', countryNameAr: 'قطر', currency: 'QAR', flag: '🇶🇦' },
  { code: 'KW', countryName: 'Kuwait', countryNameAr: 'الكويت', currency: 'KWD', flag: '🇰🇼' },
  { code: 'OM', countryName: 'Oman', countryNameAr: 'عُمان', currency: 'OMR', flag: '🇴🇲' },
  { code: 'BH', countryName: 'Bahrain', countryNameAr: 'البحرين', currency: 'BHD', flag: '🇧🇭' },
];

export default function StorefrontLanguageMarketSwitch({
  initialLanguage = 'en',
  tone = 'onDark',
  appearance = DEFAULT_NAVBAR_LANGUAGE,
  variant = 'dropdown',
  open = false,
  onOpenChange,
  onOpenMenu,
}) {
  const { market: storefrontMarket, setMarketCode } = useStorefrontMarket();
  const [languageAppearance, setLanguageAppearance] = useState(() => normalizeNavbarLanguage(appearance));
  const [storefrontLanguage, setStorefrontLanguage] = useState(() => normalizeStorefrontLanguage(initialLanguage));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const suppressToggleRef = useRef(false);
  const dropdownLeaveTimerRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [portalReady, setPortalReady] = useState(false);

  const clearDropdownLeaveTimer = () => {
    if (dropdownLeaveTimerRef.current) {
      window.clearTimeout(dropdownLeaveTimerRef.current);
      dropdownLeaveTimerRef.current = null;
    }
  };

  const closeDropdown = () => {
    clearDropdownLeaveTimer();
    suppressToggleRef.current = true;
    setDropdownOpen(false);
    window.setTimeout(() => {
      suppressToggleRef.current = false;
    }, 250);
  };

  const toggleDropdown = () => {
    if (suppressToggleRef.current) return;
    setDropdownOpen((value) => !value);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const applyAppearance = (raw = {}) => {
      const next = normalizeNavbarLanguage(raw);
      setLanguageAppearance(next);
      try {
        window.sessionStorage.setItem('nav:language:v1', JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }
    };

    try {
      const cached = window.sessionStorage.getItem('nav:language:v1');
      const parsed = cached ? JSON.parse(cached) : null;
      if (parsed && typeof parsed === 'object') applyAppearance(parsed);
    } catch {
      // Ignore cache parse failures.
    }

    const loadAppearance = async () => {
      try {
        const response = await fetch('/api/store/settings', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.navbarLanguage) applyAppearance(data.navbarLanguage);
      } catch {
        // Keep current values if the request fails.
      }
    };

    void loadAppearance();

    const handleAppearanceUpdate = (event) => {
      applyAppearance(event?.detail || {});
    };

    window.addEventListener('navbarLanguageUpdated', handleAppearanceUpdate);
    window.addEventListener('navMenuUpdated', loadAppearance);
    return () => {
      window.removeEventListener('navbarLanguageUpdated', handleAppearanceUpdate);
      window.removeEventListener('navMenuUpdated', loadAppearance);
    };
  }, []);

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
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!dropdownOpen) {
      setMenuPosition(null);
      return undefined;
    }

    const updateMenuPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger || typeof window === 'undefined') return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 24);
      const top = rect.bottom + 8;
      const preferredLeft = document.documentElement.getAttribute('dir') === 'rtl'
        ? rect.right - width
        : rect.right - width;
      const left = Math.min(
        Math.max(12, preferredLeft),
        window.innerWidth - width - 12,
      );

      setMenuPosition({ top, left, width });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [dropdownOpen, storefrontLanguage]);

  useEffect(() => {
    function handleClickOutside(event) {
      const inTrigger = dropdownRef.current?.contains(event.target);
      const inMenu = menuRef.current?.contains(event.target);
      if (!inTrigger && !inMenu) closeDropdown();
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearDropdownLeaveTimer();
    };
  }, [dropdownOpen]);

  const handleDropdownMouseEnter = () => {
    clearDropdownLeaveTimer();
  };

  const handleDropdownMouseLeave = () => {
    if (!dropdownOpen) return;
    clearDropdownLeaveTimer();
    dropdownLeaveTimerRef.current = window.setTimeout(() => {
      closeDropdown();
    }, 120);
  };

  const handleLanguageChange = (lang) => {
    const nextLanguage = normalizeStorefrontLanguage(lang);
    setStorefrontLanguage(nextLanguage);
    if (typeof window !== 'undefined') {
      persistStorefrontLanguage(nextLanguage, { userChosen: true });
    }
    if (variant !== 'inline') closeDropdown();
  };

  const handleMarketChange = (code) => {
    setMarketCode(code);
    if (variant !== 'inline') closeDropdown();
  };

  const isArabic = storefrontLanguage === 'ar';
  const languageShort = isArabic ? 'AR' : 'EN';
  const triggerMark = resolveNavbarLanguageTrigger(languageAppearance, storefrontMarket?.code);
  const activeMarket = GCC_MARKETS.find((market) => market.code === storefrontMarket?.code) || GCC_MARKETS[0];
  const activeCountryName = isArabic ? activeMarket.countryNameAr : activeMarket.countryName;
  const onDark = tone === 'onDark';
  const copy = isArabic
    ? {
        language: 'اللغة',
        shopIn: 'تسوّق في',
        currency: 'العملة',
        shoppingIn: `أنت تتسوق في ${activeCountryName}.`,
      }
    : {
        language: 'Language',
        shopIn: 'Shop in',
        currency: 'Currency',
        shoppingIn: `You are shopping in ${activeCountryName}.`,
      };

  const menuBody = (
    <>
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
          {copy.language}
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ].map((option) => {
            const isActive = storefrontLanguage === option.value;
            return (
              <label
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleLanguageChange(option.value);
                }}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition ${
                  isActive
                    ? 'bg-orange-50 font-semibold text-orange-700 ring-1 ring-orange-200'
                    : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm">{option.label}</span>
                <input
                  type="radio"
                  name={variant === 'inline' ? 'drawer-lang' : 'lang'}
                  checked={isActive}
                  readOnly
                  className="pointer-events-none h-4 w-4 shrink-0 accent-orange-600"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="border-b border-gray-100 px-4 py-4">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
          {copy.shopIn}
        </div>
        <div className="flex flex-col gap-1.5">
          {GCC_MARKETS.map((market) => {
            const isActive = storefrontMarket?.code === market.code;
            const countryName = isArabic ? market.countryNameAr : market.countryName;
            return (
              <button
                key={market.code}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleMarketChange(market.code);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition ${
                  isActive
                    ? 'border-orange-300 bg-orange-50 text-orange-800 ring-1 ring-orange-200'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg leading-none">{market.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    {market.code}
                  </span>
                  <span className="block truncate text-sm font-semibold">{countryName}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold">
                    <CurrencySymbol currency={market.currency} />
                  </span>
                  {isActive ? <Check size={16} className="text-orange-600" strokeWidth={2.5} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3.5 text-sm text-gray-600">
        <div className="font-semibold text-gray-800">
          {copy.currency}:{' '}
          <CurrencySymbol currency={storefrontMarket?.currency} />
        </div>
        <div className="mt-1 leading-snug">{copy.shoppingIn}</div>
      </div>
    </>
  );

  if (variant === 'inline') {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" dir={isArabic ? 'rtl' : 'ltr'}>
        <button
          type="button"
          onClick={() => onOpenChange?.(!open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
          aria-expanded={open}
        >
          <span className="flex min-w-0 items-center gap-2">
            {triggerMark.iconUrl ? (
              <img src={triggerMark.iconUrl} alt="" className="h-5 w-5 shrink-0 rounded-sm object-contain" aria-hidden="true" />
            ) : (
              <span className="text-base leading-none" aria-hidden="true">{triggerMark.flag}</span>
            )}
            <span className="text-sm font-semibold text-slate-800">{copy.language}</span>
            <span className="text-xs font-semibold text-slate-500">{languageShort}</span>
          </span>
          <ChevronDown size={16} className={`shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open ? <div className="border-t border-slate-100">{menuBody}</div> : null}
      </section>
    );
  }

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={handleDropdownMouseEnter}
      onMouseLeave={handleDropdownMouseLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={onOpenMenu || toggleDropdown}
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold leading-none ${
          onDark ? 'text-white hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
        }`}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        aria-label={`${activeCountryName}, ${languageShort}`}
      >
        {triggerMark.iconUrl ? (
          <img
            src={triggerMark.iconUrl}
            alt=""
            className="h-5 w-5 shrink-0 rounded-sm object-contain"
            aria-hidden="true"
          />
        ) : (
          <span className="text-sm leading-none" aria-hidden="true">{triggerMark.flag}</span>
        )}
        <span>{languageShort}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-80" />
      </button>

      {dropdownOpen && portalReady && menuPosition && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[1200]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
          >
            <div
              dir={isArabic ? 'rtl' : 'ltr'}
              className="max-h-[min(72vh,520px)] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {menuBody}
            </div>
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}
