'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { BRANDS_BANNER_PRODUCT_MAX, clampFeaturedColumns, clampFeaturedRows } from '@/lib/featuredProductLimit'

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

function expandCategoryIds(categories = [], selectedIds = []) {
  const childrenByParent = new Map()
  const addChild = (parentId, childId) => {
    const parent = String(parentId || '').trim()
    const child = String(childId || '').trim()
    if (!parent || !child || parent === child) return
    const list = childrenByParent.get(parent) || []
    if (!list.includes(child)) list.push(child)
    childrenByParent.set(parent, list)
  }
  const visit = (item) => {
    const id = String(item?._id || item?.id || '').trim()
    if (!id) return
    addChild(item?.parentId, id)
    ;(Array.isArray(item?.children) ? item.children : []).forEach((child) => {
      addChild(id, child?._id || child?.id)
      visit(child)
    })
  }
  ;(Array.isArray(categories) ? categories : []).forEach(visit)

  const result = new Set(selectedIds.map((id) => String(id || '').trim()).filter(Boolean))
  const stack = [...result]
  while (stack.length) {
    const current = stack.pop()
    ;(childrenByParent.get(current) || []).forEach((childId) => {
      if (result.has(childId)) return
      result.add(childId)
      stack.push(childId)
    })
  }
  return [...result].slice(0, 200)
}

function productCategoryIds(product) {
  const ids = []
  const add = (value) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach(add)
      return
    }
    if (typeof value === 'object') {
      add(value._id || value.id)
      return
    }
    const id = String(value).trim()
    if (id) ids.push(id)
  }
  add(product?.category)
  add(product?.categories)
  add(product?.categoryId)
  return ids
}

export default function BrandsBannerCatalogSettings({
  categories = [],
  categoryIds = [],
  productIds = [],
  productsTitle = '',
  productsTitleAr = '',
  columns = 6,
  rows = 3,
  getToken,
  onChange,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [details, setDetails] = useState({})
  const categoryList = useMemo(() => categoryRows(categories), [categories])
  const selectedSet = useMemo(() => new Set(productIds), [productIds])
  const columnCount = clampFeaturedColumns(columns, 6)
  const rowCount = clampFeaturedRows(rows, 3)
  const selectionVersion = useRef(0)
  const seededCategoriesRef = useRef('')

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
        const scope = categoryIds.length ? expandCategoryIds(categories, categoryIds) : []
        const products = trimmed.length >= 2
          ? await (async () => {
            const token = await getToken()
            if (!token) return []
            const { data } = await axios.get('/api/store/product', {
              params: {
                page: 1,
                limit: 24,
                manage: 'true',
                inStock: 'true',
                search: trimmed,
                categories: scope.length ? scope.join(',') : undefined,
              },
              headers: { Authorization: `Bearer ${token}` },
            })
            return Array.isArray(data?.products) ? data.products : []
          })()
          : await loadCategoryProducts(scope)
        if (!active) return
        setResults(products)
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
  }, [query, categoryIds, categories, getToken])

  useEffect(() => {
    const key = categoryIds.join(',')
    if (!key || !categories.length) return undefined
    if (productIds.length) {
      seededCategoriesRef.current = key
      return undefined
    }
    if (seededCategoriesRef.current === key) return undefined
    const version = selectionVersion.current
    let active = true

    const fillSelectedCategories = async () => {
      try {
        const products = await loadCategoryProducts(expandCategoryIds(categories, categoryIds))
        if (!active || selectionVersion.current !== version) return
        seededCategoriesRef.current = key
        if (!products.length) return
        rememberProducts(products)
        onChange({ productIds: products.map(productId).filter(Boolean) })
      } catch {
        if (active) toast.error('Could not load products for the selected categories')
      }
    }

    fillSelectedCategories()
    return () => {
      active = false
    }
  }, [categoryIds, productIds.length, categories, getToken])

  const patch = (next) => onChange(next)

  const loadCategoryProducts = async (ids) => {
    const token = await getToken()
    if (!token || !ids.length) return []
    const collected = []
    const seen = new Set()
    let page = 1
    const limit = 100
    while (collected.length < BRANDS_BANNER_PRODUCT_MAX && page <= 5) {
      const { data } = await axios.get('/api/store/product', {
        params: {
          page,
          limit,
          manage: 'true',
          inStock: 'true',
          sort: 'newest',
          categories: ids.join(','),
        },
        headers: { Authorization: `Bearer ${token}` },
      })
      const batch = Array.isArray(data?.products) ? data.products : []
      batch.forEach((product) => {
        const id = productId(product)
        if (!id || seen.has(id) || collected.length >= BRANDS_BANNER_PRODUCT_MAX) return
        seen.add(id)
        collected.push(product)
      })
      const totalPages = Number(data?.pagination?.totalPages) || 1
      if (!batch.length || page >= totalPages) break
      page += 1
    }
    return collected
  }

  const rememberProducts = (products) => {
    setDetails((current) => {
      const next = { ...current }
      products.forEach((product) => {
        const id = productId(product)
        if (id) next[id] = product
      })
      return next
    })
  }

  const toggleCategory = async (id) => {
    selectionVersion.current += 1
    const version = selectionVersion.current
    const turningOff = categoryIds.includes(id)
    const nextCategories = turningOff
      ? categoryIds.filter((item) => item !== id)
      : [...categoryIds, id].slice(0, 40)
    const scope = expandCategoryIds(categories, [id])
    try {
      const products = await loadCategoryProducts(scope)
      if (selectionVersion.current !== version) return
      rememberProducts(products)
      const matched = new Set(products.map(productId).filter(Boolean))
      Object.entries(details).forEach(([savedId, product]) => {
        if (productCategoryIds(product).some((categoryId) => scope.includes(categoryId))) {
          matched.add(savedId)
        }
      })
      if (turningOff) {
        patch({
          categoryIds: nextCategories,
          productIds: productIds.filter((item) => !matched.has(item)),
        })
        return
      }
      const nextIds = [...productIds]
      products.forEach((product) => {
        const productKey = productId(product)
        if (!productKey || nextIds.includes(productKey) || nextIds.length >= BRANDS_BANNER_PRODUCT_MAX) return
        nextIds.push(productKey)
      })
      patch({ categoryIds: nextCategories, productIds: nextIds })
    } catch {
      if (selectionVersion.current !== version) return
      toast.error('Could not load products for that category')
      if (turningOff) {
        const matched = new Set()
        Object.entries(details).forEach(([savedId, product]) => {
          if (productCategoryIds(product).some((categoryId) => scope.includes(categoryId))) {
            matched.add(savedId)
          }
        })
        patch({
          categoryIds: nextCategories,
          productIds: productIds.filter((item) => !matched.has(item)),
        })
        return
      }
      patch({ categoryIds: nextCategories })
    }
  }

  const toggleProduct = (product) => {
    selectionVersion.current += 1
    const id = productId(product)
    if (!id) return
    setDetails((current) => ({ ...current, [id]: product }))
    if (selectedSet.has(id)) {
      patch({ productIds: productIds.filter((item) => item !== id) })
      return
    }
    if (productIds.length >= BRANDS_BANNER_PRODUCT_MAX) return
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
          Checking a category selects every in-stock product in that category and its subcategories. The numbered list is the order customers see under the banner, before Top Brands.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Homepage grid</p>
          <p className="mt-1 text-xs text-slate-500">
            {columnCount} columns on each row. Every selected product is shown, up to {BRANDS_BANNER_PRODUCT_MAX}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-medium text-slate-600">
            Columns
            <input
              type="number"
              min={2}
              max={6}
              value={columnCount}
              onChange={(event) => {
                patch({ productColumns: clampFeaturedColumns(event.target.value, 6) })
              }}
              className="mt-1 block w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Rows
            <input
              type="number"
              min={1}
              max={4}
              value={rowCount}
              onChange={(event) => {
                patch({ productRows: clampFeaturedRows(event.target.value, 3) })
              }}
              className="mt-1 block w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>
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
            {categoryList.length === 0 ? (
              <p className="text-sm text-slate-500">No categories found.</p>
            ) : categoryList.map((row) => (
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
            <span className="text-xs text-slate-500">{productIds.length} selected</span>
          </div>
          <input
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={query}
            placeholder="Search name or SKU"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
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
                    disabled={!checked && productIds.length >= BRANDS_BANNER_PRODUCT_MAX}
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Homepage order</p>
          <button
            type="button"
            onClick={() => {
              selectionVersion.current += 1
              seededCategoriesRef.current = categoryIds.join(',')
              patch({ productIds: [] })
            }}
            disabled={!productIds.length}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove all
          </button>
        </div>
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
