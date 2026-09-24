'use client';

import { useAuth } from '@/lib/useAuth';
import Loading from '@/components/Loading';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { countSkuCostRows, rowsToSkuCostLines } from '@/lib/productCostSheet';
import axios from 'axios';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, CircleDollarSign, ExternalLink, FileSpreadsheet, History, Search, Upload, X } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'AED';

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dubai',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sourceLabel(source) {
  if (source === 'excel') return 'Excel';
  if (source === 'sku_list') return 'SKU list';
  if (source === 'selection') return 'Selection';
  if (source === 'row_edit') return 'Row edit';
  return source || '—';
}

function actionLabel(action) {
  if (action === 'bulk_set_cost') return 'Bulk cost';
  return 'Set cost';
}

export default function ProductCostPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ totalProducts: 0, withCostPrice: 0, needConfiguration: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [supplierId, setSupplierId] = useState('');
  const [brand, setBrand] = useState('');
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [editingCost, setEditingCost] = useState('');
  const [savingId, setSavingId] = useState('');
  const [bulkSkus, setBulkSkus] = useState('');
  const [bulkCost, setBulkCost] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [excelName, setExcelName] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sheetStatus, setSheetStatus] = useState(null);
  const [sheetSyncing, setSheetSyncing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter, pageSize, supplierId, brand]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/product-cost', {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch,
          filter,
          supplierId,
          brand,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(Array.isArray(data?.products) ? data.products : []);
      setPagination(data?.pagination || { page, limit: pageSize, total: 0, totalPages: 1 });
      setStats(data?.stats || { totalProducts: 0, withCostPrice: 0, needConfiguration: 0 });
      if (Array.isArray(data?.brands)) setBrandOptions(data.brands);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [brand, debouncedSearch, filter, getToken, page, pageSize, supplierId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get('/api/store/suppliers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setSupplierOptions(Array.isArray(data?.suppliers) ? data.suppliers : []);
        }
      } catch {
        if (!cancelled) setSupplierOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  const saveRowCost = async (productId, costPrice) => {
    try {
      setSavingId(productId);
      const token = await getToken();
      const current = products.find((product) => String(product._id) === String(productId));
      const { data } = await axios.put('/api/store/product-cost', {
        productId,
        costPrice,
        sku: current?.sku || '',
        source: 'row_edit',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((current) => current.map((product) => (
        String(product._id) === String(productId)
          ? { ...product, costPrice: data?.product?.costPrice ?? Number(costPrice) }
          : product
      )));
      setEditingId('');
      toast.success(data?.message || 'Product cost saved');
      fetchProducts();
      fetchHistory(1);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to save cost');
    } finally {
      setSavingId('');
    }
  };

  const fetchHistory = useCallback(async (nextPage = 1) => {
    try {
      setHistoryLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/product-cost/history', {
        params: { page: nextPage, limit: 20 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistoryItems(Array.isArray(data?.items) ? data.items : []);
      setHistoryPage(data?.pagination?.page || nextPage);
      setHistoryTotalPages(data?.pagination?.totalPages || 1);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const fetchSheetStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/store/inventory/google-sheet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSheetStatus(data);
    } catch {
      setSheetStatus({ configured: false });
    }
  }, [getToken]);

  useEffect(() => {
    fetchSheetStatus();
  }, [fetchSheetStatus]);

  const syncGoogleSheet = async () => {
    try {
      setSheetSyncing(true);
      const token = await getToken();
      const { data } = await axios.post('/api/store/inventory/google-sheet', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSheetStatus((current) => ({
        ...(current || {}),
        configured: true,
        spreadsheetUrl: data?.spreadsheetUrl || current?.spreadsheetUrl,
        lastSyncedAt: data?.syncedAt,
        rowCount: data?.rowCount,
        costRowCount: data?.costRowCount,
        costTab: data?.costTab || current?.costTab,
      }));
      toast.success(data?.message || 'Google Sheet updated');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to sync Google Sheet');
    } finally {
      setSheetSyncing(false);
    }
  };

  const applySkuCostText = async (skuText) => {
    if (!String(skuText || '').trim()) {
      toast.error('No SKU and cost rows found');
      return;
    }
    try {
      setBulkSaving(true);
      const token = await getToken();
      const { data } = await axios.post('/api/store/product-cost', {
        productIds: [],
        skus: skuText,
        costPrice: '',
        source: 'excel',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(data?.message || 'Product costs updated');
      fetchProducts();
      fetchHistory(1);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to bulk update costs');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setBulkSaving(true);
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
      const lines = rowsToSkuCostLines(rows);
      if (!lines.length) {
        toast.error('No SKU and cost rows found. Use headers SKU and Product cost. Keep SKUs as text so Excel does not turn them into 8.9E+12.');
        return;
      }
      setExcelName(`${file.name} · ${countSkuCostRows(rows)} row(s)`);
      setBulkSkus(lines.join('\n'));
      await applySkuCostText(lines.join('\n'));
    } catch (error) {
      toast.error(error.message || 'Failed to read Excel file');
    } finally {
      setBulkSaving(false);
    }
  };

  const applyBulkCost = async ({ useSelection = false } = {}) => {
    const productIds = useSelection ? selectedIds : [];
    if (!useSelection && !String(bulkSkus || '').trim() && !productIds.length) {
      toast.error('Paste SKUs or select products first');
      return;
    }
    if (useSelection && !productIds.length) {
      toast.error('Select products on this page first');
      return;
    }
    if (!String(bulkCost || '').trim() && !/[,\t=]/.test(bulkSkus)) {
      toast.error('Enter a cost, or paste lines like ST4001,12.50');
      return;
    }

    try {
      setBulkSaving(true);
      const token = await getToken();
      const { data } = await axios.post('/api/store/product-cost', {
        productIds,
        skus: useSelection ? '' : bulkSkus,
        costPrice: bulkCost,
        source: useSelection ? 'selection' : 'sku_list',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(data?.message || 'Product costs updated');
      setSelectedIds([]);
      fetchProducts();
      fetchHistory(1);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to bulk update costs');
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleSelected = (productId) => {
    const id = String(productId);
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const allVisibleSelected = products.length > 0 && products.every((product) => selectedIds.includes(String(product._id)));

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5" lang="en" dir="ltr">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Product Cost</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add purchase cost for each product. Sales reports use this for profit. The storefront sale price does not change.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Products</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalProducts}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
            <p className="text-[11px] uppercase tracking-wide text-emerald-700">Cost set</p>
            <p className="text-lg font-bold text-emerald-900">{stats.withCostPrice}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
            <p className="text-[11px] uppercase tracking-wide text-amber-700">Missing cost</p>
            <p className="text-lg font-bold text-amber-900">{stats.needConfiguration}</p>
          </div>
          {sheetStatus?.configured && sheetStatus?.spreadsheetUrl ? (
            <a
              href={sheetStatus.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              <ExternalLink size={16} /> View Google Sheet
            </a>
          ) : null}
          <button
            type="button"
            onClick={syncGoogleSheet}
            disabled={sheetSyncing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileSpreadsheet size={16} />
            {sheetSyncing ? 'Syncing...' : 'Sync Google Sheet'}
          </button>
        </div>
      </div>

      {sheetStatus && !sheetStatus.configured ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Google Sheet is not connected yet. Add GOOGLE_SHEETS_SPREADSHEET_ID in .env and share the sheet with
          {' '}{sheetStatus.clientEmail || 'the service account email'} as Editor.
        </p>
      ) : sheetStatus?.configured ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          The sheet updates automatically a few seconds after you save. Tabs: <span className="font-semibold">Product Cost</span>, <span className="font-semibold">Nexso</span>, and <span className="font-semibold">Suppliers</span>. You can still Sync now.
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Bulk add or edit cost</h2>
        <p className="mt-1 text-xs text-slate-500">
          Paste SKUs, or upload an Excel file with SKU and cost columns. Headers can be SKU / Product cost, in either order.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload size={16} />
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleExcelUpload}
              disabled={bulkSaving}
            />
          </label>
          {excelName ? <span className="text-xs text-slate-500">{excelName}</span> : null}
        </div>
        <textarea
          value={bulkSkus}
          onChange={(event) => setBulkSkus(event.target.value)}
          rows={4}
          placeholder={'ST4001, ST4002\n\nor\n\nST4001,12.50\nST4002,8.00'}
          className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-400"
        />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[160px]">
            <span className="mb-1 block text-xs font-medium text-slate-500">Cost ({currency})</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bulkCost}
              onChange={(event) => setBulkCost(event.target.value)}
              placeholder="Leave blank if each SKU line has a cost"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400"
            />
          </label>
          <button
            type="button"
            onClick={() => applyBulkCost({ useSelection: false })}
            disabled={bulkSaving}
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {bulkSaving ? 'Saving...' : 'Apply cost by SKU'}
          </button>
          <button
            type="button"
            onClick={() => applyBulkCost({ useSelection: true })}
            disabled={bulkSaving || !selectedIds.length}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Apply to {selectedIds.length || 0} selected
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search name, SKU, brand, or supplier"
            className="h-10 w-full rounded-lg border border-slate-200 ps-9 pe-3 text-sm outline-none focus:border-emerald-400"
          />
        </div>
        <select
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
          className="h-10 min-w-[12rem] rounded-lg border border-slate-200 bg-white px-3 text-sm"
          aria-label="Filter by supplier"
        >
          <option value="">All suppliers{supplierOptions.length ? ` (${supplierOptions.length})` : ''}</option>
          <option value="none">No supplier</option>
          {supplierOptions.map((supplier) => (
            <option key={supplier.id || supplier._id} value={supplier.id || supplier._id}>
              {supplier.name}
            </option>
          ))}
        </select>
        <select
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          className="h-10 min-w-[11rem] rounded-lg border border-slate-200 bg-white px-3 text-sm"
          aria-label="Filter by brand"
        >
          <option value="">All brands{brandOptions.length ? ` (${brandOptions.length})` : ''}</option>
          {brandOptions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        {['all', 'missing', 'set'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`h-10 rounded-lg px-3 text-sm font-medium ${
              filter === value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {value === 'all' ? 'All products' : value === 'missing' ? 'Missing cost' : 'Cost set'}
          </button>
        ))}
        <select
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value) || 20)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => {
                      if (allVisibleSelected) {
                        const visible = new Set(products.map((product) => String(product._id)));
                        setSelectedIds((current) => current.filter((id) => !visible.has(id)));
                      } else {
                        setSelectedIds((current) => [...new Set([
                          ...current,
                          ...products.map((product) => String(product._id)),
                        ])]);
                      }
                    }}
                  />
                </th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Supplier</th>
                <th className="px-3 py-3">Sale price</th>
                <th className="px-3 py-3">Cost</th>
                <th className="px-3 py-3">Margin</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && !products.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                    <Loading />
                  </td>
                </tr>
              ) : null}
              {!loading && !products.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-500">No products found.</td>
                </tr>
              ) : null}
              {products.map((product) => {
                const id = String(product._id);
                const editing = editingId === id;
                const image = getProductThumbnailUrl(product, { fallback: '' });
                const sale = Number(product.price || 0);
                const cost = Number(product.costPrice || 0);
                const margin = sale > 0 && cost > 0 ? ((sale - cost) / sale) * 100 : null;
                return (
                  <tr key={id} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() => toggleSelected(id)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-slate-100">
                          {image ? (
                            <Image src={image} alt={product.name} fill className="object-cover" />
                          ) : (
                            <CircleDollarSign className="m-auto mt-2.5 text-slate-300" size={20} />
                          )}
                        </div>
                        <span className="font-medium text-slate-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">
                      {(Array.isArray(product.skus) && product.skus.length ? product.skus : [product.sku].filter(Boolean)).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{product.supplierName || '—'}</td>
                    <td className="px-3 py-3 text-slate-700">{currency} {formatMoney(sale)}</td>
                    <td className="px-3 py-3">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingCost}
                          onChange={(event) => setEditingCost(event.target.value)}
                          className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-emerald-400"
                        />
                      ) : (
                        <span className={cost > 0 ? 'font-semibold text-slate-900' : 'text-amber-700'}>
                          {cost > 0 ? `${currency} ${formatMoney(cost)}` : 'Add cost'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {margin === null ? '—' : `${margin.toFixed(1)}%`}
                    </td>
                    <td className="px-3 py-3">
                      {editing ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={savingId === id}
                            onClick={() => saveRowCost(id, editingCost)}
                            className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-60"
                            aria-label="Save cost"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId('')}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                            aria-label="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(id);
                            setEditingCost(cost > 0 ? String(cost) : '');
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {cost > 0 ? 'Edit' : 'Add'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} products
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <History size={16} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Cost history</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Every cost change on this page is recorded here and in Activity history.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">By</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3 text-right">Cost</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">Loading history…</td>
                </tr>
              ) : historyItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">No cost changes yet. Add or edit a cost to start the log.</td>
                </tr>
              ) : (
                historyItems.map((row) => (
                  <tr key={row._id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDateTime(row.createdAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-600">{row.sku || '—'}</td>
                    <td className="px-3 py-3">
                      <p className="line-clamp-2 font-medium text-slate-800">{row.productName || '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-slate-700">{row.actorName || '—'}</p>
                      <p className="text-xs text-slate-400">{row.actorEmail || ''}</p>
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-600">{actionLabel(row.action)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm">
                      <span className="text-slate-400">{currency} {formatMoney(row.previousCost)}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className="font-semibold text-slate-900">{currency} {formatMoney(row.newCost)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{sourceLabel(row.source)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">Page {historyPage} of {historyTotalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={historyPage <= 1 || historyLoading}
              onClick={() => fetchHistory(historyPage - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={historyPage >= historyTotalPages || historyLoading}
              onClick={() => fetchHistory(historyPage + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
