'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CheckCircle2, RefreshCcw, Save } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

function formatWhen(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 20) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function scopeLabel(scope) {
  return scope === 'all' ? 'All website cache' : 'Storefront only';
}

export default function StoreCacheSettings() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [settings, setSettings] = useState(null);
  const [scope, setScope] = useState('storefront');
  const [defaultScope, setDefaultScope] = useState('storefront');
  const [justCleared, setJustCleared] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadSettings = async () => {
    const token = await getToken();
    if (!token) return;
    const { data } = await axios.get('/api/store/cache', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSettings(data.settings);
    const nextScope = data.settings?.defaultScope === 'all' ? 'all' : 'storefront';
    setDefaultScope(nextScope);
    setScope(nextScope);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadSettings();
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message || 'Could not load cache settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const { data } = await axios.patch('/api/store/cache', { defaultScope }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(data.settings);
      setScope(data.settings?.defaultScope === 'all' ? 'all' : 'storefront');
      toast.success('Cache settings saved');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setSaving(false);
    }
  };

  const clearCache = async () => {
    setClearing(true);
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/store/cache', { scope }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(data.settings);
      setJustCleared(true);
      setConfirmOpen(false);
      toast.success(data.message || 'Cache cleared');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Loading cache settings...</p>;
  }

  const stats = settings?.stats || { size: 0, active: 0 };
  const history = Array.isArray(settings?.history) ? settings.history : [];

  return (
    <div className="space-y-5">
      {justCleared && settings?.lastClearedAt ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Cache cleared {formatAgo(settings.lastClearedAt)}</p>
            <p className="mt-0.5">
              {scopeLabel(settings.lastScope)} · {settings.lastClearedCount || 0} keys removed
              {settings.lastClearedBy ? ` · ${settings.lastClearedBy}` : ''}
            </p>
            <p className="mt-0.5 text-emerald-800/80">{formatWhen(settings.lastClearedAt)}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cached keys now</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.size}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Keys removed last time</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{settings?.lastClearedCount || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last cleared</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {settings?.lastClearedAt ? formatAgo(settings.lastClearedAt) : 'Not cleared yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">{formatWhen(settings?.lastClearedAt)}</p>
          {settings?.lastClearedBy ? (
            <p className="mt-1 text-xs text-slate-500">{settings.lastClearedBy}</p>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Cache clean settings</h3>
        <p className="mt-1 text-sm text-slate-500">Default scope for the next manual clear.</p>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="defaultScope"
              checked={defaultScope === 'storefront'}
              onChange={() => setDefaultScope('storefront')}
              className="mt-1"
            />
            <span>
              <strong className="text-slate-800">Storefront only</strong>
              <span className="block text-slate-500">Homepage, shop, products, banners, and featured sections.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="defaultScope"
              checked={defaultScope === 'all'}
              onChange={() => setDefaultScope('all')}
              className="mt-1"
            />
            <span>
              <strong className="text-slate-800">All website cache</strong>
              <span className="block text-slate-500">Clears every in-memory API cache on this server.</span>
            </span>
          </label>
        </div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Clear cache now</h3>
        <p className="mt-1 text-sm text-slate-500">Use this when the site still shows old banners, prices, or products after you save.</p>
        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={scope === 'storefront'}
              onChange={() => setScope('storefront')}
            />
            Storefront only
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
            />
            All website cache
          </label>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={clearing}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCcw size={15} />
          {clearing ? 'Clearing...' : 'Clear cache'}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">Clear history</h3>
        <p className="mt-1 text-sm text-slate-500">Each successful clear is saved here so you can see when it happened.</p>
        {history.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Cache has not been cleared yet. Click Clear cache above.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{scopeLabel(entry.scope)}</p>
                  <p className="text-xs text-slate-500">
                    {entry.clearedCount || 0} keys removed
                    {entry.by ? ` · ${entry.by}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-800">{formatAgo(entry.at)}</p>
                  <p className="text-xs text-slate-500">{formatWhen(entry.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" lang="en" dir="ltr" role="dialog" aria-modal="true" aria-labelledby="cache-clear-title">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <RefreshCcw size={18} />
              </span>
              <div className="min-w-0">
                <h3 id="cache-clear-title" className="text-lg font-semibold text-slate-900">Clear cache?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This will clear <span className="font-semibold text-slate-900">{scopeLabel(scope).toLowerCase()}</span> and refresh public pages so visitors see the latest content.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={clearing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clearCache}
                disabled={clearing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <RefreshCcw size={15} />
                {clearing ? 'Clearing...' : 'Yes, clear cache'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
