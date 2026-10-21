'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Heart,
  Loader2,
  Menu,
  PanelTop,
  Phone,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import EnableSwitch from '@/components/store/EnableSwitch';
import { DEFAULT_SEARCH_STYLE } from '@/lib/navbarLayoutSettings';
import { DEFAULT_NAVBAR_PHONE, normalizeNavbarPhone } from '@/lib/storeContact';
import { BNPL_PARTNER_DEFS, normalizeBnplTopBar } from '@/lib/bnplTopBar';

const FONT_FAMILIES = [
  ['inherit', 'App font'],
  ['poppins', 'Poppins'],
  ['montserrat', 'Montserrat'],
  ['arial', 'Arial'],
  ['helvetica', 'Helvetica'],
  ['georgia', 'Georgia'],
  ['times', 'Times'],
  ['verdana', 'Verdana'],
  ['trebuchet', 'Trebuchet'],
  ['tahoma', 'Tahoma'],
  ['garamond', 'Garamond'],
];

const FONT_WEIGHTS = ['300', '400', '500', '600', '700', '800'];

function fieldClass() {
  return 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900';
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ColorField({ label, value, onChange, fallback = '#111827' }) {
  const picker = /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : fallback;
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
          placeholder={fallback}
        />
      </span>
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
      </span>
      <EnableSwitch enabled={checked} onChange={onChange} />
    </div>
  );
}

function previewLines(bar) {
  const config = normalizeBnplTopBar(bar);
  if (config.enabled === false) return [];
  const lines = [];
  if (config.tamaraEnabled !== false) {
    lines.push(config.tamaraText || `Pay in ${config.tamaraPayments} with Tamara`);
  }
  if (config.tabbyEnabled) {
    lines.push(config.tabbyText || `Pay in ${config.tabbyPayments} with Tabby`);
  }
  (config.customItems || []).forEach((item) => {
    if (item.enabled === false) return;
    if (!item.name && !item.imageUrl && !item.text) return;
    lines.push(item.text || item.name);
  });
  if (!lines.length) lines.push('Pay in 4 with Tamara');
  return lines;
}

function HeaderPreview({ branding, search, visibility, phone, bnpl }) {
  const style = { ...DEFAULT_SEARCH_STYLE, ...(search.searchStyle || {}) };
  const lines = previewLines(bnpl);
  const headerColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(branding.backgroundColor)
    ? branding.backgroundColor
    : '#111827';
  const fieldFill = style.backgroundTransparent ? 'transparent' : (style.backgroundColor || '#ffffff');
  const fontFamily = search.unifyNavbarText ? search.unifiedTextFontFamily : style.fontFamily;

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-300 bg-slate-100 shadow-sm">
      {lines.length ? (
        <div
          className="flex items-center justify-center bg-white px-3 text-center text-slate-800"
          style={{ minHeight: Number(bnpl.minHeight) || 40, fontSize: Number(bnpl.fontSize) || 14 }}
        >
          <span className="line-clamp-2">{lines[0]}</span>
        </div>
      ) : null}
      <div className="flex items-center gap-2 px-2 py-2" style={{ backgroundColor: headerColor }}>
        <Menu size={16} color="#ffffff" />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/15">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="h-9 w-9 object-contain" />
          ) : (
            <span className="text-[8px] font-bold text-white">Logo</span>
          )}
        </span>
        <span
          className="flex h-9 min-w-0 flex-1 items-center px-2 text-[11px]"
          style={{
            background: fieldFill,
            borderStyle: 'solid',
            borderColor: style.borderColor || '#ffffff',
            borderWidth: Number(style.borderWidth) || 0,
            borderRadius: Number(style.borderRadius) ?? 16,
            color: style.fontColor || '#1e293b',
            fontFamily: fontFamily && fontFamily !== 'inherit' ? fontFamily : undefined,
          }}
        >
          <span className="truncate">{search.searchPlaceholder || 'Search'}</span>
          <Search size={12} className="ms-auto shrink-0" />
        </span>
        {visibility.phone !== false ? <Phone size={15} color="#ffffff" /> : null}
        {visibility.wishlist !== false ? <Heart size={15} color="#ffffff" /> : null}
      </div>
      <p className="bg-white px-3 py-2 text-[11px] text-slate-500">
        Home tab. The bag stays hidden here. Other tabs stay on a white header. Phone caption: {phone.label || 'Toll-free'}
      </p>
    </div>
  );
}

export default function MobileAppHeaderEditor() {
  const { getToken } = useAuth();
  const navbarRef = useRef({});
  const updatedAtRef = useRef('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [clearLogo, setClearLogo] = useState(false);
  const [branding, setBranding] = useState({ logoUrl: '', backgroundColor: '#111827' });
  const [search, setSearch] = useState({
    searchPlaceholder: '',
    searchPlaceholderAr: '',
    searchStyle: { ...DEFAULT_SEARCH_STYLE },
    unifyNavbarText: false,
    unifiedTextFontFamily: 'inherit',
    unifiedTextFontSize: 14,
  });
  const [visibility, setVisibility] = useState({
    store: true,
    orders: true,
    wishlist: true,
    cart: true,
    phone: true,
    language: true,
  });
  const [phone, setPhone] = useState({ ...DEFAULT_NAVBAR_PHONE });
  const [bnpl, setBnpl] = useState(() => normalizeBnplTopBar());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [navbarRes, settingsRes] = await Promise.all([
        axios.get('/api/store/navbar-menu', { headers }),
        axios.get('/api/store/settings', { headers }),
      ]);
      const navbar = navbarRes.data || {};
      const settings = settingsRes.data || {};
      navbarRef.current = navbar;
      const stamps = [navbar.updatedAt, settings.updatedAt].filter(Boolean).map((value) => new Date(value).getTime());
      const latest = stamps.filter((value) => Number.isFinite(value)).sort((a, b) => b - a)[0];
      updatedAtRef.current = latest ? new Date(latest).toISOString() : '';
      setBranding({
        logoUrl: String(navbar.logoUrl || '').trim(),
        backgroundColor: String(navbar.backgroundColor || '').trim() || '#111827',
      });
      setSearch({
        searchPlaceholder: navbar.searchPlaceholder || '',
        searchPlaceholderAr: navbar.searchPlaceholderAr || '',
        searchStyle: { ...DEFAULT_SEARCH_STYLE, ...(navbar.searchStyle || {}) },
        unifyNavbarText: navbar.unifyNavbarText === true,
        unifiedTextFontFamily: navbar.unifiedTextFontFamily || 'inherit',
        unifiedTextFontSize: Number(navbar.unifiedTextFontSize) || 14,
      });
      setVisibility({
        store: settings.navActionsVisibility?.store !== false,
        orders: settings.navActionsVisibility?.orders !== false,
        wishlist: settings.navActionsVisibility?.wishlist !== false,
        cart: settings.navActionsVisibility?.cart !== false,
        phone: settings.navActionsVisibility?.phone !== false,
        language: settings.navActionsVisibility?.language !== false,
      });
      setPhone(normalizeNavbarPhone(settings.navbarPhone));
      setBnpl(normalizeBnplTopBar(settings.bnplTopBar));
      setClearLogo(false);
    } catch (error) {
      console.error(error);
      toast.error('Could not load the app header');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const patchStyle = (patch) => {
    setSearch((prev) => ({ ...prev, searchStyle: { ...prev.searchStyle, ...patch } }));
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
        maxWidth: 800,
        maxHeight: 800,
        maxBytes: 1024 * 1024,
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
      const headers = { Authorization: `Bearer ${token}` };
      const nav = navbarRef.current || {};
      const navbarBody = {
        enabled: nav.enabled !== false,
        items: Array.isArray(nav.items) ? nav.items : [],
        logoUrl: branding.logoUrl,
        logoWidth: Math.max(20, Math.min(400, Number(nav.logoWidth) || 120)),
        logoHeight: Math.max(10, Math.min(200, Number(nav.logoHeight) || 40)),
        backgroundColor: branding.backgroundColor,
        clearLogo,
        extraButtons: nav.extraButtons,
        searchMaxWidth: nav.searchMaxWidth,
        searchAlign: nav.searchAlign,
        searchPlaceholder: search.searchPlaceholder,
        searchPlaceholderAr: search.searchPlaceholderAr,
        searchStyle: { ...(nav.searchStyle || {}), ...search.searchStyle },
        navbarMaxWidth: nav.navbarMaxWidth,
        itemGap: nav.itemGap,
        logoGap: nav.logoGap,
        mobileItemGap: nav.mobileItemGap,
        stickyHeader: nav.stickyHeader,
        showCategoriesButton: nav.showCategoriesButton,
        categoriesButtonLabel: nav.categoriesButtonLabel,
        categoriesButtonLabelAr: nav.categoriesButtonLabelAr,
        categoriesButtonStyle: nav.categoriesButtonStyle,
        itemOrder: nav.itemOrder,
        itemAlign: nav.itemAlign,
        unifyNavbarText: search.unifyNavbarText,
        unifiedTextFontFamily: search.unifiedTextFontFamily,
        unifiedTextFontSize: Number(search.unifiedTextFontSize) || 14,
        settingsUpdatedAt: updatedAtRef.current || undefined,
      };
      const navRes = await axios.post('/api/store/navbar-menu', navbarBody, { headers });
      const navStamp = navRes.data?.data?.updatedAt || navRes.data?.meta?.updatedAt;
      if (navStamp) updatedAtRef.current = new Date(navStamp).toISOString();

      const settingsRes = await axios.put('/api/store/settings', {
        settingsUpdatedAt: updatedAtRef.current || undefined,
        navActionsVisibility: visibility,
        navbarPhone: {
          number: phone.number,
          label: phone.label,
          labelAr: phone.labelAr,
        },
        bnplTopBar: normalizeBnplTopBar(bnpl),
      }, { headers });
      if (settingsRes.data?.updatedAt) {
        updatedAtRef.current = new Date(settingsRes.data.updatedAt).toISOString();
      }
      navbarRef.current = {
        ...nav,
        logoUrl: clearLogo ? '' : (navRes.data?.data?.logoUrl || branding.logoUrl),
        backgroundColor: branding.backgroundColor,
        searchPlaceholder: search.searchPlaceholder,
        searchPlaceholderAr: search.searchPlaceholderAr,
        searchStyle: navbarBody.searchStyle,
        unifyNavbarText: search.unifyNavbarText,
        unifiedTextFontFamily: search.unifiedTextFontFamily,
        unifiedTextFontSize: navbarBody.unifiedTextFontSize,
      };
      setClearLogo(false);
      toast.success('App header saved. The phone shows it on the next open.');
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Could not save the header');
    } finally {
      setSaving(false);
    }
  };

  const updateCustom = (index, patch) => {
    setBnpl((prev) => {
      const customItems = normalizeBnplTopBar(prev).customItems.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...patch } : item
      ));
      return { ...prev, customItems };
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-sky-700" />
      </div>
    );
  }

  const lines = previewLines(bnpl);

  return (
    <div className="-mx-3 -mt-3 min-h-full w-full max-w-full overflow-x-hidden bg-white pb-16 sm:-mx-4 sm:-mt-4 lg:-mx-5 lg:-mt-5">
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600 px-4 py-6 text-white sm:px-6 lg:px-8 lg:py-8">
        <Link href="/store/mobile-features" className="inline-flex items-center gap-1.5 text-sm text-sky-100 hover:text-white">
          <ArrowLeft size={16} />
          Mobile
        </Link>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          <PanelTop size={14} />
          App header
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Phone header</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-50 sm:text-base">
          This is the payment strip and the navbar row on the shopper app. Save, then open the app again.
          The same save also updates the website header. Icon shapes, row order, and logo size stay in the app.
        </p>
      </div>

      <div className="grid gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:px-8 lg:py-8">
        <div className="space-y-4">
          <Section title="Home tab color and logo">
            <ColorField
              label="Header color on the home tab"
              value={branding.backgroundColor}
              onChange={(backgroundColor) => setBranding((prev) => ({ ...prev, backgroundColor }))}
            />
            <p className="text-xs text-slate-500">Shop, Offers, Cart, and Account stay white. After the shopper scrolls home, the bar turns white.</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.logoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-slate-400">No logo</span>
                )}
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                {uploading === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Upload logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    uploadImage(file, 'logo', (logoUrl) => {
                      setBranding((prev) => ({ ...prev, logoUrl }));
                      setClearLogo(false);
                    });
                  }}
                />
              </label>
              {branding.logoUrl ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-700"
                  onClick={() => {
                    setBranding((prev) => ({ ...prev, logoUrl: '' }));
                    setClearLogo(true);
                  }}
                >
                  Remove logo
                </button>
              ) : null}
            </div>
          </Section>

          <Section title="Search field">
            <label className="block text-sm">
              <span className="font-medium text-slate-800">Hint in English</span>
              <input
                value={search.searchPlaceholder}
                onChange={(event) => setSearch((prev) => ({ ...prev, searchPlaceholder: event.target.value }))}
                className={fieldClass()}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-800">Hint in Arabic</span>
              <input
                dir="rtl"
                value={search.searchPlaceholderAr}
                onChange={(event) => setSearch((prev) => ({ ...prev, searchPlaceholderAr: event.target.value }))}
                className={fieldClass()}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField label="Field fill" value={search.searchStyle.backgroundColor} onChange={(backgroundColor) => patchStyle({ backgroundColor })} fallback="#ffffff" />
              <ColorField label="Border color" value={search.searchStyle.borderColor} onChange={(borderColor) => patchStyle({ borderColor })} fallback="#ffffff" />
              <ColorField label="Text and hint color" value={search.searchStyle.fontColor} onChange={(fontColor) => patchStyle({ fontColor })} fallback="#1e293b" />
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Corner radius</span>
                <input type="number" min="0" max="40" value={search.searchStyle.borderRadius ?? 16} onChange={(event) => patchStyle({ borderRadius: Number(event.target.value) })} className={fieldClass()} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Border thickness</span>
                <input type="number" min="0" max="8" value={search.searchStyle.borderWidth ?? 0} onChange={(event) => patchStyle({ borderWidth: Number(event.target.value) })} className={fieldClass()} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Text size</span>
                <input type="number" min="8" max="28" value={search.searchStyle.fontSize ?? 14} onChange={(event) => patchStyle({ fontSize: Number(event.target.value) })} className={fieldClass()} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Font</span>
                <select value={search.searchStyle.fontFamily || 'inherit'} onChange={(event) => patchStyle({ fontFamily: event.target.value })} className={fieldClass()}>
                  {FONT_FAMILIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Weight</span>
                <select value={String(search.searchStyle.fontWeight || '400')} onChange={(event) => patchStyle({ fontWeight: event.target.value })} className={fieldClass()}>
                  {FONT_WEIGHTS.map((weight) => <option key={weight} value={weight}>{weight}</option>)}
                </select>
              </label>
            </div>
            <Toggle label="See-through field" checked={search.searchStyle.backgroundTransparent === true} onChange={(backgroundTransparent) => patchStyle({ backgroundTransparent })} />
            <Toggle label="Pick black or white text from the field fill" checked={search.searchStyle.fontColorAuto === true} onChange={(fontColorAuto) => patchStyle({ fontColorAuto })} />
            <Toggle label="Use one font for the search text" checked={search.unifyNavbarText} onChange={(unifyNavbarText) => setSearch((prev) => ({ ...prev, unifyNavbarText }))} />
            {search.unifyNavbarText ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Unified font</span>
                  <select value={search.unifiedTextFontFamily || 'inherit'} onChange={(event) => setSearch((prev) => ({ ...prev, unifiedTextFontFamily: event.target.value }))} className={fieldClass()}>
                    {FONT_FAMILIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Unified size</span>
                  <input type="number" min="8" max="22" value={search.unifiedTextFontSize} onChange={(event) => setSearch((prev) => ({ ...prev, unifiedTextFontSize: Number(event.target.value) }))} className={fieldClass()} />
                </label>
              </div>
            ) : null}
          </Section>

          <Section title="Phone, wishlist, and bag">
            <Toggle label="Phone" hint="Hidden when off." checked={visibility.phone !== false} onChange={(phoneOn) => setVisibility((prev) => ({ ...prev, phone: phoneOn }))} />
            <Toggle label="Wishlist" checked={visibility.wishlist !== false} onChange={(wishlist) => setVisibility((prev) => ({ ...prev, wishlist }))} />
            <Toggle
              label="Bag"
              hint="The app still hides the bag on the home tab."
              checked={visibility.cart !== false}
              onChange={(cart) => setVisibility((prev) => ({ ...prev, cart }))}
            />
            <label className="block text-sm">
              <span className="font-medium text-slate-800">Phone number</span>
              <input value={phone.number || ''} onChange={(event) => setPhone((prev) => ({ ...prev, number: event.target.value.replace(/\D/g, '') }))} className={fieldClass()} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Caption</span>
                <input value={phone.label || ''} onChange={(event) => setPhone((prev) => ({ ...prev, label: event.target.value.slice(0, 40) }))} className={fieldClass()} placeholder="Toll-free" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Arabic caption</span>
                <input dir="rtl" value={phone.labelAr || ''} onChange={(event) => setPhone((prev) => ({ ...prev, labelAr: event.target.value.slice(0, 40) }))} className={fieldClass()} placeholder="مجاني" />
              </label>
            </div>
          </Section>

          <Section title="Payment strip">
            <Toggle label="Show the strip" checked={bnpl.enabled !== false} onChange={(enabled) => setBnpl((prev) => ({ ...prev, enabled }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Height</span>
                <input type="number" min="28" max="72" value={bnpl.minHeight || 40} onChange={(event) => setBnpl((prev) => ({ ...prev, minHeight: Number(event.target.value) }))} className={fieldClass()} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-800">Text size</span>
                <input type="number" min="10" max="24" value={bnpl.fontSize || 14} onChange={(event) => setBnpl((prev) => ({ ...prev, fontSize: Number(event.target.value) }))} className={fieldClass()} />
              </label>
            </div>
            <p className="text-xs text-slate-500">If Tamara, Tabby, and extra lines are all off, the app still shows one Tamara line until the strip itself is turned off.</p>
            {BNPL_PARTNER_DEFS.map((partner) => (
              <div key={partner.key} className="rounded-xl border border-slate-200 p-3">
                <Toggle
                  label={partner.name}
                  checked={bnpl[partner.enabledKey] === true}
                  onChange={(enabled) => setBnpl((prev) => ({ ...prev, [partner.enabledKey]: enabled }))}
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium text-slate-800">Payments</span>
                    <input type="number" min="2" max="12" value={bnpl[partner.paymentsKey] || 4} onChange={(event) => setBnpl((prev) => ({ ...prev, [partner.paymentsKey]: Number(event.target.value) }))} className={fieldClass()} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-800">English line</span>
                    <input value={bnpl[partner.textKey] || ''} onChange={(event) => setBnpl((prev) => ({ ...prev, [partner.textKey]: event.target.value }))} className={fieldClass()} placeholder={`Pay in 4 with ${partner.name}`} />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-800">Arabic line</span>
                    <input dir="rtl" value={bnpl[partner.textArKey] || ''} onChange={(event) => setBnpl((prev) => ({ ...prev, [partner.textArKey]: event.target.value }))} className={fieldClass()} />
                  </label>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">Extra lines</p>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800"
                onClick={() => setBnpl((prev) => {
                  const customItems = normalizeBnplTopBar(prev).customItems;
                  if (customItems.length >= 8) {
                    toast.error('You can add up to 8 extra lines');
                    return prev;
                  }
                  return {
                    ...prev,
                    customItems: [...customItems, {
                      id: `topbar-${Date.now()}`,
                      enabled: true,
                      name: '',
                      imageUrl: '',
                      text: '',
                      textAr: '',
                    }],
                  };
                })}
              >
                <Plus size={14} />
                Add line
              </button>
            </div>
            {(bnpl.customItems || []).map((item, index) => (
              <div key={item.id || index} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Toggle label={`Line ${index + 1}`} checked={item.enabled !== false} onChange={(enabled) => updateCustom(index, { enabled })} />
                  <button type="button" className="text-rose-700" onClick={() => setBnpl((prev) => ({
                    ...prev,
                    customItems: normalizeBnplTopBar(prev).customItems.filter((_, itemIndex) => itemIndex !== index),
                  }))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium text-slate-800">Name</span>
                    <input value={item.name || ''} onChange={(event) => updateCustom(index, { name: event.target.value.slice(0, 40) })} className={fieldClass()} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-800">English line</span>
                    <input value={item.text || ''} onChange={(event) => updateCustom(index, { text: event.target.value.slice(0, 160) })} className={fieldClass()} />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-800">Arabic line</span>
                    <input dir="rtl" value={item.textAr || ''} onChange={(event) => updateCustom(index, { textAr: event.target.value.slice(0, 160) })} className={fieldClass()} />
                  </label>
                </div>
              </div>
            ))}
            {lines.length > 1 ? (
              <p className="text-xs text-slate-500">The app flips between {lines.length} lines every 3.5 seconds.</p>
            ) : null}
          </Section>

          <Section title="Side menu departments">
            <p className="text-sm leading-6 text-slate-600">
              Home, Shop, and Offers stay fixed. Department names and photos come from categories that have no parent.
            </p>
            <Link href="/store/categories" className="inline-flex text-sm font-semibold text-sky-800 hover:underline">
              Edit categories
            </Link>
          </Section>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save header
          </button>
        </div>

        <aside className="lg:sticky lg:top-4">
          <HeaderPreview branding={branding} search={search} visibility={visibility} phone={phone} bnpl={bnpl} />
        </aside>
      </div>
    </div>
  );
}
