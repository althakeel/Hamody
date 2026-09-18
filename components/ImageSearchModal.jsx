'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Camera, ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { compressImageForUpload } from '@/lib/compressImageForUpload';
import { recordStorefrontSearch } from '@/lib/recordStorefrontSearch';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

function pickImageFile(list) {
  return [...(list || [])].find((file) => file?.type?.startsWith('image/')) || null;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

function measureHeaderBottom() {
  if (typeof document === 'undefined') return 0;
  const nodes = document.querySelectorAll('[data-storefront-topbar], [data-storefront-navbar]');
  let bottom = 0;
  nodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.height > 0) bottom = Math.max(bottom, rect.bottom);
  });
  return Math.max(0, Math.round(bottom));
}

export default function ImageSearchModal({ open, onClose, initialFile = null }) {
  const router = useRouter();
  const { t, isArabic } = useStorefrontI18n();
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [headerBottom, setHeaderBottom] = useState(0);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const startedRef = useRef(false);

  const reset = useCallback(() => {
    setPreview('');
    setBusy(false);
    setError('');
    setDragOver(false);
    startedRef.current = false;
  }, []);

  const searchFile = useCallback(async (file) => {
    if (!file) return;
    try {
      setBusy(true);
      setError('');
      const compressed = await compressImageForUpload(file, {
        maxBytes: 700 * 1024,
        maxWidth: 960,
        maxHeight: 960,
        quality: 0.72,
      });
      const previewUrl = await fileToDataUrl(compressed);
      setPreview(previewUrl);

      const body = new FormData();
      body.append('image', compressed, compressed.name || 'search.jpg');
      const response = await fetch('/api/search-by-image', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || t('navbar.imageSearchFailed'));
      }

      const products = data.products || [];
      const relatedProducts = data.relatedProducts || data.recommendedProducts || [];
      sessionStorage.setItem('imageSearchResults', JSON.stringify({
        keyword: data.keyword || '',
        keywords: data.keywords || [],
        products,
        relatedProducts,
        recommendedProducts: relatedProducts,
        previewUrl,
      }));

      if (data.keyword) {
        void recordStorefrontSearch(data.keyword, {
          source: 'navbar',
          resultCount: products.length,
        });
      }

      onClose?.();
      router.push('/search-results?source=image&method=image-search');
    } catch (err) {
      setError(err?.message || t('navbar.imageSearchFailed'));
    } finally {
      setBusy(false);
    }
  }, [onClose, router, t]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return undefined;
    }
    const update = () => setHeaderBottom(measureHeaderBottom());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (initialFile && !startedRef.current) {
      startedRef.current = true;
      void searchFile(initialFile);
    }
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, initialFile, reset, searchFile]);

  useEffect(() => {
    if (!open) return undefined;
    const onPaste = (event) => {
      const file = pickImageFile(event.clipboardData?.files);
      if (!file) return;
      event.preventDefault();
      void searchFile(file);
    };
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose?.();
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, searchFile, busy, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[1100]"
      style={{ top: headerBottom }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close"
        onClick={() => {
          if (!busy) onClose?.();
        }}
      />
      <div
        className="relative mx-auto w-full max-w-[560px] px-3 pt-3 sm:pt-4"
        dir={isArabic ? 'rtl' : 'ltr'}
        role="dialog"
        aria-label={t('navbar.imageSearch')}
      >
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between px-5 pt-4 pb-1">
            <h2 className="text-lg font-semibold text-slate-900">{t('navbar.imageSearch')}</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3 px-5 pb-5 pt-2">
            <p className="text-sm text-slate-500">{t('navbar.imageSearchHint')}</p>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                const file = pickImageFile(event.dataTransfer?.files);
                if (file) void searchFile(file);
              }}
              className={`flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center ${
                dragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              {busy ? (
                <Loader2 className="h-9 w-9 animate-spin text-slate-400" />
              ) : preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="max-h-40 rounded-lg object-contain" />
              ) : (
                <ImagePlus className="h-12 w-12 text-slate-300" />
              )}
              <p className="mt-3 text-sm font-medium text-slate-700">
                {busy ? t('navbar.imageSearchSearching') : t('navbar.imageSearchDrop')}
              </p>
              {!busy ? (
                <>
                  <p className="mt-1 text-xs text-slate-400">{t('navbar.imageSearchOr')}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#e62e04] px-5 py-2 text-sm font-semibold text-white hover:bg-[#cf2803]"
                    >
                      <Upload size={15} />
                      {t('navbar.imageSearchUpload')}
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Camera size={15} />
                      {t('navbar.imageSearchCamera')}
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <p className="text-xs text-slate-400">{t('navbar.imageSearchPaste')}</p>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void searchFile(file);
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void searchFile(file);
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
