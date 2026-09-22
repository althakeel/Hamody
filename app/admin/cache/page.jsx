'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { isAdminEmail } from '@/lib/adminEmails';
import { getIdToken, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';

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

export default function AdminCachePage() {
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [settings, setSettings] = useState(null);
  const [scope, setScope] = useState('storefront');
  const [defaultScope, setDefaultScope] = useState('storefront');

  const getToken = async () => {
    if (!auth.currentUser) return null;
    return getIdToken(auth.currentUser, true);
  };

  const loadSettings = async () => {
    const token = await getToken();
    if (!token) return;
    const { data } = await axios.get('/api/admin/cache', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSettings(data.settings);
    const nextScope = data.settings?.defaultScope === 'all' ? 'all' : 'storefront';
    setDefaultScope(nextScope);
    setScope(nextScope);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const allowed = Boolean(user && isAdminEmail(user.email));
      setIsAdmin(allowed);
      setChecked(true);
      if (!allowed) {
        setLoading(false);
        return;
      }
      try {
        await loadSettings();
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const { data } = await axios.patch('/api/admin/cache', { defaultScope }, {
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
    const label = scope === 'all' ? 'all website cache' : 'storefront cache';
    if (!window.confirm(`Clear ${label} now? Public pages will refresh.`)) return;
    setClearing(true);
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/cache', { scope }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(data.settings);
      toast.success(data.message || 'Cache cleared');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setClearing(false);
    }
  };

  if (!checked || loading) return <Loading />;
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        <h1 className="text-2xl font-semibold">Super admin only.</h1>
      </div>
    );
  }

  const stats = settings?.stats || { size: 0, active: 0, expired: 0 };

  return (
    <div className="text-slate-600 max-w-3xl">
      <h1 className="text-2xl text-slate-800 font-medium">Website cache</h1>
      <p className="mt-2 text-sm">
        Super admin only. Use this when the homepage, shop, or product pages show old images or prices after you save.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide">Cached keys</p>
          <p className="mt-1 text-2xl font-medium text-slate-800">{stats.size}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide">Active</p>
          <p className="mt-1 text-2xl font-medium text-slate-800">{stats.active}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide">Last cleared</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{formatWhen(settings?.lastClearedAt)}</p>
          {settings?.lastClearedBy ? (
            <p className="mt-1 text-xs">{settings.lastClearedBy}</p>
          ) : null}
        </div>
      </div>

      <section className="mt-8 rounded-lg border border-slate-200 p-5">
        <h2 className="text-lg font-medium text-slate-800">Cache clean settings</h2>
        <p className="mt-1 text-sm">Default scope for the next manual clear.</p>
        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="defaultScope"
              checked={defaultScope === 'storefront'}
              onChange={() => setDefaultScope('storefront')}
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
          className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 p-5">
        <h2 className="text-lg font-medium text-slate-800">Clear cache now</h2>
        <p className="mt-1 text-sm">This also refreshes public pages so visitors see the latest content.</p>
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
          onClick={clearCache}
          disabled={clearing}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {clearing ? 'Clearing…' : 'Clear cache'}
        </button>
      </section>
    </div>
  );
}
