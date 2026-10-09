'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Copy, ExternalLink, ImagePlus, Plus, Search, Trash2, Check } from 'lucide-react';
import {
  EMAIL_CAMPAIGN_BANNER_MAX_WIDTH,
  EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS,
  campaignPageHasBanner,
  normalizeCampaignPageBanners,
} from '@/lib/emailCampaignPageHelpers';

const EMPTY_FORM = {
  title: '',
  titleAr: '',
  slug: '',
  subtitle: '',
  subtitleAr: '',
  heroImage: '',
  banners: normalizeCampaignPageBanners({}),
  productIds: [],
  ctaLabel: '',
  ctaUrl: '',
  backgroundColor: '#f8fafc',
  accentColor: '#0f766e',
  status: 'published',
  seoTitle: '',
  seoDescription: '',
};

const BANNER_SLOTS = [
  { device: 'desktop', language: 'en', label: 'Desktop · English', hint: 'Shown from 1024px and up' },
  { device: 'desktop', language: 'ar', label: 'Desktop · Arabic', hint: 'Shown from 1024px and up for Arabic' },
  { device: 'tablet', language: 'en', label: 'Tablet · English', hint: 'Shown from 768px to 1023px' },
  { device: 'tablet', language: 'ar', label: 'Tablet · Arabic', hint: 'Shown from 768px to 1023px for Arabic' },
  { device: 'mobile', language: 'en', label: 'Mobile · English', hint: 'Shown below 768px' },
  { device: 'mobile', language: 'ar', label: 'Mobile · Arabic', hint: 'Shown below 768px for Arabic' },
];

const BANNER_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,.gif,.png,.jpg,.jpeg,.webp';

const PRODUCT_SOURCES = [
  { id: 'search', label: 'Search' },
  { id: 'all', label: 'All products' },
  { id: 'category', label: 'Category' },
  { id: 'brand', label: 'Brand' },
  { id: 'latest', label: 'Latest' },
  { id: 'tag', label: 'Tags' },
];

function isBannerFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  return type.startsWith('image/') || /\.(gif|png|jpe?g|webp)$/i.test(name);
}

async function uploadCampaignBanner(file, getToken) {
  if (!file || !getToken) throw new Error('Upload is not available');
  if (!isBannerFile(file)) throw new Error('Use a JPG, PNG, WebP, or GIF file');
  const token = await getToken();
  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', 'email-marketing');
  const response = await fetch('/api/store/upload-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.url) {
    throw new Error(data?.error || 'Upload failed');
  }
  return data.url;
}

function BannerImageField({ label, hint, value, onChange, getToken }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadError('');
      const url = await uploadCampaignBanner(file, getToken);
      onChange(url);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    handleUpload(file);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">{label}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] font-semibold text-red-600 hover:underline"
          >
            Remove
          </button>
        ) : null}
      </div>
      <label
        className={`mt-2 flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed px-3 py-4 text-center transition ${
          dragActive
            ? 'border-teal-400 bg-teal-50'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragActive(false);
        }}
        onDrop={onDrop}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="max-h-28 w-full max-w-full object-contain" />
        ) : (
          <>
            <ImagePlus className="h-5 w-5 text-slate-400" />
            <p className="mt-2 text-[11px] font-medium text-slate-600">
              {uploading ? 'Uploading…' : dragActive ? 'Drop image or GIF here' : 'Drag and drop or click to upload'}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">JPG, PNG, WebP, or GIF</p>
          </>
        )}
        <input
          type="file"
          accept={BANNER_ACCEPT}
          className="sr-only"
          disabled={uploading || !getToken}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            handleUpload(file);
          }}
        />
      </label>
      {uploadError ? <p className="mt-1 text-[11px] text-red-600">{uploadError}</p> : null}
    </div>
  );
}

export default function EmailCampaignLandingPages({ getToken }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showBanners, setShowBanners] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productSource, setProductSource] = useState('search');
  const [pickerCategory, setPickerCategory] = useState('');
  const [pickerBrand, setPickerBrand] = useState('');
  const [pickerTagInput, setPickerTagInput] = useState('');
  const [pickerTags, setPickerTags] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogBrands, setCatalogBrands] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState({});
  const [productOverIndex, setProductOverIndex] = useState(null);
  const productDragIndex = useRef(null);

  const authHeaders = useCallback(async () => {
    const token = await getToken?.();
    if (!token) throw new Error('Sign in required');
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const headers = await authHeaders();
      const { data } = await axios.get('/api/store/email-marketing/pages', { headers });
      setPages(Array.isArray(data.pages) ? data.pages : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const selectedProducts = useMemo(
    () => (form.productIds || [])
      .map((id) => selectedMeta[id] || { id, name: id })
      .filter(Boolean),
    [form.productIds, selectedMeta],
  );

  useEffect(() => {
    if (!form.productIds?.length || !getToken) return undefined;
    const missing = form.productIds.filter((id) => !selectedMeta[id]?.name);
    if (!missing.length) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const chunkSize = 80;
        const found = [];
        for (let i = 0; i < missing.length; i += chunkSize) {
          const chunk = missing.slice(i, i + chunkSize);
          const { data } = await axios.get(
            `/api/store/email-marketing/products?ids=${encodeURIComponent(chunk.join(','))}&limit=${chunk.length}`,
            { headers },
          );
          if (cancelled) return;
          found.push(...(Array.isArray(data.products) ? data.products : []));
        }
        if (cancelled) return;
        setSelectedMeta((prev) => {
          const next = { ...prev };
          found.forEach((product) => {
            const id = String(product.id || product._id || '');
            if (!id) return;
            next[id] = {
              id,
              name: product.name || '',
              image: product.image || '',
              price: product.price,
            };
          });
          return next;
        });
      } catch {
        // ignore hydrate failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.productIds.join('|'), getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const { data } = await axios.get('/api/store/email-marketing/products?catalog=1&limit=8', { headers });
        if (cancelled) return;
        setCatalogCategories(Array.isArray(data.categories) ? data.categories : []);
        setCatalogBrands(Array.isArray(data.brands) ? data.brands : []);
      } catch {
        if (!cancelled) {
          setCatalogCategories([]);
          setCatalogBrands([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  useEffect(() => {
    const q = productSearch.trim();
    const params = new URLSearchParams({ limit: '48' });
    if (productSource === 'search') {
      if (q.length < 2) {
        setSearchResults([]);
        return undefined;
      }
      params.set('q', q);
    } else if (productSource === 'all' || productSource === 'latest') {
      params.set('source', productSource);
    } else if (productSource === 'category') {
      if (!pickerCategory) {
        setSearchResults([]);
        return undefined;
      }
      params.set('category', pickerCategory);
    } else if (productSource === 'brand') {
      if (!pickerBrand) {
        setSearchResults([]);
        return undefined;
      }
      params.set('brand', pickerBrand);
    } else if (productSource === 'tag') {
      if (!pickerTags.length) {
        setSearchResults([]);
        return undefined;
      }
      params.set('tags', pickerTags.join(','));
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const headers = await authHeaders();
        const { data } = await axios.get(`/api/store/email-marketing/products?${params.toString()}`, { headers });
        if (!cancelled) setSearchResults(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, productSource === 'search' ? 280 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [productSearch, productSource, pickerCategory, pickerBrand, pickerTags, authHeaders]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setBanner = (device, language, value) => {
    setForm((prev) => {
      const banners = normalizeCampaignPageBanners(prev.banners, prev.heroImage);
      const nextBanners = {
        ...banners,
        [device]: {
          ...banners[device],
          [language]: String(value || '').trim(),
        },
      };
      return {
        ...prev,
        banners: nextBanners,
        heroImage: nextBanners.desktop.en || prev.heroImage || '',
      };
    });
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, banners: normalizeCampaignPageBanners({}), productIds: [] });
    setShowBanners(false);
    setStatusMessage('');
    setError('');
  };

  const startEdit = (page) => {
    setEditingId(page.id);
    setForm({
      title: page.title || '',
      titleAr: page.titleAr || '',
      slug: page.slug || '',
      subtitle: page.subtitle || '',
      subtitleAr: page.subtitleAr || '',
      heroImage: page.heroImage || '',
      banners: normalizeCampaignPageBanners(page.banners, page.heroImage),
      productIds: Array.isArray(page.productIds) ? page.productIds : [],
      ctaLabel: page.ctaLabel || '',
      ctaUrl: page.ctaUrl || '',
      backgroundColor: page.backgroundColor || '#f8fafc',
      accentColor: page.accentColor || '#0f766e',
      status: page.status || 'draft',
      seoTitle: page.seoTitle || '',
      seoDescription: page.seoDescription || '',
    });
    setShowBanners(campaignPageHasBanner(page.banners, page.heroImage));
    setStatusMessage('');
    setError('');
  };

  const rememberProducts = (products) => {
    setSelectedMeta((prev) => {
      const next = { ...prev };
      products.forEach((product) => {
        const id = String(product.id || product._id || '');
        if (!id) return;
        next[id] = {
          id,
          name: product.name || '',
          image: product.image || '',
          price: product.price,
        };
      });
      return next;
    });
  };

  const addProducts = (products) => {
    const incoming = (products || []).map((product) => ({
      ...product,
      id: String(product.id || product._id || ''),
    })).filter((product) => product.id);
    if (!incoming.length) return;
    rememberProducts(incoming);
    setForm((prev) => {
      const nextIds = [...prev.productIds];
      incoming.forEach((product) => {
        if (nextIds.includes(product.id)) return;
        if (nextIds.length >= EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS) return;
        nextIds.push(product.id);
      });
      return { ...prev, productIds: nextIds };
    });
  };

  const pickerQuery = () => {
    const params = new URLSearchParams();
    const q = productSearch.trim();
    if (productSource === 'search') {
      if (q.length < 2) return null;
      params.set('q', q);
    } else if (productSource === 'all' || productSource === 'latest') {
      params.set('source', productSource);
    } else if (productSource === 'category') {
      if (!pickerCategory) return null;
      params.set('category', pickerCategory);
    } else if (productSource === 'brand') {
      if (!pickerBrand) return null;
      params.set('brand', pickerBrand);
    } else if (productSource === 'tag') {
      if (!pickerTags.length) return null;
      params.set('tags', pickerTags.join(','));
    }
    return params;
  };

  const selectAllProducts = async () => {
    const params = pickerQuery();
    if (!params) return;
    params.set('all', '1');
    params.set('limit', String(EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS));
    try {
      setSelectingAll(true);
      const headers = await authHeaders();
      const { data } = await axios.get(`/api/store/email-marketing/products?${params.toString()}`, { headers });
      addProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to select products');
    } finally {
      setSelectingAll(false);
    }
  };

  const addPickerTag = (raw) => {
    const parts = String(raw || '').split(/[,\n،]/).map((tag) => tag.trim()).filter(Boolean);
    if (!parts.length) return;
    setPickerTags((prev) => {
      const next = [...prev];
      parts.forEach((tag) => {
        if (!next.some((item) => item.toLowerCase() === tag.toLowerCase())) next.push(tag);
      });
      return next.slice(0, 40);
    });
    setPickerTagInput('');
  };

  const moveSelectedProduct = (fromIndex, toIndex) => {
    setForm((prev) => {
      const ids = [...(prev.productIds || [])];
      if (
        !Number.isFinite(fromIndex)
        || !Number.isFinite(toIndex)
        || fromIndex < 0
        || toIndex < 0
        || fromIndex >= ids.length
        || toIndex >= ids.length
        || fromIndex === toIndex
      ) {
        return prev;
      }
      const [id] = ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, id);
      return { ...prev, productIds: ids };
    });
  };

  const toggleProduct = (product) => {
    const id = String(product.id || product._id || '');
    if (!id) return;
    setSelectedMeta((prev) => ({
      ...prev,
      [id]: {
        id,
        name: product.name || '',
        image: product.image || '',
        price: product.price,
      },
    }));
    setForm((prev) => {
      const exists = prev.productIds.includes(id);
      if (exists) {
        return { ...prev, productIds: prev.productIds.filter((item) => item !== id) };
      }
      if (prev.productIds.length >= EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS) return prev;
      return { ...prev, productIds: [...prev.productIds, id] };
    });
  };

  const savePage = async () => {
    try {
      setSaving(true);
      setError('');
      setStatusMessage('');
      const headers = await authHeaders();
      const payload = { ...form };
      if (editingId) {
        const { data } = await axios.patch(
          `/api/store/email-marketing/pages/${editingId}`,
          payload,
          { headers },
        );
        setStatusMessage('Page updated.');
        if (data.page) startEdit(data.page);
      } else {
        const { data } = await axios.post('/api/store/email-marketing/pages', payload, { headers });
        setStatusMessage('Page created.');
        if (data.page) startEdit(data.page);
      }
      await loadPages();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (page) => {
    if (!window.confirm(`Delete landing page “${page.title}”?`)) return;
    try {
      const headers = await authHeaders();
      await axios.delete(`/api/store/email-marketing/pages/${page.id}`, { headers });
      if (editingId === page.id) startCreate();
      await loadPages();
      setStatusMessage('Page deleted.');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to delete page');
    }
  };

  const copyLink = async (page) => {
    if (page.status !== 'published') {
      setError('This page is still a Draft. Set status to Published and save — then the /c/ link will work.');
      return;
    }
    const url = page.publicUrl || '';
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(page.id);
      setError('');
      window.setTimeout(() => setCopiedId(''), 1600);
    } catch {
      setError('Could not copy link');
    }
  };

  const publishPage = async (page) => {
    try {
      setSaving(true);
      setError('');
      const headers = await authHeaders();
      const { data } = await axios.patch(
        `/api/store/email-marketing/pages/${page.id}`,
        { status: 'published' },
        { headers },
      );
      setStatusMessage(`Published. Public link: ${data?.page?.publicUrl || page.publicUrl || `/c/${page.slug}`}`);
      await loadPages();
      if (data?.page) startEdit(data.page);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {pages.length} page{pages.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          <Plus className="h-4 w-4" />
          New page
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {statusMessage ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">{statusMessage}</div>
      ) : null}

      <section>
        {loading ? (
          <p className="text-sm text-slate-500">Loading pages…</p>
        ) : pages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">No landing pages yet</p>
            <p className="mt-1 text-sm text-slate-500">Create one, add the products from your email, then publish the link.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => {
              const selected = editingId === page.id;
              const published = page.status === 'published';
              return (
                <article
                  key={page.id}
                  className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                    selected ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => startEdit(page)}
                    className="block w-full px-4 pb-3 pt-4 text-start"
                  >
                    <span
                      className="mb-3 block h-1.5 w-14 rounded-full"
                      style={{ backgroundColor: page.accentColor || '#0f766e' }}
                    />
                    <span className="block truncate text-base font-semibold text-slate-900">{page.title}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {published ? 'Published' : 'Draft'}
                      </span>
                      <span>{page.productCount} products</span>
                    </span>
                    <span className="mt-2 block truncate font-mono text-[11px] text-slate-400">/c/{page.slug}</span>
                  </button>
                  <div className="flex items-center gap-1 border-t border-slate-100 px-3 py-2">
                    {!published ? (
                      <button
                        type="button"
                        onClick={() => publishPage(page)}
                        disabled={saving}
                        className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        Publish
                      </button>
                    ) : null}
                    <button
                      type="button"
                      title="Copy public link"
                      onClick={() => copyLink(page)}
                      className="ms-auto rounded-full p-2 text-slate-500 hover:bg-slate-100"
                    >
                      {copiedId === page.id ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    {published ? (
                      <a
                        href={page.publicPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                        title="Open page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => deletePage(page)}
                      className="rounded-full p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit page' : 'New page'}</h3>
            <p className="mt-0.5 text-xs text-slate-500">/c/{form.slug || 'your-slug'}</p>
          </div>
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            {['draft', 'published'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setField('status', status)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  form.status === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 p-5">
          {form.status !== 'published' ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This draft is not public yet. Switch to Published and save before sharing the link.
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Public after save: /c/{form.slug || 'your-slug'}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Title (English)
              <input
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                className={fieldClass}
                placeholder="Weekend picks"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Title (Arabic)
              <input
                value={form.titleAr}
                onChange={(e) => setField('titleAr', e.target.value)}
                dir="rtl"
                className={fieldClass}
                placeholder="اختياري"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 lg:col-span-2">
              Subtitle
              <input
                value={form.subtitle}
                onChange={(e) => setField('subtitle', e.target.value)}
                className={fieldClass}
                placeholder="Only the products from this email"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              URL slug
              <input
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
                className={`${fieldClass} font-mono`}
                placeholder="weekend-picks"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2">
                <input
                  type="color"
                  value={form.backgroundColor || '#f8fafc'}
                  onChange={(e) => setField('backgroundColor', e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  aria-label="Background color"
                />
                <span className="text-xs font-medium text-slate-600">Background</span>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2">
                <input
                  type="color"
                  value={form.accentColor || '#0f766e'}
                  onChange={(e) => setField('accentColor', e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  aria-label="Accent color"
                />
                <span className="text-xs font-medium text-slate-600">Accent</span>
              </label>
            </div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Button label
              <input
                value={form.ctaLabel}
                onChange={(e) => setField('ctaLabel', e.target.value)}
                className={fieldClass}
                placeholder="Shop all deals"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Button link
              <input
                value={form.ctaUrl}
                onChange={(e) => setField('ctaUrl', e.target.value)}
                className={fieldClass}
                placeholder="https://www.store1920.com/shop"
              />
            </label>
          </div>

          <div>
              {!showBanners ? (
                <button
                  type="button"
                  onClick={() => setShowBanners(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Add banner
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Banners (optional)</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Drag and drop or click to upload JPG, PNG, WebP, or GIF. English and Arabic for desktop, tablet, and mobile.
                        Max width on the public page is {EMAIL_CAMPAIGN_BANNER_MAX_WIDTH}px. Empty slots fall back to the next available image.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBanners(false)}
                      className="shrink-0 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Hide
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {BANNER_SLOTS.map((slot) => (
                      <BannerImageField
                        key={`${slot.device}-${slot.language}`}
                        label={slot.label}
                        hint={slot.hint}
                        value={form.banners?.[slot.device]?.[slot.language] || ''}
                        onChange={(url) => setBanner(slot.device, slot.language, url)}
                        getToken={getToken}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          <div className="rounded-3xl bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-800">
                Products on this page ({form.productIds.length}/{EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS})
              </div>
              {selectedProducts.length > 1 ? (
                <p className="text-[11px] text-slate-500">Drag a product to change its place.</p>
              ) : null}
            </div>

            {selectedProducts.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedProducts.map((product, index) => (
                  <div
                    key={product.id}
                    draggable
                    onDragStart={(event) => {
                      productDragIndex.current = index;
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      if (productOverIndex !== index) setProductOverIndex(index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = productDragIndex.current ?? Number(event.dataTransfer.getData('text/plain'));
                      moveSelectedProduct(from, index);
                      productDragIndex.current = null;
                      setProductOverIndex(null);
                    }}
                    onDragEnd={() => {
                      productDragIndex.current = null;
                      setProductOverIndex(null);
                    }}
                    className={`inline-flex max-w-full cursor-grab items-center gap-2 rounded-full border bg-white px-2.5 py-1 text-xs text-slate-800 active:cursor-grabbing ${
                      productOverIndex === index ? 'border-teal-500 bg-teal-50' : 'border-teal-200'
                    }`}
                  >
                    <span className="select-none text-slate-300" aria-hidden="true">⋮⋮</span>
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt="" className="h-5 w-5 rounded object-cover" />
                    ) : null}
                    <span className="truncate">{product.name || product.id}</span>
                    <button
                      type="button"
                      draggable={false}
                      onDragStart={(event) => event.preventDefault()}
                      onClick={() => toggleProduct(product)}
                      className="text-slate-400 hover:text-slate-700"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Choose how to find products, then add them to this page.</p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_SOURCES.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setProductSource(source.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    productSource === source.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {source.label}
                </button>
              ))}
            </div>

            {productSource === 'search' ? (
              <label className="relative block">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name or SKU…"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 ps-8 pe-3 text-sm"
                />
              </label>
            ) : null}

            {productSource === 'category' ? (
              <select
                value={pickerCategory}
                onChange={(e) => setPickerCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choose a category…</option>
                {catalogCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            ) : null}

            {productSource === 'brand' ? (
              <select
                value={pickerBrand}
                onChange={(e) => setPickerBrand(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choose a brand…</option>
                {catalogBrands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            ) : null}

            {productSource === 'tag' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {pickerTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPickerTags((prev) => prev.filter((item) => item !== tag))}
                      className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
                <input
                  value={pickerTagInput}
                  onChange={(e) => setPickerTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addPickerTag(pickerTagInput);
                    }
                  }}
                  onBlur={() => addPickerTag(pickerTagInput)}
                  placeholder="Type a tag, then press Enter"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            ) : null}

            {productSource === 'all' || productSource === 'latest' ? (
              <p className="text-xs text-slate-500">
                {productSource === 'latest' ? 'Newest products in the catalog.' : 'Products currently in stock.'}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {searchLoading ? <p className="text-xs text-slate-500">Loading products…</p> : (
                <p className="text-xs text-slate-500">One click adds every match, up to {EMAIL_CAMPAIGN_PAGE_MAX_PRODUCTS}.</p>
              )}
              <button
                type="button"
                onClick={selectAllProducts}
                disabled={selectingAll || searchLoading || !pickerQuery()}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectingAll ? 'Selecting…' : 'Select all'}
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
                {searchResults.map((product) => {
                  const id = String(product.id || product._id || '');
                  const selected = form.productIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleProduct(product)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs ${
                        selected ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <span className="h-8 w-8 rounded bg-slate-100" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {selected ? 'Added' : 'Add'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={savePage}
              disabled={saving || !form.title.trim() || form.productIds.length === 0}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create page'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={startCreate}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                New page instead
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
