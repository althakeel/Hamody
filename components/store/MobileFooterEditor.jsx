'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ChevronDown,
  Home,
  Loader2,
  MessageCircle,
  PanelBottom,
  Save,
  ShoppingCart,
  Upload,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import EnableSwitch from '@/components/store/EnableSwitch';
import StoreDropdown from '@/components/store/StoreDropdown';
import { slugifyCategory } from '@/lib/categorySlug';
import { flattenShowcaseCategories } from '@/lib/showcaseBannerLinks';
import {
  BOTTOM_NAV_LINK_TYPES,
  BOTTOM_NAV_PAGE_OPTIONS,
  createBottomNavLink,
  readBottomNavLinkChoice,
} from '@/lib/bottomNavLinkChoices';
import { normalizeMobileFeatures } from '@/lib/mobileFeatures';
import { FOOTER_CLICK_ANIMATIONS, appFooterFrameStyle, normalizeAppFooter } from '@/lib/mobileAppFooter';

const BUILTIN_ICONS = {
  home: Home,
  categories: CategoriesMark,
  cart: ShoppingCart,
  support: MessageCircle,
  account: User,
};

function fieldClass() {
  return 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900';
}

function CategoriesMark({ size = 22, color = 'currentColor', strokeWidth = 1.8 }) {
  const r = 2.2;
  const dots = [
    [7, 7],
    [17, 7],
    [7, 17],
    [17, 17],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {dots.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={color} />
      ))}
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

function ColorField({ label, value, onChange }) {
  const picker = /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : '#5b35e6';
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-800">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={picker}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white"
        />
        <input
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
        />
      </span>
    </label>
  );
}

function SettingsPanel({ title, open, onToggle, aside, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center justify-between text-left"
          aria-expanded={open}
        >
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          <ChevronDown size={16} className={`shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {aside}
      </div>
      {open ? <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">{children}</div> : null}
    </section>
  );
}

function FooterPreview({ footer, activeId, onSelect }) {
  const config = normalizeAppFooter(footer);
  const visible = config.items.filter((item) => item.enabled);
  const [tapKey, setTapKey] = useState(0);
  const [scrolledAway, setScrolledAway] = useState(false);
  const motion = config.clickAnimation === 'none' ? '' : config.clickAnimation;

  return (
    <div>
      <style>{`
        @keyframes footerTapScale { 0% { transform: scale(1); } 45% { transform: scale(1.16); } 100% { transform: scale(1); } }
        @keyframes footerTapLift { 0% { transform: translateY(0); } 45% { transform: translateY(-8px); } 100% { transform: translateY(0); } }
        @keyframes footerTapPop { 0% { transform: scale(0.86); } 55% { transform: scale(1.12); } 100% { transform: scale(1); } }
        @keyframes footerTapFade { 0% { opacity: 1; } 40% { opacity: 0.35; } 100% { opacity: 1; } }
        @keyframes footerTapBounce { 0%, 100% { transform: translateY(0); } 35% { transform: translateY(-10px); } 60% { transform: translateY(3px); } }
        .footer-tap-scale { animation: footerTapScale 0.42s ease; }
        .footer-tap-lift { animation: footerTapLift 0.42s ease; }
        .footer-tap-pop { animation: footerTapPop 0.42s ease; }
        .footer-tap-fade { animation: footerTapFade 0.42s ease; }
        .footer-tap-bounce { animation: footerTapBounce 0.5s ease; }
        .footer-hover-scale:hover { transform: scale(1.08); }
        .footer-hover-lift:hover { transform: translateY(-4px); }
        .footer-hover-pop:hover { transform: scale(1.06); }
        .footer-hover-fade:hover { opacity: 0.65; }
        .footer-hover-bounce:hover { transform: translateY(-3px); }
      `}</style>
      <div className="relative h-44 overflow-hidden rounded-[28px] bg-slate-100">
        <div
          className="absolute inset-x-4 transition-transform duration-300 ease-out"
          style={{
            bottom: config.bottomSpacePx,
            transform: config.hideOnScroll && scrolledAway ? 'translateY(140%)' : 'translateY(0)',
          }}
        >
          <div
            className="flex items-stretch px-2"
            style={{
              background: config.backgroundColor,
              borderRadius: config.radiusPx,
              height: config.heightPx,
              ...appFooterFrameStyle(config),
            }}
          >
            {visible.map((item) => {
              const selected = item.id === activeId;
              const color = selected ? config.activeColor : config.inactiveColor;
              const Icon = BUILTIN_ICONS[item.id] || Home;
              const iconUrl = selected && item.activeIconUrl ? item.activeIconUrl : item.iconUrl;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.id);
                    setTapKey((current) => current + 1);
                  }}
                  className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition duration-200 ${motion ? `footer-hover-${motion}` : ''}`}
                >
                  <span
                    key={selected ? `${item.id}-${tapKey}` : item.id}
                    className={`flex h-6 w-6 items-center justify-center ${selected && motion ? `footer-tap-${motion}` : ''}`}
                  >
                    {iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={iconUrl} alt="" className="h-5 w-5 object-contain" />
                    ) : (
                      <Icon size={20} color={color} strokeWidth={selected ? 2.4 : 1.8} />
                    )}
                  </span>
                  <span className="max-w-full truncate text-[11px] font-medium" style={{ color }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">
          {config.bottomSpacePx}px from the bottom. Click an icon to play the animation.
        </p>
        <button
          type="button"
          disabled={!config.hideOnScroll}
          onClick={() => setScrolledAway((current) => !current)}
          className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-40"
        >
          {scrolledAway ? 'Show bar' : 'Scroll'}
        </button>
      </div>
    </div>
  );
}

function PathFields({ path, linkType, onTypeChange, onPathChange, categoryOptions, brandOptions, productOptions, landingOptions }) {
  const choice = readBottomNavLinkChoice(path);
  const activeType = linkType || choice.type;
  return (
    <div className="grid gap-3">
      <StoreDropdown
        portal
        value={activeType}
        onChange={onTypeChange}
        options={BOTTOM_NAV_LINK_TYPES}
        placeholder="Choose what to open"
      />
      {activeType === 'page' ? (
        <StoreDropdown
          portal
          searchable
          value={choice.type === 'page' ? choice.value : ''}
          onChange={(value) => onPathChange(createBottomNavLink('page', value))}
          options={BOTTOM_NAV_PAGE_OPTIONS}
          placeholder="Select a page"
          searchPlaceholder="Search pages"
        />
      ) : null}
      {activeType === 'category' ? (
        <StoreDropdown
          portal
          searchable
          value={choice.type === 'category' ? choice.value : ''}
          onChange={(value) => onPathChange(createBottomNavLink('category', value))}
          options={categoryOptions}
          placeholder="Select a category"
          searchPlaceholder="Search categories"
        />
      ) : null}
      {activeType === 'brand' ? (
        <StoreDropdown
          portal
          searchable
          value={choice.type === 'brand' ? choice.value : ''}
          onChange={(value) => onPathChange(createBottomNavLink('brand', value))}
          options={brandOptions}
          placeholder="Select a brand"
          searchPlaceholder="Search brands"
        />
      ) : null}
      {activeType === 'product' ? (
        <StoreDropdown
          portal
          searchable
          value={choice.type === 'product' ? choice.value : ''}
          onChange={(value) => onPathChange(createBottomNavLink('product', value))}
          options={productOptions}
          placeholder="Select a product"
          searchPlaceholder="Search products"
        />
      ) : null}
      {activeType === 'landing' ? (
        <StoreDropdown
          portal
          searchable
          value={choice.type === 'landing' ? choice.value : ''}
          onChange={(value) => onPathChange(createBottomNavLink('landing', value))}
          options={landingOptions}
          placeholder={landingOptions.length ? 'Select a landing page' : 'No landing pages yet'}
          searchPlaceholder="Search landing pages"
        />
      ) : null}
      {activeType === 'custom' ? (
        <input
          type="text"
          value={choice.type === 'custom' ? choice.value : ''}
          onChange={(event) => onPathChange(event.target.value)}
          placeholder="https://example.com or /your-page"
          className={fieldClass()}
        />
      ) : null}
      <p className="sm:col-span-2 text-[11px] text-slate-500">Opens {path || '/'}</p>
    </div>
  );
}

export default function MobileFooterEditor() {
  const { getToken } = useAuth();
  const [form, setForm] = useState(() => normalizeAppFooter());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [openPanel, setOpenPanel] = useState('');
  const [activeId, setActiveId] = useState('cart');
  const [linkTypes, setLinkTypes] = useState({});
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [landingPages, setLandingPages] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/mobile-features', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const next = normalizeAppFooter(normalizeMobileFeatures(data?.mobileFeatures).appFooter);
      setForm(next);
      setLinkTypes(Object.fromEntries(next.items.map((item) => [item.id, readBottomNavLinkChoice(item.path).type])));
    } catch (error) {
      console.error(error);
      toast.error('Could not load the footer');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    const loadTargets = async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [categoryRes, brandRes, productRes, landingRes] = await Promise.all([
          axios.get('/api/categories'),
          axios.get('/api/store/brands', { headers }),
          axios.get('/api/store/product', {
            headers,
            params: { page: 1, limit: 500, manage: 'true', sort: 'name' },
          }),
          axios.get('/api/store/email-marketing/pages', { headers }),
        ]);
        if (!active) return;
        setCategories(Array.isArray(categoryRes.data?.categories) ? categoryRes.data.categories : []);
        setBrands(Array.isArray(brandRes.data?.brands) ? brandRes.data.brands : []);
        setProducts(Array.isArray(productRes.data?.products) ? productRes.data.products : []);
        setLandingPages(Array.isArray(landingRes.data?.pages) ? landingRes.data.pages : []);
      } catch (error) {
        console.error(error);
      }
    };
    loadTargets();
    return () => {
      active = false;
    };
  }, [getToken]);

  const categoryOptions = useMemo(
    () => flattenShowcaseCategories(categories).map((category) => ({
      value: category.slug,
      label: category.label,
    })),
    [categories],
  );
  const brandOptions = useMemo(() => {
    const seen = new Set();
    return brands.flatMap((brand) => {
      const name = String(brand?.name || '').trim();
      const slug = slugifyCategory(name);
      if (!name || !slug || seen.has(slug)) return [];
      seen.add(slug);
      return [{ value: slug, label: name }];
    });
  }, [brands]);
  const productOptions = useMemo(() => products.flatMap((product) => {
    const slug = String(product?.slug || '').trim();
    const name = String(product?.name || slug).trim();
    if (!slug) return [];
    return [{ value: slug, label: name }];
  }), [products]);
  const landingOptions = useMemo(() => landingPages.flatMap((page) => {
    const slug = String(page?.slug || '').trim();
    if (!slug) return [];
    const title = String(page?.title || slug).trim();
    const status = page?.status === 'published' ? 'Published' : 'Draft';
    return [{ value: slug, label: `${title} · ${status}` }];
  }), [landingPages]);

  const patch = (next) => setForm((prev) => ({ ...prev, ...next }));
  const updateItem = (id, itemPatch) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...itemPatch } : item)),
    }));
  };

  const uploadImage = async (file, key, onUrl) => {
    if (!file) return;
    try {
      setUploading(key);
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in again to upload');
        return;
      }
      const { compressImageForUpload } = await import('@/lib/compressImageForUpload');
      const prepared = await compressImageForUpload(file, {
        maxWidth: 256,
        maxHeight: 256,
        maxBytes: 512 * 1024,
        preserveTransparency: true,
      });
      const body = new FormData();
      body.append('image', prepared);
      body.append('type', 'navbar-logo');
      const response = await fetch('/api/store/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.url) throw new Error(data?.error || 'Upload failed');
      onUrl(data.url);
      toast.success('Image uploaded. Save to publish it.');
    } catch (error) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setUploading('');
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      await axios.put('/api/store/mobile-features', {
        mobileFeatures: { appFooter: normalizeAppFooter(form) },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Footer saved');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save the footer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-sky-700" />
      </div>
    );
  }

  return (
    <div className="-mx-3 -mt-3 min-h-full w-full max-w-full overflow-x-hidden bg-white pb-16 sm:-mx-4 sm:-mt-4 lg:-mx-5 lg:-mt-5">
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600 px-4 py-6 text-white sm:px-6 lg:px-8 lg:py-8">
        <Link href="/store/mobile-features" className="inline-flex items-center gap-1.5 text-sm text-sky-100 hover:text-white">
          <ArrowLeft size={16} />
          Mobile
        </Link>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          <PanelBottom size={14} />
          Footer
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Mobile footer</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-50 sm:text-base">
          The bottom bar. Upload each icon and choose where it opens.
        </p>
      </div>

      <div className="grid gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:px-8 lg:py-8">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">Show this footer</span>
              <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => patch({ enabled })} />
            </div>
          </section>

          <SettingsPanel title="Bar" open={openPanel === 'bar'} onToggle={() => setOpenPanel((current) => (current === 'bar' ? '' : 'bar'))}>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField label="Background" value={form.backgroundColor} onChange={(backgroundColor) => patch({ backgroundColor })} />
              <ColorField label="Icon and text" value={form.inactiveColor} onChange={(inactiveColor) => patch({ inactiveColor })} />
              <ColorField label="Selected icon and text" value={form.activeColor} onChange={(activeColor) => patch({ activeColor })} />
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Corner radius</span>
                <input type="number" min="0" max="48" value={form.radiusPx} onChange={(event) => patch({ radiusPx: Number(event.target.value) })} className={fieldClass()} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Height</span>
                <input type="number" min="56" max="120" value={form.heightPx} onChange={(event) => patch({ heightPx: Number(event.target.value) })} className={fieldClass()} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Space from the bottom</span>
                <input type="number" min="0" max="80" value={form.bottomSpacePx ?? 12} onChange={(event) => patch({ bottomSpacePx: Number(event.target.value) })} className={fieldClass()} />
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-800">Shadow</span>
                <EnableSwitch enabled={form.shadowEnabled !== false} onChange={(enabled) => patch({ shadowEnabled: enabled })} />
              </div>
              {form.shadowEnabled !== false ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ColorField label="Shadow color" value={form.shadowColor} onChange={(shadowColor) => patch({ shadowColor })} />
                  <label className="block text-sm">
                    <span className="font-medium text-slate-800">Strength</span>
                    <input type="number" min="0" max="100" value={form.shadowOpacity ?? 18} onChange={(event) => patch({ shadowOpacity: Number(event.target.value) })} className={fieldClass()} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-800">Blur</span>
                    <input type="number" min="0" max="60" value={form.shadowBlurPx ?? 24} onChange={(event) => patch({ shadowBlurPx: Number(event.target.value) })} className={fieldClass()} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-800">Distance</span>
                    <input type="number" min="0" max="40" value={form.shadowYPx ?? 10} onChange={(event) => patch({ shadowYPx: Number(event.target.value) })} className={fieldClass()} />
                  </label>
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-800">Border</span>
                <EnableSwitch enabled={form.borderEnabled === true} onChange={(enabled) => patch({ borderEnabled: enabled })} />
              </div>
              {form.borderEnabled === true ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ColorField label="Border color" value={form.borderColor} onChange={(borderColor) => patch({ borderColor })} />
                  <label className="block text-sm">
                    <span className="font-medium text-slate-800">Thickness</span>
                    <input type="number" min="0" max="8" value={form.borderWidthPx ?? 1} onChange={(event) => patch({ borderWidthPx: Number(event.target.value) })} className={fieldClass()} />
                  </label>
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm">
              <span>
                <span className="block font-medium text-slate-800">Hide while scrolling</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">The bar slides away as the page moves, and comes back when scrolling stops.</span>
              </span>
              <EnableSwitch enabled={form.hideOnScroll === true} onChange={(enabled) => patch({ hideOnScroll: enabled })} />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-800">Icon click animation</span>
              <div className="flex flex-wrap gap-1.5">
                {FOOTER_CLICK_ANIMATIONS.map((option) => {
                  const active = (form.clickAnimation || 'scale') === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => patch({ clickAnimation: option.id })}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Plays on the icon when it is tapped. Hover the preview to see the same motion.</p>
            </div>
          </SettingsPanel>

          {form.items.map((item) => (
            <SettingsPanel
              key={item.id}
              title={item.label || item.id}
              open={openPanel === item.id}
              onToggle={() => setOpenPanel((current) => (current === item.id ? '' : item.id))}
              aside={(
                <EnableSwitch enabled={item.enabled !== false} onChange={(enabled) => updateItem(item.id, { enabled })} />
              )}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Label</span>
                  <input value={item.label} onChange={(event) => updateItem(item.id, { label: event.target.value.slice(0, 24) })} className={fieldClass()} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Arabic label</span>
                  <input dir="rtl" value={item.labelAr || ''} onChange={(event) => updateItem(item.id, { labelAr: event.target.value.slice(0, 24) })} className={fieldClass()} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['iconUrl', 'Icon'],
                  ['activeIconUrl', 'Selected icon'],
                ].map(([key, label]) => (
                  <div key={key} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-800">{label}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {item[key] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item[key]} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-[9px] text-slate-400">Built in</span>
                        )}
                      </span>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800">
                        {uploading === `${item.id}-${key}` ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        Upload
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            uploadImage(file, `${item.id}-${key}`, (url) => updateItem(item.id, { [key]: url }));
                          }}
                        />
                      </label>
                    </div>
                    {item[key] ? (
                      <button type="button" className="mt-2 text-xs font-semibold text-rose-700" onClick={() => updateItem(item.id, { [key]: '' })}>
                        Use the built-in icon
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-800">Path</p>
                <PathFields
                  path={item.path}
                  linkType={linkTypes[item.id]}
                  onTypeChange={(type) => setLinkTypes((prev) => ({ ...prev, [item.id]: type }))}
                  onPathChange={(path) => updateItem(item.id, { path })}
                  categoryOptions={categoryOptions}
                  brandOptions={brandOptions}
                  productOptions={productOptions}
                  landingOptions={landingOptions}
                />
              </div>
            </SettingsPanel>
          ))}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save footer
          </button>
        </div>

        <aside className="lg:sticky lg:top-4">
          <FooterPreview footer={form} activeId={activeId} onSelect={setActiveId} />
        </aside>
      </div>
    </div>
  );
}
