'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/useAuth';
import Loading from '@/components/Loading';

export default function StoreImageSearchPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/image-search/index', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(data);
    } catch (error) {
      console.error(error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const train = async (mode) => {
    try {
      setTraining(true);
      const token = await getToken();
      let next = status;
      do {
        const { data } = await axios.post('/api/store/image-search/index', {
          mode,
          limit: 8,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        next = data;
        setStatus(data);
        if (mode === 'all') break;
      } while ((next?.missing || 0) > 0);
      toast.success(mode === 'all' ? 'Re-index batch finished' : 'Image search training finished');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to train image search');
    } finally {
      setTraining(false);
    }
  };

  if (loading && !status) return <Loading />;

  const total = Number(status?.totalWithImages || 0);
  const indexed = Number(status?.indexed || 0);
  const missing = Number(status?.missing || 0);
  const percent = total ? Math.round((indexed / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6" dir="ltr" lang="en">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Image Search</h1>
        <p className="mt-1 text-sm text-slate-500">
          Training stores a visual fingerprint for up to 3 photos per product. Shopper uploads are then matched by photo first. Exact matches need a close image score; other similar items appear as related.
        </p>
      </div>

      {!status?.configured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Gemini is not configured. Add GEMINI_API_KEY before training.
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-700">Training status</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{indexed} / {total}</p>
        <p className="mt-1 text-sm text-slate-500">{percent}% of product photos indexed. {missing} still need training.</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-900" style={{ width: `${percent}%` }} />
        </div>
        {status?.lastIndexedAt ? (
          <p className="mt-3 text-xs text-slate-400">
            Last indexed {new Date(status.lastIndexedAt).toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}
          </p>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={training || !status?.configured || missing === 0}
          onClick={() => void train('missing')}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {training ? 'Training…' : 'Train missing products'}
        </button>
        <button
          type="button"
          disabled={training || !status?.configured || total === 0}
          onClick={() => void train('all')}
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Re-index 8 products
        </button>
      </section>
    </div>
  );
}
