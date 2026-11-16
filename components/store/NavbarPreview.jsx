'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronDown, ChevronLeft, ChevronRight, Flame, Grid3x3, Heart, History, Menu, Package, Phone, Search, Shield, ShoppingCart, Sparkles, Star, User, X } from 'lucide-react';
import { DEFAULT_NAVBAR_PHONE, resolveNavbarPhone } from '@/lib/storeContact';
import { DEFAULT_NAVBAR_LANGUAGE, resolveNavbarLanguageTrigger } from '@/lib/storefrontMarket';
import OffersNavLabel from '@/components/OffersNavLabel';
import { filterParentCategories, getCategoryDisplayName, resolveStoreNavMenuItems } from '@/lib/categoryNavigation';
import { DEFAULT_BNPL_TOP_BAR, resolveBnplPartners, resolveBnplTopBarMetrics } from '@/lib/bnplTopBar';
import { HAMODY_LOGO_PATH } from '@/lib/brandLogo';
import {
  DEFAULT_OFFERS_NAV_LABEL,
  DEFAULT_OFFERS_NAV_STYLE,
  expandOffersNavShortcodes,
  getOffersNavButtonAppearance,
  normalizeNavGifUrl,
  normalizeOffersNavStyle,
  splitOffersNavLabel,
} from '@/lib/offersPageSettings';
import { applyUnifiedNavbarText, getNavbarArrangeItems, getNavbarBottomBorderStyle, getNavbarCategoriesButtonAppearance, getNavbarCategoriesButtonLabel, getNavbarSearchAppearance, getUnifiedNavbarFontId, getUnifiedNavbarTextCss, groupNavbarItemsBySide, visibleNavbarExtraButtons } from '@/lib/navbarLayoutSettings';

const DEFAULT_BG = '#9f4b1d';
const NAVBAR_MAX_WIDTH_LIMIT = 1400;

function getContrastColor(hexColor) {
  const hex = String(hexColor || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff';
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.65 ? '#111827' : '#ffffff';
}

export default function NavbarPreview({
  backgroundColor = DEFAULT_BG,
  logoUrl = '',
  logoWidth = 120,
  logoHeight = 40,
  navMenuEnabled = true,
  navMenuItems = [],
  navMenuUseParentCategories = false,
  navMenuHoverDropdown = true,
  categoryOptions = [],
  navActionsVisibility = { orders: true, wishlist: true, cart: true, phone: true, language: true },
  navbarPhone = DEFAULT_NAVBAR_PHONE,
  navbarLanguage = DEFAULT_NAVBAR_LANGUAGE,
  searchPlaceholder = 'Search products...',
  dealsLabel = '',
  extraButtons = [],
  searchMaxWidth = 600,
  searchAlign = 'left',
  searchStyle,
  navbarMaxWidth = 1400,
  showCategoriesButton = true,
  categoriesButtonLabel = '',
  categoriesButtonStyle,
  itemOrder,
  itemAlign,
  itemGap = 12,
  logoGap = 16,
  mobileItemGap = 4,
  device = 'desktop',
  userName = 'Hamody',
  showMenuBar = true,
  menuBarBackgroundColor = '#000000',
  showBottomBorder = false,
  bottomBorderWidth = 2,
  bottomBorderColor = '#e2e8f0',
  unifyNavbarText = false,
  unifiedTextFontFamily = 'inherit',
  unifiedTextFontSize = 13,
  bnplTopBar = DEFAULT_BNPL_TOP_BAR,
}) {
  const bg = backgroundColor || DEFAULT_BG;
  const textColor = getContrastColor(bg);
  const searchAccentColor = bg || '#0f172a';
  const bottomBorderStyle = getNavbarBottomBorderStyle({
    showBottomBorder,
    bottomBorderWidth,
    bottomBorderColor,
  });
  const menuItems = useMemo(() => {
    return resolveStoreNavMenuItems(
      { navMenuUseParentCategories, navMenuItems },
      categoryOptions,
      'en',
      { previewLiveParents: true },
    ).filter((item) => String(item?.name || '').trim());
  }, [navMenuUseParentCategories, categoryOptions, navMenuItems]);
  const bnplPartners = useMemo(() => resolveBnplPartners(bnplTopBar, 'en'), [bnplTopBar]);
  const bnplPreview = bnplPartners[0] || null;
  const bnplMetrics = useMemo(() => resolveBnplTopBarMetrics(bnplTopBar), [bnplTopBar]);
  const resolvedLogoUrl = String(logoUrl || '').trim() || HAMODY_LOGO_PATH;
  const logoW = Number(logoWidth) > 0 ? Number(logoWidth) : 120;
  const logoH = Number(logoHeight) > 0 ? Number(logoHeight) : 40;
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(device === 'mobile');
  useEffect(() => {
    if (device === 'mobile') setMobileDrawerOpen(true);
  }, [device]);
  const [offersNav, setOffersNav] = useState({
    label: String(dealsLabel || '').trim(),
    gifUrl: '',
    style: DEFAULT_OFFERS_NAV_STYLE,
  });

  useEffect(() => {
    if (dealsLabel) {
      setOffersNav((prev) => ({ ...prev, label: String(dealsLabel).trim() }));
    }
  }, [dealsLabel]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadOffersNav = async () => {
      try {
        const response = await fetch(`/api/store/appearance/sections/public?t=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        const label = expandOffersNavShortcodes(
          String(data?.offersPage?.navLabel || DEFAULT_OFFERS_NAV_LABEL).trim() || DEFAULT_OFFERS_NAV_LABEL
        );
        if (!active) return;
        setOffersNav({
          label: dealsLabel || label,
          gifUrl: normalizeNavGifUrl(data?.offersPage?.navGifUrl),
          style: normalizeOffersNavStyle(data?.offersPage?.navStyle),
        });
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    };

    loadOffersNav();
    return () => {
      active = false;
      controller.abort();
    };
  }, [dealsLabel]);

  const resolvedDealsLabel = offersNav.label || DEFAULT_OFFERS_NAV_LABEL;
  const unifiedLayout = {
    unifyNavbarText,
    unifiedTextFontFamily,
    unifiedTextFontSize,
    categoriesButtonStyle,
    searchStyle,
  };
  const dealsAppearance = getOffersNavButtonAppearance(
    applyUnifiedNavbarText(offersNav.style || DEFAULT_OFFERS_NAV_STYLE, unifiedLayout),
    'desktop',
  );
  const categoriesAppearance = getNavbarCategoriesButtonAppearance(unifiedLayout, 'desktop');
  const desktopSearchAppearance = getNavbarSearchAppearance(unifiedLayout, 'desktop');
  const mobileSearchAppearance = getNavbarSearchAppearance(unifiedLayout, 'mobile');
  const dealsParts = splitOffersNavLabel(resolvedDealsLabel);
  const previewExtraButtons = visibleNavbarExtraButtons(extraButtons, 'en');
  const previewLayout = {
    extraButtons,
    showCategoriesButton,
    categoriesButtonLabel,
    categoriesButtonStyle,
    itemOrder,
    itemAlign,
  };
  const previewItems = getNavbarArrangeItems(previewLayout, navActionsVisibility);
  const resolvedNavbarMaxWidth = Math.min(NAVBAR_MAX_WIDTH_LIMIT, Number(navbarMaxWidth) || NAVBAR_MAX_WIDTH_LIMIT);
  const renderPreviewAction = (Icon, label, badge) => (
    <span className="relative inline-flex shrink-0 items-center gap-1 px-0.5 py-1 text-white">
      <span className="relative inline-flex shrink-0 items-center justify-center">
        <Icon size={18} strokeWidth={1.5} />
        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="whitespace-nowrap text-[12px] font-normal leading-none">{label}</span>
    </span>
  );

  const renderPreviewItem = (itemId) => {
    if (itemId === 'logo') {
      return (
        <img
          src={resolvedLogoUrl}
          alt="Store logo"
          width={logoW}
          height={logoH}
          className="h-8 w-auto max-w-[72px] shrink-0 object-contain"
          style={{ maxHeight: '32px', marginInlineEnd: `${Math.min(Number(logoGap) || 0, 8)}px` }}
        />
      );
    }
    if (itemId === 'deals') {
      return (
        <span
          className={`navbar-deals-btn inline-flex shrink-0 items-center font-extrabold leading-none tracking-[0.04em] ${dealsAppearance.animationClass || ''}`}
          data-font={dealsAppearance.fontId || 'inherit'}
          style={{ ...dealsAppearance.style, fontSize: 12 }}
        >
          <span className="flex items-center leading-[1.05]">
            <OffersNavLabel
              label={resolvedDealsLabel}
              gifUrl={offersNav.gifUrl}
              shineClass={dealsAppearance.useShine ? 'navbar-deals-text-shine' : ''}
              gifSize={18}
              top={dealsParts.top}
              bottom={dealsParts.bottom}
            />
          </span>
        </span>
      );
    }
    if (itemId === 'categories') {
      return (
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 font-medium leading-none ${categoriesAppearance.animationClass || ''}`}
          data-font={categoriesAppearance.fontId || 'inherit'}
          style={{
            ...categoriesAppearance.style,
            minHeight: 36,
            height: 36,
            fontSize: 12,
          }}
        >
          <span style={{ textTransform: 'none' }}>{getNavbarCategoriesButtonLabel({ categoriesButtonLabel }, 'en', 'Categories')}</span>
          <ChevronDown
            size={categoriesAppearance.chevronSize || 13}
            strokeWidth={2.4}
            className="shrink-0"
            style={{ color: categoriesAppearance.textColor || 'currentColor' }}
            aria-hidden="true"
          />
        </span>
      );
    }
    if (itemId === 'search') {
      return (
        <div className="relative min-w-0 w-full">
            <div
              className="flex h-9 w-full min-w-0 items-center overflow-hidden px-2 shadow-sm"
              data-font={desktopSearchAppearance.fontId || 'inherit'}
              style={desktopSearchAppearance.boxStyle}
            >
              <span
                className="min-w-0 flex-1 truncate leading-none opacity-70"
                style={desktopSearchAppearance.inputStyle}
              >
                {searchPlaceholder}
              </span>
              <span
                className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ color: desktopSearchAppearance.textColor || searchAccentColor }}
              >
                <Search size={15} />
              </span>
            </div>
        </div>
      );
    }
    if (itemId === 'account') {
      return (
        <span className="inline-flex max-w-[128px] items-center gap-1.5 rounded-md px-0.5 py-1 text-left text-white">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center">
            <User size={18} strokeWidth={1.85} />
          </span>
          <span className="flex min-w-0 flex-col leading-[1.1]">
            <span
              className={`truncate font-bold leading-none text-white ${unifyNavbarText ? '' : 'text-[12px]'}`}
              data-font={getUnifiedNavbarFontId(unifiedLayout) || undefined}
              style={getUnifiedNavbarTextCss(unifiedLayout) || undefined}
            >
              Sign In / Register
            </span>
            <span className="mt-0.5 truncate text-[10px] font-normal leading-none text-white/85">
              Orders &amp; Account
            </span>
          </span>
        </span>
      );
    }
    if (itemId === 'orders') return renderPreviewAction(Package, 'Orders');
    if (itemId === 'wishlist') return renderPreviewAction(Heart, 'Wishlist', '1');
    if (itemId === 'cart') return renderPreviewAction(ShoppingCart, 'Cart', '2');
    if (itemId === 'phone') {
      const phone = resolveNavbarPhone(navbarPhone);
      return (
        <span className="inline-flex shrink-0 items-center gap-1 px-0.5 py-1 text-white">
          <Phone size={16} strokeWidth={1.7} />
          <span className="flex min-w-0 flex-col leading-[1.05]">
            <span className="text-[12px] font-bold tabular-nums leading-none" dir="ltr">
              {phone.short}
            </span>
            {phone.displayLabel ? (
              <span className="mt-0.5 max-w-[72px] truncate text-[9px] font-medium leading-none text-white/85">
                {phone.displayLabel}
              </span>
            ) : null}
          </span>
        </span>
      );
    }
    if (itemId === 'language') {
      const languageTrigger = resolveNavbarLanguageTrigger(navbarLanguage);
      return (
        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold leading-none text-white">
          {languageTrigger.iconUrl ? (
            <img src={languageTrigger.iconUrl} alt="" className="h-5 w-5 rounded-sm object-contain" />
          ) : (
            <span className="text-sm leading-none" aria-hidden="true">{languageTrigger.flag}</span>
          )}
          <span>EN</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-80" />
        </span>
      );
    }

    const extraButton = previewExtraButtons.find((button) => button.id === itemId);
    if (!extraButton) return null;
    const extraAppearance = getOffersNavButtonAppearance(
      applyUnifiedNavbarText(extraButton.style, unifiedLayout),
      'desktop',
    );
    return (
      <span
        className={`inline-flex shrink-0 items-center leading-none tracking-[0.04em] ${extraAppearance.animationClass || ''}`}
        data-font={extraAppearance.fontId || 'inherit'}
        style={extraAppearance.style}
      >
        {extraButton.displayLabel}
        {extraButton.kind === 'dropdown' ? <ChevronDown className="ms-1 h-3 w-3 shrink-0 opacity-80" /> : null}
      </span>
    );
  };

  if (device === 'mobile') {
    const iconClass = 'text-gray-900';
    const phone = resolveNavbarPhone(navbarPhone);
    const languageMark = resolveNavbarLanguageTrigger(navbarLanguage);
    const sidebarCategories = filterParentCategories(Array.isArray(categoryOptions) ? categoryOptions : [])
      .map((category) => getCategoryDisplayName(category, 'en'))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
    const categoryNames = sidebarCategories.length
      ? sidebarCategories
      : menuItems.map((item) => String(item?.name || '').trim()).filter(Boolean);
    const categoryHeading = getNavbarCategoriesButtonLabel(
      { categoriesButtonLabel, showCategoriesButton },
      'en',
      'Categories',
    );
    return (
      <div className="flex justify-center">
        <div className="relative w-full max-w-[390px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-sm">
          <div className="flex items-center justify-center bg-slate-200/80 py-1.5">
            <span className="h-1 w-16 rounded-full bg-slate-400/70" />
          </div>
          {bnplPreview ? (
            <div
              className="flex items-center justify-center gap-2 border-b border-[#e7e7e7] bg-white px-2"
              style={{ minHeight: bnplMetrics.minHeight, fontSize: bnplMetrics.fontSize }}
            >
              <img src={bnplPreview.logoUrl} alt={bnplPreview.name} className="w-auto" style={{ height: bnplMetrics.logoHeight }} />
              <span className="truncate font-medium leading-snug text-gray-700">{bnplPreview.mobileText}</span>
            </div>
          ) : null}
          <nav
            className="border-b shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
            style={{
              backgroundColor: '#ffffff',
              borderColor: 'rgba(15, 23, 42, 0.12)',
              ...bottomBorderStyle,
            }}
          >
            <div
              className="flex min-w-0 items-center overflow-visible px-2 py-2"
              style={{ gap: `${Number(mobileItemGap) || 0}px` }}
            >
              <button
                type="button"
                onClick={() => setMobileDrawerOpen((open) => !open)}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
                aria-label={mobileDrawerOpen ? 'Close side menu preview' : 'Open side menu preview'}
              >
                <Menu size={20} />
              </button>
              <img
                src={resolvedLogoUrl}
                alt="Store logo"
                width={logoW}
                height={logoH}
                className="h-7 w-auto max-w-[72px] shrink-0 object-contain"
                style={{ maxHeight: '32px' }}
              />
              <div className="relative min-w-0 flex-1">
                <div
                  className="relative flex h-9 min-w-0 items-center overflow-hidden pl-2.5 pr-1 shadow-[0_2px_10px_rgba(15,23,42,0.12)]"
                  data-font={mobileSearchAppearance.fontId || 'inherit'}
                  style={mobileSearchAppearance.boxStyle}
                >
                  <span
                    className="min-w-0 flex-1 truncate opacity-50"
                    style={mobileSearchAppearance.inputStyle}
                  >
                    {searchPlaceholder}
                  </span>
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500">
                    <Camera size={15} />
                  </span>
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: bg || '#0f172a' }}
                  >
                    <Search size={14} strokeWidth={2.5} />
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {navActionsVisibility.phone !== false ? (
                  <span className={`inline-flex h-9 shrink-0 flex-col items-center justify-center rounded-md px-1 ${iconClass}`}>
                    <Phone size={16} strokeWidth={1.7} />
                    {phone.displayLabel ? (
                      <span className="mt-0.5 text-[8px] font-semibold leading-none">{phone.displayLabel}</span>
                    ) : null}
                  </span>
                ) : null}
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  <img src={resolvedLogoUrl} alt="" className="h-full w-full object-cover" />
                </span>
                {navActionsVisibility.wishlist !== false ? (
                  <span className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                    <Heart size={20} strokeWidth={1.5} />
                    <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">1</span>
                  </span>
                ) : null}
                {navActionsVisibility.cart !== false ? (
                  <span className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                    <ShoppingCart size={20} strokeWidth={1.5} />
                    <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">4</span>
                  </span>
                ) : null}
              </div>
            </div>
          </nav>
          <div className="min-h-[560px] bg-white" />
          {mobileDrawerOpen ? (
            <div className="absolute inset-0 z-20 flex bg-slate-900/50">
              <div className="flex h-full w-[86%] flex-col overflow-hidden bg-[#f7f8fa] text-slate-800 shadow-2xl">
                <div className="shrink-0 border-b border-slate-200 bg-white px-3 pb-2.5 pt-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <img src={resolvedLogoUrl} alt="" className="h-7 w-auto max-w-[110px] object-contain" />
                    <button
                      type="button"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="rounded-full bg-slate-100 p-1.5 text-slate-600"
                      aria-label="Close side menu preview"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <img src={resolvedLogoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">Hi, {userName || 'Hamody'}</p>
                      <p className="text-[10px] text-slate-500">Account</p>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-2">
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Account</p>
                    {[
                      ['Profile', User],
                      ['Security', Shield],
                      ['My Orders', Package],
                      ['Track Order', Package],
                      ['Browse History', History],
                    ].map(([label, Icon]) => (
                      <p key={label} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium last:border-b-0">
                        <Icon size={14} className="text-slate-500" />
                        {label}
                      </p>
                    ))}
                  </section>
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <p className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <Grid3x3 size={12} />
                      {categoryHeading}
                    </p>
                    {categoryNames.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-500">No categories yet</p>
                    ) : categoryNames.map((name) => (
                      <p key={name} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 text-xs font-semibold last:border-b-0">
                        <span className="min-w-0 truncate">{name}</span>
                        <ChevronDown size={14} className="shrink-0 text-slate-400" />
                      </p>
                    ))}
                  </section>
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Shop</p>
                    <p className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium"><Flame size={14} className="text-orange-500" />Top selling</p>
                    <p className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium"><Sparkles size={14} className="text-violet-500" />New arrivals</p>
                    <p className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium"><Star size={14} className="fill-amber-500 text-amber-500" />5 star rated</p>
                    {navActionsVisibility.wishlist !== false ? (
                      <p className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium"><Heart size={14} className="text-rose-500" />Wishlist</p>
                    ) : null}
                    {navActionsVisibility.cart !== false ? (
                      <p className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium"><ShoppingCart size={14} className="text-blue-600" />Cart</p>
                    ) : null}
                    {navActionsVisibility.store !== false ? (
                      <p className="flex items-center gap-2 px-3 py-2 text-xs font-medium">
                        <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Seller</span>
                        Dashboard
                      </p>
                    ) : null}
                  </section>
                  {navActionsVisibility.language !== false ? (
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        {languageMark.iconUrl ? (
                          <img src={languageMark.iconUrl} alt="" className="h-4 w-4 rounded-sm object-contain" />
                        ) : (
                          <span aria-hidden="true">{languageMark.flag}</span>
                        )}
                        Language
                        <span className="text-[10px] font-semibold text-slate-500">EN</span>
                      </span>
                      <ChevronDown size={14} className="text-slate-500" />
                    </div>
                  ) : null}
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Support</p>
                    {['FAQ', 'Support', 'Terms & Conditions', 'Privacy Policy', 'Return Policy'].map((label) => (
                      <p key={label} className="border-b border-slate-100 px-3 py-2 text-xs text-slate-700 last:border-b-0">{label}</p>
                    ))}
                  </section>
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-700">Sign out</p>
                </div>
              </div>
              <button
                type="button"
                className="min-w-0 flex-1"
                aria-label="Close side menu preview"
                onClick={() => setMobileDrawerOpen(false)}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200/80 shadow-sm">
        {bnplPreview ? (
          <div
            className="flex items-center justify-center gap-2 border-b border-[#e7e7e7] bg-white px-3"
            style={{ minHeight: bnplMetrics.minHeight, fontSize: bnplMetrics.fontSize }}
          >
            <img src={bnplPreview.logoUrl} alt={bnplPreview.name} className="w-auto" style={{ height: bnplMetrics.logoHeight }} />
            <span className="truncate font-medium leading-snug text-gray-700">{bnplPreview.desktopText}</span>
          </div>
        ) : null}
        <div
          className="border-b text-white"
          style={{
            backgroundColor: bg,
            borderColor: 'rgba(15, 23, 42, 0.18)',
            color: textColor,
          }}
        >
          <div className="px-3">
            {(() => {
              const sides = groupNavbarItemsBySide(
                previewItems.map((item) => item.id),
                itemAlign,
                extraButtons,
                searchAlign,
              );
              const orderedIds = [...sides.left, ...sides.center, ...sides.right];
              return (
                <div className="flex w-full items-center gap-2 py-2">
                  {orderedIds.map((itemId) => {
                    const node = renderPreviewItem(itemId);
                    if (!node) return null;
                    return (
                      <div
                        key={itemId}
                        className={itemId === 'search' ? 'relative min-w-[140px] flex-1' : 'shrink-0'}
                      >
                        {node}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {showMenuBar ? (
          navMenuEnabled && menuItems.length > 0 ? (
            <div
              className="relative w-full"
              style={{
                backgroundColor: menuBarBackgroundColor || '#000000',
                boxShadow: `inset 0 1px 0 ${getContrastColor(menuBarBackgroundColor || '#000000') === '#111827' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)'}`,
                ...bottomBorderStyle,
              }}
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center ps-1">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: menuBarBackgroundColor || '#000000',
                    color: getContrastColor(menuBarBackgroundColor || '#000000'),
                    borderColor: getContrastColor(menuBarBackgroundColor || '#000000') === '#111827' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)',
                  }}
                >
                  <ChevronLeft size={14} />
                </span>
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pe-1">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: menuBarBackgroundColor || '#000000',
                    color: getContrastColor(menuBarBackgroundColor || '#000000'),
                    borderColor: getContrastColor(menuBarBackgroundColor || '#000000') === '#111827' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)',
                  }}
                >
                  <ChevronRight size={14} />
                </span>
              </div>
              <div className="mx-auto w-full overflow-x-auto px-8 sm:px-10 scrollbar-hide" style={{ maxWidth: resolvedNavbarMaxWidth }}>
                <div className="relative flex w-max items-center whitespace-nowrap py-2">
                  {menuItems.map((item, index) => {
                    const childCount = Array.isArray(item?.megaMenu?.links) ? item.megaMenu.links.length : 0;
                    const showHoverHint = navMenuHoverDropdown && childCount > 0;
                    return (
                    <span key={`${item.name}-${index}`} className="inline-flex items-center">
                      {index > 0 ? (
                        <span className="select-none px-2 text-xs opacity-40" style={{ color: getContrastColor(menuBarBackgroundColor || '#000000') }}>|</span>
                      ) : null}
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-semibold uppercase tracking-wide"
                        style={{ color: getContrastColor(menuBarBackgroundColor || '#000000') }}
                      >
                        {item.icon ? (
                          <img src={item.icon} alt="" className="h-4 w-4 object-contain" />
                        ) : null}
                        <span>{item.name}</span>
                        {showHoverHint ? <ChevronDown size={11} className="opacity-70" /> : null}
                      </span>
                    </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : navMenuEnabled ? (
            <div
              className="border-t px-4 py-2 text-xs text-white/70 sm:px-6"
              style={{ backgroundColor: bg, borderColor: 'rgba(255,255,255,0.14)' }}
            >
              Add menu items to show navigation links
            </div>
          ) : (
            <div
              className="border-t px-4 py-2 text-xs text-white/70 sm:px-6"
              style={{ backgroundColor: bg, borderColor: 'rgba(255,255,255,0.14)' }}
            >
              Desktop menu disabled
            </div>
          )
        ) : null}
    </div>
  );
}
