'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, Loader2, Megaphone, Save, Search, X } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { getProductThumbnailUrl, normalizeProductImages } from '@/lib/productMedia';
import { PLACEHOLDER_IMAGE } from '@/lib/mediaUrls';
import { DEFAULT_RELATED_PRODUCT_AD, RELATED_AD_MARKETPLACES, normalizeRelatedProductAd } from '@/lib/relatedProductAd';

const MARKETPLACE_FIELDS = [
  { id: 'noon', label: 'Noon', urlKey: 'noonUrl', placeholder: 'https://www.noon.com/...' },
  { id: 'jomla', label: 'Jomla', urlKey: 'jomlaUrl', placeholder: 'https://jomla.ae/...' },
  { id: 'amazon', label: 'Amazon', urlKey: 'amazonUrl', placeholder: 'https://www.amazon.ae/...' },
];

const PRODUCTS_PER_PAGE = 12;

function productIdOf(product) {
  return String(product?._id || product || '').trim();
}

function ProductThumb({ product }) {
  const imageSrc = getProductThumbnailUrl(
    { ...product, images: normalizeProductImages(product?.images) },
    { fallback: PLACEHOLDER_IMAGE },
  );
  return (
    <img
      src={imageSrc || PLACEHOLDER_IMAGE}
      alt=""
      className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 object-cover"
    />
  );
}

export default function RelatedProductAdPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [enabled, setEnabled] = useState(DEFAULT_RELATED_PRODUCT_AD.enabled);
  const [showOnAllProducts, setShowOnAllProducts] = useState(DEFAULT_RELATED_PRODUCT_AD.showOnAllProducts);
  const [marketplaces, setMarketplaces] = useState(DEFAULT_RELATED_PRODUCT_AD.marketplaces);
  const [noonUrl, setNoonUrl] = useState('');
  const [jomlaUrl, setJomlaUrl] = useState('');
  const [amazonUrl, setAmazonUrl] = useState('');
  const [headline, setHeadline] = useState('');
  const [selected, setSelected] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const abortRef = useRef(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/appearance/sections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ad = normalizeRelatedProductAd(data?.relatedProductAd);
      setEnabled(ad.enabled);
      setShowOnAllProducts(ad.showOnAllProducts);
      setMarketplaces(ad.marketplaces);
      setNoonUrl(ad.noonUrl);
      setJomlaUrl(ad.jomlaUrl);
      setAmazonUrl(ad.amazonUrl);
      setHeadline(ad.headline);
      if (!ad.productId) {
        setSelected(null);
        return;
      }
      const { data: productData } = await axios.get('/api/store/product', {
        params: { ids: ad.productId },
        headers: { Authorization: `Bearer ${token}` },
      });
      const match = (productData?.products || []).find((item) => productIdOf(item) === ad.productId);
      setSelected(match || { _id: ad.productId, name: ad.productId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load related product ad');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const fetchProductsPage = useCallback(async ({ page = 1, search = debouncedSearch } = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setProductsLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/product', {
        params: { page, limit: PRODUCTS_PER_PAGE, search: search || undefined, sort: 'name' },
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setProducts(data.products || []);
      setPagination(data.pagination || { page: 1, totalPages: 1 });
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      toast.error('Failed to load products');
    } finally {
      if (!controller.signal.aborted) setProductsLoading(false);
    }
  }, [debouncedSearch, getToken]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (loading) return;
    void fetchProductsPage({ page: 1, search: debouncedSearch });
  }, [debouncedSearch, fetchProductsPage, loading]);

  const save = async () => {
    const id = productIdOf(selected);
    if (enabled && !id) {
      toast.error('Choose one product before turning the ad on');
      return;
    }
    try {
      setSaving(true);
      const token = await getToken();
      await axios.post('/api/store/appearance/sections', {
        relatedProductAd: {
          enabled,
          productId: id,
          headline,
          showOnAllProducts,
          marketplaces,
          noonUrl,
          jomlaUrl,
          amazonUrl,
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(enabled ? 'Related product ad is on' : 'Related product ad is off');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save related product ad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-5xl space-y-6 text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/store/customize"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} />
            Customize
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Megaphone className="text-amber-500" size={24} />
            Related product ad
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Choose one product, then choose every product page or only that product’s own page.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Loading settings…
        </div>
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Show this ad on desktop</span>
                <span className="mt-0.5 block text-sm text-slate-500">
                  The card shows under the buy box on desktop product pages. It stays off on phones.
                </span>
              </span>
            </label>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="relatedAdPlacement"
                  checked={showOnAllProducts}
                  onChange={() => setShowOnAllProducts(true)}
                  className="mt-1 h-4 w-4 border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">All product pages</span>
                  <span className="mt-0.5 block text-sm text-slate-500">
                    The product you choose below is shown on every product page.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="relatedAdPlacement"
                  checked={!showOnAllProducts}
                  onChange={() => setShowOnAllProducts(false)}
                  className="mt-1 h-4 w-4 border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Only on this product page</span>
                  <span className="mt-0.5 block text-sm text-slate-500">
                    The card shows only on the chosen product’s own page.
                  </span>
                </span>
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold text-slate-800">Headline</span>
              <input
                type="text"
                value={headline}
                maxLength={80}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Fun for everyone"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Optional. Shown next to the brand, for example Brand: Fun for everyone.
              </span>
            </label>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Noon, Jomla, and Amazon</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tick the stores for this product. The card under the buy box switches to the next design every 5 seconds.
              </p>
            </div>
            {MARKETPLACE_FIELDS.map((item) => {
              const checked = marketplaces.includes(item.id);
              const urlValue = item.id === 'noon' ? noonUrl : item.id === 'jomla' ? jomlaUrl : amazonUrl;
              const setUrl = item.id === 'noon' ? setNoonUrl : item.id === 'jomla' ? setJomlaUrl : setAmazonUrl;
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const on = event.target.checked;
                        setMarketplaces((current) => RELATED_AD_MARKETPLACES.filter((id) => (
                          id === item.id ? on : current.includes(id)
                        )));
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                  </label>
                  {checked ? (
                    <label className="mt-3 block text-sm">
                      <span className="mb-1.5 block text-xs font-medium text-slate-600">{item.label} link</span>
                      <input
                        type="url"
                        value={urlValue}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder={item.placeholder}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Chosen product</h2>
            {selected ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <ProductThumb product={selected} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{selected.name || 'Selected product'}</p>
                  <p className="truncate text-xs text-slate-500">{selected.sku || productIdOf(selected)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white"
                  aria-label="Remove product"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No product chosen yet. Search below and pick one.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">Choose a product</h2>
              <div className="relative w-full max-w-sm">
                <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-lg border border-slate-200 py-2 pe-3 ps-9 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
            {productsLoading ? (
              <div className="flex justify-center py-12 text-slate-400">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : products.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No products found.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {products.map((product) => {
                  const id = productIdOf(product);
                  const isSelected = id && id === productIdOf(selected);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setSelected(product)}
                        className={`flex w-full items-center gap-3 px-3 py-3 text-start hover:bg-slate-50 ${isSelected ? 'bg-emerald-50/70' : ''}`}
                      >
                        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <ProductThumb product={product} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{product.name || 'Untitled product'}</span>
                          <span className="block truncate text-xs text-slate-500">{product.sku || id}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {pagination.totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || productsLoading}
                  onClick={() => fetchProductsPage({ page: pagination.page - 1 })}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-slate-500">Page {pagination.page} of {pagination.totalPages}</span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || productsLoading}
                  onClick={() => fetchProductsPage({ page: pagination.page + 1 })}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
