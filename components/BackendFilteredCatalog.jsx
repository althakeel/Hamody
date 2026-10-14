'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import ProductFilterSidebar from '@/components/ProductFilterSidebar';
import { appendCatalogFilters } from '@/lib/catalogFilters';

const PAGE_SIZE = 48;

const DEFAULT_FILTERS = {
  categories: [],
  priceRange: { min: 0, max: 100000 },
  rating: 0,
  inStock: false,
  sortBy: 'newest',
};

function flattenCategoryNames(categories = []) {
  const names = [];
  const walk = (items) => {
    (items || []).forEach((category) => {
      const name = String(category?.name || '').trim();
      if (name) names.push(name);
      if (Array.isArray(category?.children) && category.children.length) walk(category.children);
    });
  };
  walk(categories);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

export default function BackendFilteredCatalog({
  title,
  subtitle,
  emptyText = 'No products match your filters.',
  preset = {},
  initialFilters = DEFAULT_FILTERS,
  headerExtra = null,
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState([]);

  const filterKey = useMemo(() => JSON.stringify({ filters, preset }), [filters, preset]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/categories', { cache: 'force-cache' })
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => {
        if (!cancelled) setCategoryOptions(flattenCategoryNames(data?.categories));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      paginated: 'true',
      slim: filters.sortBy === 'rating' || Number(filters.rating) > 0 || Number(preset.minRating) > 0 ? 'false' : 'true',
      limit: String(PAGE_SIZE),
      page: String(page),
    });
    appendCatalogFilters(params, filters, preset);

    setLoading(true);
    fetch(`/api/products?${params.toString()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { products: [] }))
      .then((data) => {
        if (cancelled) return;
        const incoming = Array.isArray(data?.products) ? data.products : [];
        setProducts((current) => (page === 1 ? incoming : [...current, ...incoming]));
        setTotal(Number(data?.total) || incoming.length);
      })
      .catch(() => {
        if (!cancelled && page === 1) {
          setProducts([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filterKey, page]);

  const handleFilterChange = useCallback((next) => {
    setFilters((current) => {
      const same = JSON.stringify(current) === JSON.stringify(next);
      return same ? current : next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const hasMore = products.length < total;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          {headerExtra}
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle ? <p className="text-gray-600">{subtitle}</p> : null}
        </div>
        <div className="flex gap-6">
          <div className="hidden shrink-0 lg:block">
            <ProductFilterSidebar
              products={[]}
              categoryOptions={categoryOptions}
              onFilterChange={handleFilterChange}
              initialFilters={filters}
            />
          </div>
          <div className="min-w-0 flex-1">
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="aspect-[3/4] animate-pulse rounded-lg border border-gray-200 bg-white" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
                <p className="text-lg text-gray-500">{emptyText}</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg bg-orange-500 px-6 py-2 text-white transition hover:bg-orange-600"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 lg:grid-cols-6">
                  {products.map((product, index) => (
                    <ProductCard key={product._id || product.id || product.slug || index} product={product} />
                  ))}
                </div>
                {hasMore ? (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setPage((current) => current + 1)}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
                    >
                      {loading ? 'Loading…' : 'Show more'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
