'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronLeft,
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  PanelTop,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth'
import EnableSwitch from '@/components/store/EnableSwitch';
import MobilePathPicker from '@/components/store/MobilePathPicker';
import { normalizeMobileFeatures } from '@/lib/mobileFeatures';
import {
  MOBILE_BANNER_SECTIONS,
  createEmptySlide,
  normalizeBannerSection,
} from '@/lib/mobileBannerLayout';
import {
  MAX_MARQUEE_ITEMS,
  appNavbarBackground,
  createEmptyMarqueeItem,
  normalizeAppNavbar,
  normalizePageNavbar,
} from '@/lib/mobileAppNavbar';

const SLIDER_META = MOBILE_BANNER_SECTIONS.bannerSlider;

const BACKGROUND_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.gif,.webp,.mp4,.webm,.mov';

function mediaKindForFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  if (type.startsWith('video/') || ['.mp4', '.webm', '.mov', '.m4v'].some((ext) => name.endsWith(ext))) return 'video';
  return 'image';
}

function NavbarFill({ navbar }) {
  if (navbar?.backgroundMode !== 'media' || !navbar.backgroundMediaUrl) return null;
  if (navbar.backgroundMediaKind === 'video') {
    return (
      <video
        src={navbar.backgroundMediaUrl}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }
  return (
    <img src={navbar.backgroundMediaUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
  );
}

function BackgroundChoices({ value, onChange, uploading, onFile }) {
  const mode = value.backgroundMode === 'gradient' || value.backgroundMode === 'media' ? value.backgroundMode : 'color';
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ['color', 'Color'],
          ['gradient', 'Linear gradient'],
          ['media', 'Image, GIF, or video'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange({ backgroundMode: id })}
            className={`rounded-xl border px-2 py-2 text-xs font-semibold sm:text-sm ${mode === id ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'gradient' ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField label="Start color" value={value.gradientFrom} onChange={(gradientFrom) => onChange({ gradientFrom })} />
            <ColorField label="End color" value={value.gradientTo} onChange={(gradientTo) => onChange({ gradientTo })} />
          </div>
          <label className="block text-sm">
            <span className="flex items-center justify-between font-medium text-slate-800">
              Angle
              <span className="tabular-nums text-slate-500">{value.gradientAngle ?? 180}°</span>
            </span>
            <input
              type="range"
              min="0"
              max="360"
              value={value.gradientAngle ?? 180}
              onChange={(event) => onChange({ gradientAngle: Number(event.target.value) })}
              className="mt-2 w-full"
            />
            <span className="mt-1 block text-[11px] text-slate-500">180 is top to bottom.</span>
          </label>
          <label className="block text-sm">
            <span className="flex items-center justify-between font-medium text-slate-800">
              Spread
              <span className="tabular-nums text-slate-500">{value.gradientPosition}</span>
            </span>
            <input
              type="range"
              min="1"
              max="100"
              value={value.gradientPosition}
              onChange={(event) => onChange({ gradientPosition: Number(event.target.value) })}
              className="mt-2 w-full"
            />
          </label>
        </div>
      ) : null}
      {mode === 'media' ? (
        <div className="mt-4">
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {value.backgroundMediaUrl && value.backgroundMediaKind === 'video' ? (
              <video src={value.backgroundMediaUrl} className="h-full w-full object-cover" muted playsInline />
            ) : null}
            {value.backgroundMediaUrl && value.backgroundMediaKind !== 'video' ? (
              <img src={value.backgroundMediaUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
            {!value.backgroundMediaUrl ? <span className="text-xs text-slate-400">JPEG, PNG, WebP, GIF, or video</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Upload background
              <input
                type="file"
                accept={BACKGROUND_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  onFile(file);
                }}
              />
            </label>
            {value.backgroundMediaUrl ? (
              <button
                type="button"
                className="text-xs font-semibold text-rose-700"
                onClick={() => onChange({ backgroundMediaUrl: '', backgroundMediaKind: 'image' })}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {mode === 'color' ? (
        <div className="mt-4">
          <ColorField label="Background color" value={value.backgroundColor} onChange={(backgroundColor) => onChange({ backgroundColor })} />
        </div>
      ) : null}
    </div>
  );
}

function fieldClass() {
  return 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900';
}

function SpaceFields({ values, onChange }) {
  const fields = [
    ['heightPx', 'Height'],
    ['marginTopPx', 'Margin top'],
    ['marginBottomPx', 'Margin bottom'],
    ['paddingX', 'Side space'],
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(([key, label]) => (
        <label key={key} className="block text-sm">
          <span className="font-medium text-slate-800">{label}</span>
          <input
            type="number"
            min="0"
            max={key === 'heightPx' ? 160 : 80}
            value={values?.[key] ?? 0}
            onChange={(event) => onChange({ [key]: Number(event.target.value) })}
            className={fieldClass()}
          />
        </label>
      ))}
    </div>
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

function ColorField({ label, value, onChange }) {
  const picker = /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : '#6d35e8';
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

function PageNavbarPreview({ navbar }) {
  const bar = normalizePageNavbar(navbar);
  const icon = bar.iconSizePx;
  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden border border-slate-200"
      style={{ background: appNavbarBackground(bar), minHeight: bar.heightPx, paddingInline: bar.paddingX }}
    >
      <NavbarFill navbar={bar} />
      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
      {bar.backEnabled ? (
        bar.backIconUrl ? (
          <img src={bar.backIconUrl} alt="" style={{ width: icon, height: icon }} className="object-contain" />
        ) : (
          <ChevronLeft size={icon} color={bar.iconColor} strokeWidth={2.4} />
        )
      ) : (
        <span style={{ width: icon }} />
      )}
      {bar.searchEnabled ? (
        <div
          className="flex min-w-0 flex-1 items-center border"
          style={{
            height: Math.max(40, bar.heightPx - 12),
            borderRadius: bar.searchRadiusPx,
            background: bar.searchBackground,
            borderColor: bar.searchBorderColor,
            borderWidth: 1.5,
            paddingLeft: 14,
            paddingRight: 4,
            gap: 8,
          }}
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: bar.searchBorderColor }}>
            {bar.placeholder || 'Search'}
          </span>
          {bar.cameraIconUrl ? (
            <img src={bar.cameraIconUrl} alt="" style={{ width: icon, height: icon }} className="shrink-0 object-contain" />
          ) : (
            <Camera size={icon} color={bar.searchBorderColor} strokeWidth={1.8} className="shrink-0" />
          )}
          <span
            className="flex shrink-0 items-center justify-center"
            style={{
              width: Math.max(32, bar.heightPx - 20),
              height: Math.max(32, bar.heightPx - 20),
              borderRadius: 10,
              backgroundColor: bar.searchButtonColor,
            }}
          >
            {bar.searchIconUrl ? (
              <img src={bar.searchIconUrl} alt="" style={{ width: Math.round(icon * 0.9), height: Math.round(icon * 0.9) }} className="object-contain" />
            ) : (
              <Search size={Math.round(icon * 0.9)} color="#ffffff" strokeWidth={2.4} />
            )}
          </span>
        </div>
      ) : (
        <span className="flex-1" />
      )}
      {bar.heartEnabled ? (
        bar.heartIconUrl ? (
          <img src={bar.heartIconUrl} alt="" style={{ width: icon, height: icon }} className="object-contain" />
        ) : (
          <Heart size={icon} color={bar.iconColor} strokeWidth={2.2} />
        )
      ) : (
        <span style={{ width: icon }} />
      )}
      </div>
    </div>
  );
}

function slideTopFill(slide) {
  if (slide?.topBackgroundMode === 'gradient') {
    const angle = Number(slide.topGradientAngle);
    const degrees = Number.isFinite(angle) ? angle : 180;
    const from = slide.topGradientFrom || '#8b5cf6';
    const to = slide.topGradientTo || '#5b21b6';
    const position = slide.topGradientPosition ?? 100;
    return `linear-gradient(${degrees}deg, ${from} 0%, ${to} ${position}%)`;
  }
  return slide?.topBackgroundColor || 'transparent';
}

function NavbarPreview({ navbar, slider }) {
  const config = normalizeAppNavbar(navbar);
  const visible = config.items.filter((item) => item.enabled && (item.iconUrl || item.text));
  const loop = visible.length ? [...visible, ...visible] : [];
  const slides = (Array.isArray(slider?.slides) ? slider.slides : []).filter((slide) => slide && slide.enabled !== false && (slide.image || slide.video));
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2 || slider?.enabled === false) return undefined;
    const seconds = Math.max(2, Number(slider.slideIntervalSeconds) || SLIDER_META.defaultIntervalSeconds);
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length);
    }, seconds * 1000);
    return () => window.clearInterval(timer);
  }, [slides.length, slider?.enabled, slider?.slideIntervalSeconds]);
  const activeIndex = slides.length ? slideIndex % slides.length : 0;
  const activeSlide = slides[activeIndex] || null;
  const fontColor = activeSlide?.fontColor || '';
  const colorEase = 'background-color 600ms ease, color 600ms ease, border-color 600ms ease';

  return (
    <div
      className="relative flex flex-col overflow-hidden border border-slate-300 shadow-sm"
      style={{
        background: appNavbarBackground(config),
        transition: colorEase,
        borderTopLeftRadius: config.radiusTopLeft,
        borderTopRightRadius: config.radiusTopRight,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }}
    >
      <NavbarFill navbar={config} />
      {slides.map((slide, index) => (
        <div
          key={`top-${slide.id || index}`}
          className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: index === activeIndex ? 1 : 0, background: slideTopFill(slide) }}
        >
          {slide.topBackgroundMode === 'media' && slide.topBackgroundMediaUrl ? (
            slide.topBackgroundMediaKind === 'video' ? (
              <video src={slide.topBackgroundMediaUrl} className="h-full w-full object-cover" autoPlay muted loop playsInline />
            ) : (
              <img src={slide.topBackgroundMediaUrl} alt="" className="h-full w-full object-cover" />
            )
          ) : null}
        </div>
      ))}
      <div className="relative z-10 flex flex-col">
      <style>{'@keyframes store1920NavMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }'}</style>
      {config.marqueeEnabled && loop.length ? (
        <div
          className="flex items-center overflow-hidden"
          style={{
            height: config.marqueeHeightPx,
            marginTop: config.marqueeMarginTopPx,
            marginBottom: config.marqueeMarginBottomPx,
            paddingInline: config.marqueePaddingX,
          }}
        >
          <div
            className="flex w-max items-center"
            style={{ animation: `store1920NavMarquee ${config.marqueeSpeedSeconds}s linear infinite` }}
          >
            {loop.map((item, index) => (
              <span
                key={`${item.id}-${index}`}
                className="inline-flex shrink-0 items-center font-semibold text-white"
                style={{
                  color: fontColor || item.color || config.marqueeTextColor,
                  fontSize: config.marqueeFontSizePx,
                  paddingInline: config.marqueeGapPx / 2,
                  gap: 6,
                  transition: 'color 600ms ease',
                }}
              >
                {item.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.iconUrl} alt="" style={{ width: config.marqueeIconSizePx, height: config.marqueeIconSizePx }} className="object-contain" />
                ) : null}
                {item.text ? <span className="whitespace-nowrap">{item.text}</span> : null}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-3" />
      )}

      <div
        className="flex items-start gap-2"
        style={{
          minHeight: config.logoRowHeightPx,
          marginTop: config.logoRowMarginTopPx,
          marginBottom: config.logoRowMarginBottomPx,
          paddingInline: config.logoRowPaddingX,
          color: fontColor || config.locationColor,
          transition: 'color 600ms ease',
        }}
      >
        <MapPin size={18} className="mt-0.5 shrink-0" />
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold leading-tight">Deliver to</span>
          <span className="block truncate text-[11px] leading-tight opacity-90">Address 123 Road 123 Street 123 Building 123</span>
        </span>
      </div>

      {config.search.enabled ? (
        <div
          className="flex items-center gap-2"
          style={{
            marginTop: config.search.marginTopPx,
            marginBottom: config.search.marginBottomPx,
            paddingInline: config.search.paddingX,
          }}
        >
          <div
            className="flex min-w-0 flex-1 items-center border"
            style={{
              height: config.search.heightPx,
              borderRadius: config.search.radiusPx,
              backgroundColor: config.search.backgroundColor,
              borderColor: fontColor || config.search.borderColor,
              borderWidth: 1.5,
              transition: colorEase,
              paddingLeft: 16,
              paddingRight: 4,
              gap: 10,
            }}
          >
            <span
              className="min-w-0 flex-1 truncate font-medium"
              style={{ color: fontColor || config.search.textColor, fontSize: Math.max(14, config.search.iconSizePx - 1), transition: 'color 600ms ease' }}
            >
              {config.search.placeholder || 'Search'}
            </span>
            {config.search.cameraIconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.search.cameraIconUrl} alt="" style={{ width: config.search.iconSizePx, height: config.search.iconSizePx }} className="shrink-0 object-contain" />
            ) : (
              <Camera size={config.search.iconSizePx} strokeWidth={1.8} className="shrink-0" style={{ color: fontColor || config.search.borderColor, transition: 'color 600ms ease' }} />
            )}
            <span
              className="flex shrink-0 items-center justify-center"
              style={{
                width: Math.max(32, config.search.heightPx - 10),
                height: Math.max(32, config.search.heightPx - 10),
                borderRadius: Math.min(12, config.search.menuButtonRadius),
                backgroundColor: fontColor || config.search.buttonColor,
                transition: 'background-color 600ms ease',
              }}
            >
              {config.search.searchIconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.search.searchIconUrl} alt="" style={{ width: config.search.iconSizePx, height: config.search.iconSizePx }} className="object-contain" />
              ) : (
                <Search size={config.search.iconSizePx} color="#ffffff" strokeWidth={2.4} />
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="h-3" />
      )}

      {slider?.enabled !== false ? (
        <div>
          <div
            className="relative overflow-hidden bg-white/40"
            style={{ height: slider?.heightPx || SLIDER_META.defaultHeightPx }}
          >
            {slides.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">Banner slider</div>
            ) : slides.map((slide, index) => (
              <div
                key={slide.id || index}
                className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                style={{ opacity: index === activeIndex ? 1 : 0 }}
              >
                {slide.video && slide.mediaType === 'video' ? (
                  <video src={slide.video} className="h-full w-full object-cover" muted autoPlay loop playsInline />
                ) : slide.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.image} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
            ))}
          {slides.length > 1 ? (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {slides.map((slide, index) => (
                <span
                  key={slide.id || index}
                  className="h-1.5 rounded-full"
                  style={{
                    width: index === activeIndex ? 14 : 6,
                    backgroundColor: index === activeIndex ? (fontColor || config.locationColor) : '#ffffff',
                    opacity: index === activeIndex ? 1 : 0.7,
                    transition: 'width 600ms ease, background-color 600ms ease',
                  }}
                />
              ))}
            </div>
          ) : null}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

export default function MobileNavbarEditor() {
  const { getToken } = useAuth();
  const [form, setForm] = useState(() => normalizeAppNavbar());
  const [slider, setSlider] = useState(() => normalizeBannerSection('bannerSlider', {}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [openPanel, setOpenPanel] = useState('');
  const [which, setWhich] = useState('home');
  const togglePanel = (id) => setOpenPanel((current) => (current === id ? '' : id));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/mobile-features', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const features = normalizeMobileFeatures(data?.mobileFeatures);
      setForm(normalizeAppNavbar(features.appNavbar));
      setSlider(normalizeBannerSection('bannerSlider', features.bannerSlider));
    } catch (error) {
      console.error(error);
      toast.error('Could not load the navbar');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (next) => setForm((prev) => ({ ...prev, ...next }));
  const patchSearch = (next) => setForm((prev) => ({ ...prev, search: { ...prev.search, ...next } }));
  const patchPage = (next) => setForm((prev) => ({ ...prev, pageNavbar: { ...normalizePageNavbar(prev.pageNavbar), ...next } }));

  const uploadBackground = async (file, onPatch, uploadKey = 'background') => {
    if (!file) return;
    try {
      setUploading(uploadKey);
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in again to upload');
        return;
      }
      const kind = mediaKindForFile(file);
      const { uploadStoreImage } = await import('@/lib/uploadStoreImage');
      const data = await uploadStoreImage(file, {
        token,
        type: 'banner',
        maxBytes: 8 * 1024 * 1024,
        compress: kind !== 'video' && file.type !== 'image/gif' && !String(file.name || '').toLowerCase().endsWith('.gif'),
      });
      const url = data?.url;
      if (!url) throw new Error('Upload failed');
      onPatch({
        backgroundMode: 'media',
        backgroundMediaUrl: url,
        backgroundMediaKind: kind,
      });
      toast.success(String(uploadKey).startsWith('slide-') ? 'Banner uploaded. Save to publish it.' : 'Background uploaded. Save to publish it.');
    } catch (error) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setUploading('');
    }
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
        maxWidth: 1600,
        maxHeight: 1600,
        maxBytes: 8 * 1024 * 1024,
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

  const updateItem = (index, itemPatch) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...itemPatch };
      return { ...prev, items };
    });
  };

  const moveItem = (index, direction) => {
    setForm((prev) => {
      const items = [...prev.items];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...prev, items };
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      await axios.put('/api/store/mobile-features', {
        mobileFeatures: {
          appNavbar: normalizeAppNavbar(form),
            bannerSlider: normalizeBannerSection('bannerSlider', {
            ...slider,
            useWebsiteHomeBanners: (slider.slides || []).some((slide) => slide.image || slide.video)
              ? false
              : slider.useWebsiteHomeBanners,
          }),
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Navbar saved');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save the navbar');
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
          <PanelTop size={14} />
          Navbar
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Mobile navbar</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-50 sm:text-base">
          Home is the tab background, marquee, Deliver to line, search, and banner slider. Other pages is the back, search, and heart bar.
        </p>
      </div>

      <div className="px-4 pt-6 lg:px-8">
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {[
            ['home', 'Home'],
            ['pages', 'Other pages'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setWhich(id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${which === id ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:px-8 lg:py-8">
        {which === 'pages' ? (
          <>
            <PageNavbarFields
              bar={normalizePageNavbar(form.pageNavbar)}
              uploading={uploading}
              saving={saving}
              onPatch={patchPage}
              onUpload={uploadImage}
              onBackgroundFile={(file) => uploadBackground(file, patchPage)}
              onSave={save}
            />
            <aside className="space-y-2 lg:sticky lg:top-4">
              <PageNavbarPreview navbar={form.pageNavbar} />
              <p className="text-xs leading-5 text-slate-500">Shown on every page except home. A tap on the heart opens saved items. Search stays a search field.</p>
            </aside>
          </>
        ) : (
        <div className="contents">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">Show this header</span>
              <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => patch({ enabled })} />
            </div>
          </section>


          <SettingsPanel title="Tab background" open={openPanel === 'background'} onToggle={() => togglePanel('background')}>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['radiusTopLeft', 'Top left'],
                ['radiusTopRight', 'Top right'],
              ].map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="font-medium text-slate-800">{label}</span>
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={form[key] ?? 0}
                    onChange={(event) => patch({ [key]: Number(event.target.value) })}
                    className={fieldClass()}
                  />
                </label>
              ))}
            </div>
            <div className="mt-3">
              <BackgroundChoices
                value={form}
                onChange={patch}
                uploading={uploading === 'background'}
                onFile={(file) => uploadBackground(file, patch)}
              />
            </div>
          </SettingsPanel>

          <SettingsPanel
            title="Marquee"
            open={openPanel === 'marquee'}
            onToggle={() => togglePanel('marquee')}
            aside={(
              <EnableSwitch enabled={form.marqueeEnabled !== false} onChange={(enabled) => patch({ marqueeEnabled: enabled })} />
            )}
          >
            <div className="space-y-4">
              <SpaceFields
                values={{
                  heightPx: form.marqueeHeightPx,
                  marginTopPx: form.marqueeMarginTopPx,
                  marginBottomPx: form.marqueeMarginBottomPx,
                  paddingX: form.marqueePaddingX,
                }}
                onChange={(next) => patch({
                  ...(next.heightPx != null ? { marqueeHeightPx: next.heightPx } : {}),
                  ...(next.marginTopPx != null ? { marqueeMarginTopPx: next.marginTopPx } : {}),
                  ...(next.marginBottomPx != null ? { marqueeMarginBottomPx: next.marginBottomPx } : {}),
                  ...(next.paddingX != null ? { marqueePaddingX: next.paddingX } : {}),
                })}
              />
              <label className="block text-sm">
                <span className="flex items-center justify-between font-medium text-slate-800">
                  Speed
                  <span className="font-normal text-slate-500">{form.marqueeSpeedSeconds}s for one pass</span>
                </span>
                <input
                  type="range"
                  min="4"
                  max="60"
                  value={form.marqueeSpeedSeconds}
                  onChange={(event) => patch({ marqueeSpeedSeconds: Number(event.target.value) })}
                  className="mt-2 w-full"
                />
                <span className="mt-1 block text-[11px] text-slate-500">A lower number moves faster.</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorField label="Default text color" value={form.marqueeTextColor} onChange={(marqueeTextColor) => patch({ marqueeTextColor })} />
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Space between items</span>
                  <input type="number" min="8" max="80" value={form.marqueeGapPx} onChange={(event) => patch({ marqueeGapPx: Number(event.target.value) })} className={fieldClass()} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Icon size</span>
                  <input type="number" min="12" max="36" value={form.marqueeIconSizePx} onChange={(event) => patch({ marqueeIconSizePx: Number(event.target.value) })} className={fieldClass()} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Text size</span>
                  <input type="number" min="10" max="22" value={form.marqueeFontSizePx} onChange={(event) => patch({ marqueeFontSizePx: Number(event.target.value) })} className={fieldClass()} />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">Lines</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800"
                  onClick={() => {
                    if (form.items.length >= MAX_MARQUEE_ITEMS) {
                      toast.error(`You can add up to ${MAX_MARQUEE_ITEMS} lines`);
                      return;
                    }
                    patch({ items: [...form.items, createEmptyMarqueeItem()] });
                  }}
                >
                  <Plus size={14} />
                  Add line
                </button>
              </div>

              {form.items.map((item, index) => (
                <div key={item.id || index} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">Line {index + 1}</span>
                      <EnableSwitch enabled={item.enabled !== false} onChange={(enabled) => updateItem(index, { enabled })} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={index === 0} onClick={() => moveItem(index, -1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" disabled={index === form.items.length - 1} onClick={() => moveItem(index, 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40">
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" onClick={() => patch({ items: form.items.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-lg border border-slate-200 p-1.5 text-rose-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {item.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.iconUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[9px] text-slate-400">Icon</span>
                      )}
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800">
                      {uploading === `icon-${index}` ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      Upload icon
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          uploadImage(file, `icon-${index}`, (iconUrl) => updateItem(index, { iconUrl }));
                        }}
                      />
                    </label>
                    {item.iconUrl ? (
                      <button type="button" className="text-xs font-semibold text-rose-700" onClick={() => updateItem(index, { iconUrl: '' })}>
                        Remove icon
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ColorField
                      label="Color"
                      value={item.color || form.marqueeTextColor}
                      onChange={(color) => updateItem(index, { color })}
                    />
                    <label className="block text-sm">
                      <span className="font-medium text-slate-800">Text</span>
                      <input value={item.text || ''} onChange={(event) => updateItem(index, { text: event.target.value.slice(0, 80) })} className={fieldClass()} placeholder="Cash On Delivery" />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-slate-800">Arabic text</span>
                      <input dir="rtl" value={item.textAr || ''} onChange={(event) => updateItem(index, { textAr: event.target.value.slice(0, 80) })} className={fieldClass()} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </SettingsPanel>

          <SettingsPanel title="Deliver to" open={openPanel === 'logo'} onToggle={() => togglePanel('logo')}>
            <div>
              <SpaceFields
                values={{
                  heightPx: form.logoRowHeightPx,
                  marginTopPx: form.logoRowMarginTopPx,
                  marginBottomPx: form.logoRowMarginBottomPx,
                  paddingX: form.logoRowPaddingX,
                }}
                onChange={(next) => patch({
                  ...(next.heightPx != null ? { logoRowHeightPx: next.heightPx } : {}),
                  ...(next.marginTopPx != null ? { logoRowMarginTopPx: next.marginTopPx } : {}),
                  ...(next.marginBottomPx != null ? { logoRowMarginBottomPx: next.marginBottomPx } : {}),
                  ...(next.paddingX != null ? { logoRowPaddingX: next.paddingX } : {}),
                })}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ColorField label="Deliver to color" value={form.locationColor} onChange={(locationColor) => patch({ locationColor })} />
              <ColorField label="Language color" value={form.languageColor} onChange={(languageColor) => patch({ languageColor })} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] text-slate-400">No logo</span>
                )}
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                {uploading === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Upload image or GIF
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,.gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    uploadImage(file, 'logo', (logoUrl) => patch({ logoUrl }));
                  }}
                />
              </label>
              {form.logoUrl ? (
                <button type="button" className="text-xs font-semibold text-rose-700" onClick={() => patch({ logoUrl: '' })}>
                  Remove
                </button>
              ) : null}
              <p className="w-full text-xs leading-5 text-slate-500">Header mark beside Deliver to. PNG, JPG, WEBP, or GIF. The phone’s main app icon is set on the App icon page.</p>
            </div>
          </SettingsPanel>

          <SettingsPanel
            title="Search"
            open={openPanel === 'search'}
            onToggle={() => togglePanel('search')}
            aside={(
              <EnableSwitch enabled={form.search?.enabled !== false} onChange={(enabled) => patchSearch({ enabled })} />
            )}
          >
            <div className="space-y-4">
              <SpaceFields
                values={{
                  heightPx: form.search?.heightPx,
                  marginTopPx: form.search?.marginTopPx,
                  marginBottomPx: form.search?.marginBottomPx,
                  paddingX: form.search?.paddingX,
                }}
                onChange={patchSearch}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Hint</span>
                  <input value={form.search?.placeholder || ''} onChange={(event) => patchSearch({ placeholder: event.target.value.slice(0, 40) })} className={fieldClass()} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Arabic hint</span>
                  <input dir="rtl" value={form.search?.placeholderAr || ''} onChange={(event) => patchSearch({ placeholderAr: event.target.value.slice(0, 40) })} className={fieldClass()} />
                </label>
                <ColorField label="Bar color" value={form.search?.backgroundColor} onChange={(backgroundColor) => patchSearch({ backgroundColor })} />
                <ColorField label="Hint color" value={form.search?.textColor} onChange={(textColor) => patchSearch({ textColor })} />
                <ColorField label="Border color" value={form.search?.borderColor} onChange={(borderColor) => patchSearch({ borderColor })} />
                <ColorField label="Search button color" value={form.search?.buttonColor} onChange={(buttonColor) => patchSearch({ buttonColor, menuButtonColor: buttonColor })} />
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Search button corners</span>
                  <input type="number" min="0" max="24" value={form.search?.menuButtonRadius ?? 14} onChange={(event) => patchSearch({ menuButtonRadius: Number(event.target.value) })} className={fieldClass()} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Corner radius</span>
                  <input type="number" min="0" max="40" value={form.search?.radiusPx ?? 28} onChange={(event) => patchSearch({ radiusPx: Number(event.target.value) })} className={fieldClass()} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Icon size</span>
                  <input type="number" min="12" max="28" value={form.search?.iconSizePx || 18} onChange={(event) => patchSearch({ iconSizePx: Number(event.target.value) })} className={fieldClass()} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['cameraIconUrl', 'Camera icon', 'camera'],
                  ['searchIconUrl', 'Search button icon', 'search'],
                ].map(([key, label, uploadKey]) => (
                  <div key={key} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-medium text-slate-800">{label}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {form.search?.[key] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={form.search[key]} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-[9px] text-slate-400">Icon</span>
                        )}
                      </span>
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-800">
                        {uploading === uploadKey ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        Upload
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            uploadImage(file, uploadKey, (url) => patchSearch({ [key]: url }));
                          }}
                        />
                      </label>
                    </div>
                    {form.search?.[key] ? (
                      <button type="button" className="mt-2 text-[11px] font-semibold text-rose-700" onClick={() => patchSearch({ [key]: '' })}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </SettingsPanel>

          <SettingsPanel
            title="Banner slider"
            open={openPanel === 'slider'}
            onToggle={() => togglePanel('slider')}
            aside={(
              <EnableSwitch enabled={slider.enabled !== false} onChange={(enabled) => setSlider((prev) => ({ ...prev, enabled }))} />
            )}
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Slider speed (seconds)</span>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={slider.slideIntervalSeconds ?? SLIDER_META.defaultIntervalSeconds}
                    onChange={(event) => setSlider((prev) => ({ ...prev, slideIntervalSeconds: Number(event.target.value) || SLIDER_META.defaultIntervalSeconds }))}
                    className={fieldClass()}
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">How long each banner stays before the next one.</span>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Banner height</span>
                  <input
                    type="number"
                    min={SLIDER_META.minHeightPx}
                    max={SLIDER_META.maxHeightPx}
                    value={slider.heightPx ?? SLIDER_META.defaultHeightPx}
                    onChange={(event) => setSlider((prev) => ({ ...prev, heightPx: Number(event.target.value) || SLIDER_META.defaultHeightPx }))}
                    className={fieldClass()}
                  />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">Banners</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800"
                  onClick={() => setSlider((prev) => {
                    const slides = Array.isArray(prev.slides) ? prev.slides : [];
                    if (slides.length >= SLIDER_META.maxItems) {
                      toast.error(`You can add up to ${SLIDER_META.maxItems} banners`);
                      return prev;
                    }
                    return { ...prev, slides: [...slides, createEmptySlide({ title: '' })] };
                  })}
                >
                  <Plus size={14} />
                  Add banner
                </button>
              </div>
              {(slider.slides || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                  <ImagePlus className="mx-auto text-slate-400" size={28} />
                  <p className="mt-2 text-sm text-slate-600">Upload a banner, then set where a tap should go.</p>
                </div>
              ) : null}
              {(slider.slides || []).map((slide, index) => (
                <div key={slide.id || index} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">Banner {index + 1}</span>
                      <EnableSwitch
                        enabled={slide.enabled !== false}
                        onChange={(enabled) => setSlider((prev) => ({
                          ...prev,
                          slides: prev.slides.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled } : item)),
                        }))}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => setSlider((prev) => {
                          const slides = [...prev.slides];
                          [slides[index - 1], slides[index]] = [slides[index], slides[index - 1]];
                          return { ...prev, slides };
                        })}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === slider.slides.length - 1}
                        onClick={() => setSlider((prev) => {
                          const slides = [...prev.slides];
                          [slides[index + 1], slides[index]] = [slides[index], slides[index + 1]];
                          return { ...prev, slides };
                        })}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlider((prev) => ({ ...prev, slides: prev.slides.filter((_, itemIndex) => itemIndex !== index) }))}
                        className="rounded-lg border border-slate-200 p-1.5 text-rose-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {slide.mediaType === 'video' && slide.video ? (
                      <video src={slide.video} className="aspect-[16/7] w-full object-cover" muted playsInline />
                    ) : null}
                    {slide.image && slide.mediaType !== 'video' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slide.image} alt="" className="aspect-[16/7] w-full object-cover" />
                    ) : null}
                    {!slide.image && !(slide.mediaType === 'video' && slide.video) ? (
                      <div className="flex aspect-[16/7] items-center justify-center text-xs text-slate-400">No banner yet</div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                      {uploading === `slide-${index}` ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      Upload banner
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (!file) return;
                          const kind = mediaKindForFile(file);
                          uploadBackground(file, (next) => {
                            setSlider((prev) => ({
                              ...prev,
                              slides: prev.slides.map((item, itemIndex) => (
                                itemIndex === index
                                  ? (kind === 'video'
                                    ? { ...item, video: next.backgroundMediaUrl, mediaType: 'video' }
                                    : { ...item, image: next.backgroundMediaUrl, mediaType: 'image', video: '' })
                                  : item
                              )),
                            }));
                          }, `slide-${index}`);
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-800">Top background</p>
                    <p className="mt-1 text-xs text-slate-500">Used above this banner while it is showing. A solid color, a linear gradient, or an image, GIF, or video.</p>
                    <div className="mt-3">
                      <BackgroundChoices
                        value={{
                          backgroundMode: slide.topBackgroundMode || 'color',
                          backgroundColor: slide.topBackgroundColor || form.backgroundColor,
                          gradientFrom: slide.topGradientFrom || '#8b5cf6',
                          gradientTo: slide.topGradientTo || '#5b21b6',
                          gradientAngle: slide.topGradientAngle ?? 180,
                          gradientPosition: slide.topGradientPosition ?? 100,
                          backgroundMediaUrl: slide.topBackgroundMediaUrl || '',
                          backgroundMediaKind: slide.topBackgroundMediaKind || 'image',
                        }}
                        onChange={(patch) => setSlider((prev) => ({
                          ...prev,
                          slides: prev.slides.map((item, itemIndex) => {
                            if (itemIndex !== index) return item;
                            return {
                              ...item,
                              ...(patch.backgroundMode != null ? { topBackgroundMode: patch.backgroundMode } : {}),
                              ...(patch.backgroundColor != null ? { topBackgroundColor: patch.backgroundColor } : {}),
                              ...(patch.gradientFrom != null ? { topGradientFrom: patch.gradientFrom } : {}),
                              ...(patch.gradientTo != null ? { topGradientTo: patch.gradientTo } : {}),
                              ...(patch.gradientAngle != null ? { topGradientAngle: patch.gradientAngle } : {}),
                              ...(patch.gradientPosition != null ? { topGradientPosition: patch.gradientPosition } : {}),
                              ...(patch.backgroundMediaUrl != null ? { topBackgroundMediaUrl: patch.backgroundMediaUrl } : {}),
                              ...(patch.backgroundMediaKind != null ? { topBackgroundMediaKind: patch.backgroundMediaKind } : {}),
                            };
                          }),
                        }))}
                        uploading={uploading === `top-${index}`}
                        onFile={(file) => uploadBackground(file, (next) => {
                          setSlider((prev) => ({
                            ...prev,
                            slides: prev.slides.map((item, itemIndex) => (
                              itemIndex === index
                                ? {
                                  ...item,
                                  topBackgroundMode: 'media',
                                  topBackgroundMediaUrl: next.backgroundMediaUrl,
                                  topBackgroundMediaKind: next.backgroundMediaKind,
                                }
                                : item
                            )),
                          }));
                        }, `top-${index}`)}
                      />
                    </div>
                    <div className="mt-4 max-w-xs">
                      <ColorField
                        label="Font color"
                        value={slide.fontColor || form.marqueeTextColor}
                        onChange={(fontColor) => setSlider((prev) => ({
                          ...prev,
                          slides: prev.slides.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, fontColor } : item
                          )),
                        }))}
                      />
                    </div>
                  </div>
                  <label className="mt-3 block text-sm">
                    <span className="font-medium text-slate-800">Path</span>
                    <div className="mt-1">
                      <MobilePathPicker
                        value={slide.path || slide.link || ''}
                        onChange={(value) => setSlider((prev) => ({
                          ...prev,
                          slides: prev.slides.map((item, itemIndex) => (
                            itemIndex === index ? { ...item, path: value, link: value } : item
                          )),
                        }))}
                      />
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </SettingsPanel>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save navbar
          </button>
        </div>

        <aside className="lg:sticky lg:top-4 space-y-2">
          <NavbarPreview navbar={form} slider={slider} />
          <p className="text-xs leading-5 text-slate-500">
            Each banner has its own top background and font color. The header above the picture uses the colors of the banner that is showing.
          </p>
        </aside>
        </div>
        )}
      </div>
    </div>
  );
}

function PageNavbarFields({ bar, uploading, saving, onPatch, onUpload, onBackgroundFile, onSave }) {
  const icons = [
    ['backIconUrl', 'Back icon'],
    ['cameraIconUrl', 'Camera icon'],
    ['searchIconUrl', 'Search button icon'],
    ['heartIconUrl', 'Heart icon'],
  ];
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-900">Show this header</span>
          <EnableSwitch enabled={bar.enabled !== false} onChange={(enabled) => onPatch({ enabled })} />
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['backEnabled', 'Back'],
            ['searchEnabled', 'Search'],
            ['heartEnabled', 'Heart'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-sm font-medium text-slate-800">{label}</span>
              <EnableSwitch enabled={bar[key] !== false} onChange={(enabled) => onPatch({ [key]: enabled })} />
            </div>
          ))}
        </div>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Search text</span>
          <input value={bar.placeholder} onChange={(event) => onPatch({ placeholder: event.target.value })} className={fieldClass()} />
        </label>
        <BackgroundChoices
          value={bar}
          onChange={onPatch}
          uploading={uploading === 'background'}
          onFile={onBackgroundFile}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <ColorField label="Back and heart" value={bar.iconColor} onChange={(value) => onPatch({ iconColor: value })} />
          <ColorField label="Search background" value={bar.searchBackground} onChange={(value) => onPatch({ searchBackground: value })} />
          <ColorField label="Search border" value={bar.searchBorderColor} onChange={(value) => onPatch({ searchBorderColor: value })} />
          <ColorField label="Search button" value={bar.searchButtonColor} onChange={(value) => onPatch({ searchButtonColor: value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['heightPx', 'Height', 44, 96],
            ['paddingX', 'Side space', 0, 32],
            ['searchRadiusPx', 'Search corner', 0, 40],
            ['iconSizePx', 'Icon size', 14, 32],
          ].map(([key, label, min, max]) => (
            <label key={key} className="block text-sm">
              <span className="font-medium text-slate-800">{label}</span>
              <input type="number" min={min} max={max} value={bar[key]} onChange={(event) => onPatch({ [key]: Number(event.target.value) })} className={fieldClass()} />
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {icons.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">{label}</p>
              <div className="mt-2 flex h-12 items-center justify-center rounded-lg bg-slate-50">
                {bar[key] ? <img src={bar[key]} alt="" className="h-7 w-7 object-contain" /> : <span className="text-[11px] text-slate-400">Default</span>}
              </div>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-800">
                {uploading === key ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Upload
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    onUpload(file, key, (url) => onPatch({ [key]: url }));
                  }}
                />
              </label>
              {bar[key] ? (
                <button type="button" className="mt-2 text-[11px] font-semibold text-rose-700" onClick={() => onPatch({ [key]: '' })}>
                  Use default
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save navbar
      </button>
    </div>
  );
}
