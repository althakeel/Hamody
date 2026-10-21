'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiChevronDown, FiChevronUp, FiSearch, FiX } from 'react-icons/fi';

const MAX_ORDERED = 500;

function productId(product) {
  return String(product?._id || product?.id || '').trim();
}

function imageUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return String(value.url || value.src || value.image || value.Location || '').trim();
  }
  return '';
}

function productImage(product) {
  const lists = [product?.images, product?.externalImages, product?.image];
  for (const list of lists) {
    const values = Array.isArray(list) ? list : [list];
    for (const value of values) {
      const url = imageUrl(value);
      if (url) return url;
    }
  }
  return '';
}

export default function CategoryMerchandiseModal({ category, getToken, onClose, onSaved }) {
  const categoryId = String(category?._id || '').trim();
  const [ordered, setOrdered] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const products = [];
        const seenIds = new Set();
        let page = 1;
        let totalPages = 1;
        while (page <= totalPages && page <= 40) {
          const params = new URLSearchParams({
            manage: 'true',
            page: String(page),
            limit: '200',
            category: categoryId,
            includeDescendants: 'true',
            sort: 'name',
          });
          const { data } = await axios.get(`/api/store/product?${params}`, { headers });
          for (const product of Array.isArray(data.products) ? data.products : []) {
            const id = productId(product);
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);
            products.push(product);
          }
          totalPages = Number(data.pagination?.totalPages) || 1;
          if (!data.products?.length) break;
          page += 1;
        }
        const { data } = await axios.get(`/api/store/categories/${categoryId}/merchandise`, { headers });
        const saved = Array.isArray(data.products) ? data.products : [];
        const savedIds = new Set(saved.map(productId));
        const rest = products.filter((product) => !savedIds.has(productId(product)));
        const nextOrder = (saved.length ? [...saved, ...rest] : products).slice(0, MAX_ORDERED);
        if (!cancelled) {
          setCatalog(products);
          setOrdered(nextOrder);
        }
      } catch (error) {
        if (!cancelled) toast.error(error?.response?.data?.error || 'Failed to load product order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, categoryId, getToken]);

  const query = search.trim().toLowerCase();
  const results = catalog.filter((product) => {
    if (!query) return true;
    return `${product.name || ''} ${product.sku || ''}`.toLowerCase().includes(query);
  });

  const addProduct = (product) => {
    const id = productId(product);
    if (!id) return;
    setOrdered((current) => {
      if (current.some((item) => productId(item) === id)) return current;
      if (current.length >= MAX_ORDERED) {
        toast.error(`You can order up to ${MAX_ORDERED} products.`);
        return current;
      }
      return [...current, product];
    });
  };

  const dropProduct = (fromIndex, toIndex) => {
    if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex) || fromIndex === toIndex) return;
    setOrdered((current) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= current.length || toIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const moveProduct = (index, direction) => {
    setOrdered((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const { data } = await axios.put(
        `/api/store/categories/${categoryId}/merchandise`,
        { productIds: ordered.map(productId).filter(Boolean) },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const saved = Array.isArray(data.products) ? data.products : ordered;
      setOrdered(saved);
      onSaved?.(saved.map(productId).filter(Boolean));
      toast.success(saved.length ? 'Category product order saved' : 'Category order cleared');
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save product order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        dir="ltr"
        lang="en"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Merchandise products</h2>
            <p className="mt-1 text-sm text-slate-500">
              {category?.name || 'Category'}. This list includes products in subcategories and child categories.
              {catalog.length ? ` ${catalog.length} products.` : ''}
              {catalog.length > ordered.length ? ` The page order keeps the first ${ordered.length}.` : ''}
              {' '}Drag a row to move it, or use the arrows. Then Save order.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <FiX size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Find a product in this category</label>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or SKU"
                className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-slate-200">
              {loading ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">Loading products…</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">No products found</p>
              ) : (
                results.map((product) => {
                  const id = productId(product);
                  const added = ordered.some((item) => productId(item) === id);
                  const image = productImage(product);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => addProduct(product)}
                      disabled={added}
                      className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50 disabled:bg-orange-50"
                    >
                      {image ? (
                        <img src={image} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <span className="h-10 w-10 rounded bg-slate-100" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{product.name}</span>
                        <span className="block truncate text-xs text-slate-400">{product.sku || id}</span>
                      </span>
                      <span className="text-xs font-semibold text-orange-600">{added ? 'Added' : 'Add'}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Page order</p>
              {ordered.length > 0 ? (
                <button type="button" onClick={() => setOrdered([])} className="text-xs font-medium text-slate-500 hover:text-slate-800">
                  Clear
                </button>
              ) : null}
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
              {loading ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">Loading order…</p>
              ) : ordered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">
                  No products in this order. Add one from the list, or the category page uses newest products.
                </p>
              ) : (
                ordered.map((product, index) => {
                  const image = productImage(product);
                  const dragging = dragIndex === index;
                  const over = overIndex === index && dragIndex !== index;
                  return (
                    <div
                      key={productId(product)}
                      draggable
                      onDragStart={(event) => {
                        setDragIndex(index);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(index));
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        if (overIndex !== index) setOverIndex(index);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const from = dragIndex ?? Number(event.dataTransfer.getData('text/plain'));
                        dropProduct(from, index);
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      className={`flex cursor-grab items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 active:cursor-grabbing ${
                        dragging ? 'opacity-50' : ''
                      } ${over ? 'bg-orange-50' : ''}`}
                    >
                      <span className="w-4 select-none text-slate-300" aria-hidden="true">⋮⋮</span>
                      <span className="w-6 text-xs font-semibold text-slate-400">{index + 1}</span>
                      {image ? (
                        <img src={image} alt="" className="h-9 w-9 rounded object-cover" />
                      ) : (
                        <span className="h-9 w-9 rounded bg-slate-100" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{product.name || 'Product'}</span>
                      <button type="button" draggable={false} onDragStart={(event) => event.preventDefault()} onClick={() => moveProduct(index, -1)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Move up">
                        <FiChevronUp size={16} />
                      </button>
                      <button type="button" draggable={false} onDragStart={(event) => event.preventDefault()} onClick={() => moveProduct(index, 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Move down">
                        <FiChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
                        onClick={() => setOrdered((current) => current.filter((item) => productId(item) !== productId(product)))}
                        className="rounded px-1.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={saveOrder}
            disabled={saving || loading}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save order'}
          </button>
        </div>
      </div>
    </div>
  );
}
