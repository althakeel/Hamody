'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Search, ShoppingCart, Package, User } from 'lucide-react';
import OffersNavLabel from '@/components/OffersNavLabel';
import { buildParentCategoryNavMenuItems } from '@/lib/categoryNavigation';
import { STORE1920_LOGO_PATH } from '@/lib/brandLogo';
import {
  DEFAULT_OFFERS_NAV_LABEL,
  DEFAULT_OFFERS_NAV_STYLE,
  expandOffersNavShortcodes,
  getOffersNavButtonAppearance,
  normalizeNavGifUrl,
  normalizeOffersNavStyle,
  splitOffersNavLabel,
} from '@/lib/offersPageSettings';
import { getNavbarArrangeItems, getNavbarCategoriesButtonAppearance, getNavbarCategoriesButtonLabel, visibleNavbarExtraButtons } from '@/lib/navbarLayoutSettings';

const DEFAULT_BG = '#9f4b1d';
const PREVIEW_WIDTH = 1400;
const NAVBAR_CONTAINER_CLASS = 'mx-auto w-full max-w-[1400px] px-4 sm:px-6';

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
  categoryOptions = [],
  navActionsVisibility = { orders: true, wishlist: true, cart: true },
  searchPlaceholder = 'Search products...',
  dealsLabel = '',
  extraButtons = [],
  searchMaxWidth = 600,
  navbarMaxWidth = 1400,
  showCategoriesButton = true,
  categoriesButtonLabel = '',
  categoriesButtonStyle,
  itemOrder,
  showMenuBar = true,
}) {
  const bg = backgroundColor || DEFAULT_BG;
  const textColor = getContrastColor(bg);
  const searchAccentColor = bg || '#0f172a';
  const menuItems = useMemo(() => {
    const items = navMenuUseParentCategories
      ? buildParentCategoryNavMenuItems(categoryOptions)
      : (navMenuItems || []);
    return items.filter((item) => String(item?.name || '').trim());
  }, [navMenuUseParentCategories, categoryOptions, navMenuItems]);
  const resolvedLogoUrl = String(logoUrl || '').trim() || STORE1920_LOGO_PATH;
  const logoW = Number(logoWidth) > 0 ? Number(logoWidth) : 120;
  const logoH = Number(logoHeight) > 0 ? Number(logoHeight) : 40;
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
  const dealsAppearance = getOffersNavButtonAppearance(offersNav.style || DEFAULT_OFFERS_NAV_STYLE, 'desktop');
  const categoriesAppearance = getNavbarCategoriesButtonAppearance({ categoriesButtonStyle }, 'desktop');
  const dealsParts = splitOffersNavLabel(resolvedDealsLabel);
  const previewExtraButtons = visibleNavbarExtraButtons(extraButtons, 'en');
  const previewLayout = {
    extraButtons,
    showCategoriesButton,
    categoriesButtonLabel,
    categoriesButtonStyle,
    itemOrder,
  };
  const previewItems = getNavbarArrangeItems(previewLayout, navActionsVisibility);
  const frameRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return undefined;

    const update = () => {
      const width = frame.clientWidth;
      setScale(width > 0 ? Math.min(1, width / PREVIEW_WIDTH) : 1);
      setContentHeight(content.offsetHeight);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(content);
    return () => observer.disconnect();
  }, [menuItems.length, navMenuEnabled, resolvedDealsLabel, offersNav.gifUrl, previewItems.map((item) => item.id).join('|')]);

  const renderPreviewAction = (Icon, label, badge) => (
    <span className="relative inline-flex shrink-0 items-center gap-2 px-1 py-1 text-white transition">
      <span className="relative inline-flex shrink-0 items-center justify-center">
        <Icon size={22} strokeWidth={1.5} />
        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="whitespace-nowrap text-[14px] font-normal leading-none">{label}</span>
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
          className="h-auto w-auto max-w-[88px] shrink-0 object-contain xl:max-w-[180px]"
          style={{ maxHeight: '50px' }}
        />
      );
    }
    if (itemId === 'deals') {
      return (
        <span
          className={`navbar-deals-btn inline-flex shrink-0 items-center font-extrabold leading-none tracking-[0.04em] ${dealsAppearance.animationClass || ''}`}
          data-font={dealsAppearance.fontId || 'inherit'}
          style={dealsAppearance.style}
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
            minHeight: 44,
            height: 44,
          }}
        >
          <span>{getNavbarCategoriesButtonLabel({ categoriesButtonLabel }, 'en', 'Categories')}</span>
          <span
            className="text-[11px]"
            style={{ color: categoriesAppearance.textColor || undefined, opacity: 0.55 }}
          >
            ▾
          </span>
        </span>
      );
    }
    if (itemId === 'search') {
      return (
        <div className="min-w-0 w-full" style={{ maxWidth: Number(searchMaxWidth) || 600 }}>
          <div
            className="flex h-[44px] w-full min-w-0 items-center overflow-hidden rounded-2xl border px-2 shadow-sm xl:px-3"
            style={{
              borderColor: 'rgba(255,255,255,0.92)',
              backgroundColor: '#ffffff',
            }}
          >
            <span className="min-w-0 flex-1 truncate text-[14px] leading-none text-slate-400">
              {searchPlaceholder}
            </span>
            <span
              className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ color: searchAccentColor }}
            >
              <Search size={15} />
            </span>
          </div>
        </div>
      );
    }
    if (itemId === 'account') {
      return (
        <span className="inline-flex max-w-[148px] items-center gap-2 rounded-md px-1 py-1 text-left text-white xl:max-w-[168px] xl:gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <User size={22} strokeWidth={1.85} />
          </span>
          <span className="flex min-w-0 flex-col leading-[1.15]">
            <span className="truncate text-[13px] font-bold leading-none text-white xl:text-[14px]">
              Sign In / Register
            </span>
            <span className="mt-1 truncate text-[11px] font-normal leading-none text-white/85">
              Orders &amp; Account
            </span>
          </span>
        </span>
      );
    }
    if (itemId === 'orders') return renderPreviewAction(Package, 'Orders');
    if (itemId === 'wishlist') return renderPreviewAction(Heart, 'Wishlist', '1');
    if (itemId === 'cart') return renderPreviewAction(ShoppingCart, 'Cart', '2');

    const extraButton = previewExtraButtons.find((button) => button.id === itemId);
    if (!extraButton) return null;
    const extraAppearance = getOffersNavButtonAppearance(extraButton.style, 'desktop');
    return (
      <span
        className={`inline-flex shrink-0 items-center leading-none tracking-[0.04em] ${extraAppearance.animationClass || ''}`}
        data-font={extraAppearance.fontId || 'inherit'}
        style={extraAppearance.style}
      >
        {extraButton.displayLabel}
      </span>
    );
  };

  return (
    <div
      ref={frameRef}
      className="relative w-full overflow-hidden rounded-xl border border-slate-200/80 shadow-sm"
      style={{ height: contentHeight ? contentHeight * scale : undefined }}
    >
      <div
        ref={contentRef}
        className="origin-top-left"
        style={{
          width: Math.max(PREVIEW_WIDTH, Number(navbarMaxWidth) || PREVIEW_WIDTH),
          transform: `scale(${scale})`,
        }}
      >
        <div
          className="overflow-visible border-b text-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
          style={{
            backgroundColor: bg,
            borderColor: 'rgba(15, 23, 42, 0.18)',
            color: textColor,
          }}
        >
          <div className="mx-auto w-full px-4 sm:px-6" style={{ maxWidth: Number(navbarMaxWidth) || 1400 }}>
            <div className="flex min-w-0 items-center gap-2 py-2.5 lg:gap-3">
              {previewItems.map((item) => {
                const node = renderPreviewItem(item.id);
                if (!node) return null;
                return (
                  <div
                    key={item.id}
                    className={item.id === 'search' ? 'min-w-0 flex-1' : 'shrink-0'}
                  >
                    {node}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {showMenuBar ? (
          navMenuEnabled && menuItems.length > 0 ? (
            <div
              className="relative w-full"
              style={{
                backgroundColor: bg,
                boxShadow: `inset 0 1px 0 ${textColor === '#111827' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)'}`,
              }}
            >
              <div className="mx-auto w-full overflow-hidden px-4 sm:px-6" style={{ maxWidth: Number(navbarMaxWidth) || 1400 }}>
                <div className="relative flex items-center whitespace-nowrap py-2">
                  {menuItems.map((item, index) => (
                    <span key={`${item.name}-${index}`} className="inline-flex items-center">
                      {index > 0 ? (
                        <span className="select-none px-2 text-xs opacity-40" style={{ color: textColor }}>|</span>
                      ) : null}
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-semibold uppercase tracking-wide"
                        style={{ color: textColor }}
                      >
                        {item.icon ? (
                          <img src={item.icon} alt="" className="h-4 w-4 object-contain" />
                        ) : null}
                        <span>{item.name}</span>
                      </span>
                    </span>
                  ))}
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
    </div>
  );
}
