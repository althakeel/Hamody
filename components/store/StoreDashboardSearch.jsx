'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Search } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import {
  SIDEBAR_ACCESS_COMPONENTS,
  canAccessDashboardArea,
} from '@/lib/storeDashboardPermissions';

const EXTRA_PAGES = [
  { id: 'whatsappWidget', label: 'WhatsApp Widget', href: '/store/customize/whatsapp-widget' },
  { id: 'scrollToTop', label: 'Scroll to Top', href: '/store/customize/scroll-to-top' },
  { id: 'inventoryPage', label: 'Inventory', href: '/store/inventory' },
];

function pageMatches(label, query) {
  return String(label || '').toLowerCase().includes(query);
}

export default function StoreDashboardSearch({
  isOwner = false,
  permissions = {},
  canViewActivityHistory = false,
}) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [products, setProducts] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const rootRef = useRef(null);

  const pages = useMemo(() => {
    const seen = new Set();
    const list = [];
    [...SIDEBAR_ACCESS_COMPONENTS, ...EXTRA_PAGES].forEach((item) => {
      if (!item.href || item.action || seen.has(item.href)) return;
      if (item.id === 'viewActivityHistory' && !isOwner && !canViewActivityHistory) return;
      if (item.id !== 'settings' && item.id !== 'viewActivityHistory' && !canAccessDashboardArea(permissions, item.id, { isOwner })) {
        return;
      }
      seen.add(item.href);
      list.push({ label: item.label, href: item.href });
    });
    return list;
  }, [isOwner, permissions, canViewActivityHistory]);

  const trimmed = query.trim();
  const needle = trimmed.toLowerCase();

  const pageResults = useMemo(() => {
    if (needle.length < 2) return [];
    return pages.filter((page) => pageMatches(page.label, needle)).slice(0, 5);
  }, [pages, needle]);

  const results = useMemo(() => {
    const items = pageResults.map((page) => ({
      key: `page:${page.href}`,
      kind: 'Page',
      label: page.label,
      href: page.href,
    }));
    products.forEach((product) => {
      const name = String(product.name || product.title || 'Product').trim();
      items.push({
        key: `product:${product._id || product.id || name}`,
        kind: 'Product',
        label: name,
        href: `/store/manage-product?q=${encodeURIComponent(name)}`,
      });
    });
    if (needle.length >= 2 && canAccessDashboardArea(permissions, 'orders', { isOwner })) {
      items.push({
        key: `orders:${needle}`,
        kind: 'Orders',
        label: `Search orders for “${trimmed}”`,
        href: `/store/orders?q=${encodeURIComponent(trimmed)}`,
      });
    }
    return items;
  }, [pageResults, products, needle, trimmed, permissions, isOwner]);

  useEffect(() => {
    setActiveIndex(0);
  }, [needle]);

  useEffect(() => {
    if (needle.length < 2 || !canAccessDashboardArea(permissions, 'manageProduct', { isOwner })) {
      setProducts([]);
      setSearchingProducts(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSearchingProducts(true);
        const token = await getToken();
        if (!token || cancelled) return;
        const { data } = await axios.get('/api/store/product', {
          headers: { Authorization: `Bearer ${token}` },
          params: { picker: true, search: trimmed, limit: 5, page: 1 },
        });
        if (cancelled) return;
        setProducts(Array.isArray(data?.products) ? data.products.slice(0, 5) : []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setSearchingProducts(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [needle, trimmed, getToken, permissions, isOwner]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const go = (href) => {
    if (!href) return;
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[activeIndex]?.href || results[0]?.href);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <label className="relative block">
        <span className="sr-only">Search the store dashboard</span>
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Advanced search"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pe-3 ps-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
        />
      </label>
      {open ? (
        <div className="absolute start-0 top-[calc(100%+6px)] z-50 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">
          {needle.length < 2 ? (
            <p className="px-3 py-3 text-sm text-slate-500">
              Advanced search. Type at least 2 letters to find a page, product, or order.
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">
              {searchingProducts ? 'Searching products and orders…' : 'No matches'}
            </p>
          ) : (
            results.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => go(item.href)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                  index === activeIndex ? 'bg-slate-100 text-slate-950' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.kind}
                </span>
                <span className="min-w-0 truncate font-medium">{item.label}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
