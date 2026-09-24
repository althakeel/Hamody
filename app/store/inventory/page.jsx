'use client';

import { useAuth } from '@/lib/useAuth';
import Loading from '@/components/Loading';
import { applyPreviewNewStock, applyPreviewVariantStock } from '@/lib/applyMainStock';
import { parseSkuStockExcelFile, downloadSkuStockExcelTemplate, downloadInventoryPreviewExcel } from '@/lib/parseSkuStockExcel';
import axios from 'axios';
import Image from 'next/image';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Boxes,
  CalendarDays,
  Download,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  Save,
  Search,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getStockBadgeClass(stock) {
  const qty = Number(stock ?? 0);
  if (qty <= 0) return 'bg-red-50 text-red-700 ring-1 ring-red-100';
  if (qty < 10) return 'bg-amber-50 text-amber-800 ring-1 ring-amber-100';
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
}

function getStockRowClass(stock) {
  const qty = Number(stock ?? 0);
  if (qty <= 0) return 'hover:bg-red-50/60';
  if (qty < 10) return 'hover:bg-amber-50/60';
  return 'hover:bg-zinc-50';
}

function parsePositiveAddAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount);
}

function parsePreviewStock(value) {
  if (value === '' || value == null) return null;
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 0 || !Number.isInteger(qty)) return null;
  return qty;
}

function StockNewInput({ value, disabled, onChange }) {
  return (
    <input
      type="number"
      min="0"
      step="1"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400 disabled:opacity-40"
    />
  );
}

function groupHistoryByDate(items = []) {
  const groups = [];
  let currentDateKey = '';

  items.forEach((item) => {
    const dateKey = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-CA')
      : 'unknown';
    if (dateKey !== currentDateKey) {
      currentDateKey = dateKey;
      groups.push({ type: 'date', key: `date-${dateKey}`, label: formatDateLabel(item.createdAt) });
    }
    groups.push({ type: 'row', key: item._id, item });
  });

  return groups;
}

function StockQuickAddBar({
  item,
  drafts,
  savingId,
  onDraftChange,
  onSave,
  hasUnsavedChanges,
  onClear,
  loading,
}) {
  if (loading && !item) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-400">
        Loading product…
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-300 shadow-sm">
          <Boxes size={20} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">Quick add stock</p>
          <p className="text-xs text-slate-500">Search a product above to update inventory</p>
        </div>
      </div>
    );
  }

  const draft = drafts[item._id] || {};
  const addAmount = parsePositiveAddAmount(draft.stockToAdd);
  const newStock = item.currentStock + addAmount;

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 via-white to-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white bg-white shadow-sm">
            {item.image ? (
              <Image src={item.image} alt={item.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <Boxes size={22} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900" title={item.name}>{item.name}</h3>
              <button type="button" onClick={onClear} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white/80 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs text-slate-600 shadow-sm">{item.sku || 'No SKU'}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStockBadgeClass(item.currentStock)}`}>
                Current: {item.currentStock}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end xl:shrink-0">
          {item.hasVariants ? (
            <div className="flex flex-wrap gap-2">
              {item.variantStocks.map((variant) => {
                const variantAdd = parsePositiveAddAmount(draft[`variant_add_${variant.index}`]);
                return (
                  <div key={`${item._id}-${variant.index}`} className="rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                    <p className="mb-1 max-w-[120px] truncate text-[10px] font-medium text-slate-500">{variant.label}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">{variant.stock}+</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={draft[`variant_add_${variant.index}`] ?? ''}
                        onChange={(e) => onDraftChange(item._id, `variant_add_${variant.index}`, e.target.value)}
                        placeholder="0"
                        className="w-14 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-emerald-400"
                      />
                      {variantAdd > 0 ? <span className="text-xs font-semibold text-emerald-600">{variant.stock + variantAdd}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">Add units</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">{item.currentStock}</span>
                <ArrowRight size={14} className="text-slate-300" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.stockToAdd ?? ''}
                  onChange={(e) => onDraftChange(item._id, 'stockToAdd', e.target.value)}
                  placeholder="Qty"
                  className="w-24 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400"
                />
                {addAmount > 0 ? (
                  <span className="text-sm font-semibold text-emerald-600">→ {newStock}</span>
                ) : null}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => onSave(item)}
            disabled={savingId === item._id || !hasUnsavedChanges(item)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={16} />
            {savingId === item._id ? 'Saving…' : 'Update stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StoreInventoryPage() {
  const { getToken } = useAuth();
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [exportingHistory, setExportingHistory] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalToday, setExportModalToday] = useState(false);
  const [exportModalFrom, setExportModalFrom] = useState('');
  const [exportModalTo, setExportModalTo] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyTodayCount, setHistoryTodayCount] = useState(0);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [appliedHistorySearch, setAppliedHistorySearch] = useState('');
  const [historyTodayOnly, setHistoryTodayOnly] = useState(false);
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const [drafts, setDrafts] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestDropdown, setShowSuggestDropdown] = useState(false);
  const [bulkSkuText, setBulkSkuText] = useState('');
  const [bulkSkuStock, setBulkSkuStock] = useState('');
  const [bulkSkuSaving, setBulkSkuSaving] = useState(false);
  const [bulkSkuPreviewing, setBulkSkuPreviewing] = useState(false);
  const [bulkSkuPreview, setBulkSkuPreview] = useState(null);
  const [showBulkSkuPreviewModal, setShowBulkSkuPreviewModal] = useState(false);
  const [bulkSkuResult, setBulkSkuResult] = useState(null);
  const [bulkExcelName, setBulkExcelName] = useState('');
  const [bulkExcelRows, setBulkExcelRows] = useState([]);
  const [sheetStatus, setSheetStatus] = useState(null);
  const [sheetSyncing, setSheetSyncing] = useState(false);
  const searchBoxRef = useRef(null);
  const suggestTimerRef = useRef(null);
  const bulkExcelInputRef = useRef(null);

  const fetchSelectedProduct = useCallback(async (productId, fallbackItem = null) => {
    const id = String(productId || '').trim();
    if (!id) {
      setSelectedProduct(null);
      return;
    }

    if (fallbackItem) setSelectedProduct(fallbackItem);

    try {
      setLoadingProduct(true);
      const token = await getToken();
      const params = new URLSearchParams({ productId: id, historyOnly: 'false', limit: '1' });
      const { data } = await axios.get(`/api/store/inventory?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const product = Array.isArray(data.items) ? data.items[0] : null;
      if (product) setSelectedProduct(product);
      else if (!fallbackItem) {
        setSelectedProduct(null);
        toast.error('Product not found');
      }
    } catch (error) {
      if (!fallbackItem) setSelectedProduct(null);
      toast.error(error?.response?.data?.error || error.message || 'Failed to load product');
    } finally {
      setLoadingProduct(false);
    }
  }, [getToken]);

  const selectProduct = useCallback((item) => {
    setSearchQuery(item.name || '');
    setShowSuggestDropdown(false);
    setSuggestions([]);
    setDrafts({});
    fetchSelectedProduct(item._id, item);
  }, [fetchSelectedProduct]);

  const clearSelectedProduct = useCallback(() => {
    setSelectedProduct(null);
    setSearchQuery('');
    setDrafts({});
  }, []);

  const fetchSuggestions = useCallback(async (query) => {
    const trimmed = String(query || '').trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestDropdown(false);
      return;
    }

    try {
      setSuggestLoading(true);
      const token = await getToken();
      const params = new URLSearchParams({ suggest: 'true', q: trimmed, limit: '8' });
      const { data } = await axios.get(`/api/store/inventory?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const nextSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      setSuggestions(nextSuggestions);
      setShowSuggestDropdown(nextSuggestions.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestDropdown(false);
    } finally {
      setSuggestLoading(false);
    }
  }, [getToken]);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setLoadingHistory(true);
      const token = await getToken();
      const params = new URLSearchParams({ page: String(page), limit: String(historyPagination.limit) });
      if (appliedHistorySearch) params.set('q', appliedHistorySearch);
      if (selectedProduct?._id) params.set('productId', selectedProduct._id);
      if (historyTodayOnly) params.set('todayOnly', 'true');
      if (!historyTodayOnly && historyFromDate) params.set('fromDate', historyFromDate);
      if (!historyTodayOnly && historyToDate) params.set('toDate', historyToDate);

      const { data } = await axios.get(`/api/store/inventory/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setHistoryItems(Array.isArray(data.items) ? data.items : []);
      setHistoryTodayCount(Number(data.todayCount || 0));
      setHistoryPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to load update history');
    } finally {
      setLoadingHistory(false);
    }
  }, [
    appliedHistorySearch,
    getToken,
    historyFromDate,
    historyPagination.limit,
    historyTodayOnly,
    historyToDate,
    selectedProduct?._id,
  ]);

  useEffect(() => {
    if (suggestTimerRef.current) window.clearTimeout(suggestTimerRef.current);
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestDropdown(false);
      return undefined;
    }
    suggestTimerRef.current = window.setTimeout(() => fetchSuggestions(searchQuery), 280);
    return () => { if (suggestTimerRef.current) window.clearTimeout(suggestTimerRef.current); };
  }, [fetchSuggestions, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowSuggestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const setDraftValue = (productId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [field]: value },
    }));
  };

  const hasStockToAdd = useCallback((item) => {
    const draft = drafts[item._id];
    if (!draft) return false;
    if (item.hasVariants) {
      return item.variantStocks.some((variant) => parsePositiveAddAmount(draft[`variant_add_${variant.index}`]) > 0);
    }
    return parsePositiveAddAmount(draft.stockToAdd) > 0;
  }, [drafts]);

  const resetBulkSkuPreview = () => {
    setBulkSkuPreview(null);
    setBulkSkuResult(null);
    setShowBulkSkuPreviewModal(false);
  };

  const downloadBulkSkuNotFoundSheet = async () => {
    const missing = Array.isArray(bulkSkuPreview?.missing) ? bulkSkuPreview.missing : [];
    if (!bulkExcelRows.length && !missing.length) {
      toast.error('Upload a sheet first, then download the not-found rows');
      return;
    }
    try {
      const baseName = String(bulkExcelName || 'inventory-sheet')
        .replace(/\.(xlsx|xls|csv)$/i, '')
        .replace(/[^\w\- ]+/g, '')
        .trim() || 'inventory-sheet';
      await downloadInventoryPreviewExcel({
        rows: bulkExcelRows,
        missingSkus: missing,
        fileName: `${baseName}-not-found.xlsx`,
      });
      toast.success('Downloaded the uploaded sheet. Not-found SKUs are marked in red.');
    } catch (error) {
      toast.error(error?.message || 'Failed to download the sheet');
    }
  };

  const closeBulkSkuPreviewModal = () => {
    if (bulkSkuSaving || bulkSkuPreviewing) return;
    setShowBulkSkuPreviewModal(false);
  };

  const buildBulkSkuPayload = () => {
    if (bulkExcelRows.length) {
      return { rows: bulkExcelRows, skus: bulkExcelRows.map((row) => row.sku) };
    }
    const stockQuantity = Number(bulkSkuStock);
    if (!String(bulkSkuText || '').trim()) {
      toast.error('Paste SKUs or upload an Excel file');
      return null;
    }
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0 || !Number.isInteger(stockQuantity)) {
      toast.error('Enter a whole-number main stock (0 or more)');
      return null;
    }
    return { skus: bulkSkuText, stockQuantity };
  };

  const handleBulkSkuPreview = async (payloadOverride) => {
    const payload = payloadOverride?.rows || payloadOverride?.skus
      ? payloadOverride
      : buildBulkSkuPayload();
    if (!payload) return;
    try {
      setShowBulkSkuPreviewModal(true);
      setBulkSkuPreviewing(true);
      setBulkSkuResult(null);
      const token = await getToken();
      const { data } = await axios.post('/api/store/inventory/bulk-sku', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBulkSkuPreview(data);
      if (!data.matches?.length) {
        toast.error(data.message || 'No matching products found');
      }
    } catch (error) {
      setBulkSkuPreview(null);
      toast.error(error?.response?.data?.error || error.message || 'Failed to preview SKUs');
    } finally {
      setBulkSkuPreviewing(false);
    }
  };

  const updateBulkSkuPreviewRow = (productId, updater) => {
    setBulkSkuPreview((prev) => {
      if (!prev?.matches) return prev;
      return {
        ...prev,
        matches: prev.matches.map((row) => (
          row.productId === productId ? updater(row) : row
        )),
      };
    });
  };

  const handlePreviewMainStockChange = (productId, value) => {
    updateBulkSkuPreviewRow(productId, (row) => {
      if (value === '') return { ...row, newStock: '' };
      const qty = parsePreviewStock(value);
      if (qty == null) return row;
      return applyPreviewNewStock(row, qty);
    });
  };

  const handlePreviewVariantStockChange = (productId, variantIndex, value) => {
    updateBulkSkuPreviewRow(productId, (row) => {
      if (value === '') {
        return {
          ...row,
          variants: (row.variants || []).map((variant) => {
            const matches = variant.index === variantIndex
              || (Array.isArray(variant.indexes) && variant.indexes.includes(variantIndex));
            if (!matches) return variant;
            if (variant.isBundle && !variant.isFamilyRow) {
              return { ...variant, newPacks: '' };
            }
            return { ...variant, newStock: '' };
          }),
        };
      }
      const qty = parsePreviewStock(value);
      if (qty == null) return row;
      return applyPreviewVariantStock(row, variantIndex, qty);
    });
  };

  const handleBulkExcelUpload = async (file) => {
    if (!file) return;
    try {
      const rows = await parseSkuStockExcelFile(file);
      setBulkExcelRows(rows);
      setBulkExcelName(file.name);
      setBulkSkuText(rows.map((row) => row.sku).join(', '));
      setBulkSkuStock('');
      resetBulkSkuPreview();
      toast.success(`Loaded ${rows.length} SKU row(s) from Excel`);
      await handleBulkSkuPreview({
        rows,
        skus: rows.map((row) => row.sku),
      });
    } catch (error) {
      setBulkExcelRows([]);
      setBulkExcelName('');
      toast.error(error?.message || 'Failed to read Excel file');
    }
  };

  const handleBulkSkuConfirm = async () => {
    const payload = buildBulkSkuPayload();
    if (!payload) return;
    if (!bulkSkuPreview?.matches?.length) {
      toast.error('Preview the SKUs first');
      return;
    }
    const updates = [];
    for (const row of bulkSkuPreview.matches) {
      const stockQuantity = parsePreviewStock(row.newStock);
      const supplierName = String(row.supplierName || '').trim();
      const brand = String(row.brand || '').trim();
      if (stockQuantity == null && !supplierName && !brand) {
        toast.error('Enter a whole-number stock (0 or more) in the New column');
        return;
      }
      const variants = [];
      if (stockQuantity != null) {
        for (const variant of row.variants || []) {
          const displayed = variant.isBundle && !variant.isFamilyRow
            ? variant.newPacks
            : variant.newStock;
          if (parsePreviewStock(displayed) == null) {
            toast.error(`Enter a whole-number stock for ${variant.label || 'each variant'}`);
            return;
          }
          const stock = parsePreviewStock(variant.newStock);
          if (stock == null) {
            toast.error(`Enter a whole-number stock for ${variant.label || 'each variant'}`);
            return;
          }
          const indexes = Array.isArray(variant.indexes) && variant.indexes.length
            ? variant.indexes
            : [variant.index];
          indexes.forEach((index) => {
            variants.push({ index, stock });
          });
        }
      }
      updates.push({
        productId: row.productId,
        stockQuantity,
        variants,
        supplierName,
        brand,
      });
    }
    try {
      setBulkSkuSaving(true);
      const token = await getToken();
      const { data } = await axios.post('/api/store/inventory/bulk-sku', {
        ...payload,
        updates,
        confirm: true,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBulkSkuResult(data);
      setBulkSkuPreview(null);
      setShowBulkSkuPreviewModal(false);
      await fetchHistory(1);
      toast.success(data.message || 'Stock updated');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to update stock by SKU');
    } finally {
      setBulkSkuSaving(false);
    }
  };

  const handleSave = async (item) => {
    try {
      setSavingId(item._id);
      const token = await getToken();
      const draft = drafts[item._id] || {};
      const payload = { productId: item._id };

      if (item.hasVariants) {
        payload.variants = item.variantStocks
          .map((variant) => ({
            index: variant.index,
            stockToAdd: parsePositiveAddAmount(draft[`variant_add_${variant.index}`]),
          }))
          .filter((entry) => entry.stockToAdd > 0);
      } else {
        payload.stockToAdd = parsePositiveAddAmount(draft.stockToAdd);
      }

      const { data } = await axios.patch('/api/store/inventory', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSelectedProduct(data.product);
      setDrafts((prev) => { const next = { ...prev }; delete next[item._id]; return next; });
      await fetchHistory(1);
      toast.success(data.message || 'Stock updated');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to update stock');
    } finally {
      setSavingId('');
    }
  };

  const handleHistoryExport = async ({
    todayOnly = exportModalToday,
    fromDate = exportModalFrom,
    toDate = exportModalTo,
    closeModal = false,
  } = {}) => {
    try {
      setExportingHistory(true);
      const token = await getToken();
      const params = new URLSearchParams();
      if (appliedHistorySearch) params.set('q', appliedHistorySearch);
      if (selectedProduct?._id) params.set('productId', selectedProduct._id);
      if (todayOnly) {
        params.set('todayOnly', 'true');
      } else {
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);
      }

      const response = await axios.get(`/api/store/inventory/history/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateLabel = todayOnly
        ? getTodayInputValue()
        : [fromDate, toDate].filter(Boolean).join('_') || 'all';
      link.download = `inventory-history-${dateLabel}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('History exported to Excel');
      if (closeModal) setShowExportModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to export history');
    } finally {
      setExportingHistory(false);
    }
  };

  const openExportModal = () => {
    setExportModalToday(false);
    setExportModalFrom('');
    setExportModalTo('');
    setShowExportModal(true);
  };

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

  useEffect(() => { fetchSheetStatus(); }, [fetchSheetStatus]);

  const applyFromGoogleSheet = async () => {
    try {
      setSheetSyncing(true);
      const token = await getToken();
      const { data } = await axios.post('/api/store/inventory/google-sheet', { apply: true }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      if (!rows.length) {
        toast.error(data?.message || 'No SKU rows found in the Google Sheet');
        return;
      }
      setBulkExcelRows(rows);
      setBulkExcelName('Google Sheet');
      setBulkSkuText(rows.map((row) => row.sku).join(', '));
      setBulkSkuStock('');
      resetBulkSkuPreview();
      toast.success(data.message || `Loaded ${rows.length} row(s) from Google Sheet`);
      await handleBulkSkuPreview({
        rows,
        skus: rows.map((row) => row.sku),
      });
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to read Google Sheet');
    } finally {
      setSheetSyncing(false);
    }
  };

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
      }));
      toast.success(data?.message || 'Google Sheet updated');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Failed to sync Google Sheet');
    } finally {
      setSheetSyncing(false);
    }
  };

  const clearHistoryFilters = useCallback(() => {
    setHistoryTodayOnly(false);
    setHistoryFromDate('');
    setHistoryToDate('');
    setHistorySearch('');
    setAppliedHistorySearch('');
  }, []);

  const applyHistorySearch = useCallback(() => {
    setAppliedHistorySearch(historySearch.trim());
  }, [historySearch]);

  const groupedHistory = useMemo(() => groupHistoryByDate(historyItems), [historyItems]);

  const hasActiveHistoryFilters = historyTodayOnly || historyFromDate || historyToDate || appliedHistorySearch;

  if (loadingHistory && historyItems.length === 0 && !selectedProduct) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-5 bg-white">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1" ref={searchBoxRef}>
          <Search size={18} className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim().length >= 2) setShowSuggestDropdown(true);
            }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestDropdown(true); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestDropdown(false); }}
            placeholder="Search by product name or SKU…"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            autoComplete="off"
          />
          {showSuggestDropdown && searchQuery.trim().length >= 2 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {suggestLoading ? (
                <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400">No products found</div>
              ) : (
                <ul className="max-h-72 divide-y divide-slate-50 overflow-y-auto">
                  {suggestions.map((item) => (
                    <li key={item._id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectProduct(item)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${getStockRowClass(item.currentStock)}`}
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <Boxes size={16} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono">{item.sku || 'No SKU'}</span>
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${getStockBadgeClass(item.currentStock)}`}>{item.currentStock}</span>
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <div className="rounded-lg bg-white px-3 py-1.5 text-center shadow-sm">
              <p className="text-[10px] font-medium text-slate-400">Today</p>
              <p className="text-base font-bold text-slate-900">{historyTodayCount}</p>
            </div>
            <div className="rounded-lg px-3 py-1.5 text-center">
              <p className="text-[10px] font-medium text-slate-400">Total</p>
              <p className="text-base font-bold text-slate-900">{historyPagination.total}</p>
            </div>
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
            {sheetSyncing ? 'Working…' : 'Sync Google Sheet'}
          </button>
          {sheetStatus?.configured ? (
            <button
              type="button"
              onClick={applyFromGoogleSheet}
              disabled={sheetSyncing || bulkSkuPreviewing || bulkSkuSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply from Google Sheet
            </button>
          ) : null}
          <button type="button" onClick={openExportModal} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
            <Download size={16} /> Excel
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedProduct?._id) fetchSelectedProduct(selectedProduct._id, selectedProduct);
              fetchHistory(historyPagination.page);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {sheetStatus && !sheetStatus.configured ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Google Sheet is not connected yet. Add GOOGLE_SHEETS_SPREADSHEET_ID in .env and share the sheet with
          {' '}{sheetStatus.clientEmail || 'the service account email'} as Editor. Share staff as Viewer.
          Sync writes store data to the sheet. Apply from Google Sheet updates stock, supplier, and brand only — SKU and product name stay the same. Extra tabs: Product Cost, Nexso, and Suppliers.
        </p>
      ) : sheetStatus?.clientEmail ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Inventory columns: SKU, PRODUCT NAME, STOCK, SUPPLIER NAME, BRAND. Apply from Google Sheet updates only stock, supplier, and brand. A missing supplier name is created. If Sync says the caller does not have permission, share
          {' '}<span className="font-mono text-slate-800">{sheetStatus.clientEmail}</span>{' '}
          as Editor. Staff can stay as Viewer.
        </p>
      ) : null}

      <StockQuickAddBar
        item={selectedProduct}
        drafts={drafts}
        savingId={savingId}
        onDraftChange={setDraftValue}
        onSave={handleSave}
        hasUnsavedChanges={hasStockToAdd}
        onClear={clearSelectedProduct}
        loading={loadingProduct}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" lang="en" dir="ltr">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Set main stock by SKU</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Paste SKUs and one stock, or upload a sheet with SKU, PRODUCT NAME, STOCK, SUPPLIER NAME, and BRAND (up to 10,000). SKU and product name stay the same. Only stock, supplier, and brand update. A missing supplier name is created so you can add details later. Review the popup and confirm — nothing saves before that.
          </p>
        </div>
        <textarea
          value={bulkSkuText}
          onChange={(e) => {
            setBulkSkuText(e.target.value);
            setBulkExcelRows([]);
            setBulkExcelName('');
            resetBulkSkuPreview();
          }}
          rows={3}
          placeholder="ST4006, ST4007, ST4008"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        {bulkExcelName ? (
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-700">
            <FileSpreadsheet size={14} />
            {bulkExcelName} · {bulkExcelRows.length} SKU(s) with stock
            <button
              type="button"
              onClick={() => {
                setBulkExcelRows([]);
                setBulkExcelName('');
                setBulkSkuText('');
                resetBulkSkuPreview();
              }}
              className="font-semibold text-slate-500 hover:text-slate-800"
            >
              Clear file
            </button>
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[140px]">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Main stock</span>
            <input
              type="number"
              min="0"
              step="1"
              value={bulkSkuStock}
              disabled={bulkExcelRows.length > 0}
              onChange={(e) => {
                setBulkSkuStock(e.target.value);
                resetBulkSkuPreview();
              }}
              placeholder={bulkExcelRows.length ? 'From sheet' : 'e.g. 20'}
              className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
          <button
            type="button"
            onClick={() => handleBulkSkuPreview()}
            disabled={bulkSkuPreviewing || bulkSkuSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {bulkSkuPreviewing ? 'Loading preview…' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={() => bulkExcelInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Upload size={16} />
            Upload Excel
          </button>
          <button
            type="button"
            onClick={() => downloadSkuStockExcelTemplate()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={16} />
            Excel template
          </button>
          <input
            ref={bulkExcelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              handleBulkExcelUpload(file);
            }}
          />
        </div>

        {bulkSkuResult ? (
          <p className="mt-3 text-sm text-slate-600">
            {bulkSkuResult.message}
            {Array.isArray(bulkSkuResult.missing) && bulkSkuResult.missing.length ? (
              <span className="mt-1 block font-mono text-xs text-amber-700">
                Not found: {bulkSkuResult.missing.join(', ')}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Stock update log</h2>
              <p className="text-xs text-slate-500">{historyPagination.total} record(s)</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHistoryTodayOnly((v) => !v);
                if (!historyTodayOnly) { setHistoryFromDate(''); setHistoryToDate(''); }
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                historyTodayOnly ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Today
            </button>
            <input type="date" value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setHistoryTodayOnly(false); }} className="rounded-lg border-0 bg-slate-100 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-200" />
            <span className="text-slate-300">→</span>
            <input type="date" value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setHistoryTodayOnly(false); }} className="rounded-lg border-0 bg-slate-100 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-200" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyHistorySearch(); }}
              placeholder="Filter…"
              className="min-w-[100px] rounded-lg border-0 bg-slate-100 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-200 sm:w-36"
            />
            <button type="button" onClick={applyHistorySearch} className="rounded-lg bg-slate-900 p-2 text-white hover:bg-slate-800">
              <Search size={14} />
            </button>
            {hasActiveHistoryFilters ? (
              <button type="button" onClick={clearHistoryFilters} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Clear">
                <CalendarDays size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">When</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3 min-w-[200px]">Product</th>
                <th className="hidden px-3 py-3 lg:table-cell">By</th>
                <th className="px-3 py-3 text-right">+ / −</th>
                <th className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-slate-400">Loading history…</td></tr>
              ) : historyItems.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-slate-400">No updates yet — add stock above to get started</td></tr>
              ) : (
                groupedHistory.map((entry, idx) => {
                  if (entry.type === 'date') {
                    return (
                      <tr key={entry.key}>
                        <td colSpan={6} className="bg-slate-100/70 px-4 py-2">
                          <span className="text-xs font-semibold text-slate-600">{entry.label}</span>
                        </td>
                      </tr>
                    );
                  }
                  const row = entry.item;
                  const zebra = idx % 2 === 0;
                  return (
                    <tr key={entry.key} className={`border-b border-slate-50 transition hover:bg-emerald-50/30 ${zebra ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDateTime(row.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-600">{row.sku || '—'}</td>
                      <td className="px-3 py-3">
                        <p className="line-clamp-2 text-sm font-medium text-slate-800" title={row.productName}>{row.productName || '—'}</p>
                        <p className="mt-0.5 text-xs text-slate-400 lg:hidden">{row.actorName}</p>
                      </td>
                      <td className="hidden px-3 py-3 lg:table-cell">
                        <p className="text-sm text-slate-700">{row.actorName || '—'}</p>
                        <p className="truncate text-xs text-slate-400">{row.actorEmail || ''}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-sm font-bold ${row.quantityDelta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {row.quantityDelta > 0 ? '+' : ''}{row.quantityDelta}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        <span className="text-slate-400">{row.previousStock}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="font-semibold text-slate-900">{row.newStock}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {historyPagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>Page {historyPagination.page} of {historyPagination.totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={historyPagination.page <= 1 || loadingHistory} onClick={() => fetchHistory(historyPagination.page - 1)} className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40">Previous</button>
              <button type="button" disabled={historyPagination.page >= historyPagination.totalPages || loadingHistory} onClick={() => fetchHistory(historyPagination.page + 1)} className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40">Next</button>
            </div>
          </div>
        ) : null}
      </div>

      {showBulkSkuPreviewModal ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          onClick={closeBulkSkuPreviewModal}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Preview inventory changes</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  SKU and product name stay the same. Only stock, supplier, and brand will update after you confirm.
                </p>
              </div>
              <button
                type="button"
                onClick={closeBulkSkuPreviewModal}
                disabled={bulkSkuSaving}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
              {bulkSkuPreviewing && !bulkSkuPreview ? (
                <p className="py-10 text-center text-sm text-slate-500">Loading preview…</p>
              ) : bulkSkuPreview?.matches?.length ? (
                <>
                  <p className="mb-3 text-sm text-slate-600">{bulkSkuPreview.message}</p>
                  <table className="w-full min-w-[920px] text-sm">
                    <thead className="sticky top-0 bg-white text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="pb-2 pr-3">SKU</th>
                        <th className="pb-2 pr-3">Product</th>
                        <th className="pb-2 pr-3">Supplier</th>
                        <th className="pb-2 pr-3">Brand</th>
                        <th className="pb-2 pr-3 text-right">Current</th>
                        <th className="pb-2 text-right">New</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkSkuPreview.matches.map((row) => (
                        <Fragment key={row.productId}>
                          <tr className="border-t border-slate-100">
                            <td className="py-2 pr-3 font-mono text-xs text-slate-600">{row.sku || '—'}</td>
                            <td className="py-2 pr-3 font-medium text-slate-800">{row.name || '—'}</td>
                            <td className="py-2 pr-3 text-xs text-slate-600">
                              {row.currentSupplier || '—'}
                              {row.supplierName ? (
                                <span className="mt-0.5 block text-emerald-700">
                                  → {row.newSupplier}{row.createSupplier ? ' (new)' : ''}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 pr-3 text-xs text-slate-600">
                              {row.currentBrand || '—'}
                              {row.brand && row.brand !== row.currentBrand ? (
                                <span className="mt-0.5 block text-emerald-700">→ {row.newBrand}</span>
                              ) : null}
                            </td>
                            <td className="py-2 pr-3 text-right text-slate-500">{row.currentStock}</td>
                            <td className="py-2 text-right">
                              <StockNewInput
                                value={row.newStock}
                                disabled={bulkSkuSaving}
                                onChange={(value) => handlePreviewMainStockChange(row.productId, value)}
                              />
                            </td>
                          </tr>
                          {(row.variants || []).map((variant) => (
                            <tr key={`${row.productId}-${variant.index}`} className="bg-slate-50/60">
                              <td className="py-1.5 pr-3 pl-4 font-mono text-[11px] text-slate-400">{variant.sku || '—'}</td>
                              <td className="py-1.5 pr-3 text-xs text-slate-500">{variant.label}</td>
                              <td className="py-1.5 pr-3" />
                              <td className="py-1.5 pr-3" />
                              <td className="py-1.5 pr-3 text-right text-xs text-slate-400">
                                {variant.isBundle && !variant.isFamilyRow
                                  ? `${variant.currentPacks} packs`
                                  : variant.currentStock}
                              </td>
                              <td className="py-1.5 text-right">
                                <StockNewInput
                                  value={variant.isBundle && !variant.isFamilyRow ? variant.newPacks : variant.newStock}
                                  disabled={bulkSkuSaving}
                                  onChange={(value) => handlePreviewVariantStockChange(row.productId, variant.index, value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                  {Array.isArray(bulkSkuPreview.missing) && bulkSkuPreview.missing.length ? (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3">
                      <p className="text-sm font-semibold text-red-800">
                        Not found ({bulkSkuPreview.missing.length}) — marked in red on the download
                      </p>
                      <p className="mt-1 font-mono text-xs text-red-700">
                        {bulkSkuPreview.missing.join(', ')}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="py-4 text-center text-sm text-slate-500">
                    {bulkSkuPreview?.message || 'No matching products found. Stock was not changed.'}
                  </p>
                  {Array.isArray(bulkSkuPreview?.missing) && bulkSkuPreview.missing.length ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
                      <p className="text-sm font-semibold text-red-800">
                        Not found ({bulkSkuPreview.missing.length}) — marked in red on the download
                      </p>
                      <p className="mt-1 font-mono text-xs text-red-700">
                        {bulkSkuPreview.missing.join(', ')}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-5 py-4">
              <button
                type="button"
                onClick={downloadBulkSkuNotFoundSheet}
                disabled={bulkSkuSaving || (!bulkExcelRows.length && !bulkSkuPreview?.missing?.length)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-40"
              >
                <Download size={16} />
                Download sheet (not found in red)
              </button>
              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeBulkSkuPreviewModal}
                disabled={bulkSkuSaving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkSkuConfirm}
                disabled={bulkSkuSaving || bulkSkuPreviewing || !bulkSkuPreview?.matches?.length}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {bulkSkuSaving ? 'Updating…' : 'Confirm'}
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showExportModal ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !exportingHistory && setShowExportModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Download Excel</h2>
                <p className="text-xs text-zinc-500">Choose a date range for the export</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={exportingHistory}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setExportModalToday(true);
                  setExportModalFrom('');
                  setExportModalTo('');
                }}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                  exportModalToday
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <span className="font-medium">Export today</span>
                <span className={`mt-0.5 block text-xs ${exportModalToday ? 'text-zinc-300' : 'text-zinc-400'}`}>
                  {historyTodayCount} update(s) today
                </span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-100" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-zinc-400">or pick dates</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-500">From</span>
                  <input
                    type="date"
                    value={exportModalFrom}
                    disabled={exportModalToday}
                    onChange={(e) => {
                      setExportModalFrom(e.target.value);
                      setExportModalToday(false);
                    }}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-500">To</span>
                  <input
                    type="date"
                    value={exportModalTo}
                    disabled={exportModalToday}
                    onChange={(e) => {
                      setExportModalTo(e.target.value);
                      setExportModalToday(false);
                    }}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2 border-t border-zinc-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={exportingHistory}
                className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleHistoryExport({ closeModal: true })}
                disabled={exportingHistory}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={15} />
                {exportingHistory ? 'Downloading…' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
