'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiEdit2, FiExternalLink, FiSearch, FiTag, FiX } from 'react-icons/fi';
import { MdAutoAwesome } from 'react-icons/md';
import { useAuth } from '@/lib/useAuth';
import Loading from '@/components/Loading';
import { readableUploadUrl } from '@/lib/readableUploadUrl';

const BANNER_FIELDS = [
  { key: 'bannerEn', label: 'Desktop banner (English)', hint: '1440×320. Shown on desktop English pages.', rtl: false },
  { key: 'bannerAr', label: 'Desktop banner (Arabic)', hint: '1440×320. Shown on desktop Arabic pages.', rtl: true },
  { key: 'bannerTabletEn', label: 'Tablet banner (English)', hint: '1024×320. Falls back to the desktop English banner.', rtl: false },
  { key: 'bannerTabletAr', label: 'Tablet banner (Arabic)', hint: '1024×320. Falls back to the desktop Arabic banner.', rtl: true },
  { key: 'bannerMobileEn', label: 'Mobile banner (English)', hint: '768×280. Falls back to the tablet or desktop English banner.', rtl: false },
  { key: 'bannerMobileAr', label: 'Mobile banner (Arabic)', hint: '768×280. Falls back to the tablet or desktop Arabic banner.', rtl: true },
];

const EMPTY_PAGE = {
  nameAr: '',
  description: '',
  descriptionAr: '',
  image: '',
  bannerEn: '',
  bannerAr: '',
  bannerTabletEn: '',
  bannerTabletAr: '',
  bannerMobileEn: '',
  bannerMobileAr: '',
  metaTitle: '',
  metaDescription: '',
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function formatLogoUpdated(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getVisiblePageNumbers(currentPage, totalPages) {
  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

function BrandPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  className = '',
}) {
  const visiblePages = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 ${className}`}>
      <p className="text-xs text-slate-600 sm:text-sm">
        Showing {rangeStart}-{rangeEnd} of {totalItems} brand{totalItems === 1 ? '' : 's'}
        {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <label className="text-[11px] font-medium text-slate-500 sm:text-xs">Per page</label>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) || PAGE_SIZE_OPTIONS[0])}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 sm:py-1.5 sm:text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
        >
          Previous
        </button>
        <div className="flex flex-wrap items-center gap-1">
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1];
            const showGap = previousPage && page - previousPage > 1;
            return (
              <div key={page} className="flex items-center gap-1">
                {showGap ? <span className="px-1 text-slate-400">...</span> : null}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition sm:h-9 sm:min-w-9 sm:px-3 sm:text-sm ${
                    page === currentPage
                      ? 'bg-teal-700 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function slugifyBrand(value = '') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function StoreBrandsPage() {
  const { getToken, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState([]);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [mergeFrom, setMergeFrom] = useState('');
  const [mergeTo, setMergeTo] = useState('');
  const [editingBrand, setEditingBrand] = useState(null);
  const [pageForm, setPageForm] = useState(EMPTY_PAGE);
  const [bannerFiles, setBannerFiles] = useState({});
  const [bannerPreviews, setBannerPreviews] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [translating, setTranslating] = useState('');

  const loadBrands = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const { data } = await axios.get('/api/store/brands', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBrands(Array.isArray(data?.brands) ? data.brands : []);
      setDuplicateGroups(Array.isArray(data?.duplicateGroups) ? data.duplicateGroups : []);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load brands');
      setBrands([]);
      setDuplicateGroups([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (user) loadBrands();
  }, [user, loadBrands]);

  const filteredBrands = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return brands;
    return brands.filter((brand) => String(brand.name || '').toLowerCase().includes(query));
  }, [brands, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedBrands = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredBrands.slice(startIndex, startIndex + pageSize);
  }, [filteredBrands, pageSize, safeCurrentPage]);
  const paginationStart = filteredBrands.length ? ((safeCurrentPage - 1) * pageSize) + 1 : 0;
  const paginationEnd = filteredBrands.length
    ? Math.min(safeCurrentPage * pageSize, filteredBrands.length)
    : 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) setCurrentPage(safeCurrentPage);
  }, [currentPage, safeCurrentPage]);

  const openPageEditor = (brand) => {
    const page = brand?.page || {};
    setEditingBrand(brand);
    setPageForm({
      ...EMPTY_PAGE,
      nameAr: page.nameAr || '',
      description: page.description || '',
      descriptionAr: page.descriptionAr || '',
      image: page.image || '',
      bannerEn: page.bannerEn || '',
      bannerAr: page.bannerAr || '',
      bannerTabletEn: page.bannerTabletEn || '',
      bannerTabletAr: page.bannerTabletAr || '',
      bannerMobileEn: page.bannerMobileEn || '',
      bannerMobileAr: page.bannerMobileAr || '',
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
    });
    setBannerFiles({});
    setBannerPreviews({});
    setImageFile(null);
    setImagePreview(page.image || '');
  };

  const uploadBrandImage = async (file, token, slot) => {
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
    const { data } = await axios.post('/api/store/upload-category-image', {
      base64Image,
      fileName: `${slugifyBrand(editingBrand?.name || 'brand')}-${slot}`,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data?.url || '';
  };

  const translateField = async (kind) => {
    const text = kind === 'name'
      ? String(editingBrand?.name || '').trim()
      : String(pageForm.description || '').trim();
    if (!text) {
      toast.error(kind === 'name' ? 'Brand name is required' : 'Write the English description first');
      return;
    }
    try {
      setTranslating(kind);
      const token = await getToken();
      const { data } = await axios.post('/api/store/categories/translate-arabic', {
        text,
        kind,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const translated = String(data?.nameAr || data?.descriptionAr || '').trim();
      if (!translated) {
        toast.error('Translation came back empty');
        return;
      }
      setPageForm((prev) => ({
        ...prev,
        ...(kind === 'name' ? { nameAr: translated } : { descriptionAr: translated }),
      }));
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Translation failed');
    } finally {
      setTranslating('');
    }
  };

  const savePage = async () => {
    if (!editingBrand?.name) return;
    try {
      setSaving(true);
      const token = await getToken();
      let imageUrl = pageForm.image || '';
      if (imageFile) {
        imageUrl = await uploadBrandImage(imageFile, token, 'image');
        if (!imageUrl) {
          toast.error('Logo upload failed');
          return;
        }
      }
      const banners = {};
      for (const field of BANNER_FIELDS) {
        banners[field.key] = pageForm[field.key] || '';
        if (bannerFiles[field.key]) {
          const uploaded = await uploadBrandImage(bannerFiles[field.key], token, field.key);
          if (!uploaded) {
            toast.error(`${field.label} upload failed`);
            return;
          }
          banners[field.key] = uploaded;
        }
      }
      const { data } = await axios.patch('/api/store/brands', {
        action: 'save-page',
        name: editingBrand.name,
        ...pageForm,
        image: imageUrl,
        ...banners,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Brand page saved');
      setEditingBrand(null);
      await loadBrands();
      if (data?.page?.path) {
        toast.success(`Live at ${data.page.path}`);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save brand page');
    } finally {
      setSaving(false);
    }
  };

  const openRename = (brandName) => {
    setRenameFrom(brandName);
    setRenameTo(brandName);
  };

  const saveRename = async () => {
    const from = String(renameFrom || '').trim();
    const to = String(renameTo || '').trim();
    if (!from || !to) {
      toast.error('Enter both current and new brand names');
      return;
    }
    if (from === to) {
      toast.error('New name must be different');
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const { data } = await axios.patch('/api/store/brands', {
        action: 'rename',
        from,
        to,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(data?.message || 'Brand renamed');
      setRenameFrom('');
      setRenameTo('');
      await loadBrands();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to rename brand');
    } finally {
      setSaving(false);
    }
  };

  const saveMerge = async () => {
    const from = String(mergeFrom || '').trim();
    const to = String(mergeTo || '').trim();
    if (!from || !to) {
      toast.error('Choose both brands to merge');
      return;
    }
    if (from === to) {
      toast.error('Pick two different brands');
      return;
    }
    if (!confirm(`Merge “${from}” into “${to}”? All products with “${from}” will use “${to}”.`)) {
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const { data } = await axios.patch('/api/store/brands', {
        action: 'merge',
        from,
        to,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(data?.message || 'Brands merged');
      setMergeFrom('');
      setMergeTo('');
      await loadBrands();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to merge brands');
    } finally {
      setSaving(false);
    }
  };

  const mergeCaseGroup = async (group) => {
    const names = Array.isArray(group?.names) ? group.names : [];
    if (names.length < 2) return;
    const canonical = names.reduce((best, name) => (
      (name?.length || 0) > (best?.length || 0) ? name : best
    ), names[0]);

    if (!confirm(`Merge ${names.length} spellings (${names.join(', ')}) into “${canonical}”?`)) {
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const { data } = await axios.patch('/api/store/brands', {
        action: 'merge-case',
        from: canonical,
        to: canonical,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(data?.message || 'Case variants merged');
      await loadBrands();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to merge case variants');
    } finally {
      setSaving(false);
    }
  };

  if (loading && brands.length === 0) return <Loading />;

  return (
    <div className="w-full max-w-5xl" lang="en" dir="ltr">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-slate-500">
            Store <span className="font-medium text-slate-800">Brands</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            A logo saved here is the Top Brands row on the homepage. Brands without a logo stay off that row.
          </p>
        </div>
        <Link
          href="/store/manage-product"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Manage products
          <FiExternalLink size={14} />
        </Link>
      </div>

      {duplicateGroups.length > 0 ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <h2 className="text-sm font-semibold text-amber-950">Case duplicates found ({duplicateGroups.length})</h2>
          <p className="mt-1 text-xs text-amber-900">
            Same brand with different capitalization (e.g. Green Lion / GREEN LION). Merge them into one spelling.
          </p>
          <ul className="mt-3 space-y-2">
            {duplicateGroups.slice(0, 8).map((group) => (
              <li
                key={group.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2"
              >
                <div className="min-w-0 text-sm text-slate-700">
                  <span className="font-medium">{group.names.join(' · ')}</span>
                  <span className="ms-2 text-xs text-slate-500">{group.productCount} products</span>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => mergeCaseGroup(group)}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  Merge spelling
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Rename brand</h2>
          <div className="mt-3 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Current name</span>
              <input
                value={renameFrom}
                onChange={(e) => setRenameFrom(e.target.value)}
                list="store-brands-list"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. green lion"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">New name</span>
              <input
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. Green Lion"
              />
            </label>
            <button
              type="button"
              onClick={saveRename}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Rename'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Merge brand into another</h2>
          <div className="mt-3 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Merge from</span>
              <select
                value={mergeFrom}
                onChange={(e) => setMergeFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select brand…</option>
                {brands.map((brand) => (
                  <option key={`from-${brand.name}`} value={brand.name}>
                    {brand.name} ({brand.productCount})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Merge into</span>
              <select
                value={mergeTo}
                onChange={(e) => setMergeTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select brand…</option>
                {brands.map((brand) => (
                  <option key={`to-${brand.name}`} value={brand.name}>
                    {brand.name} ({brand.productCount})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={saveMerge}
              disabled={saving}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? 'Merging…' : 'Merge brands'}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands…"
            className="w-full rounded-lg border border-slate-300 py-2.5 ps-9 pe-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>

      {filteredBrands.length > 0 ? (
        <BrandPagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredBrands.length}
          rangeStart={paginationStart}
          rangeEnd={paginationEnd}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          className="mb-4"
        />
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Logo</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBrands.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No brands found. Brands appear here after products have a brand name set.
                </td>
              </tr>
            ) : (
              pagedBrands.map((brand) => (
                <tr key={brand.name} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                      <FiTag className="text-teal-600" size={14} />
                      {brand.name}
                    </span>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {brand.page?.path || `/brand/${slugifyBrand(brand.name)}`}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {brand.page?.image ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={readableUploadUrl(brand.page.image)}
                          alt=""
                          className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain"
                        />
                        <p className="text-[11px] leading-snug text-slate-500">
                          Shown in Top Brands
                          {brand.page.imageUpdatedAt
                            ? ` · Logo updated ${formatLogoUpdated(brand.page.imageUpdatedAt)}`
                            : ''}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No logo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{brand.productCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openPageEditor(brand)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FiEdit2 size={12} />
                        Edit page
                      </button>
                      {brand.page?.path ? (
                        <Link
                          href={brand.page.path}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <FiExternalLink size={12} />
                          View
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openRename(brand.name)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Rename
                      </button>
                      <Link
                        href={`/store/manage-product?brand=${encodeURIComponent(brand.name)}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                      >
                        View products
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredBrands.length > 0 ? (
        <BrandPagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredBrands.length}
          rangeStart={paginationStart}
          rangeEnd={paginationEnd}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          className="mt-4"
        />
      ) : null}

      {editingBrand ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div className="my-6 w-full max-w-4xl rounded-2xl bg-white p-5 shadow-xl" lang="en" dir="ltr">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editingBrand.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Public page: {`/brand/${slugifyBrand(editingBrand.page?.slug || editingBrand.name)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBrand(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-600">Arabic name</label>
                  <button
                    type="button"
                    onClick={() => translateField('name')}
                    disabled={translating === 'name'}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    <MdAutoAwesome />
                    {translating === 'name' ? 'Translating...' : 'Translate'}
                  </button>
                </div>
                <input
                  value={pageForm.nameAr}
                  dir="rtl"
                  onChange={(event) => setPageForm((prev) => ({ ...prev, nameAr: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="الاسم بالعربي"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Description (English)</label>
                  <textarea
                    value={pageForm.description}
                    maxLength={2000}
                    rows={4}
                    onChange={(event) => setPageForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Shown under the brand name on the public page"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-600">Description (Arabic)</label>
                    <button
                      type="button"
                      onClick={() => translateField('description')}
                      disabled={translating === 'description' || !pageForm.description.trim()}
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                    >
                      <MdAutoAwesome />
                      {translating === 'description' ? 'Translating...' : 'Translate'}
                    </button>
                  </div>
                  <textarea
                    value={pageForm.descriptionAr}
                    maxLength={2000}
                    rows={4}
                    dir="rtl"
                    onChange={(event) => setPageForm((prev) => ({ ...prev, descriptionAr: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="الوصف بالعربي"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setImageFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setImagePreview(String(reader.result || ''));
                    reader.readAsDataURL(file);
                  }}
                  className="block w-full text-sm text-slate-600"
                />
                {imagePreview ? (
                  <img src={readableUploadUrl(imagePreview)} alt="" className="mt-2 h-20 w-20 rounded-lg border border-slate-200 object-contain" />
                ) : null}
                {imageFile ? (
                  <p className="mt-2 text-xs font-medium text-teal-700">This logo is saved when you click Save brand page.</p>
                ) : editingBrand.page?.imageUpdatedAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Logo updated {formatLogoUpdated(editingBrand.page.imageUpdatedAt)}
                  </p>
                ) : pageForm.image && editingBrand.page?.updatedAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Last saved {formatLogoUpdated(editingBrand.page.updatedAt)}. The next logo change records its own time.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No logo yet.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Banners</p>
                <p className="mt-1 text-xs text-slate-500">
                  Desktop, tablet, and mobile, in English and Arabic. The public page uses the same layout as a category.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {BANNER_FIELDS.map((field) => {
                    const preview = bannerPreviews[field.key] || pageForm[field.key];
                    return (
                      <div key={field.key} className="rounded-lg border border-slate-200 p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                            <p className="text-[11px] text-slate-500">{field.hint}</p>
                          </div>
                          {preview ? (
                            <button
                              type="button"
                              onClick={() => {
                                setBannerFiles((prev) => ({ ...prev, [field.key]: null }));
                                setBannerPreviews((prev) => ({ ...prev, [field.key]: '' }));
                                setPageForm((prev) => ({ ...prev, [field.key]: '' }));
                              }}
                              className="text-xs font-semibold text-slate-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (file.size > 15 * 1024 * 1024) {
                              toast.error('Banner must be 15MB or smaller');
                              return;
                            }
                            setBannerFiles((prev) => ({ ...prev, [field.key]: file }));
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setBannerPreviews((prev) => ({ ...prev, [field.key]: String(reader.result || '') }));
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="block w-full text-sm text-slate-600"
                        />
                        {preview ? (
                          <img src={readableUploadUrl(preview)} alt="" className="mt-2 h-24 w-full rounded-lg border border-slate-200 object-contain" dir={field.rtl ? 'rtl' : 'ltr'} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Meta title</span>
                  <input
                    value={pageForm.metaTitle}
                    maxLength={120}
                    onChange={(event) => setPageForm((prev) => ({ ...prev, metaTitle: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Meta description</span>
                  <textarea
                    value={pageForm.metaDescription}
                    maxLength={320}
                    rows={2}
                    onChange={(event) => setPageForm((prev) => ({ ...prev, metaDescription: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBrand(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePage}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save brand page'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <datalist id="store-brands-list">
        {brands.map((brand) => (
          <option key={brand.name} value={brand.name} />
        ))}
      </datalist>
    </div>
  );
}
