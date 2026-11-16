'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

export default function SitemapProductsSection({
  initialLinks = [],
  total = 0,
  initialPage = 1,
  pageSize = 50,
  initialHasMore = false,
}) {
  const [links, setLinks] = useState(initialLinks);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const nextPage = page + 1;
      const { data } = await axios.get('/api/public/sitemap-products', {
        params: { page: nextPage, limit: pageSize },
      });

      const nextLinks = Array.isArray(data?.links) ? data.links : [];
      setLinks((prev) => {
        const seen = new Set(prev.map((item) => item.path));
        const merged = [...prev];
        nextLinks.forEach((item) => {
          if (item?.path && !seen.has(item.path)) {
            seen.add(item.path);
            merged.push(item);
          }
        });
        return merged;
      });
      setPage(data?.page || nextPage);
      setHasMore(Boolean(data?.hasMore));
    } catch (err) {
      console.error('Sitemap products scroll load failed:', err);
      setError('Could not load more products. Scroll again to retry.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, page, pageSize]);

  useEffect(() => {
    const node = sentinelRef.current;
    const root = listRef.current;
    if (!node || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root, rootMargin: '160px', threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <section id="sitemap-products" className="scroll-mt-28">
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-[#E9D6B5] pb-2">
        <h2 className="text-lg font-semibold tracking-tight text-[#123D33]">Products</h2>
        <p className="shrink-0 text-xs text-[#9C6E20]">
          {total.toLocaleString()} {total === 1 ? 'product' : 'products'}
          <span className="mx-2 text-[#E9D6B5]">·</span>
          <Link href="/shop" className="font-medium text-[#123D33] underline-offset-2 hover:text-[#1F5C4A] hover:underline">
            All Products
          </Link>
        </p>
      </div>

      {links.length === 0 ? (
        <p className="text-sm leading-6 text-[#9C6E20]">No published products yet.</p>
      ) : (
        <div ref={listRef}>
          <ul className="grid max-w-4xl grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => (
              <li key={link.path} className="min-w-0">
                <Link
                  href={link.path || '#'}
                  className="inline-block max-w-full truncate py-1 text-sm leading-5 text-[#123D33] transition hover:text-[#1F5C4A]"
                  title={link.text}
                >
                  {link.text}
                </Link>
              </li>
            ))}
          </ul>
          <div ref={sentinelRef} className="mt-3 text-xs leading-5 text-[#9C6E20]">
            {loading ? 'Loading more products…' : hasMore ? 'Scroll to load more' : null}
          </div>
        </div>
      )}

      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </section>
  );
}
