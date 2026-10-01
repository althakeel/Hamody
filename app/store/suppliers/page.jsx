'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import Loading from '@/components/Loading';
import { EMPTY_SUPPLIER } from '@/lib/supplierHelpers';

export default function StoreSuppliersPage() {
  const { getToken, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_SUPPLIER);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = useCallback(async () => {
    const token = await getToken?.();
    if (!token) throw new Error('Sign in required');
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await authHeaders();
      const { data } = await axios.get('/api/store/suppliers', { headers });
      setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to load suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (user) loadSuppliers();
  }, [user, loadSuppliers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) => {
      const haystack = [
        supplier.name,
        supplier.contactName,
        supplier.company,
        supplier.email,
        supplier.phone,
        supplier.city,
        supplier.country,
        supplier.trn,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [suppliers, search]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_SUPPLIER });
    setFormOpen(true);
  };

  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || '',
      contactName: supplier.contactName || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      company: supplier.company || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || '',
      trn: supplier.trn || '',
      notes: supplier.notes || '',
      isActive: supplier.isActive !== false,
    });
    setFormOpen(true);
  };

  useEffect(() => {
    if (!formOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeForm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen, saving]);

  const saveSupplier = async () => {
    if (!form.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    try {
      setSaving(true);
      const headers = await authHeaders();
      if (editingId) {
        await axios.patch(`/api/store/suppliers/${editingId}`, form, { headers });
        toast.success('Supplier updated');
      } else {
        await axios.post('/api/store/suppliers', form, { headers });
        toast.success('Supplier added');
      }
      setFormOpen(false);
      setEditingId(null);
      await loadSuppliers();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (supplier) => setDeleteTarget(supplier);
  const closeDeletePopup = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const deleteSupplier = async () => {
    if (!deleteTarget?.id) return;
    try {
      setDeleting(true);
      const headers = await authHeaders();
      await axios.delete(`/api/store/suppliers/${deleteTarget.id}`, { headers });
      toast.success('Supplier deleted');
      if (editingId === deleteTarget.id) closeForm();
      setDeleteTarget(null);
      await loadSuppliers();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to delete supplier');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && suppliers.length === 0) return <Loading />;

  return (
    <div className="w-full max-w-6xl" lang="en" dir="ltr">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-500">
            Store <span className="font-medium text-slate-800">Suppliers</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Add supplier names and contact details. Use this list when you need to track who supplies your products.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          <Plus className="h-4 w-4" />
          Add supplier
        </button>
      </div>

      <div className="max-w-3xl">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Your suppliers</h2>
            <span className="text-xs text-slate-500">{suppliers.length}</span>
          </div>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, company, phone…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 ps-8 pe-3 text-sm"
            />
          </label>
          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {suppliers.length === 0
                ? 'No suppliers yet. Use Add supplier to enter a name and contact details.'
                : 'No suppliers match this search.'}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {filtered.map((supplier) => (
                <div
                  key={supplier.id}
                  onClick={() => startEdit(supplier)}
                  className={`cursor-pointer rounded-xl border px-3 py-3 ${
                    editingId === supplier.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-start">
                      <div className="truncate text-sm font-semibold text-slate-900">{supplier.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {supplier.isActive ? 'Active' : 'Inactive'}
                        {supplier.company ? ` · ${supplier.company}` : ''}
                        {supplier.trn ? ` · TRN ${supplier.trn}` : ''}
                        {supplier.phone ? ` · ${supplier.phone}` : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        title="Edit"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEdit(supplier);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          askDelete(supplier);
                        }}
                        className="rounded-lg border border-red-100 bg-white p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {formOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={closeForm}
          role="presentation"
        >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="supplier-form-title"
          className="max-h-[min(90vh,820px)] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="supplier-form-title" className="text-sm font-semibold text-slate-900">
              {editingId ? 'Edit supplier' : 'Add supplier'}
            </h2>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setField('isActive', event.target.checked)}
                />
                Active
              </label>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-600 sm:col-span-2">
              Supplier name
              <input
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Al Thakeel Trading"
              />
            </label>
            <label className="block text-xs text-slate-600">
              Company
              <input
                value={form.company}
                onChange={(event) => setField('company', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Company name"
              />
            </label>
            <label className="block text-xs text-slate-600">
              Contact name
              <input
                value={form.contactName}
                onChange={(event) => setField('contactName', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ahmed"
              />
            </label>
            <label className="block text-xs text-slate-600">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setField('email', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="supplier@example.com"
              />
            </label>
            <label className="block text-xs text-slate-600">
              Phone
              <input
                value={form.phone}
                onChange={(event) => setField('phone', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="050 000 0000"
              />
            </label>
            <label className="block text-xs text-slate-600">
              City
              <input
                value={form.city}
                onChange={(event) => setField('city', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Sharjah"
              />
            </label>
            <label className="block text-xs text-slate-600">
              Country
              <input
                value={form.country}
                onChange={(event) => setField('country', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="United Arab Emirates"
              />
            </label>
            <label className="block text-xs text-slate-600 sm:col-span-2">
              TRN
              <input
                value={form.trn}
                onChange={(event) => setField('trn', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tax Registration Number"
              />
            </label>
            <label className="block text-xs text-slate-600 sm:col-span-2">
              Address
              <input
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Warehouse address"
              />
            </label>
            <label className="block text-xs text-slate-600 sm:col-span-2">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => setField('notes', event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Payment terms, lead time, or other details"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveSupplier}
              disabled={saving || !form.name.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add supplier'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </section>
        </div>
        ) : null}
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={closeDeletePopup}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-delete-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="supplier-delete-title" className="text-base font-semibold text-slate-900">
                  Delete supplier
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Delete <span className="font-semibold text-slate-800">{deleteTarget.name}</span>? This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeletePopup}
                disabled={deleting}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={closeDeletePopup}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteSupplier}
                disabled={deleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
