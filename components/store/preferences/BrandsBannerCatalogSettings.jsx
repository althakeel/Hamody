'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const MAX_PRODUCTS = 18

function categoryRows(categories = []) {
  const list = Array.isArray(categories) ? categories : []
  const rows = []
  const seen = new Set()

  const walk = (item, depth) => {
    const id = String(item?._id || item?.id || '').trim()
    if (!id || seen.has(id)) return
    seen.add(id)
    rows.push({
      id,
      name: String(item?.name || 'Category').trim() || 'Category',
      depth,
    })
    const nested = Array.isArray(item?.children) && item.children.length
      ? item.children
      : list.filter((child) => String(child?.parentId || '') === id)
    nested.forEach((child) => walk(child, depth + 1))
  }

  list
    .filter((item) => !item?.parentId)
    .forEach((item) => walk(item, 0))

  return rows
}

function productId(product) {
  return String(product?._id || product?.id || '').trim()
}

export default function BrandsBannerCatalogSettings({
  categories = [],
  categoryIds = [],
  productIds = [],
  productsTitle = '',
  productsTitleAr = '',
  getToken,
  onChange,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [details, setDetails] = useState({})
  const rows = useMemo(() => categoryRows(categories), [categories])
  const selectedSet = useMemo(() => new Set(productIds), [productIds])

  useEffect(() => {
    let active = true
    const missing = productIds.filter((id) => id && !details[id])
    if (!missing.length) return undefined

    const loadDetails = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const { data } = await axios.get('/api/store/product', {
          params: { ids: missing.join(',') },
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!active) return
        const next = {}
        ;(data?.products || []).forEach((product) => {
          const id = productId(product)
          if (id) next[id] = product
        })
        setDetails((current) => ({ ...current, ...next }))
      } catch {
        // Selected rows still show the saved id if the name cannot be loaded.
      }
    }

    loadDetails()
    return () => {
      active = false
    }
  }, [productIds, getToken])

  useEffect(() => {
    let active = true
    const handle = setTimeout(async () => {
      const trimmed = query.trim()
      if (trimmed.length < 2 && categoryIds.length === 0) {
        setResults([])
        return
      }
      try {
        setSearching(true)
        const token = await getToken()
        if (!token) return
        const { data } = await axios.get('/api/store/product', {
          params: {
            page: 1,
            limit: 24,
            manage: 'true',
            inStock: 'true',
            search: trimmed.length >= 2 ? trimmed : undefined,
            categories: categoryIds.length ? categoryIds.join(',') : undefined,
          },
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!active) return
        setResults(Array.isArray(data?.products) ? data.products : [])
      } catch {
        if (active) setResults([])
      } finally {
        if (active) setSearching(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(handle)
    }
  }, [query, categoryIds, getToken])

  const patch = (next) => onChange({
    categoryIds,
    productIds,
    productsTitle,
    productsTitleAr,
    ...next,
  })

  const toggleCategory = (id) => {
    const next = categoryIds.includes(id)
      ? categoryIds.filter((item) => item !== id)
      : [...categoryIds, id].slice(0, 40)
    patch({ categoryIds: next })
  }

  const toggleProduct = (product) => {
    const id = productId(product)
    if (!id) return
    setDetails((current) => ({ ...current, [id]: product }))
    if (selectedSet.has(id)) {
      patch({ productIds: productIds.filter((item) => item !== id) })
      return
    }
    if (productIds.length >= MAX_PRODUCTS) return
    patch({ productIds: [...productIds, id] })
  }

  const moveProduct = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= productIds.length) return
    const next = [...productIds]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    patch({ productIds: next })
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Categories and products</h3>
        <p className="mt-1 text-sm text-slate-600">
          Check categories to connect this section, then choose up to {MAX_PRODUCTS} products. The number is the order customers see under the banner, before Top Brands. If you check categories and do not pick products, the homepage shows in-stock products from those categories.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Section title</span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={productsTitle}
            maxLength={80}
            placeholder="Optional"
            onChange={(event) => patch({ productsTitle: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Arabic title</span>
          <input
            dir="rtl"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={productsTitleAr}
            maxLength={80}
            placeholder="اختياري"
            onChange={(event) => patch({ productsTitleAr: event.target.value })}
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">Categories</p>
          <p className="mt-1 text-xs text-slate-500">{categoryIds.length} connected</p>
          <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="text-sm text-slate-500">No categories found.</p>
            ) : rows.map((row) => (
              <label
                key={row.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
                style={{ paddingInlineStart: 8 + row.depth * 16 }}
              >
                <input
                  type="checkbox"
                  checked={categoryIds.includes(row.id)}
                  onChange={() => toggleCategory(row.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-slate-800">{row.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Products on the homepage</p>
            <span className="text-xs text-slate-500">{productIds.length} of {MAX_PRODUCTS}</span>
          </div>
          <input
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={query}
            placeholder="Search name or SKU"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
            {searching ? (
              <p className="text-sm text-slate-500">Searching…</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-slate-500">Choose a category or search to list products.</p>
            ) : results.map((product) => {
              const id = productId(product)
              const checked = selectedSet.has(id)
              return (
                <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && productIds.length >= MAX_PRODUCTS}
                    onChange={() => toggleProduct(product)}
                    className="h-4 w-4"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{product.name || 'Product'}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">Homepage order</p>
        {productIds.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No products selected yet.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {productIds.map((id, index) => (
              <li key={id} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                  {details[id]?.name || 'Saved product'}
                </span>
                <button type="button" onClick={() => moveProduct(index, -1)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">Up</button>
                <button type="button" onClick={() => moveProduct(index, 1)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">Down</button>
                <button
                  type="button"
                  onClick={() => patch({ productIds: productIds.filter((item) => item !== id) })}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
