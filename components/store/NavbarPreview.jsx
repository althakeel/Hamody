'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Flame, Grid3x3, Heart, History, Menu, Package, Phone, Search, Shield, ShoppingCart, Sparkles, Star, User, X } from 'lucide-react';
import { DEFAULT_NAVBAR_PHONE, resolveNavbarPhone } from '@/lib/storeContact';
import { DEFAULT_NAVBAR_LANGUAGE, resolveNavbarLanguageTrigger } from '@/lib/storefrontMarket';
import { filterParentCategories, getCategoryDisplayName, resolveStoreNavMenuItems } from '@/lib/categoryNavigation';
import { HAMODY_LOGO_PATH } from '@/lib/brandLogo';
import { readableUploadUrl } from '@/lib/readableUploadUrl';
import { getNavbarCategoriesButtonLabel } from '@/lib/navbarLayoutSettings';

const PREVIEW_LINKS = [
  { label: 'Home', active: true },
  { label: 'All Products', active: false },
  { label: 'Collections', active: false },
  { label: 'Contact Us', active: false },
];

function PreviewCartIcon({ size = 22 }) {
  const dimension = `${size}px`;
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0"
      style={{
        width: dimension,
        height: dimension,
        backgroundColor: 'currentColor',
        WebkitMask: 'url(/icons/navbar-cart.png) center / contain no-repeat',
        mask: 'url(/icons/navbar-cart.png) center / contain no-repeat',
      }}
    />
  );
}

export default function NavbarPreview({
  logoUrl = '',
  logoWidth = 120,
  logoHeight = 40,
  navMenuItems = [],
  navMenuUseParentCategories = false,
  categoryOptions = [],
  navActionsVisibility = { orders: true, wishlist: true, cart: true, phone: true, language: true },
  navbarPhone = DEFAULT_NAVBAR_PHONE,
  navbarLanguage = DEFAULT_NAVBAR_LANGUAGE,
  showCategoriesButton = true,
  categoriesButtonLabel = '',
  device = 'desktop',
  userName = 'Hamody',
}) {
  const menuItems = useMemo(() => {
    return resolveStoreNavMenuItems(
      { navMenuUseParentCategories, navMenuItems },
      categoryOptions,
      'en',
      { previewLiveParents: true },
    ).filter((item) => String(item?.name || '').trim());
  }, [navMenuUseParentCategories, categoryOptions, navMenuItems]);
  const resolvedLogoUrl = readableUploadUrl(logoUrl) || HAMODY_LOGO_PATH;
  const logoW = Number(logoWidth) > 0 ? Number(logoWidth) : 120;
  const logoH = Number(logoHeight) > 0 ? Number(logoHeight) : 40;
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(device === 'mobile');
  useEffect(() => {
    if (device === 'mobile') setMobileDrawerOpen(true);
  }, [device]);

  if (device === 'mobile') {
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
          <nav className="border-b border-[#E7E1D6] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="flex min-w-0 items-center px-2 py-2">
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen((open) => !open)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-900"
                  aria-label={mobileDrawerOpen ? 'Close side menu preview' : 'Open side menu preview'}
                >
                  <Menu size={20} />
                </button>
                <img
                  src={resolvedLogoUrl}
                  alt="Hamody"
                  width={logoW}
                  height={logoH}
                  className="-ms-1 block h-12 w-auto max-w-[160px] object-contain"
                  style={{ height: '48px', width: 'auto' }}
                />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-900">
                  <Search size={18} strokeWidth={2.2} />
                </span>
                {navActionsVisibility.phone !== false ? (
                  <span className="inline-flex h-9 shrink-0 flex-col items-center justify-center rounded-md px-1 text-gray-900">
                    <Phone size={16} strokeWidth={1.7} />
                    {phone.displayLabel ? (
                      <span className="mt-0.5 text-[8px] font-semibold leading-none">{phone.displayLabel}</span>
                    ) : null}
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

  const languageTrigger = resolveNavbarLanguageTrigger(navbarLanguage);
  const iconAction = (Icon, label, badge) => (
    <span className="relative inline-flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 px-1 py-1 text-[12px] font-medium leading-none text-slate-800">
      <span className="relative inline-flex shrink-0 items-center justify-center">
        <Icon size={22} strokeWidth={1.75} />
        {badge ? (
          <span className="absolute -right-2 -top-1.5 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#C8F404] px-1 text-[10px] font-bold leading-none text-[#05090D]">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <nav className="border-b border-neutral-200 bg-white text-slate-900">
          <div className="flex h-16 min-w-0 items-center gap-3 px-4 sm:gap-5">
            <img
              src={resolvedLogoUrl}
              alt="Hamody"
              width={logoW}
              height={logoH}
              className="block h-[52px] w-auto shrink-0 object-contain"
              style={{ height: '52px', width: 'auto' }}
            />
            <div className="hidden shrink-0 items-center gap-4 md:flex xl:gap-7">
              {PREVIEW_LINKS.map((link) => (
                <span
                  key={link.label}
                  className={`inline-flex items-center border-b-2 pb-1 text-[11px] font-semibold uppercase leading-none tracking-wide text-slate-900 sm:text-sm ${
                    link.active ? 'border-black' : 'border-transparent'
                  }`}
                >
                  {link.label}
                </span>
              ))}
            </div>
            <div className="min-w-[140px] flex-1">
              <div className="flex h-10 w-full min-w-0 items-center rounded-md bg-[#F2F5F5] px-3">
                <Search size={16} strokeWidth={2} className="shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1 truncate px-2 text-[14px] leading-none text-slate-500">
                  Search for a product
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {navActionsVisibility.language !== false ? (
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold leading-none text-slate-800">
                  {languageTrigger.iconUrl ? (
                    <img src={languageTrigger.iconUrl} alt="" className="h-5 w-5 shrink-0 rounded-sm object-contain" />
                  ) : (
                    <span className="text-sm leading-none" aria-hidden="true">{languageTrigger.flag}</span>
                  )}
                  <span>EN</span>
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-80" />
                </span>
              ) : null}
              {iconAction(User, 'Profile')}
              {navActionsVisibility.wishlist !== false ? iconAction(Heart, 'Wishlist') : null}
              {navActionsVisibility.cart !== false ? iconAction(PreviewCartIcon, 'Cart') : null}
            </div>
          </div>
        </nav>
    </div>
  );
}
