'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, MessageSquare, Save } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { DEFAULT_TAWK_CHAT, normalizeTawkChat } from '@/lib/tawkChatSettings';

export default function TawkChatCustomizePage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(DEFAULT_TAWK_CHAT.enabled);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/appearance/sections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnabled(normalizeTawkChat(data?.tawkChat).enabled);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load Tawk settings');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const save = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      await axios.post('/api/store/appearance/sections', {
        tawkChat: { enabled },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(enabled ? 'Tawk chat is on' : 'Tawk chat is off');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save Tawk settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/store/customize"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Customize
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Tawk live chat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Show or hide the purple Tawk chat button on the storefront.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Loading settings…
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquare size={16} className="text-violet-600" />
                Enable Tawk chat
              </span>
              <span className="mt-0.5 block text-sm text-slate-500">
                When this is off, customers do not see the purple chat button. The seller dashboard stays without it either way.
              </span>
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm text-slate-600">
              {enabled ? 'Chat button will show on the storefront.' : 'Chat button will stay hidden.'}
            </p>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
