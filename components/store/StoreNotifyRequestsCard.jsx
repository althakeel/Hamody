'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Bell } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export default function StoreNotifyRequestsCard() {
  const { getToken } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get('/api/store/notify-list?limit=6&status=pending', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.pagination?.total || 0));
      } catch {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  if (!total) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3" lang="en" dir="ltr">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-amber-700" />
          <p className="text-sm font-semibold text-slate-900">
            Notify me requests ({total} pending)
          </p>
        </div>
        <Link href="/store/notify-list" className="text-sm font-semibold text-amber-800 hover:text-amber-950">
          Open notify list
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            {item.productHref ? (
              <Link href={item.productHref} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:underline">
                {item.productName || 'Product'}
              </Link>
            ) : (
              <p className="font-medium text-slate-900">{item.productName || 'Product'}</p>
            )}
            <p className="mt-0.5 text-xs text-slate-500">
              {item.email || '—'}
              {item.phone ? ` · ${item.phone}` : ''}
              {item.sku ? ` · ${item.sku}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
