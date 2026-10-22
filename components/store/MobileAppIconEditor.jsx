'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Image as ImageIcon, Loader2, Save, Upload } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { normalizeMobileFeatures } from '@/lib/mobileFeatures';
import { normalizeAppNavbar } from '@/lib/mobileAppNavbar';
import { uploadStoreImage } from '@/lib/uploadStoreImage';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,.gif,.jpg,.jpeg,.png,.webp';

function isGifFile(file) {
  const type = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();
  return type === 'image/gif' || name.endsWith('.gif');
}

function IconPreview({ logoUrl }) {
  return (
    <div className="mx-auto w-[280px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-sm">
      <div className="flex h-[88px] items-center px-4">
        <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/20">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-center text-[9px] font-bold leading-tight text-white">
              store
              <br />
              1920
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function MobileAppIconEditor() {
  const { getToken } = useAuth();
  const [navbar, setNavbar] = useState(() => normalizeAppNavbar());
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
      setNavbar(normalizeAppNavbar(normalizeMobileFeatures(data?.mobileFeatures).appNavbar));
    } catch (error) {
      console.error(error);
      toast.error('Could not load the app icon');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in again to upload');
        return;
      }
      const data = await uploadStoreImage(file, {
        token,
        type: 'navbar-logo',
        compress: !isGifFile(file),
      });
      if (!data?.url) throw new Error('Upload failed');
      setNavbar((prev) => normalizeAppNavbar({ ...prev, logoUrl: data.url }));
      toast.success('Icon uploaded. Save to publish it.');
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
        mobileFeatures: { appNavbar: normalizeAppNavbar(navbar) },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('App icon saved');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save the app icon');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="-mx-3 -mt-3 min-h-full w-full max-w-full overflow-x-hidden bg-white pb-12 sm:-mx-4 sm:-mt-4 lg:-mx-5 lg:-mt-5">
      <div className="border-b border-slate-200 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link href="/store/mobile-features" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} />
          Mobile
        </Link>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <ImageIcon size={14} />
          App icon
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">App icon</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          The icon in the app header. Upload a PNG, JPG, WEBP, or GIF. A GIF keeps playing in the icon box.
        </p>
      </div>

      <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,420px)_280px] lg:px-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 p-4">
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {navbar.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={navbar.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[11px] text-slate-400">No icon</span>
              )}
            </span>
            <div className="space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Upload image or GIF
                <input
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    upload(file);
                  }}
                />
              </label>
              {navbar.logoUrl ? (
                <button
                  type="button"
                  className="block text-xs font-semibold text-rose-700"
                  onClick={() => setNavbar((prev) => normalizeAppNavbar({ ...prev, logoUrl: '' }))}
                >
                  Remove icon
                </button>
              ) : null}
              <p className="text-xs leading-5 text-slate-500">Save after the upload. The app uses this as the header icon.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save app icon
          </button>
        </div>

        <aside className="lg:sticky lg:top-4">
          <IconPreview logoUrl={navbar.logoUrl} />
          <p className="mt-2 text-xs leading-5 text-slate-500">The app crops this into a 56 by 56 box with rounded corners.</p>
        </aside>
      </div>
    </div>
  );
}
