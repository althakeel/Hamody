'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  filterParentCategories,
  getCategoryDisplayName,
  getDirectChildCategories,
  getCategoryRecordId,
  buildCategoryShopLink,
  resolveStoreNavMenuItems,
} from '@/lib/categoryNavigation';
import {
  readPersistedStorefrontLanguage,
  STOREFRONT_LANGUAGE_EVENT,
} from '@/lib/storefrontLanguage';
import { translateStaticText } from '@/lib/useStorefrontI18n';
import { normalizeStorefrontCategoryHref } from '@/lib/categorySlug';
import { getNavbarBottomBorderStyle } from '@/lib/navbarLayoutSettings';

const MENU_CACHE_KEY = 'nav:menu:v1';
const CATEGORIES_CACHE_KEY = 'nav:categories:v2';
const MENU_ENABLED_CACHE_KEY = 'nav:menu:enabled:v1';
const ACTIONS_VISIBILITY_CACHE_KEY = 'nav:actions:visibility:v1';
const MENU_STYLE_CACHE_KEY = 'nav:menu:style:v1';
const NAVBAR_APPEARANCE_CACHE_KEY = 'navbarAppearanceCache';
const REFRESH_MS = 10 * 60 * 1000;

const defaultActionsVisibility = {
  store: true,
  orders: true,
  wishlist: true,
  cart: true,
  phone: true,
  language: true,
};

const NAVBAR_CONTAINER_CLASS = 'mx-auto w-full px-4 sm:px-6';

const DEFAULT_CATEGORY_BAR_BG = '#000000';
const SLIDER_DRAG_THRESHOLD = 6;
const SLIDER_CLICK_SUPPRESS_MS = 120;

const defaultMenuStyle = {
  barBackgroundColor: DEFAULT_CATEGORY_BAR_BG,
  categoryBarBackgroundColor: DEFAULT_CATEGORY_BAR_BG,
  barTextColor: '#ffffff',
  barHoverBackgroundColor: 'rgba(0,0,0,0.15)',
  dropdownBackgroundColor: '#ffffff',
  dropdownTextColor: '#334155',
  dropdownMutedTextColor: '#64748b',
  dropdownBorderColor: '#e2e8f0',
  showBottomBorder: false,
  bottomBorderWidth: 2,
  bottomBorderColor: '#e2e8f0',
};

const resolveCategoryBarBackground = (...colors) => {
  for (const color of colors) {
    const value = String(color || '').trim();
    if (value) return value;
  }
  return DEFAULT_CATEGORY_BAR_BG;
};

const safeJsonParse = (value, fallback) => {
  try {
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const getContrastColor = (hexColor) => {
  const hex = String(hexColor || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff';
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.65 ? '#111827' : '#ffffff';
};

const getMenuBarBorderColor = (textColor) => {
  return textColor === '#111827' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)';
};

const getMenuBarHoverColor = (textColor) => {
  return textColor === '#111827' ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.08)';
};

const sanitizeMenuItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const name = String(item?.name || item?.label || '').trim();
      const link = normalizeStorefrontCategoryHref(String(item?.link || item?.url || '').trim() || '#');
      const icon = String(item?.icon || '').trim();
      const hasDropdown = Boolean(item?.hasDropdown);
      const categoryId = String(item?.categoryId || '').trim();
      const megaMenu = item?.megaMenu && typeof item.megaMenu === 'object' ? item.megaMenu : {};

      const numericCols = Number(megaMenu.linkColumns);
      const linkColumns = [1, 2, 3].includes(numericCols) ? numericCols : 1;
      const links = Array.isArray(megaMenu.links)
        ? megaMenu.links
            .map((entry) => ({
              name: String(entry?.name || '').trim(),
              link: normalizeStorefrontCategoryHref(String(entry?.link || '').trim() || '#'),
              categoryId: String(entry?.categoryId || '').trim(),
              slug: String(entry?.slug || '').trim(),
              children: Array.isArray(entry?.children)
                ? entry.children
                    .map((child) => ({
                      name: String(child?.name || '').trim(),
                      link: normalizeStorefrontCategoryHref(String(child?.link || '').trim() || '#'),
                      categoryId: String(child?.categoryId || '').trim(),
                      slug: String(child?.slug || '').trim(),
                    }))
                    .filter((child) => child.name)
                : [],
            }))
            .filter((entry) => entry.name)
        : [];

      const images = Array.isArray(megaMenu.images)
        ? megaMenu.images
            .map((entry) => ({
              url: String(entry?.url || '').trim(),
              label: String(entry?.label || '').trim(),
              link: normalizeStorefrontCategoryHref(String(entry?.link || '').trim() || '#'),
            }))
            .filter((entry) => entry.url)
        : [];

      return {
        name,
        link,
        icon,
        hasDropdown,
        categoryId,
        megaMenu: {
          linkColumns,
          manualLinks: Boolean(megaMenu.manualLinks),
          links,
          images,
        },
      };
    })
    .filter((item) => item.name);
};

const isCollectionsItem = (item) => {
  const name = String(item?.name || '').toLowerCase();
  return item?.hasDropdown && name.includes('collection');
};

const hasMegaContent = (item) => {
  if (!item?.hasDropdown || !item?.megaMenu) return false;
  const links = Array.isArray(item.megaMenu.links) ? item.megaMenu.links : [];
  const images = Array.isArray(item.megaMenu.images) ? item.megaMenu.images : [];
  return links.length > 0 || images.some((entry) => entry?.url);
};

function CategoryHoverPanel({
  links,
  anchorRect,
  isArabic,
  menuStyle,
  onKeepOpen,
  onClose,
}) {
  const [openChildIndex, setOpenChildIndex] = useState(null);

  if (typeof document === 'undefined' || !anchorRect || !Array.isArray(links) || links.length === 0) {
    return null;
  }

  const panelWidth = 260;
  const left = isArabic
    ? Math.max(8, anchorRect.right - panelWidth)
    : Math.min(Math.max(8, anchorRect.left), window.innerWidth - panelWidth - 8);
  const top = Math.min(anchorRect.bottom + 2, window.innerHeight - 16);

  return createPortal(
    <div
      className="fixed z-[120] min-w-[220px] max-w-[280px] rounded-xl border py-1.5 shadow-2xl"
      style={{
        top,
        left,
        borderColor: menuStyle.dropdownBorderColor,
        backgroundColor: menuStyle.dropdownBackgroundColor,
      }}
      dir={isArabic ? 'rtl' : 'ltr'}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      {links.map((entry, idx) => {
        const children = Array.isArray(entry.children) ? entry.children.filter((child) => child?.name) : [];
        const hasChildren = children.length > 0;
        return (
          <div
            key={`${entry.name}-${idx}`}
            className="relative"
            onMouseEnter={() => setOpenChildIndex(hasChildren ? idx : null)}
          >
            <Link
              href={entry.link || '#'}
              className="flex items-center justify-between gap-3 px-3.5 py-2 text-sm font-medium transition hover:bg-slate-50"
              style={{ color: menuStyle.dropdownTextColor }}
            >
              <span className="min-w-0 truncate">{entry.name}</span>
              {hasChildren ? (
                isArabic ? <ChevronLeft size={14} className="shrink-0 opacity-60" /> : <ChevronRight size={14} className="shrink-0 opacity-60" />
              ) : null}
            </Link>
            {hasChildren && openChildIndex === idx ? (
              <div
                className="absolute top-0 z-[121] min-w-[200px] rounded-xl border py-1.5 shadow-2xl"
                style={{
                  [isArabic ? 'right' : 'left']: 'calc(100% + 4px)',
                  borderColor: menuStyle.dropdownBorderColor,
                  backgroundColor: menuStyle.dropdownBackgroundColor,
                }}
              >
                {children.map((child, childIdx) => (
                  <Link
                    key={`${child.name}-${childIdx}`}
                    href={child.link || '#'}
                    className="block px-3.5 py-2 text-sm transition hover:bg-slate-50"
                    style={{ color: menuStyle.dropdownTextColor }}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

function MegaDropdown({ item, dropdownLinks, featuredImages, onClose, timerRef, menuStyle }) {
  const columns = item?.megaMenu?.linkColumns || 1;
  const hasLinks = dropdownLinks.length > 0;
  const hasImages = featuredImages.length > 0;

  return (
    <div
      className="absolute left-1/2 top-full z-[80] mt-1 w-[min(92vw,1100px)] min-w-[620px] -translate-x-1/2 rounded-xl border shadow-2xl"
      style={{ borderColor: menuStyle.dropdownBorderColor, backgroundColor: menuStyle.dropdownBackgroundColor }}
      onMouseEnter={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
      }}
      onMouseLeave={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(onClose, 180);
      }}
    >
      <div className={`mx-auto grid w-full gap-8 px-6 py-6 ${hasLinks && hasImages ? 'lg:grid-cols-[2fr,1fr]' : 'lg:grid-cols-1'}`}>
        {hasLinks ? (
          <div>
            <div className={`grid gap-3 ${columns === 1 ? 'sm:grid-cols-1' : columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {dropdownLinks.map((entry, idx) => (
                <div key={`${entry.name}-${idx}`} className="space-y-1">
                  <Link
                    href={entry.link || '#'}
                    className="block rounded-lg border px-3 py-2 text-sm font-medium transition"
                    style={{ borderColor: menuStyle.dropdownBorderColor, color: menuStyle.dropdownTextColor }}
                  >
                    {entry.name}
                  </Link>
                  {Array.isArray(entry.children) && entry.children.length > 0 ? (
                    <div className="space-y-0.5 pl-2">
                      {entry.children.map((child) => (
                        <Link
                          key={`${entry.name}-${child.name}`}
                          href={child.link || '#'}
                          className="block rounded px-2 py-1 text-xs transition hover:underline"
                          style={{ color: menuStyle.dropdownMutedTextColor }}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {item?.link && item.link !== '#' ? (
              <div className="mt-4">
                <Link href={item.link} className="text-sm font-semibold hover:underline" style={{ color: menuStyle.dropdownTextColor }}>
                  {`View all ${item.name}`}
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasImages ? (
          <div className={`grid gap-3 ${hasLinks ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {featuredImages.map((entry, idx) => (
              <Link
                key={`${entry.url}-${idx}`}
                href={entry.link || '#'}
                className="group block w-full overflow-hidden rounded-xl border"
                style={{ borderColor: menuStyle.dropdownBorderColor }}
              >
                <img
                  src={entry.url}
                  alt={entry.label || item?.name || 'Featured image'}
                  className="h-28 w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {entry.label ? (
                  <div
                    className="border-t px-3 py-2 text-xs font-semibold"
                    style={{
                      borderColor: menuStyle.dropdownBorderColor,
                      backgroundColor: menuStyle.dropdownBackgroundColor,
                      color: menuStyle.dropdownTextColor,
                    }}
                  >
                    {entry.label}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function NavbarMenuBar({ barBackgroundColor = '' } = {}) {
  const [navMenuItems, setNavMenuItems] = useState([]);
  const [navMenuUseParentCategories, setNavMenuUseParentCategories] = useState(false);
  const [navMenuHoverDropdown, setNavMenuHoverDropdown] = useState(true);
  const [navMenuEnabled, setNavMenuEnabled] = useState(false);
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [openMegaIndex, setOpenMegaIndex] = useState(null);
  const [openHoverIndex, setOpenHoverIndex] = useState(null);
  const [hoverAnchorRect, setHoverAnchorRect] = useState(null);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [menuStyle, setMenuStyle] = useState(defaultMenuStyle);
  const [storefrontLanguage, setStorefrontLanguage] = useState('en');
  const [navbarMaxWidth, setNavbarMaxWidth] = useState(1400);

  const megaTimer = useRef(null);
  const categoryTimer = useRef(null);
  const hoverTimer = useRef(null);
  const sliderRef = useRef(null);
  const sliderTargetRef = useRef(0);
  const sliderRafRef = useRef(null);
  const suppressClickRef = useRef(false);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isSliderDragging, setIsSliderDragging] = useState(false);

  const updateSliderState = useCallback(() => {
    const container = sliderRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 2);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 2);
  }, []);

  const scrollCategoryBar = useCallback((direction) => {
    const container = sliderRef.current;
    if (!container) return;
    const distance = Math.max(280, Math.round(container.clientWidth * 0.7));
    const max = Math.max(0, container.scrollWidth - container.clientWidth);
    sliderTargetRef.current = Math.min(max, Math.max(0, container.scrollLeft + direction * distance));
    container.scrollTo({ left: sliderTargetRef.current, behavior: 'smooth' });
  }, []);

  const topLevelCategories = useMemo(
    () => filterParentCategories(categories),
    [categories]
  );

  const effectiveMenuItems = useMemo(() => {
    return resolveStoreNavMenuItems(
      { navMenuUseParentCategories, navMenuItems },
      categories,
      storefrontLanguage,
    );
  }, [navMenuUseParentCategories, categories, navMenuItems, storefrontLanguage]);

  const getLocalizedCategoryDisplayName = (category) => getCategoryDisplayName(category, storefrontLanguage);

  const hoveredChildren = useMemo(
    () => getDirectChildCategories(categories, hoveredCategory),
    [categories, hoveredCategory]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncLanguage = (event) => {
      const nextLanguage = event?.detail?.language;
      setStorefrontLanguage(nextLanguage === 'ar' || nextLanguage === 'en'
        ? nextLanguage
        : readPersistedStorefrontLanguage());
    };
    syncLanguage();
    window.addEventListener(STOREFRONT_LANGUAGE_EVENT, syncLanguage);

    return () => window.removeEventListener(STOREFRONT_LANGUAGE_EVENT, syncLanguage);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cachedCategories = safeJsonParse(window.sessionStorage.getItem(CATEGORIES_CACHE_KEY), []);
    const cachedMenu = safeJsonParse(window.sessionStorage.getItem(MENU_CACHE_KEY), []);
    const cachedEnabled = safeJsonParse(window.sessionStorage.getItem(MENU_ENABLED_CACHE_KEY), false);
    const cachedActions = safeJsonParse(window.sessionStorage.getItem(ACTIONS_VISIBILITY_CACHE_KEY), defaultActionsVisibility);
    const cachedStyle = safeJsonParse(window.sessionStorage.getItem(MENU_STYLE_CACHE_KEY), defaultMenuStyle);
    const cachedMaxWidth = Number(safeJsonParse(window.localStorage.getItem(NAVBAR_APPEARANCE_CACHE_KEY), null)?.navbarMaxWidth);
    if (Number.isFinite(cachedMaxWidth) && cachedMaxWidth >= 1000) {
      setNavbarMaxWidth(cachedMaxWidth);
    }

    if (Array.isArray(cachedCategories)) setCategories(cachedCategories);
    if (Array.isArray(cachedMenu)) setNavMenuItems(sanitizeMenuItems(cachedMenu));
    setNavMenuEnabled(Boolean(cachedEnabled));
    setMenuStyle({
      ...defaultMenuStyle,
      ...(cachedStyle || {}),
      barBackgroundColor: resolveCategoryBarBackground(
        cachedStyle?.categoryBarBackgroundColor,
        cachedStyle?.barBackgroundColor,
        DEFAULT_CATEGORY_BAR_BG,
      ),
      categoryBarBackgroundColor: resolveCategoryBarBackground(
        cachedStyle?.categoryBarBackgroundColor,
        cachedStyle?.barBackgroundColor,
        DEFAULT_CATEGORY_BAR_BG,
      ),
    });
    window.dispatchEvent(new CustomEvent('navActionsVisibilityUpdated', { detail: cachedActions }));

    let active = true;

    const revalidate = async () => {
      try {
        const [categoriesRes, settingsRes] = await Promise.all([
          fetch('/api/categories', { cache: 'no-store' }),
          fetch('/api/store/settings', { cache: 'no-store' }),
        ]);

        const nextCategories = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };
        const nextSettings = settingsRes.ok ? await settingsRes.json() : {};

        if (!active) return;

        const parsedCategories = Array.isArray(nextCategories?.categories) ? nextCategories.categories : [];
        const parsedItems = sanitizeMenuItems(nextSettings?.navMenuItems);
        const parsedEnabled = Boolean(nextSettings?.navMenuEnabled);
        const parsedUseParentCategories = Boolean(nextSettings?.navMenuUseParentCategories);
        const parsedHoverDropdown = nextSettings?.navMenuHoverDropdown !== false;
        const parsedActions = {
          ...defaultActionsVisibility,
          ...(nextSettings?.navActionsVisibility || {}),
        };
        const parsedStyle = {
          ...defaultMenuStyle,
          ...(nextSettings?.navMenuStyle || {}),
        };
        parsedStyle.categoryBarBackgroundColor = resolveCategoryBarBackground(
          parsedStyle.categoryBarBackgroundColor,
          parsedStyle.barBackgroundColor,
        );
        parsedStyle.barBackgroundColor = parsedStyle.categoryBarBackgroundColor;

        setCategories(parsedCategories);
        setNavMenuItems(parsedItems);
        setNavMenuEnabled(parsedEnabled);
        setNavMenuUseParentCategories(parsedUseParentCategories);
        setNavMenuHoverDropdown(parsedHoverDropdown);
        setMenuStyle(parsedStyle);

        window.sessionStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(parsedCategories));
        window.sessionStorage.setItem(MENU_CACHE_KEY, JSON.stringify(parsedItems));
        window.sessionStorage.setItem(MENU_ENABLED_CACHE_KEY, JSON.stringify(parsedEnabled));
        window.sessionStorage.setItem(ACTIONS_VISIBILITY_CACHE_KEY, JSON.stringify(parsedActions));
        window.sessionStorage.setItem(MENU_STYLE_CACHE_KEY, JSON.stringify(parsedStyle));
        window.dispatchEvent(new CustomEvent('navActionsVisibilityUpdated', { detail: parsedActions }));
      } catch {
        // Ignore transient fetch failures and keep cached values.
      } finally {
        if (active) setLoadedOnce(true);
      }
    };

    revalidate();
    const intervalId = setInterval(revalidate, REFRESH_MS);
    const handleMenuUpdated = () => revalidate();
    const handleNavbarAppearance = (e) => {
      const nextMaxWidth = Number(e?.detail?.navbarMaxWidth);
      if (Number.isFinite(nextMaxWidth) && nextMaxWidth >= 1000) {
        setNavbarMaxWidth(nextMaxWidth);
      }
    };
    window.addEventListener('navMenuUpdated', handleMenuUpdated);
    window.addEventListener('navbarAppearanceUpdated', handleNavbarAppearance);

    return () => {
      active = false;
      window.removeEventListener('navMenuUpdated', handleMenuUpdated);
      window.removeEventListener('navbarAppearanceUpdated', handleNavbarAppearance);
      clearInterval(intervalId);
      if (megaTimer.current) clearTimeout(megaTimer.current);
      if (categoryTimer.current) clearTimeout(categoryTimer.current);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  useEffect(() => {
    if (openHoverIndex == null) return undefined;
    const closeHover = () => {
      setOpenHoverIndex(null);
      setHoverAnchorRect(null);
    };
    const container = sliderRef.current;
    container?.addEventListener('scroll', closeHover, { passive: true });
    window.addEventListener('scroll', closeHover, { passive: true });
    window.addEventListener('resize', closeHover);
    return () => {
      container?.removeEventListener('scroll', closeHover);
      window.removeEventListener('scroll', closeHover);
      window.removeEventListener('resize', closeHover);
    };
  }, [openHoverIndex]);

  useEffect(() => {
    const container = sliderRef.current;
    if (!container) return undefined;

    sliderTargetRef.current = container.scrollLeft;
    updateSliderState();

    const clampScroll = (value) => {
      const max = Math.max(0, container.scrollWidth - container.clientWidth);
      return Math.min(max, Math.max(0, value));
    };

    const animateScroll = () => {
      const current = container.scrollLeft;
      const target = sliderTargetRef.current;
      const next = current + (target - current) * 0.22;
      if (Math.abs(target - next) < 0.6) {
        container.scrollLeft = target;
        sliderRafRef.current = null;
        updateSliderState();
        return;
      }
      container.scrollLeft = next;
      sliderRafRef.current = window.requestAnimationFrame(animateScroll);
    };

    const onScroll = () => {
      if (!dragStateRef.current.active) {
        sliderTargetRef.current = container.scrollLeft;
      }
      updateSliderState();
    };

    const onWheel = (event) => {
      if (container.scrollWidth <= container.clientWidth) return;
      const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!delta) return;
      event.preventDefault();
      sliderTargetRef.current = clampScroll(sliderTargetRef.current + delta);
      if (!sliderRafRef.current) {
        sliderRafRef.current = window.requestAnimationFrame(animateScroll);
      }
    };

    const onMouseMove = (event) => {
      if (!dragStateRef.current.active) return;
      const walk = event.pageX - dragStateRef.current.startX;
      if (!dragStateRef.current.moved && Math.abs(walk) > SLIDER_DRAG_THRESHOLD) {
        dragStateRef.current.moved = true;
        setIsSliderDragging(true);
      }
      if (!dragStateRef.current.moved) return;
      event.preventDefault();
      const next = clampScroll(dragStateRef.current.startScrollLeft - walk);
      sliderTargetRef.current = next;
      container.scrollLeft = next;
      updateSliderState();
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (dragStateRef.current.moved) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, SLIDER_CLICK_SUPPRESS_MS);
      }
      dragStateRef.current.active = false;
      dragStateRef.current.moved = false;
      setIsSliderDragging(false);
    };

    const onMouseDown = (event) => {
      if (event.button !== 0) return;
      if (event.target.closest('button')) return;
      dragStateRef.current.active = true;
      dragStateRef.current.moved = false;
      dragStateRef.current.startX = event.pageX;
      dragStateRef.current.startScrollLeft = container.scrollLeft;
      sliderTargetRef.current = container.scrollLeft;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateSliderState())
      : null;
    resizeObserver?.observe(container);
    if (container.firstElementChild) resizeObserver?.observe(container.firstElementChild);

    container.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', updateSliderState);

    return () => {
      container.removeEventListener('scroll', onScroll);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateSliderState);
      if (sliderRafRef.current) {
        window.cancelAnimationFrame(sliderRafRef.current);
        sliderRafRef.current = null;
      }
    };
  }, [effectiveMenuItems, updateSliderState]);

  if (loadedOnce && (!navMenuEnabled || effectiveMenuItems.length === 0)) return null;
  if (!loadedOnce && effectiveMenuItems.length === 0) return null;

  const resolvedBarBg = resolveCategoryBarBackground(
    barBackgroundColor,
    menuStyle.categoryBarBackgroundColor,
    menuStyle.barBackgroundColor,
  );
  if (!resolvedBarBg) {
    return (
      <div className="relative hidden w-full overflow-hidden border-b border-slate-200 bg-slate-200 lg:block">
        <div className={`${NAVBAR_CONTAINER_CLASS} flex items-center gap-3 py-2.5`}>
          <div className="h-4 w-20 animate-pulse rounded-full bg-slate-300" />
          <div className="h-4 w-24 animate-pulse rounded-full bg-slate-300/80" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-slate-300/80" />
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-300/70" />
        </div>
      </div>
    );
  }

  const menuBarTextColor = getContrastColor(resolvedBarBg);
  const menuBarBorderColor = getMenuBarBorderColor(menuBarTextColor);
  const menuBarHoverColor = getMenuBarHoverColor(menuBarTextColor);

  const cssVars = {
    '--menu-bar-bg': resolvedBarBg,
    '--menu-bar-text': menuBarTextColor,
    '--menu-bar-hover-bg': menuBarHoverColor,
    '--menu-bar-border': menuBarBorderColor,
    '--menu-dropdown-bg': menuStyle.dropdownBackgroundColor,
    '--menu-dropdown-text': menuStyle.dropdownTextColor,
    '--menu-dropdown-muted': menuStyle.dropdownMutedTextColor,
    '--menu-dropdown-border': menuStyle.dropdownBorderColor,
  };

  return (
    <div
      className="relative hidden w-full min-w-0 max-w-full lg:block"
      style={{
        ...cssVars,
        backgroundColor: 'var(--menu-bar-bg)',
        boxShadow: 'inset 0 1px 0 var(--menu-bar-border)',
        ...getNavbarBottomBorderStyle(menuStyle),
      }}
    >
      {canScrollLeft ? (
        <button
          type="button"
          aria-label="Scroll categories left"
          onClick={() => scrollCategoryBar(-1)}
          className="absolute left-1 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm lg:inline-flex"
          style={{
            backgroundColor: 'var(--menu-bar-bg)',
            color: 'var(--menu-bar-text)',
            borderColor: 'var(--menu-bar-border)',
          }}
        >
          <ChevronLeft size={16} />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          aria-label="Scroll categories right"
          onClick={() => scrollCategoryBar(1)}
          className="absolute right-1 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm lg:inline-flex"
          style={{
            backgroundColor: 'var(--menu-bar-bg)',
            color: 'var(--menu-bar-text)',
            borderColor: 'var(--menu-bar-border)',
          }}
        >
          <ChevronRight size={16} />
        </button>
      ) : null}
      <div
        ref={sliderRef}
        className={`${NAVBAR_CONTAINER_CLASS} min-w-0 w-full max-w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-px-4 scrollbar-hide select-none ${isSliderDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ maxWidth: `min(100%, ${Math.min(1400, Number(navbarMaxWidth) || 1400)}px)` }}
      >
        <div className="relative flex w-max min-w-full items-center pb-2 pe-10 pt-3.5 whitespace-nowrap lg:pt-4">
          {effectiveMenuItems.map((item, index) => {
            const dropdownLinks = Array.isArray(item?.megaMenu?.links) ? item.megaMenu.links : [];
            const featuredImages = Array.isArray(item?.megaMenu?.images) ? item.megaMenu.images.filter((img) => img?.url) : [];
            const shouldUseCollectionsFlyout = navMenuHoverDropdown && isCollectionsItem(item);
            const shouldUseHoverDropdown = navMenuHoverDropdown
              && !shouldUseCollectionsFlyout
              && dropdownLinks.length > 0
              && featuredImages.length === 0;
            const shouldUseMega = navMenuHoverDropdown && !shouldUseHoverDropdown && hasMegaContent(item);
            const itemHref = item.link || '#';

            return (
              <div
                key={`${item.name}-${index}`}
                className="static inline-flex shrink-0 snap-start items-center"
                onMouseEnter={(event) => {
                  if (megaTimer.current) clearTimeout(megaTimer.current);
                  if (categoryTimer.current) clearTimeout(categoryTimer.current);
                  if (hoverTimer.current) clearTimeout(hoverTimer.current);

                  if (shouldUseCollectionsFlyout) {
                    setCategoriesDropdownOpen(true);
                    setOpenMegaIndex(null);
                    setOpenHoverIndex(null);
                    setHoverAnchorRect(null);
                    if (!hoveredCategory && topLevelCategories.length > 0) {
                      setHoveredCategory(topLevelCategories[0]);
                    }
                  } else if (shouldUseHoverDropdown) {
                    const trigger = event.currentTarget.querySelector('[data-category-hover-trigger]');
                    setHoverAnchorRect((trigger || event.currentTarget).getBoundingClientRect());
                    setOpenHoverIndex(index);
                    setOpenMegaIndex(null);
                    setCategoriesDropdownOpen(false);
                  } else if (shouldUseMega) {
                    setOpenMegaIndex(index);
                    setOpenHoverIndex(null);
                    setHoverAnchorRect(null);
                    setCategoriesDropdownOpen(false);
                  } else {
                    setOpenMegaIndex(null);
                    setOpenHoverIndex(null);
                    setHoverAnchorRect(null);
                    setCategoriesDropdownOpen(false);
                  }
                }}
                onMouseLeave={() => {
                  if (shouldUseCollectionsFlyout) {
                    categoryTimer.current = setTimeout(() => {
                      setCategoriesDropdownOpen(false);
                    }, 180);
                  }
                  if (shouldUseHoverDropdown) {
                    hoverTimer.current = setTimeout(() => {
                      setOpenHoverIndex(null);
                      setHoverAnchorRect(null);
                    }, 180);
                  }
                  if (shouldUseMega) {
                    megaTimer.current = setTimeout(() => {
                      setOpenMegaIndex(null);
                    }, 180);
                  }
                }}
              >
                {index > 0 && (
                  <span className="px-2 text-xs select-none opacity-40" style={{ color: 'var(--menu-bar-text)' }}>|</span>
                )}
                <Link
                  href={itemHref}
                  data-category-hover-trigger=""
                  draggable={false}
                  onClick={(event) => {
                    if (suppressClickRef.current || dragStateRef.current.moved) {
                      event.preventDefault();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-70"
                  style={{ color: 'var(--menu-bar-text)' }}
                >
                  {item.icon ? <img src={item.icon} alt={item.name} className="h-4 w-4 object-contain" loading="lazy" /> : null}
                  <span>{item.name}</span>
                  {shouldUseHoverDropdown ? <ChevronDown size={12} className="opacity-70" /> : null}
                </Link>

                {shouldUseCollectionsFlyout && categoriesDropdownOpen ? (
                  <div
                    className="absolute left-0 top-full z-[80] mt-0 grid min-w-[560px] grid-cols-[220px,1fr] overflow-hidden rounded-xl border shadow-2xl"
                    style={{ borderColor: 'var(--menu-dropdown-border)', backgroundColor: 'var(--menu-dropdown-bg)' }}
                    onMouseEnter={() => {
                      if (categoryTimer.current) clearTimeout(categoryTimer.current);
                      setCategoriesDropdownOpen(true);
                    }}
                    onMouseLeave={() => {
                      if (categoryTimer.current) clearTimeout(categoryTimer.current);
                      categoryTimer.current = setTimeout(() => setCategoriesDropdownOpen(false), 180);
                    }}
                  >
                    <div className="border-r" style={{ borderColor: 'var(--menu-dropdown-border)', backgroundColor: 'var(--menu-bar-hover-bg)' }}>
                      {topLevelCategories.map((category) => (
                        <button
                          key={category._id || category.slug || category.name}
                          type="button"
                          onMouseEnter={() => setHoveredCategory(category)}
                          className={`block w-full px-4 py-2.5 text-left text-sm transition ${hoveredCategory?._id === category._id ? 'font-semibold' : ''}`}
                          style={getCategoryRecordId(hoveredCategory) === getCategoryRecordId(category)
                            ? { backgroundColor: 'var(--menu-dropdown-bg)', color: 'var(--menu-dropdown-text)' }
                            : { color: 'var(--menu-dropdown-text)' }}
                        >
                          {getLocalizedCategoryDisplayName(category)}
                        </button>
                      ))}
                    </div>

                    <div className="p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--menu-dropdown-muted)' }}>
                        {getLocalizedCategoryDisplayName(hoveredCategory) || translateStaticText('navbar.collections', storefrontLanguage)}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {hoveredChildren.length > 0 ? (
                          hoveredChildren.map((child) => (
                            <Link
                              key={child._id || child.slug || child.name}
                              href={buildCategoryShopLink(child, categories)}
                              className="rounded-lg border px-3 py-2 text-sm transition"
                              style={{ borderColor: 'var(--menu-dropdown-border)', color: 'var(--menu-dropdown-text)' }}
                            >
                              {getLocalizedCategoryDisplayName(child)}
                            </Link>
                          ))
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--menu-dropdown-muted)' }}>No sub-categories yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {shouldUseHoverDropdown && openHoverIndex === index ? (
                  <CategoryHoverPanel
                    links={dropdownLinks}
                    anchorRect={hoverAnchorRect}
                    isArabic={storefrontLanguage === 'ar'}
                    menuStyle={menuStyle}
                    onKeepOpen={() => {
                      if (hoverTimer.current) clearTimeout(hoverTimer.current);
                      setOpenHoverIndex(index);
                    }}
                    onClose={() => {
                      if (hoverTimer.current) clearTimeout(hoverTimer.current);
                      hoverTimer.current = setTimeout(() => {
                        setOpenHoverIndex(null);
                        setHoverAnchorRect(null);
                      }, 180);
                    }}
                  />
                ) : null}

                {shouldUseMega && openMegaIndex === index ? (
                  <MegaDropdown
                    item={item}
                    dropdownLinks={dropdownLinks}
                    featuredImages={featuredImages}
                    onClose={() => setOpenMegaIndex(null)}
                    timerRef={megaTimer}
                    menuStyle={menuStyle}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
