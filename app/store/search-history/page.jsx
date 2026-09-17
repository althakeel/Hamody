'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Search, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import Loading from '@/components/Loading';
import StorePagination from '@/components/store/StorePagination';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-AE', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StoreSearchHistoryPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [range, setRange] = useState('week');
  const [visitorType, setVisitorType] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const params = new URLSearchParams({
        range,
        page: String(page),
        limit: String(pageSize),
      });
      if (visitorType !== 'all') params.set('visitorType', visitorType);
      if (q.trim()) params.set('q', q.trim());
      const { data: payload } = await axios.get(`/api/store/search-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(payload);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [getToken, page, pageSize, q, range, visitorType]);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteSearch = async ({ id, query } = {}) => {
    try {
      setDeletingId(id || query || 'pending');
      const token = await getToken();
      await axios.delete('/api/store/search-history', {
        headers: { Authorization: `Bearer ${token}` },
        data: id ? { id } : { query },
      });
      setPendingDelete(null);
      toast.success('Search deleted');
      const remaining = (data?.recent || []).filter((row) => (id ? row.id !== id : true)).length;
      if (id && remaining === 0 && page > 1) setPage((current) => Math.max(1, current - 1));
      else await load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete search');
    } finally {
      setDeletingId('');
    }
  };

  if (loading && !data) return <Loading />;

  const summary = data?.summary || {};
  const pagination = data?.pagination || { page: 1, limit: pageSize, total: 0, totalPages: 1 };

  return (
    <div className="space-y-5" lang="en" dir="ltr">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Search history</h1>
          <p className="mt-1 text-sm text-slate-500">
            Submitted storefront searches only. Autocomplete suggestions are not saved, and nothing is deleted unless you delete it here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={range}
            onChange={(event) => {
              setPage(1);
              setRange(event.target.value);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 3 months</option>
            <option value="all">All time</option>
          </select>
          <select
            value={visitorType}
            onChange={(event) => {
              setPage(1);
              setVisitorType(event.target.value);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Guests & customers</option>
            <option value="guest">Guests only</option>
            <option value="customer">Customers only</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Total searches', summary.total || 0],
          ['Guests', summary.guests || 0],
          ['Customers', summary.customers || 0],
          ['Unique terms', summary.uniqueQueries || 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Top searches</h2>
          <div className="mt-3 space-y-2">
            {(data?.top || []).length ? (data.top).map((row) => (
              <div key={row.query} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setQ(row.query);
                  }}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                >
                  <span className="truncate text-sm text-slate-800">{row.query}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">{row.count}</span>
                </button>
                <button
                  type="button"
                  title="Delete this term"
                  disabled={deletingId === row.query}
                  onClick={() => setPendingDelete({ query: row.query })}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )) : (
              <p className="text-sm text-slate-500">No searches in this range yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Recent searches</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Per page
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPage(1);
                    setPageSize(Number(event.target.value));
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={q}
                  onChange={(event) => {
                    setPage(1);
                    setQ(event.target.value);
                  }}
                  placeholder="Filter term"
                  className="rounded-lg border border-slate-200 py-1.5 ps-8 pe-3 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pe-3 font-semibold">Search</th>
                  <th className="py-2 pe-3 font-semibold">Visitor</th>
                  <th className="py-2 pe-3 font-semibold">Source</th>
                  <th className="py-2 pe-3 font-semibold">When</th>
                  <th className="py-2 text-right font-semibold">Delete</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent || []).map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-2.5 pe-3 font-medium text-slate-900">{row.query}</td>
                    <td className="py-2.5 pe-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        row.visitorType === 'customer'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                      >
                        {row.visitorType === 'customer' ? 'Customer' : 'Guest'}
                      </span>
                    </td>
                    <td className="py-2.5 pe-3 capitalize text-slate-500">{row.source || 'navbar'}</td>
                    <td className="py-2.5 whitespace-nowrap text-slate-500">{formatWhen(row.createdAt)}</td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        title="Delete this search"
                        disabled={deletingId === row.id}
                        onClick={() => setPendingDelete({ id: row.id, query: row.query })}
                        className="inline-flex rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!(data?.recent || []).length ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No search history yet. Searches from the storefront bar will appear here.
            </p>
          ) : null}

          <div className="mt-4">
            <StorePagination
              pagination={pagination}
              itemLabel="searches"
              disabled={loading}
              alwaysShowButtons
              onPageChange={setPage}
            />
          </div>
        </section>
      </div>

      {pendingDelete ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Delete this search?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Remove <span className="font-semibold text-slate-900">{pendingDelete.query || 'this search'}</span> from the dashboard.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => void deleteSearch(pendingDelete)}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deletingId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
