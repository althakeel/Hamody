'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader, Loader2, Save, Upload } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import EnableSwitch from '@/components/store/EnableSwitch';
import { normalizeMobileFeatures } from '@/lib/mobileFeatures';
import { loaderMediaTypeFromFile, normalizeAppLoader } from '@/lib/mobileAppLoader';
import { uploadStoreImage } from '@/lib/uploadStoreImage';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.gif,.mp4,.webm,.mov';

function fieldClass() {
  return 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900';
}

function mediaLabel(type) {
  if (type === 'video') return 'Video';
  if (type === 'gif') return 'GIF';
  return 'Photo';
}

function ColorField({ label, value, onChange }) {
  const picker = /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : '#ffffff';
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

function LoaderPreview({ loader }) {
  const config = normalizeAppLoader(loader);
  const fitClass = config.fit === 'cover' ? 'object-cover' : 'object-contain';
  return (
    <div
      className="relative mx-auto h-[520px] w-[260px] overflow-hidden rounded-[32px] border border-slate-200 shadow-sm"
      style={{ background: config.backgroundColor }}
    >
      {config.url && config.mediaType === 'video' ? (
        <video
          key={config.url}
          src={config.url}
          className={`absolute inset-0 h-full w-full ${fitClass}`}
          muted
          playsInline
          autoPlay
          loop
        />
      ) : null}
      {config.url && config.mediaType !== 'video' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={config.url} alt="" className={`absolute inset-0 h-full w-full ${fitClass}`} />
      ) : null}
      {!config.url ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-slate-400">
          Upload a photo, GIF, or video
        </div>
      ) : null}
    </div>
  );
}

export default function MobileLoaderEditor() {
  const { getToken } = useAuth();
  const [form, setForm] = useState(() => normalizeAppLoader());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/mobile-features', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForm(normalizeAppLoader(normalizeMobileFeatures(data?.mobileFeatures).appLoader));
    } catch (error) {
      console.error(error);
      toast.error('Could not load the loader');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (next) => setForm((prev) => ({ ...prev, ...next }));

  const uploadFile = async (file) => {
    if (!file) return;
    const mediaType = loaderMediaTypeFromFile(file);
    try {
      setUploading(true);
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in again to upload');
        return;
      }
      const data = await uploadStoreImage(file, {
        token,
        type: 'splash',
        compress: mediaType === 'image',
      });
      const url = data?.url || data?.imageUrl || '';
      if (!url) throw new Error('No file URL returned');
      patch({
        url,
        mediaType,
        durationSeconds: mediaType === 'video' ? 0 : (form.durationSeconds || 2),
      });
      toast.success(`${mediaLabel(mediaType)} uploaded. Save to publish it.`);
    } catch (error) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      await axios.put('/api/store/mobile-features', {
        mobileFeatures: { appLoader: normalizeAppLoader(form) },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Loader saved');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save the loader');
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
          <Loader size={14} />
          Loader
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">App loader</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-50 sm:text-base">
          Shown while the app opens. Upload a photo, a GIF, or a video.
        </p>
      </div>

      <div className="grid gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:px-8 lg:py-8">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">Show this loader</span>
              <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => patch({ enabled })} />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {form.url && form.mediaType !== 'video' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="px-1 text-center text-[10px] text-slate-400">{form.url ? 'Video' : 'Empty'}</span>
                )}
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800">
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Upload photo, GIF, or video
                <input
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    uploadFile(file);
                  }}
                />
              </label>
              {form.url ? (
                <button type="button" className="text-xs font-semibold text-rose-700" onClick={() => patch({ url: '', mediaType: 'image' })}>
                  Remove
                </button>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500">
              {form.url ? `${mediaLabel(form.mediaType)} ready.` : 'JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV. Video up to 50 MB.'}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField label="Background" value={form.backgroundColor} onChange={(backgroundColor) => patch({ backgroundColor })} />
              <label className="block text-sm">
                <span className="font-medium text-slate-800">How it fits</span>
                <select
                  value={form.fit === 'contain' ? 'contain' : 'cover'}
                  onChange={(event) => patch({ fit: event.target.value })}
                  className={fieldClass()}
                >
                  <option value="cover">Full screen</option>
                  <option value="contain">Fit inside</option>
                </select>
              </label>
              {form.mediaType !== 'video' ? (
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Show for (seconds)</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.durationSeconds || 2}
                    onChange={(event) => patch({ durationSeconds: Number(event.target.value) })}
                    className={fieldClass()}
                  />
                </label>
              ) : (
                <p className="self-end text-[11px] text-slate-500">A video plays once, then the app continues.</p>
              )}
            </div>
          </section>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save loader
          </button>
        </div>

        <aside className="lg:sticky lg:top-4">
          <LoaderPreview loader={form} />
        </aside>
      </div>
    </div>
  );
}
