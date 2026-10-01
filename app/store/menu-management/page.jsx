'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import toast from 'react-hot-toast';
import PageSkeleton from '@/components/PageSkeleton';
import NavbarPreview from '@/components/store/NavbarPreview';
import NavbarItemArrange from '@/components/store/NavbarItemArrange';
import StoreDropdown from '@/components/store/StoreDropdown';
import { STORE1920_LOGO_PATH } from '@/lib/brandLogo';
import {
  DEFAULT_CATEGORIES_BUTTON_STYLE,
  DEFAULT_NAVBAR_LAYOUT,
  DEFAULT_SEARCH_STYLE,
  SEARCH_ALIGN_OPTIONS,
  createNavbarExtraButton,
  defaultNavbarItemAlign,
  defaultNavbarItemOrder,
  getNavbarCategoriesButtonAppearance,
  getNavbarSearchAppearance,
  normalizeNavbarBottomBorder,
  normalizeNavbarItemOrder,
  normalizeNavbarLayout,
} from '@/lib/navbarLayoutSettings';
import {
  DEFAULT_NAVBAR_PHONE,
  normalizeNavbarPhone,
} from '@/lib/storeContact';
import {
  DEFAULT_NAVBAR_LANGUAGE,
  GCC_MARKETS,
  normalizeNavbarLanguage,
  resolveNavbarLanguageTrigger,
} from '@/lib/storefrontMarket';
import {
  BNPL_PARTNER_DEFS,
  DEFAULT_BNPL_TOP_BAR,
  getDefaultBnplBannerText,
  normalizeBnplTopBar,
} from '@/lib/bnplTopBar';
import {
  DEFAULT_OFFERS_NAV_STYLE,
  OFFERS_NAV_ANIMATION_OPTIONS,
  OFFERS_NAV_FONT_OPTIONS,
  OFFERS_NAV_WEIGHT_OPTIONS,
  getOffersNavButtonAppearance,
} from '@/lib/offersPageSettings';
import {
  buildCategoryShopLink,
  buildParentCategoryNavMenuItems,
  filterParentCategories,
  findCategoryForNavItem,
  getCategoryDisplayName,
  getCategoryRecordId,
  getDirectChildCategories,
  isDisplayableCategoryName,
  isLegacyPlaceholderNavItems,
  resolveStoreNavMenuItems,
} from '@/lib/categoryNavigation';
import { toPublicCategoryPath } from '@/lib/categorySlug';
import {
  ChevronDown,
  GripVertical,
  Eye,
  Loader2,
  Menu,
  Monitor,
  Palette,
  Save,
  Settings2,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Heart,
  Languages,
  Package,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

function SearchFieldPreview({
  searchStyle,
  placeholder = 'Search products...',
  maxWidth = 600,
  backgroundColor = '#8f3404',
}) {
  const appearance = getNavbarSearchAppearance({ searchStyle }, 'desktop');
  return (
    <div
      className="rounded-xl px-3 py-3 sm:px-4"
      style={{ backgroundColor: backgroundColor || '#111827' }}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">
        Live search preview
      </p>
      <div className="flex w-full min-w-0 items-center">
        <div className="min-w-0 flex-1 basis-0">
          <div className="w-full" style={{ maxWidth: Number(maxWidth) || 600 }}>
            <div
              className="flex h-[44px] w-full min-w-0 items-center overflow-hidden px-3 shadow-sm"
              data-font={appearance.fontId || 'inherit'}
              style={appearance.boxStyle}
            >
              <span className="min-w-0 flex-1 truncate opacity-70" style={appearance.inputStyle}>
                {placeholder}
              </span>
              <Search
                size={15}
                className="ms-2 shrink-0"
                style={{ color: appearance.textColor || '#64748b' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoriesButtonPreview({
  style,
  label = 'Categories',
  backgroundColor = '#8f3404',
}) {
  const appearance = getNavbarCategoriesButtonAppearance({ categoriesButtonStyle: style }, 'desktop');
  return (
    <div
      className="rounded-xl px-3 py-3 sm:px-4"
      style={{ backgroundColor: backgroundColor || '#111827' }}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">
        Live categories preview
      </p>
      <span
        className={`inline-flex items-center gap-1.5 leading-none ${appearance.animationClass || ''}`}
        data-font={appearance.fontId || 'inherit'}
        style={{
          ...appearance.style,
          minHeight: 44,
          height: 44,
        }}
      >
        <span>{label}</span>
        <ChevronDown
          size={appearance.chevronSize || 13}
          strokeWidth={2.4}
          className="shrink-0"
          style={{ color: appearance.textColor || 'currentColor' }}
          aria-hidden="true"
        />
      </span>
    </div>
  );
}

function ExtraButtonStyleEditor({
  style,
  previewLabel,
  onChange,
  disabled = false,
  fallbackStyle = DEFAULT_CATEGORIES_BUTTON_STYLE,
  hideAnimation = false,
  hideWidth = false,
  previewKind = 'button',
  lockTypography = false,
}) {
  const [open, setOpen] = useState(false);
  const navStyle = style || fallbackStyle;
  const preview = getOffersNavButtonAppearance(navStyle, 'desktop');
  const categoriesPreview = getNavbarCategoriesButtonAppearance({ categoriesButtonStyle: navStyle }, 'desktop');
  const fontLabel = OFFERS_NAV_FONT_OPTIONS.find((font) => font.id === (navStyle.fontFamily || 'inherit'))?.label || 'Default';
  const isSearchPreview = previewKind === 'search';
  const isCategoriesPreview = previewKind === 'categories';

  return (
    <div className={`mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-xs font-semibold text-slate-800">
            {isSearchPreview ? 'Search design' : 'Font and design'}
          </span>
          <span className="mt-0.5 block text-[11px] text-slate-400">
            {open
              ? (isSearchPreview
                ? 'Font, size, color, border, radius, and background.'
                : 'Font, weight, animation, size, color, border, radius, and background.')
              : 'Closed. Open only if you need fonts, borders, or colors.'}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">
            Font
            {lockTypography ? ' (locked by Same font)' : ''}
          </span>
          <select
            value={navStyle.fontFamily || 'inherit'}
            onChange={(event) => onChange({ fontFamily: event.target.value })}
            disabled={disabled || lockTypography}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {OFFERS_NAV_FONT_OPTIONS.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Weight</span>
          <div className="flex flex-wrap gap-1.5">
            {OFFERS_NAV_WEIGHT_OPTIONS.map((weight) => {
              const active = String(navStyle.fontWeight || '800') === weight.id;
              return (
                <button
                  key={weight.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ fontWeight: weight.id })}
                  className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                  style={{ fontWeight: weight.value }}
                >
                  {weight.label}
                </button>
              );
            })}
          </div>
        </div>

        {hideAnimation ? null : (
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Animation</span>
          <div className="flex flex-wrap gap-1.5">
            {OFFERS_NAV_ANIMATION_OPTIONS.map((animation) => {
              const active = String(navStyle.animation || 'none') === animation.id;
              return (
                <button
                  key={animation.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ animation: animation.id })}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {animation.label}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {isSearchPreview ? null : (
          <div
            className={`inline-flex items-center gap-1.5 leading-none tracking-[0.04em] ${preview.animationClass || ''}`}
            data-font={preview.fontId || 'inherit'}
            style={preview.style}
          >
            <span>{previewLabel || 'Button preview'}</span>
            {isCategoriesPreview ? (
              <ChevronDown
                size={categoriesPreview.chevronSize || 13}
                strokeWidth={2.4}
                className="shrink-0"
                style={{ color: categoriesPreview.textColor || 'currentColor' }}
                aria-hidden="true"
              />
            ) : (
              <span className="text-[10px] font-medium tracking-normal text-slate-400">{fontLabel}</span>
            )}
          </div>
        )}

        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
            Font size
            <span className="tabular-nums text-slate-700">{navStyle.fontSize}px</span>
          </span>
          <input
            type="range"
            min={8}
            max={22}
            value={navStyle.fontSize}
            onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
            disabled={disabled || lockTypography}
            className="w-full accent-indigo-600"
          />
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Font color</span>
            <button
              type="button"
              onClick={() => onChange({ fontColorAuto: !navStyle.fontColorAuto })}
              disabled={disabled}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                navStyle.fontColorAuto
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              Auto
            </button>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 ${
              navStyle.fontColorAuto ? 'opacity-50' : ''
            }`}
          >
            <input
              type="color"
              value={navStyle.fontColor || '#ffffff'}
              disabled={disabled || navStyle.fontColorAuto}
              onChange={(event) => onChange({ fontColor: event.target.value, fontColorAuto: false })}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
              aria-label="Font color"
            />
            <input
              type="text"
              value={navStyle.fontColorAuto ? 'auto' : navStyle.fontColor}
              disabled={disabled || navStyle.fontColorAuto}
              onChange={(event) => onChange({ fontColor: event.target.value, fontColorAuto: false })}
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
            Border width
            <span className="tabular-nums text-slate-700">{navStyle.borderWidth ?? 0}px</span>
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={8}
              value={navStyle.borderWidth ?? 0}
              onChange={(event) => onChange({ borderWidth: Number(event.target.value) })}
              disabled={disabled}
              className="min-w-0 flex-1 accent-indigo-600"
            />
            <input
              type="number"
              min={0}
              max={8}
              value={navStyle.borderWidth ?? 0}
              onChange={(event) => onChange({ borderWidth: Number(event.target.value) || 0 })}
              disabled={disabled}
              className="w-16 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs tabular-nums"
              aria-label="Border width"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">0px removes the border.</p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
            <input
              type="color"
              value={navStyle.borderColor}
              onChange={(event) => onChange({ borderColor: event.target.value })}
              disabled={disabled}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label="Border color"
            />
            <input
              type="text"
              value={navStyle.borderColor}
              onChange={(event) => onChange({ borderColor: event.target.value })}
              disabled={disabled}
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>
        </div>

        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
            Border radius
            <span className="tabular-nums text-slate-700">{navStyle.borderRadius ?? 0}px</span>
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={40}
              value={navStyle.borderRadius ?? 0}
              onChange={(event) => onChange({ borderRadius: Number(event.target.value) })}
              disabled={disabled}
              className="min-w-0 flex-1 accent-indigo-600"
            />
            <input
              type="number"
              min={0}
              max={40}
              value={navStyle.borderRadius ?? 0}
              onChange={(event) => onChange({ borderRadius: Number(event.target.value) || 0 })}
              disabled={disabled}
              className="w-16 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs tabular-nums"
              aria-label="Border radius"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">0px is square. Increase for a rounder button.</p>
        </label>

        {hideWidth ? null : (
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
            Button width
            <span className="tabular-nums text-slate-700">{navStyle.width ? `${navStyle.width}px` : 'Auto'}</span>
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={400}
              step={2}
              value={navStyle.width ?? 0}
              onChange={(event) => onChange({ width: Number(event.target.value) })}
              disabled={disabled}
              className="min-w-0 flex-1 accent-indigo-600"
            />
            <input
              type="number"
              min={0}
              max={400}
              value={navStyle.width ?? 0}
              onChange={(event) => onChange({ width: Number(event.target.value) || 0 })}
              disabled={disabled}
              className="w-16 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs tabular-nums"
              aria-label="Button width"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">0 is auto width. Type a pixel width to lock the size.</p>
        </label>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Background</span>
            <button
              type="button"
              onClick={() => onChange({ backgroundTransparent: !navStyle.backgroundTransparent })}
              disabled={disabled}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                navStyle.backgroundTransparent
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              Transparent
            </button>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 ${
              navStyle.backgroundTransparent ? 'opacity-50' : ''
            }`}
          >
            <input
              type="color"
              value={navStyle.backgroundColor}
              disabled={disabled || navStyle.backgroundTransparent}
              onChange={(event) => onChange({
                backgroundColor: event.target.value,
                backgroundTransparent: false,
              })}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
              aria-label="Background color"
            />
            <input
              type="text"
              value={navStyle.backgroundTransparent ? 'transparent' : navStyle.backgroundColor}
              disabled={disabled || navStyle.backgroundTransparent}
              onChange={(event) => {
                const next = String(event.target.value || '').trim();
                const isTransparent = next.toLowerCase() === 'transparent';
                onChange({
                  backgroundColor: isTransparent ? navStyle.backgroundColor : next,
                  backgroundTransparent: isTransparent,
                });
              }}
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}

const createMenuItem = () => ({
  name: '',
  link: '#',
  icon: '',
  hasDropdown: false,
  categoryId: '',
  megaMenu: {
    linkColumns: 1,
    links: [],
    images: [],
  },
});

const createSubLinkFromCategory = (category, allCategories = []) => ({
  name: getCategoryDisplayName(category),
  link: buildCategoryShopLink(category, allCategories),
  categoryId: getCategoryRecordId(category),
  slug: String(category?.slug || '').trim(),
  children: getDirectChildCategories(allCategories, category).map((child) => ({
    name: getCategoryDisplayName(child),
    link: buildCategoryShopLink(child, allCategories),
    categoryId: getCategoryRecordId(child),
    slug: String(child?.slug || '').trim(),
  })),
});

const createNavItemFromCategory = (category, allCategories = []) => ({
  name: getCategoryDisplayName(category),
  link: buildCategoryShopLink(category, allCategories),
  slug: String(category?.slug || '').trim(),
  icon: '',
  hasDropdown: false,
  categoryId: getCategoryRecordId(category),
  megaMenu: {
    linkColumns: 1,
    manualLinks: false,
    links: [],
    images: [],
  },
});

const defaultSettings = {
  navMenuEnabled: true,
  navActionsVisibility: {
    store: true,
    orders: true,
    wishlist: true,
    cart: true,
    phone: true,
    language: true,
  },
  navbarPhone: { ...DEFAULT_NAVBAR_PHONE },
  navbarLanguage: { ...DEFAULT_NAVBAR_LANGUAGE },
  navMenuStyle: {
    barBackgroundColor: '#000000',
    categoryBarBackgroundColor: '#000000',
    barTextColor: '#334155',
    barHoverBackgroundColor: '#f1f5f9',
    dropdownBackgroundColor: '#ffffff',
    dropdownTextColor: '#334155',
    dropdownMutedTextColor: '#64748b',
    dropdownBorderColor: '#e2e8f0',
    showcaseFlyoutBackgroundColor: '#ffffff',
    showcaseFlyoutTitleColor: '#0f172a',
    showcaseFlyoutLinkColor: '#1f2937',
    showcaseFlyoutHoverColor: '#f8fafc',
    showcaseFlyoutBorderColor: '#dbe3ee',
    showBottomBorder: false,
    bottomBorderWidth: 2,
    bottomBorderColor: '#e2e8f0',
  },
  navMenuItems: [],
  navMenuUseParentCategories: false,
  navMenuHoverDropdown: true,
  bnplTopBar: { ...DEFAULT_BNPL_TOP_BAR },
};

const defaultNavbarBranding = {
  logoUrl: '',
  logoWidth: 120,
  logoHeight: 40,
  backgroundColor: '',
};

const SHOW_MANUAL_NAV_EDITOR = false;

const EXISTING_PAGES = [
  '/',
  '/shop',
  '/categories',
  '/new-arrivals',
  '/best-sellers',
  '/offers',
  '/about-us',
  '/contact-us',
  '/faq',
  '/support',
  '/help',
  '/privacy-policy',
  '/terms-and-conditions',
  '/shipping-policy',
  '/return-policy',
  '/cookie-policy',
  '/warranty-policy',
];

const EXISTING_PAGE_OPTIONS = EXISTING_PAGES.map((pagePath) => ({
  value: pagePath,
  label: pagePath === '/'
    ? 'Home'
    : pagePath
      .replace(/^\//, '')
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
}));

const LINK_TYPE_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
  { value: 'page', label: 'Existing page' },
  { value: 'custom', label: 'Custom URL' },
];

const safeDecode = (value) => {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
};

const readLinkChoice = (link) => {
  const normalized = String(link || '').trim() || '#';
  if (normalized.startsWith('/category/')) {
    return { type: 'category', value: normalized.replace(/^\/category\//, '').trim() };
  }

  if (normalized.startsWith('/shop?')) {
    const query = normalized.split('?')[1] || '';
    const params = new URLSearchParams(query);
    const category = params.get('category');
    if (category) {
      return { type: 'category', value: safeDecode(category) };
    }
  }

  if (normalized.startsWith('/product/')) {
    return { type: 'product', value: safeDecode(normalized.replace('/product/', '').trim()) };
  }

  if (normalized.startsWith('/products/')) {
    return { type: 'product', value: safeDecode(normalized.replace('/products/', '').trim()) };
  }

  if (EXISTING_PAGES.includes(normalized)) {
    return { type: 'page', value: normalized };
  }

  return { type: 'custom', value: normalized === '#' ? '' : normalized };
};

const createLinkFromChoice = (type, rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return '#';

  if (type === 'category') {
    return toPublicCategoryPath(value);
  }

  if (type === 'product') {
    return `/product/${encodeURIComponent(value)}`;
  }

  if (type === 'page') {
    return value.startsWith('/') ? value : `/${value}`;
  }

  return value;
};

export default function MenuManagementPage() {
  const { user, getToken, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultSettings);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [nestedDrag, setNestedDrag] = useState(null);
  const [nestedDrop, setNestedDrop] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [activePanel, setActivePanel] = useState('settings');
  const [settingsSection, setSettingsSection] = useState('topbar');
  const [uploadingMegaImageKey, setUploadingMegaImageKey] = useState('');
  const [uploadingNavbarLogo, setUploadingNavbarLogo] = useState(false);
  const [uploadingLanguageIcon, setUploadingLanguageIcon] = useState(false);
  const [pendingClearLogo, setPendingClearLogo] = useState(false);
  const [navbarBranding, setNavbarBranding] = useState(defaultNavbarBranding);
  const [navbarLayout, setNavbarLayout] = useState(DEFAULT_NAVBAR_LAYOUT);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [legacyNavbarItems, setLegacyNavbarItems] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [translatingKey, setTranslatingKey] = useState('');
  const [addCategoryKey, setAddCategoryKey] = useState('');
  const [addSubKeys, setAddSubKeys] = useState({});
  const [customLinkDrafts, setCustomLinkDrafts] = useState({});
  const [customBarLinkName, setCustomBarLinkName] = useState('');
  const [customBarLinkUrl, setCustomBarLinkUrl] = useState('');
  const [customBarLinkParent, setCustomBarLinkParent] = useState('bar');
  const [pendingCustomDrag, setPendingCustomDrag] = useState(false);
  const navbarLayoutRef = useRef(navbarLayout);
  const navbarBrandingRef = useRef(navbarBranding);
  const legacyNavbarItemsRef = useRef(legacyNavbarItems);
  const pendingClearLogoRef = useRef(pendingClearLogo);

  useEffect(() => {
    navbarLayoutRef.current = navbarLayout;
  }, [navbarLayout]);
  useEffect(() => {
    navbarBrandingRef.current = navbarBranding;
  }, [navbarBranding]);
  useEffect(() => {
    legacyNavbarItemsRef.current = legacyNavbarItems;
  }, [legacyNavbarItems]);
  useEffect(() => {
    pendingClearLogoRef.current = pendingClearLogo;
  }, [pendingClearLogo]);

  const closeConfirmDialog = () => setConfirmDialog(null);

  const translateTextToArabic = async (text) => {
    const token = await getToken();
    if (!token) {
      throw new Error('Please sign in again');
    }
    const response = await fetch('/api/store/categories/translate-arabic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to translate to Arabic');
    }
    return String(data?.descriptionAr || '').trim();
  };

  const translateExtraButtonToArabic = async (index) => {
    const english = String(navbarLayout.extraButtons[index]?.label || '').trim();
    if (!english) {
      toast.error('Enter English text first');
      return;
    }
    try {
      setTranslatingKey(`button-${index}`);
      const labelAr = await translateTextToArabic(english);
      if (!labelAr) {
        toast.error('Could not translate to Arabic');
        return;
      }
      setNavbarLayout((prev) => ({
        ...prev,
        extraButtons: prev.extraButtons.map((item, itemIndex) => (
          itemIndex === index ? { ...item, labelAr } : item
        )),
      }));
      toast.success('Arabic text updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to translate to Arabic');
    } finally {
      setTranslatingKey('');
    }
  };

  const updateExtraButtonLink = (index, type, value) => {
    setNavbarLayout((prev) => ({
      ...prev,
      extraButtons: prev.extraButtons.map((item, itemIndex) => (
        itemIndex === index ? { ...item, link: createLinkFromChoice(type, value) } : item
      )),
    }));
  };

  const translateCategoriesButtonToArabic = async () => {
    const english = String(navbarLayout.categoriesButtonLabel || '').trim();
    if (!english) {
      toast.error('Enter English Categories text first');
      return;
    }
    try {
      setTranslatingKey('categories');
      const categoriesButtonLabelAr = await translateTextToArabic(english);
      if (!categoriesButtonLabelAr) {
        toast.error('Could not translate to Arabic');
        return;
      }
      setNavbarLayout((prev) => ({ ...prev, categoriesButtonLabelAr }));
      toast.success('Arabic Categories text updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to translate to Arabic');
    } finally {
      setTranslatingKey('');
    }
  };

  const translateSearchPlaceholderToArabic = async () => {
    const english = String(navbarLayout.searchPlaceholder || '').trim();
    if (!english) {
      toast.error('Enter English search placeholder first');
      return;
    }
    try {
      setTranslatingKey('search');
      const searchPlaceholderAr = await translateTextToArabic(english);
      if (!searchPlaceholderAr) {
        toast.error('Could not translate to Arabic');
        return;
      }
      setNavbarLayout((prev) => ({ ...prev, searchPlaceholderAr }));
      toast.success('Arabic placeholder updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to translate to Arabic');
    } finally {
      setTranslatingKey('');
    }
  };

  const loadSettings = async () => {
    try {
      const token = user ? await getToken() : null;
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const [settingsResponse, brandingResponse] = await Promise.all([
        fetch('/api/store/settings', {
          cache: 'no-store',
          headers: authHeaders,
        }),
        fetch('/api/store/navbar-menu', {
          cache: 'no-store',
          headers: authHeaders,
        }),
      ]);

      if (!settingsResponse.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await settingsResponse.json();
      setForm({
        navMenuEnabled: Boolean(data?.navMenuEnabled),
        navActionsVisibility: {
          store: data?.navActionsVisibility?.store !== false,
          orders: data?.navActionsVisibility?.orders !== false,
          wishlist: data?.navActionsVisibility?.wishlist !== false,
          cart: data?.navActionsVisibility?.cart !== false,
          phone: data?.navActionsVisibility?.phone !== false,
          language: data?.navActionsVisibility?.language !== false,
        },
        navbarPhone: normalizeNavbarPhone(data?.navbarPhone),
        navbarLanguage: normalizeNavbarLanguage(data?.navbarLanguage),
        navMenuStyle: {
          ...defaultSettings.navMenuStyle,
          ...(data?.navMenuStyle || {}),
          categoryBarBackgroundColor: data?.navMenuStyle?.categoryBarBackgroundColor
            || (data?.navMenuStyle?.barBackgroundColor
              && String(data.navMenuStyle.barBackgroundColor).toLowerCase() !== '#ffffff'
              ? data.navMenuStyle.barBackgroundColor
              : '#000000'),
          ...normalizeNavbarBottomBorder(data?.navMenuStyle, defaultSettings.navMenuStyle),
        },
        navMenuItems: Array.isArray(data?.navMenuItems) ? data.navMenuItems : [],
        navMenuUseParentCategories: Boolean(data?.navMenuUseParentCategories)
          || isLegacyPlaceholderNavItems(data?.navMenuItems),
        navMenuHoverDropdown: data?.navMenuHoverDropdown !== false,
        bnplTopBar: normalizeBnplTopBar(data?.bnplTopBar),
      });

      if (brandingResponse.ok) {
        const brandingData = await brandingResponse.json();
        setNavbarBranding({
          logoUrl: String(brandingData?.logoUrl || '').trim(),
          logoWidth: Number.isFinite(Number(brandingData?.logoWidth)) ? Number(brandingData.logoWidth) : defaultNavbarBranding.logoWidth,
          logoHeight: Number.isFinite(Number(brandingData?.logoHeight)) ? Number(brandingData.logoHeight) : defaultNavbarBranding.logoHeight,
          backgroundColor: String(brandingData?.backgroundColor || defaultNavbarBranding.backgroundColor),
        });
        setPendingClearLogo(false);
        setLegacyNavbarItems(Array.isArray(brandingData?.items) ? brandingData.items : []);
        setNavbarLayout(normalizeNavbarLayout(brandingData));
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to load menu settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadSettings();
  }, [authLoading, user?.uid]);

  useEffect(() => {
    let active = true;

    const loadLinkTargets = async () => {
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          fetch('/api/categories', { cache: 'no-store' }),
          fetch('/api/products?limit=200', { cache: 'no-store' }),
        ]);

        const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };
        const productsData = productsRes.ok ? await productsRes.json() : { products: [] };

        if (!active) return;

        setCategoryOptions(Array.isArray(categoriesData?.categories) ? categoriesData.categories : []);
        setProductOptions(Array.isArray(productsData?.products) ? productsData.products : []);
      } catch {
        if (!active) return;
        setCategoryOptions([]);
        setProductOptions([]);
      }
    };

    loadLinkTargets();

    return () => {
      active = false;
    };
  }, []);

  const parentCategoryPreview = useMemo(
    () => filterParentCategories(categoryOptions),
    [categoryOptions],
  );

  const previewMenuItems = useMemo(() => {
    return resolveStoreNavMenuItems(
      {
        navMenuUseParentCategories: form.navMenuUseParentCategories,
        navMenuItems: form.navMenuItems,
      },
      categoryOptions,
    );
  }, [form.navMenuUseParentCategories, form.navMenuItems, categoryOptions]);

  const parentCategoryItems = useMemo(
    () => buildParentCategoryNavMenuItems(categoryOptions),
    [categoryOptions],
  );

  const isNavItemForCategory = (item, category) => {
    const categoryId = getCategoryRecordId(category);
    const slug = String(category?.slug || '').trim().toLowerCase();
    const name = getCategoryDisplayName(category).toLowerCase();
    const itemId = String(item?.categoryId || '').trim();
    const itemSlug = String(item?.slug || '').trim().toLowerCase();
    const itemName = String(item?.name || '').trim().toLowerCase();
    return (categoryId && itemId === categoryId)
      || (slug && itemSlug === slug)
      || (name && itemName === name);
  };

  const isParentCategorySelected = (category) => {
    return form.navMenuItems.some((item) => isNavItemForCategory(item, category));
  };

  const addableCategories = useMemo(
    () => categoryOptions
      .filter((category) => isDisplayableCategoryName(getCategoryDisplayName(category)))
      .filter((category) => !form.navMenuItems.some((item) => isNavItemForCategory(item, category)))
      .sort((left, right) => getCategoryDisplayName(left).localeCompare(getCategoryDisplayName(right))),
    [categoryOptions, form.navMenuItems],
  );

  const persistCategoryBar = (nextItems, useParents) => {
    setForm((prev) => ({
      ...prev,
      navMenuUseParentCategories: useParents,
      navMenuItems: nextItems,
    }));
  };

  const setCategoryBarSource = async (useParents) => {
    const nextItems = useParents
      ? form.navMenuItems
      : (isLegacyPlaceholderNavItems(form.navMenuItems)
        ? buildParentCategoryNavMenuItems(categoryOptions)
        : form.navMenuItems);
    persistCategoryBar(nextItems, useParents);
  };

  const setHoverDropdown = (enabled) => {
    setForm((prev) => ({ ...prev, navMenuHoverDropdown: enabled }));
  };

  const persistBnplTopBar = (patch) => {
    const next = normalizeBnplTopBar({
      ...(form.bnplTopBar || DEFAULT_BNPL_TOP_BAR),
      ...patch,
    });
    setForm((prev) => ({ ...prev, bnplTopBar: next }));
  };

  const uploadTopBarImage = async (file) => {
    if (!file) return '';
    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Please choose an image file');
      return '';
    }
    const token = await getToken();
    const { compressImageForUpload } = await import('@/lib/compressImageForUpload');
    const prepared = await compressImageForUpload(file, {
      maxWidth: 600,
      maxHeight: 200,
      maxBytes: 1024 * 1024,
      preserveTransparency: true,
    });
    const body = new FormData();
    body.append('image', prepared);
    body.append('type', 'navbar-logo');
    const uploadResponse = await fetch('/api/store/upload-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const uploadData = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok || !uploadData?.url) {
      throw new Error(uploadData?.error || 'Failed to upload image');
    }
    return uploadData.url;
  };

  const translateTopBarEnglish = async (english, key, applyArabic) => {
    const source = String(english || '').trim();
    if (!source) {
      toast.error('Enter English text first');
      return;
    }
    try {
      setTranslatingKey(key);
      const arabic = await translateTextToArabic(source);
      if (!arabic) {
        toast.error('Could not translate to Arabic');
        return;
      }
      await applyArabic(arabic);
    } catch (error) {
      toast.error(error?.message || 'Failed to translate to Arabic');
    } finally {
      setTranslatingKey('');
    }
  };

  const matchesNavItem = (item, match) => {
    const itemId = String(item?.categoryId || '').trim();
    const itemSlug = String(item?.slug || '').trim().toLowerCase();
    const itemName = String(item?.name || '').trim().toLowerCase();
    return (match.categoryId && itemId === match.categoryId)
      || (match.slug && itemSlug === String(match.slug).toLowerCase())
      || (match.name && itemName === String(match.name).toLowerCase());
  };

  const toggleParentCategoryChip = async (category) => {
    const match = parentCategoryItems.find((item) => {
      const categoryId = getCategoryRecordId(category);
      const slug = String(category?.slug || '').trim().toLowerCase();
      return (categoryId && String(item?.categoryId || '') === categoryId)
        || (slug && String(item?.slug || '').trim().toLowerCase() === slug);
    }) || createNavItemFromCategory(category, categoryOptions);
    if (!match?.name) return;

    const selected = form.navMenuItems.some((item) => matchesNavItem(item, match));
    let nextItems;
    if (selected) {
      nextItems = form.navMenuItems.filter((item) => !matchesNavItem(item, match));
    } else {
      nextItems = [...form.navMenuItems, match];
      const order = new Map(parentCategoryItems.map((item, index) => [String(item.categoryId || item.slug || item.name), index]));
      nextItems.sort((left, right) => {
        const leftKey = String(left.categoryId || left.slug || left.name);
        const rightKey = String(right.categoryId || right.slug || right.name);
        return (order.get(leftKey) ?? 999) - (order.get(rightKey) ?? 999);
      });
    }

    await persistCategoryBar(
      nextItems,
      false,
      selected ? 'Category hidden from the bar' : 'Category added to the bar',
    );
  };

  const addCategoryToBar = async () => {
    const key = String(addCategoryKey || '').trim();
    if (!key) {
      toast.error('Choose a category to add');
      return;
    }
    const category = categoryOptions.find((item) => (
      getCategoryRecordId(item) === key || String(item?.slug || '').trim() === key
    ));
    if (!category) {
      toast.error('Category not found');
      return;
    }
    if (isParentCategorySelected(category)) {
      toast.error('That category is already on the bar');
      return;
    }
    const match = parentCategoryItems.find((item) => {
      const categoryId = getCategoryRecordId(category);
      const slug = String(category?.slug || '').trim().toLowerCase();
      return (categoryId && String(item?.categoryId || '') === categoryId)
        || (slug && String(item?.slug || '').trim().toLowerCase() === slug);
    }) || createNavItemFromCategory(category, categoryOptions);

    setAddCategoryKey('');
    await persistCategoryBar(
      [...form.navMenuItems, match],
      false,
      'Category added to the bar',
    );
  };

  const normalizeBarHref = (value) => {
    const link = String(value || '').trim();
    if (!link) return '';
    return link.startsWith('/') || /^https?:\/\//i.test(link) ? link : `/${link}`;
  };

  const createCustomSubLink = (name, link) => ({
    name: String(name || '').trim(),
    link: normalizeBarHref(link),
    categoryId: '',
    slug: '',
    children: [],
  });

  const isCustomBarItem = (item) => {
    if (!item) return false;
    if (String(item.categoryId || '').trim()) return false;
    return !findCategoryForNavItem(item, categoryOptions);
  };

  const withManualSubs = (item, nextLinks) => ({
    ...item,
    hasDropdown: nextLinks.length > 0,
    megaMenu: {
      ...(item.megaMenu && typeof item.megaMenu === 'object' ? item.megaMenu : {}),
      manualLinks: true,
      linkColumns: nextLinks.length > 8 ? 3 : nextLinks.length > 4 ? 2 : 1,
      links: nextLinks,
      images: Array.isArray(item?.megaMenu?.images) ? item.megaMenu.images : [],
    },
  });

  const addCustomBarLink = async () => {
    const name = String(customBarLinkName || '').trim();
    const link = normalizeBarHref(customBarLinkUrl);
    if (!name || !link) {
      toast.error('Enter a name and a link');
      return;
    }
    const parentKey = String(customBarLinkParent || 'bar');
    setCustomBarLinkName('');
    setCustomBarLinkUrl('');
    if (parentKey !== 'bar') {
      const parentIndex = Number(parentKey);
      if (!Number.isInteger(parentIndex) || !form.navMenuItems[parentIndex]) {
        toast.error('Choose a bar row to place this link under');
        return;
      }
      const current = getItemSubLinks(form.navMenuItems[parentIndex]);
      await persistBarItemSubs(
        parentIndex,
        [...current, createCustomSubLink(name, link)],
        'Custom link added to the hover menu',
      );
      return;
    }
    await persistCategoryBar(
      [...form.navMenuItems, {
        ...createMenuItem(),
        name,
        link,
      }],
      false,
      'Link added to the bar',
    );
  };

  const removeManualBarItem = async (index) => {
    const nextItems = form.navMenuItems.filter((_, itemIndex) => itemIndex !== index);
    await persistCategoryBar(nextItems, false, 'Item removed from the bar');
  };

  const moveManualBarItem = async (index, step) => {
    const nextIndex = index + step;
    if (nextIndex < 0 || nextIndex >= form.navMenuItems.length) return;
    const nextItems = [...form.navMenuItems];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, moved);
    await persistCategoryBar(nextItems, false, 'Category bar order updated');
  };

  const getAutoSubLinks = (item) => {
    const match = findCategoryForNavItem(item, categoryOptions);
    if (!match) return [];
    return getDirectChildCategories(categoryOptions, match).map((child) => (
      createSubLinkFromCategory(child, categoryOptions)
    ));
  };

  const getItemSubLinks = (item) => {
    const saved = Array.isArray(item?.megaMenu?.links)
      ? item.megaMenu.links.filter((entry) => String(entry?.name || '').trim())
      : [];
    if (item?.megaMenu?.manualLinks) return saved;
    return saved.length ? saved : getAutoSubLinks(item);
  };

  const isSameSubLink = (left, right) => {
    const leftId = String(left?.categoryId || '').trim();
    const rightId = String(right?.categoryId || '').trim();
    if (leftId && rightId && leftId === rightId) return true;
    const leftSlug = String(left?.slug || '').trim().toLowerCase();
    const rightSlug = String(right?.slug || '').trim().toLowerCase();
    if (leftSlug && rightSlug && leftSlug === rightSlug) return true;
    const leftName = String(left?.name || '').trim().toLowerCase();
    const rightName = String(right?.name || '').trim().toLowerCase();
    return Boolean(leftName && rightName && leftName === rightName);
  };

  const getAddableSubCategories = (item) => {
    const current = getItemSubLinks(item);
    const parent = findCategoryForNavItem(item, categoryOptions);
    const parentId = getCategoryRecordId(parent);
    const children = parent ? getDirectChildCategories(categoryOptions, parent) : [];
    const childIds = new Set(children.map((category) => getCategoryRecordId(category)).filter(Boolean));
    return categoryOptions
      .filter((category) => isDisplayableCategoryName(getCategoryDisplayName(category)))
      .filter((category) => getCategoryRecordId(category) !== parentId)
      .filter((category) => !current.some((entry) => isSameSubLink(entry, {
        categoryId: getCategoryRecordId(category),
        slug: category?.slug,
        name: getCategoryDisplayName(category),
      })))
      .sort((left, right) => {
        const leftChild = childIds.has(getCategoryRecordId(left)) ? 0 : 1;
        const rightChild = childIds.has(getCategoryRecordId(right)) ? 0 : 1;
        if (leftChild !== rightChild) return leftChild - rightChild;
        return getCategoryDisplayName(left).localeCompare(getCategoryDisplayName(right));
      });
  };

  const persistBarItemSubs = async (index, nextLinks, message) => {
    const nextItems = form.navMenuItems.map((item, itemIndex) => (
      itemIndex === index ? withManualSubs(item, nextLinks) : item
    ));
    await persistCategoryBar(nextItems, false, message);
  };

  const addSubToBarItem = async (index) => {
    const key = String(addSubKeys[index] || '').trim();
    if (!key) {
      toast.error('Choose a subcategory to add');
      return;
    }
    const category = categoryOptions.find((item) => (
      getCategoryRecordId(item) === key || String(item?.slug || '').trim() === key
    ));
    if (!category) {
      toast.error('Category not found');
      return;
    }
    const nextLink = createSubLinkFromCategory(category, categoryOptions);
    const current = getItemSubLinks(form.navMenuItems[index]);
    if (current.some((entry) => isSameSubLink(entry, nextLink))) {
      toast.error('That subcategory is already on this menu');
      return;
    }
    setAddSubKeys((prev) => ({ ...prev, [index]: '' }));
    await persistBarItemSubs(index, [...current, nextLink], 'Subcategory added to the hover menu');
  };

  const addCustomSubToBarItem = async (index) => {
    const draft = customLinkDrafts[index] || {};
    const name = String(draft.name || '').trim();
    const link = normalizeBarHref(draft.url);
    if (!name || !link) {
      toast.error('Enter a name and a link');
      return;
    }
    const nextLink = createCustomSubLink(name, link);
    const current = getItemSubLinks(form.navMenuItems[index]);
    if (current.some((entry) => isSameSubLink(entry, nextLink))) {
      toast.error('That link is already on this menu');
      return;
    }
    setCustomLinkDrafts((prev) => ({ ...prev, [index]: { name: '', url: '' } }));
    await persistBarItemSubs(index, [...current, nextLink], 'Custom link added to the hover menu');
  };

  const removeSubFromBarItem = async (index, subIndex) => {
    const current = getItemSubLinks(form.navMenuItems[index]);
    const nextLinks = current.filter((_, itemIndex) => itemIndex !== subIndex);
    await persistBarItemSubs(index, nextLinks, 'Item removed from the hover menu');
  };

  const dropManualBarItem = async (targetIndex) => {
    if (dragIndex == null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const nextItems = [...form.navMenuItems];
    const [moved] = nextItems.splice(dragIndex, 1);
    nextItems.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setDropIndex(null);
    await persistCategoryBar(nextItems, false, 'Category bar order updated');
  };

  const nestBarItemUnder = async (sourceIndex, targetIndex, targetSubIndex = null) => {
    if (sourceIndex == null || sourceIndex === targetIndex || !form.navMenuItems[sourceIndex]) return;
    const movedItem = form.navMenuItems[sourceIndex];
    const movedLink = createCustomSubLink(movedItem.name, movedItem.link);
    const withoutSource = form.navMenuItems.filter((_, itemIndex) => itemIndex !== sourceIndex);
    const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    const targetLinks = [...getItemSubLinks(withoutSource[adjustedTarget])];
    const insertAt = Number.isInteger(targetSubIndex)
      ? Math.min(Math.max(targetSubIndex, 0), targetLinks.length)
      : targetLinks.length;
    targetLinks.splice(insertAt, 0, movedLink);
    const nextItems = withoutSource.map((item, itemIndex) => (
      itemIndex === adjustedTarget ? withManualSubs(item, targetLinks) : item
    ));
    setDragIndex(null);
    setDropIndex(null);
    setNestedDrag(null);
    setNestedDrop(null);
    await persistCategoryBar(nextItems, false, 'Link moved under that bar row');
  };

  const dropPendingCustomOnRow = async (targetIndex, targetSubIndex = null) => {
    const name = String(customBarLinkName || '').trim();
    const link = normalizeBarHref(customBarLinkUrl);
    if (!name || !link || !form.navMenuItems[targetIndex]) {
      setPendingCustomDrag(false);
      return;
    }
    const current = [...getItemSubLinks(form.navMenuItems[targetIndex])];
    const insertAt = Number.isInteger(targetSubIndex)
      ? Math.min(Math.max(targetSubIndex, 0), current.length)
      : current.length;
    current.splice(insertAt, 0, createCustomSubLink(name, link));
    setCustomBarLinkName('');
    setCustomBarLinkUrl('');
    setPendingCustomDrag(false);
    setNestedDrag(null);
    setNestedDrop(null);
    await persistBarItemSubs(targetIndex, current, 'Custom link added to the hover menu');
  };

  const dropBarSubItem = async (targetItemIndex, targetSubIndex = null) => {
    if (pendingCustomDrag) {
      await dropPendingCustomOnRow(targetItemIndex, targetSubIndex);
      return;
    }
    if (dragIndex != null && isCustomBarItem(form.navMenuItems[dragIndex])) {
      await nestBarItemUnder(dragIndex, targetItemIndex, targetSubIndex);
      return;
    }
    if (!nestedDrag || nestedDrag.itemIndex == null) {
      setNestedDrag(null);
      setNestedDrop(null);
      return;
    }

    const fromItemIndex = nestedDrag.itemIndex;
    const fromSubIndex = nestedDrag.subIndex;
    if (fromItemIndex === targetItemIndex) {
      if (fromSubIndex == null || fromSubIndex === targetSubIndex) {
        setNestedDrag(null);
        setNestedDrop(null);
        return;
      }
      const current = [...getItemSubLinks(form.navMenuItems[fromItemIndex])];
      const [moved] = current.splice(fromSubIndex, 1);
      const insertAt = Number.isInteger(targetSubIndex)
        ? Math.min(Math.max(targetSubIndex, 0), current.length)
        : current.length;
      current.splice(insertAt, 0, moved);
      setNestedDrag(null);
      setNestedDrop(null);
      await persistBarItemSubs(fromItemIndex, current, 'Hover menu order updated');
      return;
    }

    const sourceLinks = [...getItemSubLinks(form.navMenuItems[fromItemIndex])];
    const [moved] = sourceLinks.splice(fromSubIndex, 1);
    if (!moved) {
      setNestedDrag(null);
      setNestedDrop(null);
      return;
    }
    const targetLinks = [...getItemSubLinks(form.navMenuItems[targetItemIndex])];
    const insertAt = Number.isInteger(targetSubIndex)
      ? Math.min(Math.max(targetSubIndex, 0), targetLinks.length)
      : targetLinks.length;
    targetLinks.splice(insertAt, 0, moved);
    const nextItems = form.navMenuItems.map((item, itemIndex) => {
      if (itemIndex === fromItemIndex) return withManualSubs(item, sourceLinks);
      if (itemIndex === targetItemIndex) return withManualSubs(item, targetLinks);
      return item;
    });
    setNestedDrag(null);
    setNestedDrop(null);
    await persistCategoryBar(nextItems, false, 'Link moved under that bar row');
  };

  const dropOnHoverZone = async (targetIndex) => {
    if (pendingCustomDrag || nestedDrag || (dragIndex != null && isCustomBarItem(form.navMenuItems[dragIndex]))) {
      await dropBarSubItem(targetIndex, null);
      return;
    }
    await dropManualBarItem(targetIndex);
  };

  const updateCategoryBarColor = (nextColor) => {
    setForm((prev) => ({
      ...prev,
      navMenuStyle: {
        ...prev.navMenuStyle,
        categoryBarBackgroundColor: nextColor,
        barBackgroundColor: nextColor,
      },
    }));
  };

  const updateBottomBorder = (patch) => {
    setForm((prev) => ({
      ...prev,
      navMenuStyle: {
        ...prev.navMenuStyle,
        ...normalizeNavbarBottomBorder({
          ...prev.navMenuStyle,
          ...patch,
        }, defaultSettings.navMenuStyle),
      },
    }));
  };

  const saveSettings = async (payload, successMessage = 'Navigation menu saved') => {
    const token = await getToken();
    const response = await fetch('/api/store/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to save settings');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('navMenuUpdated'));
      if (payload?.navActionsVisibility) {
        try {
          window.sessionStorage.setItem(
            'nav:actions:visibility:v1',
            JSON.stringify(payload.navActionsVisibility),
          );
        } catch {
          // Ignore storage failures.
        }
        window.dispatchEvent(new CustomEvent('navActionsVisibilityUpdated', {
          detail: payload.navActionsVisibility,
        }));
      }
      if (payload?.navbarPhone) {
        try {
          window.sessionStorage.setItem('nav:phone:v1', JSON.stringify(payload.navbarPhone));
        } catch {
          // Ignore storage failures.
        }
        window.dispatchEvent(new CustomEvent('navbarPhoneUpdated', {
          detail: payload.navbarPhone,
        }));
      }
      if (payload?.navbarLanguage) {
        try {
          window.sessionStorage.setItem('nav:language:v1', JSON.stringify(payload.navbarLanguage));
        } catch {
          // Ignore storage failures.
        }
        window.dispatchEvent(new CustomEvent('navbarLanguageUpdated', {
          detail: payload.navbarLanguage,
        }));
      }
      if (payload?.bnplTopBar) {
        window.dispatchEvent(new Event('bnplTopBarUpdated'));
      }
    }
    if (successMessage) {
      toast.success(successMessage);
    }
  };

  const applyNavbarLayoutChange = (updater) => {
    setNavbarLayout((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      navbarLayoutRef.current = next;
      return next;
    });
  };

  const saveNavbarBranding = async (layoutOverride) => {
    const layout = layoutOverride || navbarLayoutRef.current || navbarLayout;
    const branding = navbarBrandingRef.current || navbarBranding;
    const token = await getToken();
    const payload = {
      enabled: true,
      items: Array.isArray(legacyNavbarItemsRef.current) ? legacyNavbarItemsRef.current : [],
      logoUrl: String(branding.logoUrl || '').trim(),
      logoWidth: Math.max(20, Math.min(400, Number(branding.logoWidth) || defaultNavbarBranding.logoWidth)),
      logoHeight: Math.max(10, Math.min(200, Number(branding.logoHeight) || defaultNavbarBranding.logoHeight)),
      backgroundColor: String(branding.backgroundColor || defaultNavbarBranding.backgroundColor).trim(),
      clearLogo: pendingClearLogoRef.current,
      extraButtons: layout.extraButtons,
      searchMaxWidth: layout.searchMaxWidth,
      searchAlign: layout.searchAlign,
      searchPlaceholder: layout.searchPlaceholder,
      searchPlaceholderAr: layout.searchPlaceholderAr,
      searchStyle: layout.searchStyle,
      navbarMaxWidth: layout.navbarMaxWidth,
      itemGap: layout.itemGap,
      logoGap: layout.logoGap,
      mobileItemGap: layout.mobileItemGap,
      stickyHeader: layout.stickyHeader,
      showCategoriesButton: layout.showCategoriesButton,
      categoriesButtonLabel: layout.categoriesButtonLabel,
      categoriesButtonLabelAr: layout.categoriesButtonLabelAr,
      categoriesButtonStyle: layout.categoriesButtonStyle,
      itemOrder: layout.itemOrder,
      itemAlign: layout.itemAlign,
      unifyNavbarText: layout.unifyNavbarText,
      unifiedTextFontFamily: layout.unifiedTextFontFamily,
      unifiedTextFontSize: layout.unifiedTextFontSize,
    };

    const response = await fetch('/api/store/navbar-menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to save navbar branding');
    }

    if (Array.isArray(data?.data?.items)) {
      setLegacyNavbarItems(data.data.items);
    }

    const savedLogoUrl = String(data?.data?.logoUrl || payload.logoUrl || '').trim();
    setNavbarBranding((prev) => ({
      ...prev,
      logoUrl: pendingClearLogo ? '' : savedLogoUrl,
      logoWidth: data?.data?.logoWidth ?? prev.logoWidth,
      logoHeight: data?.data?.logoHeight ?? prev.logoHeight,
    }));
    setPendingClearLogo(false);
    if (data?.data) {
      setNavbarLayout(normalizeNavbarLayout(data.data));
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('navbarAppearanceCache');
        const cached = raw ? JSON.parse(raw) : {};
        window.localStorage.setItem('navbarAppearanceCache', JSON.stringify({
          ...cached,
          logoUrl: pendingClearLogoRef.current ? '' : savedLogoUrl,
          logoWidth: payload.logoWidth,
          logoHeight: payload.logoHeight,
          backgroundColor: payload.backgroundColor,
          ...layout,
          layoutUpdatedAt: data?.data?.layoutUpdatedAt || new Date().toISOString(),
        }));
      } catch {
        // Ignore storage write failures.
      }
      window.dispatchEvent(new CustomEvent('navbarAppearanceUpdated', {
        detail: {
          logoUrl: pendingClearLogoRef.current ? '' : savedLogoUrl,
          logoWidth: payload.logoWidth,
          logoHeight: payload.logoHeight,
          backgroundColor: payload.backgroundColor,
          ...layout,
          layoutUpdatedAt: data?.data?.layoutUpdatedAt || new Date().toISOString(),
        },
      }));
    }
  };

  const uploadNavbarLogo = async (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    try {
      setUploadingNavbarLogo(true);
      const token = await getToken();
      // Keep PNG/WebP transparency — JPEG would show black around the logo.
      const { compressImageForUpload } = await import('@/lib/compressImageForUpload');
      const prepared = await compressImageForUpload(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        maxBytes: 2 * 1024 * 1024,
        preserveTransparency: true,
      });
      const body = new FormData();
      body.append('image', prepared);
      body.append('type', 'navbar-logo');

      const uploadResponse = await fetch('/api/store/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadData?.url) {
        throw new Error(uploadData?.error || 'Failed to upload logo');
      }

      setNavbarBranding((prev) => ({ ...prev, logoUrl: uploadData.url }));
      setPendingClearLogo(false);
      toast.success('Logo uploaded. Click Save Settings to apply.');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload logo');
    } finally {
      setUploadingNavbarLogo(false);
    }
  };

  const persistNavbarLanguage = (nextLanguage) => {
    const navbarLanguage = normalizeNavbarLanguage(nextLanguage);
    setForm((prev) => ({ ...prev, navbarLanguage }));
  };

  const uploadLanguageIcon = async (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    try {
      setUploadingLanguageIcon(true);
      const token = await getToken();
      const { compressImageForUpload } = await import('@/lib/compressImageForUpload');
      const prepared = await compressImageForUpload(file, {
        maxWidth: 256,
        maxHeight: 256,
        maxBytes: 512 * 1024,
        preserveTransparency: true,
      });
      const body = new FormData();
      body.append('image', prepared);
      body.append('type', 'navbar-language-icon');

      const uploadResponse = await fetch('/api/store/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadData?.url) {
        throw new Error(uploadData?.error || 'Failed to upload icon');
      }

      persistNavbarLanguage({
        ...form.navbarLanguage,
        iconUrl: uploadData.url,
      });
      toast.success('Language icon uploaded. Click Save to apply.');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload language icon');
    } finally {
      setUploadingLanguageIcon(false);
    }
  };

  const updateMenuItem = (index, updater) => {
    setForm((prev) => ({
      ...prev,
      navMenuItems: prev.navMenuItems.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)),
    }));
  };

  const moveMenuItem = (fromIndex, toIndex) => {
    setForm((prev) => {
      const total = prev.navMenuItems.length;
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= total ||
        toIndex >= total
      ) {
        return prev;
      }

      const nextItems = [...prev.navMenuItems];
      const [movedItem] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, movedItem);
      return { ...prev, navMenuItems: nextItems };
    });
  };

  const moveMenuItemByStep = (index, step) => {
    const target = index + step;
    moveMenuItem(index, target);
  };

  const updateItemLinkChoice = (menuIndex, type, value) => {
    updateMenuItem(menuIndex, (current) => ({
      ...current,
      link: createLinkFromChoice(type, value),
    }));
  };

  const updateMegaLinkChoice = (menuIndex, linkIndex, type, value) => {
    updateMenuItem(menuIndex, (current) => {
      const links = [...(current.megaMenu?.links || [])];
      links[linkIndex] = {
        ...(links[linkIndex] || {}),
        link: createLinkFromChoice(type, value),
      };
      return {
        ...current,
        megaMenu: {
          ...(current.megaMenu || {}),
          links,
        },
      };
    });
  };

  const moveMegaArrayItem = (menuIndex, key, fromIndex, toIndex) => {
    updateMenuItem(menuIndex, (current) => {
      const source = Array.isArray(current?.megaMenu?.[key]) ? current.megaMenu[key] : [];
      const total = source.length;
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= total ||
        toIndex >= total
      ) {
        return current;
      }

      const next = [...source];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      return {
        ...current,
        megaMenu: {
          ...(current.megaMenu || {}),
          [key]: next,
        },
      };
    });
  };

  const moveMegaArrayItemByStep = (menuIndex, key, index, step) => {
    moveMegaArrayItem(menuIndex, key, index, index + step);
  };

  const uploadIconAndPersist = async (menuIndex, file) => {
    if (!file) return;
    try {
      const token = await getToken();
      const body = new FormData();
      body.append('image', file);
      body.append('type', 'menu-icon');

      const uploadResponse = await fetch('/api/store/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadData?.url) {
        throw new Error(uploadData?.error || 'Failed to upload icon');
      }

      const updatedItems = form.navMenuItems.map((item, index) =>
        index === menuIndex ? { ...item, icon: uploadData.url } : item
      );

      setForm((prev) => ({ ...prev, navMenuItems: updatedItems }));
      toast.success('Icon uploaded. Click Save menu to apply.');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload icon');
    }
  };

  const uploadMegaImageAndPersist = async (menuIndex, imageIndex, file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    const uploadKey = `${menuIndex}-${imageIndex}`;
    setUploadingMegaImageKey(uploadKey);

    try {
      const token = await getToken();
      const body = new FormData();
      body.append('image', file);
      body.append('type', 'menu-mega-image');

      const uploadResponse = await fetch('/api/store/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadData?.url) {
        throw new Error(uploadData?.error || 'Failed to upload image');
      }

      let updatedItems = [];
      setForm((prev) => {
        updatedItems = prev.navMenuItems.map((item, idx) => {
          if (idx !== menuIndex) return item;
          const images = [...(item?.megaMenu?.images || [])];
          images[imageIndex] = {
            ...(images[imageIndex] || {}),
            url: uploadData.url,
          };
          return {
            ...item,
            megaMenu: {
              ...(item?.megaMenu || {}),
              images,
            },
          };
        });

        return { ...prev, navMenuItems: updatedItems };
      });

      toast.success('Image uploaded. Click Save menu to apply.');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload image');
    } finally {
      setUploadingMegaImageKey('');
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <p className="text-sm">Please sign in to manage menu settings.</p>
          <Link href="/store/login" className="mt-4 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
            Go to Store Login
          </Link>
        </div>
      </div>
    );
  }

  const actionToggles = [
    { key: 'store', label: 'Store action', icon: Store },
    { key: 'orders', label: 'Orders action', icon: Package },
    { key: 'wishlist', label: 'Wishlist action', icon: Heart },
    { key: 'cart', label: 'Cart action', icon: ShoppingCart },
    { key: 'phone', label: 'Phone action', icon: Phone },
    { key: 'language', label: 'Language action', icon: Languages },
  ];

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const saveErrors = [];

      try {
        await saveNavbarBranding();
      } catch (error) {
        saveErrors.push(error?.message || 'Failed to save navbar branding');
      }

      try {
        await saveSettings({
          navMenuEnabled: form.navMenuEnabled,
          navActionsVisibility: form.navActionsVisibility,
          navbarPhone: form.navbarPhone,
          navbarLanguage: form.navbarLanguage,
          navMenuStyle: form.navMenuStyle,
          navMenuHoverDropdown: form.navMenuHoverDropdown,
          bnplTopBar: form.bnplTopBar,
        }, null);
      } catch (error) {
        saveErrors.push(error?.message || 'Failed to save settings');
      }

      if (saveErrors.length) {
        throw new Error(saveErrors[0]);
      }

      toast.success('Settings saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMenu = async () => {
    if (form.navMenuItems.length === 0) {
      setConfirmDialog({
        tone: 'warning',
        title: 'Save empty menu?',
        message: 'You removed all navigation items. The live navbar will show no manual items until you add some again.',
        confirmLabel: 'Save empty menu',
        onConfirm: async () => {
          setConfirmDialog(null);
          setSaving(true);
          try {
            await saveSettings({
              navMenuEnabled: form.navMenuEnabled,
              navMenuItems: form.navMenuItems,
              navMenuUseParentCategories: form.navMenuUseParentCategories,
              navMenuHoverDropdown: form.navMenuHoverDropdown,
              navMenuStyle: form.navMenuStyle,
            }, 'Menu saved');
          } catch (error) {
            toast.error(error?.message || 'Failed to save menu');
          } finally {
            setSaving(false);
          }
        },
      });
      return;
    }

    setSaving(true);
    try {
      await saveSettings({
        navMenuEnabled: form.navMenuEnabled,
        navMenuItems: form.navMenuItems,
        navMenuUseParentCategories: form.navMenuUseParentCategories,
        navMenuHoverDropdown: form.navMenuHoverDropdown,
        navMenuStyle: form.navMenuStyle,
      }, 'Menu saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  const removeMenuItem = (index) => {
    const itemName = String(form.navMenuItems[index]?.name || `Item ${index + 1}`).trim();
    setConfirmDialog({
      tone: 'danger',
      title: 'Remove menu item?',
      message: `“${itemName}” will be removed from this editor. Click Save menu afterward to apply on the live site.`,
      confirmLabel: 'Remove item',
      onConfirm: () => {
        setForm((prev) => ({
          ...prev,
          navMenuItems: prev.navMenuItems.filter((_, i) => i !== index),
        }));
        setConfirmDialog(null);
        toast.success('Item removed — click Save menu to apply');
      },
    });
  };

  return (
    <div className="-mx-3 -mt-3 min-h-full w-full max-w-full overflow-x-hidden bg-white pb-16 sm:-mx-4 sm:-mt-4 lg:-mx-5 lg:-mt-5">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex w-full flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles size={14} />
              Navigation
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Navbar
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Pick a section below, change it, then click Save.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={activePanel === 'settings' ? handleSaveSettings : handleSaveMenu}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-4 pb-0 pt-3 sm:px-6 lg:px-8">
          {[
            { id: 'settings', label: 'Look', icon: Settings2 },
            { id: 'menu', label: 'Menu links', icon: Menu },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activePanel === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePanel(tab.id)}
                className={`inline-flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      {activePanel === 'settings' ? (
        <div className="space-y-5">
          <div className="overflow-visible rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Eye size={14} />
                  Navbar preview
                </div>
                <p className="mt-1 text-[11px] font-normal normal-case tracking-normal text-slate-400">
                  {previewDevice === 'mobile'
                    ? 'Phone navbar and side menu. Edits stay on this page until you click Save settings.'
                    : 'Same layout as the website. Click Save settings to update the live store.'}
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                    previewDevice === 'desktop'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Monitor size={13} />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                    previewDevice === 'mobile'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Smartphone size={13} />
                  Mobile
                </button>
              </div>
            </div>
            <div className="overflow-visible p-4 sm:p-5">
              <NavbarPreview
                backgroundColor={navbarBranding.backgroundColor || defaultNavbarBranding.backgroundColor}
                logoUrl={navbarBranding.logoUrl}
                logoWidth={navbarBranding.logoWidth}
                logoHeight={navbarBranding.logoHeight}
                navMenuEnabled={form.navMenuEnabled}
                navMenuItems={previewMenuItems}
                navMenuUseParentCategories={form.navMenuUseParentCategories}
                navMenuHoverDropdown={form.navMenuHoverDropdown !== false}
                bnplTopBar={form.bnplTopBar}
                categoryOptions={categoryOptions}
                navActionsVisibility={form.navActionsVisibility}
                navbarPhone={form.navbarPhone}
                navbarLanguage={form.navbarLanguage}
                userName={user?.displayName || user?.email?.split('@')[0] || 'store1920'}
                searchPlaceholder={navbarLayout.searchPlaceholder || 'Wireless Headphones'}
                extraButtons={navbarLayout.extraButtons}
                searchMaxWidth={navbarLayout.searchMaxWidth}
                searchAlign={navbarLayout.searchAlign}
                searchStyle={navbarLayout.searchStyle}
                navbarMaxWidth={navbarLayout.navbarMaxWidth}
                showCategoriesButton={navbarLayout.showCategoriesButton}
                categoriesButtonLabel={navbarLayout.categoriesButtonLabel}
                categoriesButtonStyle={navbarLayout.categoriesButtonStyle}
                itemOrder={navbarLayout.itemOrder}
                itemAlign={navbarLayout.itemAlign}
                itemGap={navbarLayout.itemGap}
                logoGap={navbarLayout.logoGap}
                mobileItemGap={navbarLayout.mobileItemGap}
                device={previewDevice}
                showMenuBar={false}
                unifyNavbarText={navbarLayout.unifyNavbarText}
                unifiedTextFontFamily={navbarLayout.unifiedTextFontFamily}
                unifiedTextFontSize={navbarLayout.unifiedTextFontSize}
              />
            </div>
          </div>

          {previewDevice === 'mobile' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-900">Mobile navbar</h2>
                <p className="mt-1 text-xs text-slate-500">Icons on the phone bar. Language stays in the side menu.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[
                    { key: 'phone', label: 'Phone', icon: Phone },
                    { key: 'wishlist', label: 'Wishlist', icon: Heart },
                    { key: 'cart', label: 'Cart', icon: ShoppingCart },
                  ].map(({ key, label, icon: Icon }) => {
                    const checked = form.navActionsVisibility[key] !== false;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          navActionsVisibility: {
                            ...prev.navActionsVisibility,
                            [key]: !checked,
                          },
                        }))}
                        className={`rounded-xl border p-3 text-left transition ${
                          checked
                            ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon size={16} className={checked ? 'text-indigo-600' : 'text-slate-400'} />
                        <p className="mt-2 text-sm font-semibold text-slate-900">{label}</p>
                      </button>
                    );
                  })}
                </div>
                <label className="mt-4 block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Item gap ({navbarLayout.mobileItemGap}px)</span>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    className="w-full accent-indigo-600"
                    value={navbarLayout.mobileItemGap}
                    onChange={(event) => setNavbarLayout((prev) => ({ ...prev, mobileItemGap: Number(event.target.value) }))}
                  />
                </label>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-900">Mobile side menu</h2>
                <p className="mt-1 text-xs text-slate-500">Shown after the menu icon is tapped. Category names come from Menu links.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    { key: 'language', label: 'Language', icon: Languages },
                    { key: 'store', label: 'Seller dashboard', icon: Store },
                  ].map(({ key, label, icon: Icon }) => {
                    const checked = form.navActionsVisibility[key] !== false;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          navActionsVisibility: {
                            ...prev.navActionsVisibility,
                            [key]: !checked,
                          },
                        }))}
                        className={`rounded-xl border p-3 text-left transition ${
                          checked
                            ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon size={16} className={checked ? 'text-indigo-600' : 'text-slate-400'} />
                        <p className="mt-2 text-sm font-semibold text-slate-900">{label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Same font for all navbar text</p>
                <p className="mt-1 text-xs text-slate-500">
                  Override existing per-item fonts so UNDER 99, extra buttons, Categories, search, and account use one family and size.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={navbarLayout.unifyNavbarText === true}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, unifyNavbarText: event.target.checked }))}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
            {navbarLayout.unifyNavbarText ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Font family</span>
                  <select
                    value={navbarLayout.unifiedTextFontFamily || 'inherit'}
                    onChange={(event) => setNavbarLayout((prev) => ({ ...prev, unifiedTextFontFamily: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {OFFERS_NAV_FONT_OPTIONS.map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                    Font size
                    <span className="tabular-nums text-slate-700">{navbarLayout.unifiedTextFontSize || 13}px</span>
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={22}
                    value={navbarLayout.unifiedTextFontSize || 13}
                    onChange={(event) => setNavbarLayout((prev) => ({ ...prev, unifiedTextFontSize: Number(event.target.value) }))}
                    className="w-full accent-indigo-600"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'topbar', label: 'Top bar' },
              { id: 'layout', label: 'Layout' },
              { id: 'logo', label: 'Logo & color' },
              { id: 'search', label: 'Search' },
              { id: 'categories', label: 'Categories' },
              { id: 'buttons', label: 'Extra buttons' },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setSettingsSection(section.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  settingsSection === section.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {settingsSection === 'topbar' ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Show top bar</p>
                  <p className="mt-1 text-xs text-slate-500">
                    The Tamara / Tabby strip above the navbar. Turn this off to hide the whole section.
                  </p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={form.bnplTopBar?.enabled !== false}
                    onChange={(event) => persistBnplTopBar(
                      { enabled: event.target.checked },
                      event.target.checked ? 'Top bar shown' : 'Top bar hidden',
                    )}
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            </div>

            <div className={`space-y-4 ${form.bnplTopBar?.enabled !== false ? '' : 'pointer-events-none opacity-50'}`}>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-sm font-semibold text-slate-900">Size</p>
                <p className="mt-1 text-xs text-slate-500">Increase the top bar text and the minimum height of the strip.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                      Font size
                      <span className="tabular-nums text-slate-700">{Number(form.bnplTopBar?.fontSize) || 14}px</span>
                    </span>
                    <input
                      type="range"
                      min={10}
                      max={24}
                      value={Number(form.bnplTopBar?.fontSize) || 14}
                      onChange={(event) => setForm((prev) => ({
                        ...prev,
                        bnplTopBar: {
                          ...normalizeBnplTopBar(prev.bnplTopBar),
                          fontSize: Number(event.target.value),
                        },
                      }))}
                      onMouseUp={(event) => persistBnplTopBar(
                        { fontSize: Number(event.currentTarget.value) },
                        'Top bar font size updated',
                      )}
                      onTouchEnd={(event) => persistBnplTopBar(
                        { fontSize: Number(event.currentTarget.value) },
                        'Top bar font size updated',
                      )}
                      className="w-full accent-indigo-600"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                      Minimum height
                      <span className="tabular-nums text-slate-700">{Number(form.bnplTopBar?.minHeight) || 40}px</span>
                    </span>
                    <input
                      type="range"
                      min={28}
                      max={72}
                      value={Number(form.bnplTopBar?.minHeight) || 40}
                      onChange={(event) => setForm((prev) => ({
                        ...prev,
                        bnplTopBar: {
                          ...normalizeBnplTopBar(prev.bnplTopBar),
                          minHeight: Number(event.target.value),
                        },
                      }))}
                      onMouseUp={(event) => persistBnplTopBar(
                        { minHeight: Number(event.currentTarget.value) },
                        'Top bar height updated',
                      )}
                      onTouchEnd={(event) => persistBnplTopBar(
                        { minHeight: Number(event.currentTarget.value) },
                        'Top bar height updated',
                      )}
                      className="w-full accent-indigo-600"
                    />
                  </label>
                </div>
              </div>
              {BNPL_PARTNER_DEFS.map((partner) => {
                const partnerEnabled = Boolean(form.bnplTopBar?.[partner.enabledKey]);
                const partnerLogo = form.bnplTopBar?.[partner.logoKey] || partner.logoUrl;
                const payments = Number(form.bnplTopBar?.[partner.paymentsKey]) || 4;
                const text = form.bnplTopBar?.[partner.textKey] || '';
                const textAr = form.bnplTopBar?.[partner.textArKey] || '';
                const preview = getDefaultBnplBannerText({
                  name: partner.name,
                  nameAr: partner.nameAr,
                  payments,
                }, 'en');
                return (
                  <div key={partner.key} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={partnerLogo} alt={partner.name} className="h-5 w-auto" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{partner.name}</p>
                          <p className="text-xs text-slate-500">Show this partner in the top bar rotation.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={partnerEnabled}
                          onChange={(event) => persistBnplTopBar(
                            { [partner.enabledKey]: event.target.checked },
                            event.target.checked ? `${partner.name} shown` : `${partner.name} hidden`,
                          )}
                          className="peer sr-only"
                        />
                        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                      </label>
                    </div>

                    <div className={`mt-4 space-y-3 ${partnerEnabled ? '' : 'pointer-events-none opacity-50'}`}>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
                        Change image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (!file) return;
                            try {
                              const url = await uploadTopBarImage(file);
                              if (!url) return;
                              await persistBnplTopBar({ [partner.logoKey]: url }, `${partner.name} image updated`);
                            } catch (error) {
                              toast.error(error?.message || 'Failed to upload image');
                            }
                          }}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">Payments</span>
                        <input
                          type="number"
                          min={2}
                          max={12}
                          value={payments}
                          onChange={(event) => setForm((prev) => ({
                            ...prev,
                            bnplTopBar: {
                              ...normalizeBnplTopBar(prev.bnplTopBar),
                              [partner.paymentsKey]: Number(event.target.value) || 4,
                            },
                          }))}
                          onBlur={() => persistBnplTopBar(
                            { [partner.paymentsKey]: payments },
                            `${partner.name} payments updated`,
                          )}
                          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">English text</span>
                        <input
                          type="text"
                          value={text}
                          placeholder={preview.desktop}
                          onChange={(event) => setForm((prev) => ({
                            ...prev,
                            bnplTopBar: {
                              ...normalizeBnplTopBar(prev.bnplTopBar),
                              [partner.textKey]: event.target.value,
                            },
                          }))}
                          onBlur={() => persistBnplTopBar(
                            { [partner.textKey]: text },
                            `${partner.name} text updated`,
                          )}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                          Arabic text
                          <button
                            type="button"
                            onClick={() => translateTopBarEnglish(
                              text.trim() || preview.desktop,
                              `topbar-${partner.key}`,
                              (arabic) => persistBnplTopBar({ [partner.textArKey]: arabic }, `${partner.name} Arabic text updated`),
                            )}
                            disabled={translatingKey === `topbar-${partner.key}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {translatingKey === `topbar-${partner.key}` ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                            {translatingKey === `topbar-${partner.key}` ? 'Translating...' : 'Translate'}
                          </button>
                        </span>
                        <input
                          type="text"
                          dir="rtl"
                          value={textAr}
                          placeholder={getDefaultBnplBannerText({
                            name: partner.name,
                            nameAr: partner.nameAr,
                            payments,
                          }, 'ar').desktop}
                          onChange={(event) => setForm((prev) => ({
                            ...prev,
                            bnplTopBar: {
                              ...normalizeBnplTopBar(prev.bnplTopBar),
                              [partner.textArKey]: event.target.value,
                            },
                          }))}
                          onBlur={() => persistBnplTopBar(
                            { [partner.textArKey]: textAr },
                            `${partner.name} Arabic text updated`,
                          )}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Preview: {text.trim() || preview.desktop}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">More items</p>
                    <p className="mt-1 text-xs text-slate-500">Add extra messages. Enabled items rotate automatically with Tamara and Tabby.</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => {
                      const current = normalizeBnplTopBar(form.bnplTopBar).customItems || [];
                      if (current.length >= 8) return;
                      persistBnplTopBar({
                        customItems: [
                          ...current,
                          {
                            id: `topbar-${Date.now()}`,
                            enabled: true,
                            name: `Item ${current.length + 1}`,
                            imageUrl: '',
                            text: '',
                            textAr: '',
                          },
                        ],
                      }, 'Top bar item added');
                    }}
                  >
                    Add item
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {(normalizeBnplTopBar(form.bnplTopBar).customItems || []).map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-6 w-auto" /> : null}
                          <input
                            value={item.name}
                            onChange={(event) => {
                              const customItems = normalizeBnplTopBar(form.bnplTopBar).customItems.map((entry, entryIndex) => (
                                entryIndex === index ? { ...entry, name: event.target.value } : entry
                              ));
                              setForm((prev) => ({
                                ...prev,
                                bnplTopBar: { ...normalizeBnplTopBar(prev.bnplTopBar), customItems },
                              }));
                            }}
                            onBlur={() => persistBnplTopBar({ customItems: normalizeBnplTopBar(form.bnplTopBar).customItems }, 'Top bar item updated')}
                            className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600"
                          onClick={() => persistBnplTopBar({
                            customItems: normalizeBnplTopBar(form.bnplTopBar).customItems.filter((entry) => entry.id !== item.id),
                          }, 'Top bar item removed')}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 space-y-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
                          {item.imageUrl ? 'Change image' : 'Upload image'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              event.target.value = '';
                              if (!file) return;
                              try {
                                const url = await uploadTopBarImage(file);
                                if (!url) return;
                                const customItems = normalizeBnplTopBar(form.bnplTopBar).customItems.map((entry) => (
                                  entry.id === item.id ? { ...entry, imageUrl: url } : entry
                                ));
                                await persistBnplTopBar({ customItems }, 'Top bar image updated');
                              } catch (error) {
                                toast.error(error?.message || 'Failed to upload image');
                              }
                            }}
                          />
                        </label>
                        <input
                          value={item.text}
                          placeholder="English text"
                          onChange={(event) => {
                            const customItems = normalizeBnplTopBar(form.bnplTopBar).customItems.map((entry) => (
                              entry.id === item.id ? { ...entry, text: event.target.value } : entry
                            ));
                            setForm((prev) => ({
                              ...prev,
                              bnplTopBar: { ...normalizeBnplTopBar(prev.bnplTopBar), customItems },
                            }));
                          }}
                          onBlur={() => persistBnplTopBar({ customItems: normalizeBnplTopBar(form.bnplTopBar).customItems }, 'Top bar text updated')}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => translateTopBarEnglish(
                              item.text,
                              `topbar-item-${item.id}`,
                              (arabic) => {
                                const customItems = normalizeBnplTopBar(form.bnplTopBar).customItems.map((entry) => (
                                  entry.id === item.id ? { ...entry, textAr: arabic } : entry
                                ));
                                return persistBnplTopBar({ customItems }, 'Top bar Arabic text updated');
                              },
                            )}
                            disabled={translatingKey === `topbar-item-${item.id}` || !String(item.text || '').trim()}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {translatingKey === `topbar-item-${item.id}` ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                            {translatingKey === `topbar-item-${item.id}` ? 'Translating...' : 'Translate'}
                          </button>
                        </div>
                        <input
                          dir="rtl"
                          value={item.textAr}
                          placeholder="Arabic text"
                          onChange={(event) => {
                            const customItems = normalizeBnplTopBar(form.bnplTopBar).customItems.map((entry) => (
                              entry.id === item.id ? { ...entry, textAr: event.target.value } : entry
                            ));
                            setForm((prev) => ({
                              ...prev,
                              bnplTopBar: { ...normalizeBnplTopBar(prev.bnplTopBar), customItems },
                            }));
                          }}
                          onBlur={() => persistBnplTopBar({ customItems: normalizeBnplTopBar(form.bnplTopBar).customItems }, 'Top bar Arabic text updated')}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          ) : null}

          {settingsSection === 'layout' ? (
          <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <label className="block min-w-0 flex-1 space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  {previewDevice === 'mobile'
                    ? `Mobile item gap (${navbarLayout.mobileItemGap}px)`
                    : `Item gap (${navbarLayout.itemGap}px)`}
                </span>
                <input
                  type="range"
                  min="0"
                  max={previewDevice === 'mobile' ? '24' : '48'}
                  step="1"
                  className="w-full accent-indigo-600"
                  value={previewDevice === 'mobile' ? navbarLayout.mobileItemGap : navbarLayout.itemGap}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setNavbarLayout((prev) => (
                      previewDevice === 'mobile'
                        ? { ...prev, mobileItemGap: next }
                        : { ...prev, itemGap: next }
                    ));
                  }}
                />
                <span className="text-[11px] text-slate-500">
                  {previewDevice === 'mobile'
                    ? 'Space between menu, logo, search, and icons on the phone navbar.'
                    : 'Space between logo, buttons, search, and icons in the navbar.'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setNavbarLayout((prev) => (
                  previewDevice === 'mobile'
                    ? { ...prev, mobileItemGap: DEFAULT_NAVBAR_LAYOUT.mobileItemGap }
                    : { ...prev, itemGap: DEFAULT_NAVBAR_LAYOUT.itemGap }
                ))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset gap
              </button>
            </div>
          </div>

          <NavbarItemArrange
            layout={navbarLayout}
            visibility={form.navActionsVisibility}
            onChange={(itemOrder) => applyNavbarLayoutChange((prev) => ({ ...prev, itemOrder }))}
            onAlignChange={(itemId, align) => applyNavbarLayoutChange((prev) => ({
              ...prev,
              itemAlign: { ...(prev.itemAlign || {}), [itemId]: align },
              ...(itemId === 'search'
                ? { searchAlign: align === 'right' ? 'right' : align === 'left' ? 'left' : 'fill' }
                : {}),
            }))}
            onReset={() => applyNavbarLayoutChange((prev) => ({
              ...prev,
              itemOrder: defaultNavbarItemOrder(prev.extraButtons),
              itemAlign: defaultNavbarItemAlign(prev.extraButtons),
              searchAlign: DEFAULT_NAVBAR_LAYOUT.searchAlign,
            }))}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Show category bar</p>
                <p className="text-xs text-slate-500">The black bar under the navbar with Baby, Clothing, Electronics, and the other category names.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form.navMenuEnabled}
                  onChange={(e) => setForm((prev) => ({ ...prev, navMenuEnabled: e.target.checked }))}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel('menu')}
              className="mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
            >
              Auto-fill parent categories or add links on Menu links
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Show or hide icons</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {actionToggles.map(({ key, label, icon: Icon }) => {
                  const checked = form.navActionsVisibility[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={async () => {
                        const nextVisibility = {
                          ...form.navActionsVisibility,
                          [key]: !checked,
                        };
                        setForm((prev) => ({
                          ...prev,
                          navActionsVisibility: nextVisibility,
                        }));
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        checked
                          ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon size={16} className={checked ? 'text-indigo-600' : 'text-slate-400'} />
                      <p className="mt-2 text-sm font-semibold text-slate-900">{label}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-slate-900">Navbar phone</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Short number and Toll-free label shown in the storefront navbar. Full number is used when a customer taps to call.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-slate-700">Phone number</span>
                    <input
                      type="tel"
                      dir="ltr"
                      value={form.navbarPhone?.number || ''}
                      onChange={(event) => {
                        setForm((prev) => ({
                          ...prev,
                          navbarPhone: {
                            ...normalizeNavbarPhone(prev.navbarPhone),
                            number: event.target.value.replace(/\D/g, ''),
                          },
                        }));
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                      placeholder="8007861920"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-slate-700">Short display</span>
                    <input
                      type="text"
                      dir="ltr"
                      value={form.navbarPhone?.shortText || ''}
                      onChange={(event) => {
                        setForm((prev) => ({
                          ...prev,
                          navbarPhone: {
                            ...normalizeNavbarPhone(prev.navbarPhone),
                            shortText: event.target.value,
                          },
                        }));
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                      placeholder="800"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-slate-700">Label</span>
                    <input
                      type="text"
                      value={form.navbarPhone?.label || ''}
                      onChange={(event) => {
                        setForm((prev) => ({
                          ...prev,
                          navbarPhone: {
                            ...normalizeNavbarPhone(prev.navbarPhone),
                            label: event.target.value,
                          },
                        }));
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                      placeholder="Toll-free"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-slate-700">Arabic label</span>
                    <input
                      type="text"
                      dir="rtl"
                      value={form.navbarPhone?.labelAr || ''}
                      onChange={(event) => {
                        setForm((prev) => ({
                          ...prev,
                          navbarPhone: {
                            ...normalizeNavbarPhone(prev.navbarPhone),
                            labelAr: event.target.value,
                          },
                        }));
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                      placeholder="مجاني"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-slate-900">Navbar language</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Choose the flag shown next to EN / AR, or upload a custom icon to replace it.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white">
                    {form.navbarLanguage?.iconUrl ? (
                      <img
                        src={form.navbarLanguage.iconUrl}
                        alt="Language icon"
                        className="h-6 w-6 rounded-sm object-contain"
                      />
                    ) : (
                      <span className="text-base leading-none">
                        {resolveNavbarLanguageTrigger(form.navbarLanguage).flag}
                      </span>
                    )}
                    <span>EN</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {form.navbarLanguage?.iconUrl ? 'Custom icon is active' : 'Live preview'}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-slate-700">Flag</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[{ code: 'auto', label: 'Follow market', flag: '🌐' }, ...GCC_MARKETS.map((market) => ({
                      code: market.code,
                      label: market.code,
                      flag: market.flag,
                    }))].map((option) => {
                      const selected = (form.navbarLanguage?.flagCode || 'auto') === option.code;
                      return (
                        <button
                          key={option.code}
                          type="button"
                          onClick={async () => {
                            try {
                              await persistNavbarLanguage({
                                ...form.navbarLanguage,
                                flagCode: option.code,
                              });
                            } catch (error) {
                              toast.error(error?.message || 'Failed to save language flag');
                            }
                          }}
                          className={`rounded-lg border px-2 py-2 text-left transition ${
                            selected
                              ? 'border-indigo-300 bg-white ring-2 ring-indigo-200'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="text-base leading-none">{option.flag}</span>
                          <p className="mt-1 text-[11px] font-semibold text-slate-800">{option.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-slate-700">Custom icon</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          void uploadLanguageIcon(file);
                        }}
                      />
                      {uploadingLanguageIcon ? 'Uploading…' : 'Upload icon'}
                    </label>
                    {form.navbarLanguage?.iconUrl ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await persistNavbarLanguage({
                              ...form.navbarLanguage,
                              iconUrl: '',
                            });
                          } catch (error) {
                            toast.error(error?.message || 'Failed to remove language icon');
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Remove icon
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
          ) : null}

          {settingsSection === 'logo' ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Palette size={16} className="text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-900">Logo and navbar color</h2>
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Upload a PNG or WebP with a transparent background. Transparent areas show the navbar color
                (not black). Avoid JPEG for logos — JPEG fills empty areas with black.
              </p>

              <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div
                  className="relative flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 p-3"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <img
                    src={String(navbarBranding.logoUrl || '').trim() || STORE1920_LOGO_PATH}
                    alt="Navbar logo preview"
                    className="max-h-16 max-w-full object-contain"
                  />
                  {!String(navbarBranding.logoUrl || '').trim() ? (
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Default logo
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    {String(navbarBranding.logoUrl || '').trim()
                      ? 'Custom logo is saved and used on the live site.'
                      : 'No custom logo uploaded yet. The live site uses the default Store1920 logo until you upload one.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      {uploadingNavbarLogo ? 'Uploading...' : 'Upload logo'}
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg,image/*"
                        className="hidden"
                        disabled={uploadingNavbarLogo}
                        onChange={(event) => uploadNavbarLogo(event.target.files?.[0])}
                      />
                    </label>
                    {navbarBranding.logoUrl || pendingClearLogo ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNavbarBranding((prev) => ({ ...prev, logoUrl: '' }));
                          setPendingClearLogo(true);
                        }}
                        className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Use default
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">Logo width</span>
                      <input
                        type="number"
                        min={20}
                        max={400}
                        value={navbarBranding.logoWidth}
                        onChange={(e) => setNavbarBranding((prev) => ({ ...prev, logoWidth: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">Logo height</span>
                      <input
                        type="number"
                        min={10}
                        max={200}
                        value={navbarBranding.logoHeight}
                        onChange={(e) => setNavbarBranding((prev) => ({ ...prev, logoHeight: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-slate-600">Main navbar color</span>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5">
                      <input
                        type="color"
                        value={navbarBranding.backgroundColor}
                        onChange={(e) => setNavbarBranding((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={navbarBranding.backgroundColor}
                        onChange={(e) => setNavbarBranding((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none"
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {settingsSection === 'buttons' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">Buttons next to LAST CHANCE</h2>
            <p className="mt-1 text-xs text-slate-500">
              Add extra text buttons after LAST CHANCE and before search. Up to 3 buttons. To rename the Categories dropdown, open the Categories tab.
            </p>
            <div className="mt-4 space-y-3">
              {navbarLayout.extraButtons.map((button, index) => (
                <div key={button.id || index} className="overflow-visible rounded-xl border border-slate-200 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">Text (English)</span>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={button.label}
                        onChange={(event) => setNavbarLayout((prev) => ({
                          ...prev,
                          extraButtons: prev.extraButtons.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, label: event.target.value } : item
                          )),
                        }))}
                        placeholder="New Arrivals"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                        Text (Arabic)
                        <button
                          type="button"
                          onClick={() => translateExtraButtonToArabic(index)}
                          disabled={translatingKey === `button-${index}` || !String(button.label || '').trim()}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {translatingKey === `button-${index}` ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                          {translatingKey === `button-${index}` ? 'Translating...' : 'Translate'}
                        </button>
                      </span>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        dir="rtl"
                        value={button.labelAr}
                        onChange={(event) => setNavbarLayout((prev) => ({
                          ...prev,
                          extraButtons: prev.extraButtons.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, labelAr: event.target.value } : item
                          )),
                        }))}
                        placeholder="وصل حديثاً"
                      />
                    </label>
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-xs font-medium text-slate-600">Link</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <StoreDropdown
                          value={readLinkChoice(button.link).type}
                          onChange={(type) => updateExtraButtonLink(index, type, '')}
                          options={LINK_TYPE_OPTIONS}
                          placeholder="Select link type"
                        />

                        {readLinkChoice(button.link).type === 'category' ? (
                          <StoreDropdown
                            searchable
                            value={readLinkChoice(button.link).value}
                            onChange={(value) => updateExtraButtonLink(index, 'category', value)}
                            options={categoryOptions.map((category) => ({
                              value: category?.slug || category?._id || '',
                              label: category?.name || category?.slug || category?._id || 'Category',
                            }))}
                            placeholder="Select category"
                            searchPlaceholder="Search categories"
                          />
                        ) : null}

                        {readLinkChoice(button.link).type === 'product' ? (
                          <StoreDropdown
                            searchable
                            value={readLinkChoice(button.link).value}
                            onChange={(value) => updateExtraButtonLink(index, 'product', value)}
                            options={productOptions.map((product) => ({
                              value: product?.slug || product?._id || '',
                              label: product?.name || product?.slug || product?._id || 'Product',
                            }))}
                            placeholder="Select product"
                            searchPlaceholder="Search products"
                          />
                        ) : null}

                        {readLinkChoice(button.link).type === 'page' ? (
                          <StoreDropdown
                            searchable
                            value={readLinkChoice(button.link).value}
                            onChange={(value) => updateExtraButtonLink(index, 'page', value)}
                            options={EXISTING_PAGE_OPTIONS}
                            placeholder="Select page"
                            searchPlaceholder="Search pages"
                          />
                        ) : null}

                        {readLinkChoice(button.link).type === 'custom' ? (
                          <input
                            type="text"
                            value={readLinkChoice(button.link).value}
                            onChange={(event) => updateExtraButtonLink(index, 'custom', event.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder="https://example.com or /custom-page"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={button.enabled !== false}
                        onChange={(event) => setNavbarLayout((prev) => ({
                          ...prev,
                          extraButtons: prev.extraButtons.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, enabled: event.target.checked } : item
                          )),
                        }))}
                      />
                      Show on website
                    </label>
                    <button
                      type="button"
                      onClick={() => setNavbarLayout((prev) => {
                        const extraButtons = prev.extraButtons.filter((_, itemIndex) => itemIndex !== index);
                        return {
                          ...prev,
                          extraButtons,
                          itemOrder: normalizeNavbarItemOrder(prev.itemOrder, extraButtons),
                        };
                      })}
                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                  <ExtraButtonStyleEditor
                    style={button.style}
                    fallbackStyle={DEFAULT_OFFERS_NAV_STYLE}
                    previewLabel={button.label || 'Button preview'}
                    lockTypography={navbarLayout.unifyNavbarText === true}
                    onChange={(patch) => setNavbarLayout((prev) => ({
                      ...prev,
                      extraButtons: prev.extraButtons.map((item, itemIndex) => (
                        itemIndex === index
                          ? { ...item, style: { ...(item.style || {}), ...patch } }
                          : item
                      )),
                    }))}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={navbarLayout.extraButtons.length >= 3}
              onClick={() => setNavbarLayout((prev) => {
                const extraButtons = [...prev.extraButtons, createNavbarExtraButton()];
                return {
                  ...prev,
                  extraButtons,
                  itemOrder: normalizeNavbarItemOrder(prev.itemOrder, extraButtons),
                };
              })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              Add button
            </button>
          </div>
          ) : null}

          {settingsSection === 'layout' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Sticky header</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Keep the desktop navbar on screen while customers scroll. Turn off to let it scroll away.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={navbarLayout.stickyHeader === true}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, stickyHeader: event.target.checked }))}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          </div>
          ) : null}

          {settingsSection === 'categories' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Categories button</h2>
                <p className="mt-1 text-xs text-slate-500">
                  This is the Categories dropdown next to search. Change the name to any text or capitalization, then Save. Examples: CATEGORIES, Shop, or All Departments.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={navbarLayout.showCategoriesButton !== false}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, showCategoriesButton: event.target.checked }))}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
            <div className="sticky top-3 z-20 mt-4 rounded-xl bg-white/95 pb-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <CategoriesButtonPreview
                style={navbarLayout.categoriesButtonStyle}
                label={navbarLayout.categoriesButtonLabel || 'Categories'}
                backgroundColor={navbarBranding.backgroundColor || defaultNavbarBranding.backgroundColor}
              />
            </div>
            <div className={`mt-4 grid gap-4 md:grid-cols-2 ${navbarLayout.showCategoriesButton === false ? 'opacity-50' : ''}`}>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Button name (English)</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={navbarLayout.categoriesButtonLabel}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, categoriesButtonLabel: event.target.value }))}
                  placeholder="Categories"
                  disabled={navbarLayout.showCategoriesButton === false}
                />
                <span className="block text-[11px] text-slate-500">
                  Type exactly how it should appear, including capital letters. This name shows on desktop and mobile.
                </span>
              </label>
              <label className="block space-y-1">
                <span className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                  Button text (Arabic)
                  <button
                    type="button"
                    onClick={translateCategoriesButtonToArabic}
                    disabled={translatingKey === 'categories' || !String(navbarLayout.categoriesButtonLabel || '').trim() || navbarLayout.showCategoriesButton === false}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {translatingKey === 'categories' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                    {translatingKey === 'categories' ? 'Translating...' : 'Translate'}
                  </button>
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  dir="rtl"
                  value={navbarLayout.categoriesButtonLabelAr}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, categoriesButtonLabelAr: event.target.value }))}
                  placeholder="الفئات"
                  disabled={navbarLayout.showCategoriesButton === false}
                />
              </label>
            </div>
            <ExtraButtonStyleEditor
              style={navbarLayout.categoriesButtonStyle}
              previewLabel={navbarLayout.categoriesButtonLabel || 'Categories'}
              previewKind="categories"
              disabled={navbarLayout.showCategoriesButton === false}
              lockTypography={navbarLayout.unifyNavbarText === true}
              onChange={(patch) => setNavbarLayout((prev) => ({
                ...prev,
                categoriesButtonStyle: {
                  ...(prev.categoriesButtonStyle || {}),
                  ...patch,
                },
              }))}
            />
          </div>
          ) : null}

          {settingsSection === 'search' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">Search</h2>
            <p className="mt-1 text-xs text-slate-500">
              Align, width, placeholder, and space after the logo.
            </p>
            <div className="sticky top-3 z-20 mt-4 rounded-xl bg-white/95 pb-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <SearchFieldPreview
                searchStyle={navbarLayout.searchStyle}
                placeholder={navbarLayout.searchPlaceholder || 'Wireless Headphones'}
                maxWidth={navbarLayout.searchMaxWidth}
                backgroundColor={navbarBranding.backgroundColor || defaultNavbarBranding.backgroundColor}
              />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Search placeholder (English)</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={navbarLayout.searchPlaceholder}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, searchPlaceholder: event.target.value }))}
                  placeholder="Wireless Headphones"
                />
              </label>
              <label className="block space-y-1">
                <span className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                  Search placeholder (Arabic)
                  <button
                    type="button"
                    onClick={translateSearchPlaceholderToArabic}
                    disabled={translatingKey === 'search' || !String(navbarLayout.searchPlaceholder || '').trim()}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {translatingKey === 'search' ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                    {translatingKey === 'search' ? 'Translating...' : 'Translate'}
                  </button>
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  dir="rtl"
                  value={navbarLayout.searchPlaceholderAr}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, searchPlaceholderAr: event.target.value }))}
                  placeholder="سماعات لاسلكية"
                />
              </label>
            </div>
            <ExtraButtonStyleEditor
              style={navbarLayout.searchStyle}
              fallbackStyle={DEFAULT_SEARCH_STYLE}
              previewLabel={navbarLayout.searchPlaceholder || 'Wireless Headphones'}
              hideAnimation
              hideWidth
              previewKind="search"
              lockTypography={navbarLayout.unifyNavbarText === true}
              onChange={(patch) => setNavbarLayout((prev) => ({
                ...prev,
                searchStyle: {
                  ...(prev.searchStyle || DEFAULT_SEARCH_STYLE),
                  ...patch,
                },
              }))}
            />
            <div className="mt-4 space-y-3">
              <div>
                <span className="text-xs font-medium text-slate-600">Search align</span>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Right packs search beside account and cart. Default keeps the leftover stretch.
                </p>
                <div className="mt-2 inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {SEARCH_ALIGN_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => applyNavbarLayoutChange((prev) => ({
                        ...prev,
                        searchAlign: option.id,
                        itemAlign: {
                          ...(prev.itemAlign || {}),
                          search: option.id === 'right' ? 'right' : option.id === 'left' ? 'left' : 'default',
                        },
                      }))}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                        navbarLayout.searchAlign === option.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Search max width ({navbarLayout.searchMaxWidth}px)</span>
                <input
                  type="range"
                  min="320"
                  max="900"
                  step="10"
                  className="w-full accent-indigo-600"
                  value={navbarLayout.searchMaxWidth}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, searchMaxWidth: Number(event.target.value) }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Navbar max width ({navbarLayout.navbarMaxWidth}px)</span>
                <input
                  type="range"
                  min="1100"
                  max="1400"
                  step="20"
                  className="w-full accent-indigo-600"
                  value={navbarLayout.navbarMaxWidth}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, navbarMaxWidth: Number(event.target.value) }))}
                />
                <span className="text-[11px] text-slate-500">Default limit is 1400px. Search width does not change this.</span>
              </label>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="block min-w-0 flex-1 space-y-1">
                  <span className="text-xs font-medium text-slate-600">Item gap ({navbarLayout.itemGap}px)</span>
                  <input
                    type="range"
                    min="0"
                    max="48"
                    step="1"
                    className="w-full accent-indigo-600"
                    value={navbarLayout.itemGap}
                    onChange={(event) => setNavbarLayout((prev) => ({ ...prev, itemGap: Number(event.target.value) }))}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setNavbarLayout((prev) => ({ ...prev, itemGap: DEFAULT_NAVBAR_LAYOUT.itemGap }))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset gap
                </button>
              </div>
              <label className="block space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-600">Space after logo ({navbarLayout.logoGap}px)</span>
                <p className="text-[11px] text-slate-500">Adds extra space after the logo, before Under 99 and the other items.</p>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  className="w-full accent-indigo-600"
                  value={navbarLayout.logoGap}
                  onChange={(event) => setNavbarLayout((prev) => ({ ...prev, logoGap: Number(event.target.value) }))}
                />
              </label>
            </div>
          </div>
          ) : null}
        </div>
      ) : null}

      {activePanel === 'menu' ? (
      <div className="space-y-5">
        <div className="overflow-visible rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Eye size={14} />
              Navbar preview
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  previewDevice === 'desktop'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Monitor size={13} />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  previewDevice === 'mobile'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone size={13} />
                Mobile
              </button>
            </div>
          </div>
          <div className="overflow-visible p-4 sm:p-5">
            <NavbarPreview
              backgroundColor={navbarBranding.backgroundColor || defaultNavbarBranding.backgroundColor}
              logoUrl={navbarBranding.logoUrl}
              logoWidth={navbarBranding.logoWidth}
              logoHeight={navbarBranding.logoHeight}
              navMenuEnabled={form.navMenuEnabled}
              navMenuItems={previewMenuItems}
              navMenuUseParentCategories={form.navMenuUseParentCategories}
              navMenuHoverDropdown={form.navMenuHoverDropdown !== false}
              bnplTopBar={form.bnplTopBar}
              categoryOptions={categoryOptions}
              navActionsVisibility={form.navActionsVisibility}
              navbarPhone={form.navbarPhone}
              navbarLanguage={form.navbarLanguage}
              userName={user?.displayName || user?.email?.split('@')[0] || 'store1920'}
              searchPlaceholder={navbarLayout.searchPlaceholder || 'Coffee Maker'}
              extraButtons={navbarLayout.extraButtons}
              searchMaxWidth={navbarLayout.searchMaxWidth}
              searchAlign={navbarLayout.searchAlign}
              searchStyle={navbarLayout.searchStyle}
              navbarMaxWidth={navbarLayout.navbarMaxWidth}
              showCategoriesButton={navbarLayout.showCategoriesButton}
              categoriesButtonLabel={navbarLayout.categoriesButtonLabel}
              categoriesButtonStyle={navbarLayout.categoriesButtonStyle}
              itemOrder={navbarLayout.itemOrder}
              itemAlign={navbarLayout.itemAlign}
              itemGap={navbarLayout.itemGap}
              logoGap={navbarLayout.logoGap}
              mobileItemGap={navbarLayout.mobileItemGap}
              device={previewDevice}
              menuBarBackgroundColor={form.navMenuStyle?.categoryBarBackgroundColor || '#000000'}
              showBottomBorder={Boolean(form.navMenuStyle?.showBottomBorder)}
              bottomBorderWidth={form.navMenuStyle?.bottomBorderWidth || 2}
              bottomBorderColor={form.navMenuStyle?.bottomBorderColor || '#e2e8f0'}
              unifyNavbarText={navbarLayout.unifyNavbarText}
              unifiedTextFontFamily={navbarLayout.unifiedTextFontFamily}
              unifiedTextFontSize={navbarLayout.unifiedTextFontSize}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Show top bar</p>
              <p className="text-xs text-slate-500">
                The Tamara / Tabby strip above the navbar. Open Look → Top bar to edit text or enable Tabby.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={form.bnplTopBar?.enabled !== false}
                onChange={(event) => persistBnplTopBar(
                  { enabled: event.target.checked },
                  event.target.checked ? 'Top bar shown' : 'Top bar hidden',
                )}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className={`mt-4 grid gap-2 sm:grid-cols-2 ${form.bnplTopBar?.enabled !== false ? '' : 'pointer-events-none opacity-50'}`}>
            {BNPL_PARTNER_DEFS.map((partner) => {
              const partnerEnabled = Boolean(form.bnplTopBar?.[partner.enabledKey]);
              return (
                <button
                  key={partner.key}
                  type="button"
                  onClick={() => persistBnplTopBar(
                    { [partner.enabledKey]: !partnerEnabled },
                    !partnerEnabled ? `${partner.name} shown` : `${partner.name} hidden`,
                  )}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                    partnerEnabled
                      ? 'border-indigo-200 bg-indigo-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <img src={partner.logoUrl} alt="" className="h-4 w-auto" />
                    {partner.name}
                  </span>
                  <span className={`text-xs font-medium ${partnerEnabled ? 'text-indigo-700' : 'text-slate-400'}`}>
                    {partnerEnabled ? 'On' : 'Off'}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setActivePanel('settings');
              setSettingsSection('topbar');
            }}
            className="mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
          >
            Edit top bar text
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Show category bar</p>
              <p className="text-xs text-slate-500">
                Turn this off to hide the black category names bar under the navbar.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={form.navMenuEnabled}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, navMenuEnabled: event.target.checked }));
                }}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>

        <div className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${form.navMenuEnabled ? '' : 'pointer-events-none opacity-50'}`}>
          <div>
            <p className="text-sm font-semibold text-slate-900">Category bar links</p>
            <p className="text-xs text-slate-500">
              Auto-fill every parent category, or pick and add links yourself. Changes apply to the storefront.
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCategoryBarSource(true)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                form.navMenuUseParentCategories
                  ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">Auto parent categories</p>
              <p className="mt-1 text-xs text-slate-500">
                Show every top-level category that has children.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setCategoryBarSource(false)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                !form.navMenuUseParentCategories
                  ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">Choose manually</p>
              <p className="mt-1 text-xs text-slate-500">
                Pick categories, hide some, or add your own links.
              </p>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Auto hover dropdown</p>
              <p className="mt-1 text-xs text-slate-500">
                Show subcategories when shoppers hover a parent name. Categories with their own children open a nested submenu.
              </p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={form.navMenuHoverDropdown !== false}
                onChange={(event) => setHoverDropdown(event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          {form.navMenuUseParentCategories ? (
            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
                {parentCategoryPreview.length} parent categories
              </p>
              <p className="mt-1 text-xs text-indigo-900/80">
                These names appear on the category bar automatically.
                {form.navMenuHoverDropdown !== false
                  ? ' Hover a name on the storefront to open its subcategories.'
                  : ''}
              </p>
              {parentCategoryPreview.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {parentCategoryPreview.map((category) => {
                    const childCount = getDirectChildCategories(categoryOptions, category).length;
                    return (
                      <span
                        key={category._id || category.slug || category.name}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-indigo-100"
                      >
                        {getCategoryDisplayName(category)}
                        {childCount ? (
                          <span className="ms-1 text-slate-400">{childCount}</span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-indigo-900">
                  No parent categories found. Add categories under Store → Categories first.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Parent categories
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Click to show or hide. Selected names stay on the bar.
                </p>
                {parentCategoryPreview.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {parentCategoryPreview.map((category) => {
                      const selected = isParentCategorySelected(category);
                      const childCount = getDirectChildCategories(categoryOptions, category).length;
                      return (
                        <button
                          key={category._id || category.slug || category.name}
                          type="button"
                          onClick={() => toggleParentCategoryChip(category)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                            selected
                              ? 'bg-white text-slate-700 ring-indigo-100'
                              : 'bg-slate-100 text-slate-400 ring-slate-200 line-through'
                          }`}
                        >
                          {getCategoryDisplayName(category)}
                          {childCount ? (
                            <span className="ms-1 opacity-60">{childCount}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    No parent categories found. Add categories under Store → Categories first.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Add a category
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={addCategoryKey}
                    onChange={(event) => setAddCategoryKey(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select a category</option>
                    {addableCategories.map((category) => {
                      const value = getCategoryRecordId(category) || String(category?.slug || '');
                      return (
                        <option key={value} value={value}>
                          {getCategoryDisplayName(category)}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={addCategoryToBar}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Add a custom link
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Add it on the bar, place it under a row, or drag the chip onto any hover menu.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr]">
                  <input
                    type="text"
                    value={customBarLinkName}
                    onChange={(event) => setCustomBarLinkName(event.target.value)}
                    placeholder="Name, e.g. New arrivals"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={customBarLinkUrl}
                    onChange={(event) => setCustomBarLinkUrl(event.target.value)}
                    placeholder="/new-arrivals or https://..."
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={customBarLinkParent}
                    onChange={(event) => setCustomBarLinkParent(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="bar">On the bar</option>
                    {form.navMenuItems.map((item, index) => (
                      <option key={`${item.name || 'row'}-${index}`} value={String(index)}>
                        Under {item.name || `Item ${index + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addCustomBarLink}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    <Plus size={14} />
                    Add link
                  </button>
                </div>
                {customBarLinkName.trim() && customBarLinkUrl.trim() ? (
                  <button
                    type="button"
                    draggable
                    onDragStart={() => setPendingCustomDrag(true)}
                    onDragEnd={() => setPendingCustomDrag(false)}
                    className={`mt-2 inline-flex cursor-grab items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 active:cursor-grabbing ${
                      pendingCustomDrag
                        ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                        : 'bg-white text-slate-700 ring-slate-200'
                    }`}
                  >
                    <GripVertical size={12} />
                    {customBarLinkName.trim()} — drag onto a row
                  </button>
                ) : null}
              </div>

              {form.navMenuItems.length ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      On the bar now
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Drag a row to change order. Drag a custom link or hover item onto any row to place it under that name.
                    </p>
                  </div>
                  {form.navMenuItems.map((item, index) => {
                    const subLinks = getItemSubLinks(item);
                    const addableSubs = getAddableSubCategories(item);
                    const customItem = isCustomBarItem(item);
                    const acceptHoverDrop = Boolean(
                      pendingCustomDrag
                      || nestedDrag
                      || (dragIndex != null && dragIndex !== index && isCustomBarItem(form.navMenuItems[dragIndex])),
                    );
                    const rowReorderActive = dropIndex === index && dragIndex !== null && dragIndex !== index && !acceptHoverDrop;
                    const hoverDropActive = dropIndex === index && acceptHoverDrop;
                    const draft = customLinkDrafts[index] || { name: '', url: '' };
                    return (
                      <div
                        key={`${item.categoryId || item.slug || item.name || 'item'}-${index}`}
                        className={`rounded-xl border bg-white transition ${
                          rowReorderActive
                            ? 'border-indigo-300 ring-2 ring-indigo-100'
                            : hoverDropActive
                              ? 'border-indigo-400 ring-2 ring-indigo-200'
                              : 'border-slate-200'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2 px-3 py-2.5"
                          onDragOver={(event) => {
                            if (acceptHoverDrop) return;
                            event.preventDefault();
                            setDropIndex(index);
                          }}
                          onDrop={(event) => {
                            if (acceptHoverDrop) return;
                            event.preventDefault();
                            dropManualBarItem(index);
                          }}
                        >
                          <button
                            type="button"
                            draggable
                            onDragStart={() => setDragIndex(index)}
                            onDragEnd={() => {
                              setDragIndex(null);
                              setDropIndex(null);
                            }}
                            className="inline-flex cursor-grab items-center rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-500 active:cursor-grabbing"
                            title="Drag to reorder the bar"
                          >
                            <GripVertical size={14} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {item.name || `Item ${index + 1}`}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              {customItem ? item.link || 'Custom link' : `${subLinks.length} hover items`}
                            </p>
                          </div>
                          <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline">
                            {customItem ? 'Custom' : 'Category'}
                          </span>
                          <button
                            type="button"
                            onClick={() => moveManualBarItem(index, -1)}
                            disabled={index === 0}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 disabled:opacity-40"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveManualBarItem(index, 1)}
                            disabled={index === form.navMenuItems.length - 1}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 disabled:opacity-40"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => removeManualBarItem(index)}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>

                        <div
                          className={`space-y-2 border-t px-3 py-3 ${
                            hoverDropActive ? 'border-indigo-200 bg-indigo-50/70' : 'border-slate-100'
                          }`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDropIndex(index);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            dropOnHoverZone(index);
                          }}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {hoverDropActive ? 'Drop here to add under this name' : 'Hover menu'}
                          </p>
                          {subLinks.length ? (
                            <div className="space-y-1.5">
                              {subLinks.map((sub, subIndex) => (
                                <div
                                  key={`${sub.categoryId || sub.slug || sub.name || 'sub'}-${subIndex}`}
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    setNestedDrag({ itemIndex: index, subIndex });
                                  }}
                                  onDragEnd={() => {
                                    setNestedDrag(null);
                                    setNestedDrop(null);
                                  }}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onDragEnter={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setNestedDrop({ itemIndex: index, subIndex });
                                  }}
                                  onDrop={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    dropBarSubItem(index, subIndex);
                                  }}
                                  className={`flex cursor-grab items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 active:cursor-grabbing ${
                                    nestedDrop?.itemIndex === index && nestedDrop?.subIndex === subIndex
                                      ? 'border-indigo-300 ring-1 ring-indigo-200'
                                      : 'border-slate-200'
                                  }`}
                                >
                                  <GripVertical size={13} className="shrink-0 text-slate-400" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-700">{sub.name}</p>
                                    {sub.link ? (
                                      <p className="truncate text-[11px] text-slate-400">{sub.link}</p>
                                    ) : null}
                                  </div>
                                  {Array.isArray(sub.children) && sub.children.length ? (
                                    <span className="text-[11px] text-slate-400">{sub.children.length}</span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => removeSubFromBarItem(index, subIndex)}
                                    className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    title="Remove from hover menu"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
                              Drop a custom link here, or add a subcategory below.
                            </p>
                          )}
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <select
                              value={addSubKeys[index] || ''}
                              onChange={(event) => setAddSubKeys((prev) => ({
                                ...prev,
                                [index]: event.target.value,
                              }))}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="">Select a subcategory</option>
                              {addableSubs.map((category) => {
                                const value = getCategoryRecordId(category) || String(category?.slug || '');
                                return (
                                  <option key={value} value={value}>
                                    {getCategoryDisplayName(category)}
                                  </option>
                                );
                              })}
                            </select>
                            <button
                              type="button"
                              onClick={() => addSubToBarItem(index)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              <Plus size={14} />
                              Add sub
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <input
                              type="text"
                              value={draft.name}
                              onChange={(event) => setCustomLinkDrafts((prev) => ({
                                ...prev,
                                [index]: { ...draft, name: event.target.value },
                              }))}
                              placeholder="Custom name"
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              value={draft.url}
                              onChange={(event) => setCustomLinkDrafts((prev) => ({
                                ...prev,
                                [index]: { ...draft, url: event.target.value },
                              }))}
                              placeholder="/link or https://..."
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => addCustomSubToBarItem(index)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Plus size={14} />
                              Add link
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No links yet. Pick a parent category or add one above.
                </p>
              )}
            </div>
          )}
        </div>

        <div className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${form.navMenuEnabled ? '' : 'opacity-50'}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Category bar background</p>
              <p className="text-xs text-slate-500">Preview updates as you pick. Click Save to apply on the live site.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5">
              <input
                type="color"
                value={form.navMenuStyle?.categoryBarBackgroundColor || '#000000'}
                onChange={(e) => updateCategoryBarColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={form.navMenuStyle?.categoryBarBackgroundColor || '#000000'}
                onChange={(e) => updateCategoryBarColor(e.target.value)}
                className="w-28 border-0 bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Bottom border</p>
                <p className="text-xs text-slate-500">Add a line under the category bar. Preview updates as you pick. Click Save to apply on the live site.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={Boolean(form.navMenuStyle?.showBottomBorder)}
                  onChange={(event) => updateBottomBorder({ showBottomBorder: event.target.checked })}
                  className="sr-only peer"
                />
                <div className="relative h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-slate-900 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            {form.navMenuStyle?.showBottomBorder ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="w-24 shrink-0">Thickness</span>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={Number(form.navMenuStyle?.bottomBorderWidth) || 2}
                    onChange={(event) => updateBottomBorder({ bottomBorderWidth: Number(event.target.value) })}
                    className="h-1.5 w-36 accent-slate-900"
                  />
                  <span className="w-10 text-xs text-slate-500">{Number(form.navMenuStyle?.bottomBorderWidth) || 2}px</span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5">
                  <input
                    type="color"
                    value={form.navMenuStyle?.bottomBorderColor || '#e2e8f0'}
                    onChange={(event) => updateBottomBorder({ bottomBorderColor: event.target.value })}
                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={form.navMenuStyle?.bottomBorderColor || '#e2e8f0'}
                    onChange={(event) => updateBottomBorder({ bottomBorderColor: event.target.value })}
                    className="w-28 border-0 bg-transparent text-sm text-slate-700 outline-none"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

      {SHOW_MANUAL_NAV_EDITOR && !form.navMenuUseParentCategories ? (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Navigation items</p>
            <p className="text-xs text-slate-500">Plain links, Collections flyouts, or mega menus. Drag to reorder.</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, navMenuItems: [...prev.navMenuItems, createMenuItem()] }))}
            className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Add item
          </button>
        </div>

        <div className="p-4 sm:p-5">

        <div className="space-y-4">
          {form.navMenuItems.map((item, index) => (
            <div
              key={`item-${index}`}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDropIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null && dragIndex !== index) {
                  moveMenuItem(dragIndex, index);
                }
                setDragIndex(null);
                setDropIndex(null);
              }}
              className={`rounded-xl border bg-slate-50/80 p-4 transition ${dropIndex === index ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDropIndex(null);
                    }}
                    className="cursor-grab rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    Drag
                  </button>
                  <p className="text-sm font-semibold text-slate-800">Item {index + 1}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => removeMenuItem(index)}
                    className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  type="text"
                  value={item.name || ''}
                  onChange={(e) => updateMenuItem(index, (current) => ({ ...current, name: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Menu name (e.g., Gold, Collections)"
                />
                <select
                  value={readLinkChoice(item.link).type}
                  onChange={(e) => updateItemLinkChoice(index, e.target.value, readLinkChoice(item.link).value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="custom">Custom URL</option>
                  <option value="category">Category</option>
                  <option value="product">Product</option>
                  <option value="page">Existing page</option>
                </select>

                {readLinkChoice(item.link).type === 'category' ? (
                  <select
                    value={readLinkChoice(item.link).value}
                    onChange={(e) => updateItemLinkChoice(index, 'category', e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => {
                      const value = category?.slug || category?._id || '';
                      return (
                        <option key={category?._id || category?.slug || category?.name} value={value}>
                          {category?.name || value}
                        </option>
                      );
                    })}
                  </select>
                ) : null}

                {readLinkChoice(item.link).type === 'product' ? (
                  <select
                    value={readLinkChoice(item.link).value}
                    onChange={(e) => updateItemLinkChoice(index, 'product', e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select product</option>
                    {productOptions.map((product) => {
                      const value = product?.slug || product?._id || '';
                      return (
                        <option key={product?._id || product?.slug || product?.name} value={value}>
                          {product?.name || value}
                        </option>
                      );
                    })}
                  </select>
                ) : null}

                {readLinkChoice(item.link).type === 'page' ? (
                  <select
                    value={readLinkChoice(item.link).value}
                    onChange={(e) => updateItemLinkChoice(index, 'page', e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select page</option>
                    {EXISTING_PAGES.map((pagePath) => (
                      <option key={pagePath} value={pagePath}>
                        {pagePath}
                      </option>
                    ))}
                  </select>
                ) : null}

                {readLinkChoice(item.link).type === 'custom' ? (
                  <input
                    type="text"
                    value={readLinkChoice(item.link).value}
                    onChange={(e) => updateItemLinkChoice(index, 'custom', e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="https://example.com or /custom-page"
                  />
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(item.hasDropdown)}
                    onChange={(e) => updateMenuItem(index, (current) => ({ ...current, hasDropdown: e.target.checked }))}
                  />
                  Has dropdown
                </label>
                <div className="flex items-center gap-2 md:col-span-2">
                  <input
                    type="text"
                    value={item.icon || ''}
                    onChange={(e) => updateMenuItem(index, (current) => ({ ...current, icon: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Icon URL"
                  />
                  <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        uploadIconAndPersist(index, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mega Menu</p>
                    <p className="text-[11px] text-slate-500">Drag rows to reorder and set each link target type.</p>
                  </div>
                  <select
                    value={item?.megaMenu?.linkColumns || 1}
                    onChange={(e) =>
                      updateMenuItem(index, (current) => ({
                        ...current,
                        megaMenu: {
                          ...(current.megaMenu || {}),
                          linkColumns: Number(e.target.value),
                        },
                      }))
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium"
                  >
                    <option value={1}>1 column</option>
                    <option value={2}>2 columns</option>
                    <option value={3}>3 columns</option>
                  </select>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">Links</p>
                    {(item?.megaMenu?.links || []).map((linkItem, linkIndex) => (
                      <div
                        key={`link-${linkIndex}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          setNestedDrop({ menuIndex: index, key: 'links', itemIndex: linkIndex });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (
                            nestedDrag &&
                            nestedDrag.menuIndex === index &&
                            nestedDrag.key === 'links' &&
                            nestedDrag.itemIndex !== linkIndex
                          ) {
                            moveMegaArrayItem(index, 'links', nestedDrag.itemIndex, linkIndex);
                          }
                          setNestedDrag(null);
                          setNestedDrop(null);
                        }}
                        className={`grid gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,1.35fr)_auto] md:items-center ${
                          nestedDrop?.menuIndex === index &&
                          nestedDrop?.key === 'links' &&
                          nestedDrop?.itemIndex === linkIndex
                            ? 'bg-blue-50 ring-1 ring-blue-200'
                            : ''
                        }`}
                      >
                        <button
                          type="button"
                          draggable
                          onDragStart={() => setNestedDrag({ menuIndex: index, key: 'links', itemIndex: linkIndex })}
                          onDragEnd={() => {
                            setNestedDrag(null);
                            setNestedDrop(null);
                          }}
                          className="cursor-grab rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 active:cursor-grabbing"
                          title="Drag to reorder links"
                        >
                          Drag
                        </button>
                        <input
                          value={linkItem.name || ''}
                          onChange={(e) =>
                            updateMenuItem(index, (current) => {
                              const links = [...(current.megaMenu?.links || [])];
                              links[linkIndex] = { ...links[linkIndex], name: e.target.value };
                              return { ...current, megaMenu: { ...(current.megaMenu || {}), links } };
                            })
                          }
                          className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          placeholder="Label"
                        />
                        <select
                          value={readLinkChoice(linkItem.link).type}
                          onChange={(e) => updateMegaLinkChoice(index, linkIndex, e.target.value, readLinkChoice(linkItem.link).value)}
                          className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                        >
                          <option value="custom">Custom</option>
                          <option value="category">Category</option>
                          <option value="product">Product</option>
                          <option value="page">Page</option>
                        </select>
                        {readLinkChoice(linkItem.link).type === 'custom' ? (
                          <input
                            value={readLinkChoice(linkItem.link).value}
                            onChange={(e) => updateMegaLinkChoice(index, linkIndex, 'custom', e.target.value)}
                            className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="https://example.com or /custom-page"
                          />
                        ) : null}
                        {readLinkChoice(linkItem.link).type === 'category' ? (
                          <select
                            value={readLinkChoice(linkItem.link).value}
                            onChange={(e) => updateMegaLinkChoice(index, linkIndex, 'category', e.target.value)}
                            className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            <option value="">Select category</option>
                            {categoryOptions.map((category) => {
                              const value = category?.slug || category?._id || '';
                              return (
                                <option key={category?._id || category?.slug || category?.name} value={value}>
                                  {category?.name || value}
                                </option>
                              );
                            })}
                          </select>
                        ) : null}
                        {readLinkChoice(linkItem.link).type === 'product' ? (
                          <select
                            value={readLinkChoice(linkItem.link).value}
                            onChange={(e) => updateMegaLinkChoice(index, linkIndex, 'product', e.target.value)}
                            className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            <option value="">Select product</option>
                            {productOptions.map((product) => {
                              const value = product?.slug || product?._id || '';
                              return (
                                <option key={product?._id || product?.slug || product?.name} value={value}>
                                  {product?.name || value}
                                </option>
                              );
                            })}
                          </select>
                        ) : null}
                        {readLinkChoice(linkItem.link).type === 'page' ? (
                          <select
                            value={readLinkChoice(linkItem.link).value}
                            onChange={(e) => updateMegaLinkChoice(index, linkIndex, 'page', e.target.value)}
                            className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            <option value="">Select page</option>
                            {EXISTING_PAGES.map((pagePath) => (
                              <option key={pagePath} value={pagePath}>
                                {pagePath}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 md:justify-self-end"
                          onClick={() =>
                            updateMenuItem(index, (current) => ({
                              ...current,
                              megaMenu: {
                                ...(current.megaMenu || {}),
                                links: (current.megaMenu?.links || []).filter((_, idx) => idx !== linkIndex),
                              },
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      onClick={() =>
                        updateMenuItem(index, (current) => ({
                          ...current,
                          megaMenu: {
                            ...(current.megaMenu || {}),
                            links: [...(current.megaMenu?.links || []), { name: '', link: '#' }],
                          },
                        }))
                      }
                    >
                      Add link
                    </button>
                  </div>

                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">Featured images</p>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        onClick={() =>
                          updateMenuItem(index, (current) => ({
                            ...current,
                            megaMenu: {
                              ...(current.megaMenu || {}),
                              images: [...(current.megaMenu?.images || []), { url: '', label: '', link: '#' }],
                            },
                          }))
                        }
                      >
                        Add image
                      </button>
                    </div>
                    {(item?.megaMenu?.images || []).map((imageItem, imageIndex) => (
                      <div
                        key={`image-${imageIndex}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          setNestedDrop({ menuIndex: index, key: 'images', itemIndex: imageIndex });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (
                            nestedDrag &&
                            nestedDrag.menuIndex === index &&
                            nestedDrag.key === 'images' &&
                            nestedDrag.itemIndex !== imageIndex
                          ) {
                            moveMegaArrayItem(index, 'images', nestedDrag.itemIndex, imageIndex);
                          }
                          setNestedDrag(null);
                          setNestedDrop(null);
                        }}
                        className={`rounded-lg border border-slate-200 bg-white p-2 ${
                          nestedDrop?.menuIndex === index &&
                          nestedDrop?.key === 'images' &&
                          nestedDrop?.itemIndex === imageIndex
                            ? 'bg-blue-50 ring-1 ring-blue-200'
                            : ''
                        }`}
                      >
                        <div className="grid gap-2 md:grid-cols-[auto_56px_minmax(0,1fr)_auto] md:items-center">
                          <button
                            type="button"
                            draggable
                            onDragStart={() => setNestedDrag({ menuIndex: index, key: 'images', itemIndex: imageIndex })}
                            onDragEnd={() => {
                              setNestedDrag(null);
                              setNestedDrop(null);
                            }}
                            className="cursor-grab rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 active:cursor-grabbing"
                            title="Drag to reorder images"
                          >
                            Drag
                          </button>

                          <div className="h-10 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                            {imageItem.url ? (
                              <img
                                src={imageItem.url}
                                alt={imageItem.label || 'Menu image preview'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No image</div>
                            )}
                          </div>

                          <div
                            className="flex min-w-0 items-center gap-2"
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const file = event.dataTransfer?.files?.[0];
                              if (file) {
                                uploadMegaImageAndPersist(index, imageIndex, file);
                              }
                            }}
                            title="Drop image file here to upload"
                          >
                            <input
                              value={imageItem.url || ''}
                              onChange={(e) =>
                                updateMenuItem(index, (current) => {
                                  const images = [...(current.megaMenu?.images || [])];
                                  images[imageIndex] = { ...images[imageIndex], url: e.target.value };
                                  return { ...current, megaMenu: { ...(current.megaMenu || {}), images } };
                                })
                              }
                              className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                              placeholder="Image URL"
                            />
                            <label
                              htmlFor={`mega-image-upload-${index}-${imageIndex}`}
                              className="shrink-0 cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                            >
                              {uploadingMegaImageKey === `${index}-${imageIndex}` ? 'Uploading...' : 'Upload'}
                            </label>
                            <input
                              id={`mega-image-upload-${index}-${imageIndex}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingMegaImageKey === `${index}-${imageIndex}`}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  uploadMegaImageAndPersist(index, imageIndex, file);
                                }
                                event.target.value = '';
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 md:justify-self-end"
                            onClick={() =>
                              updateMenuItem(index, (current) => ({
                                ...current,
                                megaMenu: {
                                  ...(current.megaMenu || {}),
                                  images: (current.megaMenu?.images || []).filter((_, idx) => idx !== imageIndex),
                                },
                              }))
                            }
                          >
                            Remove
                          </button>

                          <div className="md:col-start-3 md:grid md:grid-cols-2 md:gap-2">
                            <input
                              value={imageItem.label || ''}
                              onChange={(e) =>
                                updateMenuItem(index, (current) => {
                                  const images = [...(current.megaMenu?.images || [])];
                                  images[imageIndex] = { ...images[imageIndex], label: e.target.value };
                                  return { ...current, megaMenu: { ...(current.megaMenu || {}), images } };
                                })
                              }
                              className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                              placeholder="Label"
                            />

                            <input
                              value={imageItem.link || ''}
                              onChange={(e) =>
                                updateMenuItem(index, (current) => {
                                  const images = [...(current.megaMenu?.images || [])];
                                  images[imageIndex] = { ...images[imageIndex], link: e.target.value };
                                  return { ...current, megaMenu: { ...(current.megaMenu || {}), images } };
                                })
                              }
                              className="mt-2 w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs md:mt-0"
                              placeholder="/category/bridal"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
      ) : null}
      </div>
      ) : null}
      </div>

      {confirmDialog ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={closeConfirmDialog}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-confirm-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  confirmDialog.tone === 'warning'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                <Trash2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="menu-confirm-title" className="text-base font-semibold text-slate-900">
                  {confirmDialog.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {confirmDialog.message}
                </p>
              </div>
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.onConfirm?.()}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                  confirmDialog.tone === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
