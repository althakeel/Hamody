'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import Loading from '@/components/Loading';

const EMPTY_FORM = {
  fromPath: '',
  toPath: '',
  statusCode: 301,
  note: '',
};

export default function StoreRedirectsPage() {
  const { getToken, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redirects, setRedirects] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const authHeaders = useCallback(async () => {
    const token = await getToken?.();
    if (!token) throw new Error('Sign in required');
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const loadRedirects = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await authHeaders();
      const { data } = await axios.get('/api/store/redirects', { headers });
      setRedirects(Array.isArray(data.redirects) ? data.redirects : []);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to load redirects');
      setRedirects([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (user) loadRedirects();
  }, [user, loadRedirects]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      fromPath: row.fromPath || '',
      toPath: row.toPath || '',
      statusCode: Number(row.statusCode) === 410 ? 410 : 301,
      note: row.note || '',
    });
    setFormOpen(true);
  };

  const saveRedirect = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const headers = await authHeaders();
      const payload = {
        fromPath: form.fromPath,
        toPath: Number(form.statusCode) === 410 ? '' : form.toPath,
        statusCode: Number(form.statusCode),
        note: form.note,
      };
      if (editingId) {
        await axios.put(`/api/store/redirects/${editingId}`, payload, { headers });
        toast.success('Redirect updated');
      } else {
        await axios.post('/api/store/redirects', payload, { headers });
        toast.success('Redirect added');
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadRedirects();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to save redirect');
    } finally {
      setSaving(false);
    }
  };

  const removeRedirect = async (row) => {
    if (!window.confirm(`Delete the redirect for ${row.fromPath}?`)) return;
    try {
      const headers = await authHeaders();
      await axios.delete(`/api/store/redirects/${row.id}`, { headers });
      toast.success('Redirect deleted');
      if (editingId === row.id) {
        setFormOpen(false);
        setEditingId(null);
      }
      await loadRedirects();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to delete redirect');
    }
  };

  if (loading && redirects.length === 0) return <Loading />;

  return (
    <div className="w-full max-w-6xl" lang="en" dir="ltr">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-500">
            URL <span className="font-medium text-slate-800">Redirects</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Send an old product or category address to a new one with a 301, or return 410 when a product is gone and has no replacement.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          <Plus className="h-4 w-4" />
          Add redirect
        </button>
      </div>

      {formOpen ? (
        <form onSubmit={saveRedirect} className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">{editingId ? 'Edit redirect' : 'New redirect'}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-700">
              Old path
              <input
                required
                value={form.fromPath}
                onChange={(event) => setForm((current) => ({ ...current, fromPath: event.target.value }))}
                placeholder="/category/bath-body"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Status
              <select
                value={form.statusCode}
                onChange={(event) => setForm((current) => ({ ...current, statusCode: Number(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value={301}>301 — permanent redirect</option>
                <option value={410}>410 — gone, no replacement</option>
              </select>
            </label>
            {Number(form.statusCode) === 301 ? (
              <label className="block text-sm text-slate-700 sm:col-span-2">
                New path
                <input
                  required
                  value={form.toPath}
                  onChange={(event) => setForm((current) => ({ ...current, toPath: event.target.value }))}
                  placeholder="/category/beauty-personal-care"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            ) : null}
            <label className="block text-sm text-slate-700 sm:col-span-2">
              Note
              <input
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Optional note for the team"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setEditingId(null); }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Old path</th>
              <th className="px-4 py-3 font-semibold">New path</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {redirects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-slate-500">No redirects yet.</td>
              </tr>
            ) : redirects.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{row.fromPath}</td>
                <td className="px-4 py-3 text-slate-700">{row.statusCode === 410 ? '—' : row.toPath}</td>
                <td className="px-4 py-3 text-slate-700">{row.statusCode}</td>
                <td className="px-4 py-3 text-slate-500">{row.source}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => startEdit(row)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={`Edit ${row.fromPath}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeRedirect(row)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={`Delete ${row.fromPath}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
