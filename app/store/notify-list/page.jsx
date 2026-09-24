'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Bell, ExternalLink, Search } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import Loading from '@/components/Loading';

function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StoreNotifyListPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  const load = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const token = await getToken();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
      });
      if (appliedSearch) params.set('q', appliedSearch);
      if (status !== 'all') params.set('status', status);
      const { data } = await axios.get(`/api/store/notify-list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to load notify list');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, getToken, pagination.limit, status]);

  useEffect(() => {
    load(1);
  }, [load]);

  const markNotified = async (item) => {
    try {
      const token = await getToken();
      const nextStatus = item.status === 'notified' ? 'pending' : 'notified';
      const { data } = await axios.patch('/api/store/notify-list', {
        id: item.id,
        status: nextStatus,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((current) => current.map((row) => (
        row.id === item.id ? { ...row, ...data.item } : row
      )));
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to update request');
    }
  };

  if (loading && items.length === 0) return <Loading />;

  return (
    <div lang="en" dir="ltr" className="flex min-h-full w-full flex-col gap-5 bg-white">
      <div>
        <h1 className="text-2xl text-slate-500">
          Notify <span className="font-medium text-slate-800">list</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Customers who asked to be notified when an out-of-stock product is back. Email or phone is saved here.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Search</span>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setAppliedSearch(search.trim());
              }}
              placeholder="Email, phone, product, SKU"
              className="w-full rounded-lg border border-slate-200 py-2.5 ps-10 pe-3 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="notified">Notified</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setAppliedSearch(search.trim())}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Search
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Bell size={16} className="text-slate-500" />
          <p className="text-sm font-semibold text-slate-900">{pagination.total} request(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-3 py-3 min-w-[260px]">Product</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                    No notify requests yet.
                  </td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatWhen(item.createdAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <Bell size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        {item.productHref ? (
                          <Link
                            href={item.productHref}
                            target="_blank"
                            rel="noreferrer"
                            className="line-clamp-2 font-medium text-slate-900 hover:text-emerald-700 hover:underline"
                          >
                            {item.productName || 'View product'}
                          </Link>
                        ) : (
                          <p className="line-clamp-2 font-medium text-slate-800">{item.productName || '—'}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                          {item.inStock != null ? (
                            <span className={item.inStock ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>
                              {item.inStock ? 'In stock' : 'Out of stock'}
                            </span>
                          ) : null}
                          {item.productHref ? (
                            <Link
                              href={item.productHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800"
                            >
                              Open product <ExternalLink size={11} />
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-600">{item.sku || '—'}</td>
                  <td className="px-3 py-3 text-slate-700">{item.email || '—'}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700">{item.phone || '—'}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.status === 'notified'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}>
                      {item.status === 'notified' ? 'Notified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      type="button"
                      onClick={() => markNotified(item)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      {item.status === 'notified' ? 'Mark pending' : 'Mark notified'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => load(pagination.page - 1)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => load(pagination.page + 1)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
