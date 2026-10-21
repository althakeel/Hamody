'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import PageSkeleton from '@/components/PageSkeleton'
import { getProductThumbnailUrl, normalizeProductImages, isRenderableMediaUrl } from '@/lib/productMedia'
import { PLACEHOLDER_IMAGE } from '@/lib/mediaUrls'
import {
  Save,
  Loader,
  Package,
  Search,
  Check,
  Eye,
  Compass,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react'

const DEFAULT_PAGE_SIZE = 24
const PAGE_SIZE_OPTIONS = [12, 24, 48]
const PREVIEW_DEBOUNCE_MS = 450

function normalizeProductId(productId) {
  return String(productId?._id || productId || '')
}

function buildPreviewFromSelection(selectedIds, productPool = []) {
  const poolMap = new Map(productPool.map((product) => [normalizeProductId(product), product]))
  return selectedIds
    .slice(0, 6)
    .map((id) => poolMap.get(normalizeProductId(id)))
    .filter(Boolean)
}

function buildCategoryIndex(categories = []) {
  const nodes = []
  for (const category of categories) {
    const id = String(category?._id || '').trim()
    const name = String(category?.name || '').trim()
    if (!id || !name) continue
    nodes.push({
      id,
      name,
      parentId: category?.parentId ? String(category.parentId) : '',
    })
  }

  const byParent = new Map()
  for (const node of nodes) {
    const key = node.parentId
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(node)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }

  const flat = []
  const walk = (parentId, depth) => {
    for (const node of byParent.get(parentId) || []) {
      flat.push({ ...node, depth })
      walk(node.id, depth + 1)
    }
  }
  walk('', 0)
  return { flat, byParent }
}

function collectBranchIds(rootId, byParent) {
  const ids = []
  const queue = [rootId]
  const seen = new Set()
  while (queue.length) {
    const current = queue.shift()
    if (!current || seen.has(current)) continue
    seen.add(current)
    ids.push(current)
    for (const child of byParent.get(current) || []) queue.push(child.id)
  }
  return ids
}

function ProductThumb({ product, size = 72 }) {
  const [failed, setFailed] = useState(false)
  const mergedImages = [
    ...normalizeProductImages(product?.images),
    ...normalizeProductImages(product?.externalImages),
  ]
  const imageSrc = getProductThumbnailUrl(
    { ...product, images: mergedImages },
    { fallback: PLACEHOLDER_IMAGE }
  )
  const showImage = imageSrc && imageSrc !== PLACEHOLDER_IMAGE && isRenderableMediaUrl(imageSrc) && !failed

  if (!showImage) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300"
        style={{ width: size, height: size }}
      >
        <Package size={Math.max(18, Math.round(size * 0.34))} />
      </div>
    )
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl bg-slate-100"
      style={{ width: size, height: size }}
    >
      <Image
        src={imageSrc}
        alt={product?.name || 'Product'}
        fill
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export default function ExploreInterestsPage() {
  const { getToken, user, loading: authLoading } = useAuth()
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'AED'
  const [selectedProducts, setSelectedProducts] = useState([])
  const [enabled, setEnabled] = useState(true)
  const [products, setProducts] = useState([])
  const [previewProducts, setPreviewProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(false)
  const [selectingAll, setSelectingAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [homepageCategoryIds, setHomepageCategoryIds] = useState([])
  const [categoryQuery, setCategoryQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [stockFilter, setStockFilter] = useState('all')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [orderOpen, setOrderOpen] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [selectedDetails, setSelectedDetails] = useState({})
  const [homepagePreview, setHomepagePreview] = useState(null)
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 })
  const searchDebounceRef = useRef(null)
  const previewDebounceRef = useRef(null)
  const productsAbortRef = useRef(null)
  const previewCacheRef = useRef(new Map())
  const skipNextProductsFetchRef = useRef(false)
  const productsGridRef = useRef(null)

  const cachePreviewProducts = useCallback((items = []) => {
    for (const product of items) {
      previewCacheRef.current.set(normalizeProductId(product), product)
    }
  }, [])

  const fetchPreviewProducts = useCallback(async (productIds = [], productPool = []) => {
    const ids = productIds.slice(0, 6).map(normalizeProductId).filter(Boolean)
    if (!ids.length) {
      setPreviewProducts([])
      return
    }

    cachePreviewProducts(productPool)

    const localPreview = ids
      .map((id) => previewCacheRef.current.get(id))
      .filter(Boolean)

    if (localPreview.length === ids.length) {
      setPreviewProducts(localPreview)
      return
    }

    const missingIds = ids.filter((id) => !previewCacheRef.current.has(id))
    if (!missingIds.length) {
      setPreviewProducts(localPreview)
      return
    }

    try {
      const token = await getToken()
      const { data } = await axios.get('/api/store/product', {
        params: { ids: missingIds.join(',') },
        headers: { Authorization: `Bearer ${token}` },
      })
      cachePreviewProducts(data.products || [])
      setPreviewProducts(ids.map((id) => previewCacheRef.current.get(id)).filter(Boolean))
    } catch {
      setPreviewProducts(buildPreviewFromSelection(ids, productPool))
    }
  }, [cachePreviewProducts, getToken])

  const fetchProductsPage = useCallback(async ({
    page = 1,
    search = debouncedSearch,
    sort = sortBy,
    limit = pageSize,
    stock = stockFilter,
    categoryIds = '',
    silent = false,
  } = {}) => {
    productsAbortRef.current?.abort()
    const controller = new AbortController()
    productsAbortRef.current = controller

    try {
      if (!silent) setProductsLoading(true)
      const token = await getToken()
      if (!token) return

      const { data } = await axios.get('/api/store/product', {
        params: {
          page,
          limit,
          search: search || undefined,
          sort,
          categories: categoryIds || undefined,
          inStock: stock === 'in' ? 'true' : stock === 'out' ? 'false' : undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      const nextProducts = data.products || []
      setProducts(nextProducts)
      cachePreviewProducts(nextProducts)
      setSelectedDetails((current) => {
        const next = { ...current }
        nextProducts.forEach((product) => {
          const id = normalizeProductId(product)
          if (id) next[id] = product
        })
        return next
      })
      setPagination(data.pagination || {
        page: 1,
        limit,
        total: nextProducts.length,
        totalPages: 1,
      })
    } catch (error) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') return
      toast.error('Failed to load products')
      console.error(error)
    } finally {
      if (!controller.signal.aborted) {
        setProductsLoading(false)
      }
    }
  }, [cachePreviewProducts, debouncedSearch, getToken, sortBy, pageSize, stockFilter])

  const fetchInitialData = async () => {
    const token = await getToken()
    if (!token) {
      toast.error('Please sign in to manage Explore Interests')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let settingsLoaded = false
      let initialSelected = []

      try {
        const { data: settingsData } = await axios.get('/api/store/explore-interests', {
          headers: { Authorization: `Bearer ${token}` },
        })
        initialSelected = (settingsData?.productIds || []).map(normalizeProductId)
        setSelectedProducts(initialSelected)
        setHomepageCategoryIds(
          Array.isArray(settingsData?.categoryIds)
            ? settingsData.categoryIds.map((id) => String(id || '').trim()).filter(Boolean)
            : []
        )
        setEnabled(typeof settingsData?.enabled === 'boolean' ? settingsData.enabled : true)
        settingsLoaded = true
      } catch (error) {
        console.error(error)
        toast.error('Failed to load Explore Interests settings')
      }

      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          axios.get('/api/store/product', {
            params: { page: 1, limit: pageSize, sort: sortBy },
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('/api/store/categories', {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ data: { categories: [] } })),
        ])
        const { data: productsData } = productsResponse
        setCategories(categoriesResponse?.data?.categories || [])

        const initialProducts = productsData?.products || []
        setProducts(initialProducts)
        cachePreviewProducts(initialProducts)
        setPreviewProducts(buildPreviewFromSelection(initialSelected, initialProducts))
        setPagination(productsData?.pagination || {
          page: 1,
          limit: pageSize,
          total: initialProducts.length,
          totalPages: 1,
        })
        skipNextProductsFetchRef.current = true
      } catch (error) {
        console.error(error)
        toast.error('Failed to load products')
      }

      if (!settingsLoaded) {
        setPreviewProducts([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    fetchInitialData()
  }, [authLoading, user?.uid])

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPagination((current) => ({ ...current, page: 1 }))
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchQuery])

  const categoryIndex = useMemo(() => buildCategoryIndex(categories), [categories])

  const categoryScopeIds = useMemo(
    () => (selectedCategoryId ? collectBranchIds(selectedCategoryId, categoryIndex.byParent) : []),
    [selectedCategoryId, categoryIndex]
  )

  const categoryScopeKey = categoryScopeIds.join(',')

  const selectedCategoryName = categoryIndex.flat.find((category) => category.id === selectedCategoryId)?.name || ''

  const visibleCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase()
    if (!query) return categoryIndex.flat
    return categoryIndex.flat.filter((category) => category.name.toLowerCase().includes(query))
  }, [categoryIndex, categoryQuery])

  const chooseCategory = (categoryId) => {
    setSelectedCategoryId(categoryId)
    setPagination((current) => ({ ...current, page: 1 }))
  }

  const homepageCategoryRank = useMemo(() => {
    const ranks = new Map()
    homepageCategoryIds.forEach((id, index) => {
      ranks.set(id, index + 1)
    })
    return ranks
  }, [homepageCategoryIds])

  const toggleHomepageCategory = (categoryId) => {
    setHomepageCategoryIds((current) => {
      if (current.includes(categoryId)) return current.filter((id) => id !== categoryId)
      if (current.length >= 40) {
        toast.error('You can show up to 40 categories on the homepage')
        return current
      }
      return [...current, categoryId]
    })
  }

  useEffect(() => {
    if (loading) return
    if (skipNextProductsFetchRef.current) {
      skipNextProductsFetchRef.current = false
      return
    }
    fetchProductsPage({
      page: pagination.page,
      search: debouncedSearch,
      sort: sortBy,
      limit: pageSize,
      stock: stockFilter,
      categoryIds: categoryScopeKey,
      silent: pagination.page > 1,
    })
  }, [loading, pagination.page, debouncedSearch, sortBy, pageSize, stockFilter, categoryScopeKey, fetchProductsPage])

  useEffect(() => {
    if (loading || pagination.page <= 1) return
    productsGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [pagination.page, loading])

  useEffect(() => {
    const localPreview = buildPreviewFromSelection(selectedProducts, [
      ...products,
      ...Array.from(previewCacheRef.current.values()),
    ])
    if (localPreview.length) {
      setPreviewProducts(localPreview)
    }

    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    previewDebounceRef.current = setTimeout(() => {
      fetchPreviewProducts(selectedProducts, products)
    }, PREVIEW_DEBOUNCE_MS)

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    }
  }, [selectedProducts, products, fetchPreviewProducts])

  const moveSelectedProduct = (fromIndex, toIndex) => {
    setSelectedProducts((prev) => {
      if (
        fromIndex < 0
        || toIndex < 0
        || fromIndex >= prev.length
        || toIndex >= prev.length
        || fromIndex === toIndex
      ) {
        return prev
      }
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const loadSelectedDetails = useCallback(async (ids = selectedProducts) => {
    const missing = ids.map(normalizeProductId).filter((id) => id && !previewCacheRef.current.has(id))
    if (!missing.length) return
    try {
      const token = await getToken()
      if (!token) return
      for (let index = 0; index < missing.length; index += 200) {
        const chunk = missing.slice(index, index + 200)
        const { data } = await axios.get('/api/store/product', {
          params: { ids: chunk.join(',') },
          headers: { Authorization: `Bearer ${token}` },
        })
        const loaded = data.products || []
        cachePreviewProducts(loaded)
        setSelectedDetails((current) => {
          const next = { ...current }
          loaded.forEach((product) => {
            const id = normalizeProductId(product)
            if (id) next[id] = product
          })
          return next
        })
      }
    } catch {
      // The order list still shows a placeholder name if details are missing.
    }
  }, [cachePreviewProducts, getToken, selectedProducts])

  const toggleProduct = (productId) => {
    const id = normalizeProductId(productId)
    const product = products.find((item) => normalizeProductId(item) === id)
    if (product) {
      previewCacheRef.current.set(id, product)
      setSelectedDetails((current) => (current[id] ? current : { ...current, [id]: product }))
    }
    setSelectedProducts((prev) => (
      prev.includes(id)
        ? prev.filter((existingId) => existingId !== id)
        : [...prev, id]
    ))
  }

  const selectCurrentPage = () => {
    const pageIds = products.map((product) => normalizeProductId(product))
    setSelectedProducts((prev) => Array.from(new Set([...prev, ...pageIds])))
  }

  const selectAllProducts = async () => {
    try {
      setSelectingAll(true)
      const token = await getToken()
      const { data } = await axios.get('/api/store/product', {
        params: {
          idsOnly: 'true',
          search: debouncedSearch || undefined,
          categories: categoryScopeKey || undefined,
          inStock: stockFilter === 'in' ? 'true' : stockFilter === 'out' ? 'false' : undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      })
      setSelectedProducts((prev) => Array.from(new Set([...prev, ...(data.productIds || [])])))
      toast.success(`Selected ${data.total || 0} product(s)`)
    } catch {
      toast.error('Failed to select all products')
    } finally {
      setSelectingAll(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const normalizedIds = Array.from(
        new Set(selectedProducts.map((id) => String(id || '').trim()).filter(Boolean))
      )
      const normalizedCategoryIds = Array.from(
        new Set(homepageCategoryIds.map((id) => String(id || '').trim()).filter(Boolean))
      )

      await axios.post(
        '/api/store/explore-interests',
        { enabled, productIds: normalizedIds, categoryIds: normalizedCategoryIds },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (typeof window !== 'undefined') {
        const payload = {
          enabled,
          productIds: normalizedIds,
          categoryIds: normalizedCategoryIds,
          updatedAt: Date.now(),
        }
        window.localStorage.setItem('exploreInterestsLive', JSON.stringify(payload))
        window.dispatchEvent(new CustomEvent('exploreInterestsUpdated', { detail: payload }))
      }

      toast.success('Explore Interests saved')
    } catch (error) {
      toast.error('Failed to save Explore Interests settings')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const selectedIdSet = useMemo(
    () => new Set(selectedProducts.map(normalizeProductId)),
    [selectedProducts]
  )

  const selectedRank = useMemo(() => {
    const ranks = new Map()
    selectedProducts.forEach((id, index) => {
      ranks.set(normalizeProductId(id), index + 1)
    })
    return ranks
  }, [selectedProducts])

  const previewKey = selectedProducts.slice(0, 6).map(normalizeProductId).filter(Boolean).join(',')

  useEffect(() => {
    if (loading) return undefined
    if (!previewKey) {
      setHomepagePreview([])
      return undefined
    }

    const controller = new AbortController()
    ;(async () => {
      try {
        const token = await getTokenRef.current()
        if (!token) return
        const { data } = await axios.get('/api/store/product', {
          params: { ids: previewKey },
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const byId = new Map((data.products || []).map((product) => [normalizeProductId(product), product]))
        const ordered = previewKey.split(',').map((id) => byId.get(id)).filter(Boolean)
        cachePreviewProducts(ordered)
        setHomepagePreview(ordered)
        if (ordered.length) {
          setSelectedDetails((current) => {
            const next = { ...current }
            ordered.forEach((product) => {
              next[normalizeProductId(product)] = product
            })
            return next
          })
        }
      } catch (error) {
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') return
        console.warn('[explore-interests] preview products failed', error?.message || error)
        setHomepagePreview([])
      }
    })()

    return () => controller.abort()
  }, [loading, previewKey, cachePreviewProducts])

  const goToPage = (nextPage) => {
    setPagination((current) => ({
      ...current,
      page: Math.max(1, Math.min(nextPage, current.totalPages || 1)),
    }))
  }

  const renderPagination = (className = '') => {
    if (pagination.total <= 0) return null

    const start = (pagination.page - 1) * pagination.limit + 1
    const end = Math.min(pagination.page * pagination.limit, pagination.total)

    return (
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
        <p className="text-xs text-slate-500">
          Showing {start}–{end} of {pagination.total}
          {' · '}
          Page {pagination.page} of {pagination.totalPages}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1 || productsLoading}
            onClick={() => goToPage(pagination.page - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, index) => {
            const pageStart = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4))
            const pageNumber = pageStart + index
            if (pageNumber > pagination.totalPages) return null
            return (
              <button
                key={pageNumber}
                type="button"
                disabled={productsLoading}
                onClick={() => goToPage(pageNumber)}
                className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  pagination.page === pageNumber
                    ? 'bg-violet-600 text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNumber}
              </button>
            )
          })}
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages || productsLoading}
            onClick={() => goToPage(pagination.page + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  if (authLoading || loading) {
    return <PageSkeleton />
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 text-center">
        <p className="text-sm text-slate-600">Please sign in to manage Explore Your Interests.</p>
      </div>
    )
  }

  return (
    <div className="-mx-3 -mt-3 min-h-full w-full max-w-full overflow-x-hidden bg-white pb-16 sm:-mx-4 sm:-mt-4 lg:-mx-5 lg:-mt-5">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex w-full flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              <Compass size={14} />
              Homepage section
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Explore Your Interests
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Curate the Recommended tab and control the category-interest carousel on your storefront.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
              <span className="text-slate-500">Recommended:</span>{' '}
              <span className="font-semibold text-slate-800">{selectedProducts.length} products</span>
              {selectedProducts.length > 60 ? (
                <span className="ms-2 text-xs font-normal text-slate-500">
                  · 60 on homepage, then Load More
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:gap-8">
          <div className="xl:sticky xl:top-4 xl:self-start">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Eye size={14} />
                Homepage preview
              </div>
              <div className="p-4">
                <p className="text-base font-bold text-slate-900">Recommended</p>
                <p className="mt-1 text-xs text-slate-500">
                  First products customers see. The number on a card in the list is this same order.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {selectedProducts.length === 0 ? (
                    <p className="col-span-3 rounded-lg bg-slate-50 px-3 py-8 text-center text-xs text-slate-400">
                      Select products on the right. They show here in homepage order.
                    </p>
                  ) : homepagePreview == null ? (
                    <p className="col-span-3 rounded-lg bg-slate-50 px-3 py-8 text-center text-xs text-slate-400">
                      Loading the first recommended products…
                    </p>
                  ) : homepagePreview.length === 0 ? (
                    <p className="col-span-3 rounded-lg bg-slate-50 px-3 py-8 text-center text-xs text-slate-400">
                      These products could not be loaded for the preview.
                    </p>
                  ) : (
                    homepagePreview.map((product, index) => (
                      <div key={normalizeProductId(product)} className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                        <div className="relative">
                          <span className="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#7B2BFF] text-[10px] font-bold text-white">
                            {index + 1}
                          </span>
                          <div className="flex aspect-square items-center justify-center bg-slate-50">
                            <ProductThumb product={product} size={92} />
                          </div>
                        </div>
                        <p className="line-clamp-2 px-1.5 py-1.5 text-[10px] font-semibold leading-snug text-slate-800">
                          {product.name || 'Product'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled((current) => !current)}
                  className={`mt-4 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                    enabled ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <span>
                    <span className={`block text-sm font-semibold ${enabled ? 'text-violet-900' : 'text-slate-700'}`}>
                      {enabled ? 'Shown on the homepage' : 'Hidden on the homepage'}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {selectedProducts.length} selected. Save to publish this order.
                    </span>
                  </span>
                  {enabled ? (
                    <ToggleRight size={28} className="shrink-0 text-violet-600" />
                  ) : (
                    <ToggleLeft size={28} className="shrink-0 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Check a main, sub, or child category to show it beside Recommended. Click the name to filter the product list. Check order is the homepage order.
                </p>
                <p className="mt-2 text-[11px] font-medium text-violet-700">
                  {homepageCategoryIds.length} on the homepage
                  {homepageCategoryIds.length === 0 ? ' · automatic main categories until you choose some' : ''}
                </p>
                <input
                  type="text"
                  value={categoryQuery}
                  onChange={(event) => setCategoryQuery(event.target.value)}
                  placeholder="Find a category..."
                  className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div className="max-h-[420px] overflow-y-auto p-2">
                <button
                  type="button"
                  onClick={() => chooseCategory('')}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm ${
                    selectedCategoryId
                      ? 'text-slate-700 hover:bg-slate-50'
                      : 'bg-violet-50 font-semibold text-violet-800'
                  }`}
                >
                  All categories
                </button>
                {visibleCategories.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-slate-400">No categories match that search.</p>
                ) : visibleCategories.map((category) => {
                  const active = category.id === selectedCategoryId
                  const homepageRank = homepageCategoryRank.get(category.id)
                  return (
                    <div
                      key={category.id}
                      className={`flex items-center gap-2 rounded-lg py-1.5 pe-2 ${
                        active ? 'bg-violet-50' : 'hover:bg-slate-50'
                      }`}
                      style={{ paddingLeft: `${8 + category.depth * 14}px` }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(homepageRank)}
                        onChange={() => toggleHomepageCategory(category.id)}
                        aria-label={`Show ${category.name} on the homepage`}
                        className="h-4 w-4 shrink-0 accent-violet-600"
                      />
                      <button
                        type="button"
                        onClick={() => chooseCategory(category.id)}
                        className={`flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm ${
                          active ? 'font-semibold text-violet-800' : 'text-slate-700'
                        }`}
                      >
                        {homepageRank ? (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                            {homepageRank}
                          </span>
                        ) : null}
                        <span className="line-clamp-2">{category.name}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Recommended products</h2>
                    <p className="text-xs text-slate-500">
                      {selectedProducts.length} selected · {pagination.total}{' '}
                      {selectedCategoryName ? `in ${selectedCategoryName}` : 'total in catalog'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectCurrentPage}
                      disabled={productsLoading || !products.length}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Select page
                    </button>
                    <button
                      type="button"
                      onClick={selectAllProducts}
                      disabled={selectingAll || productsLoading}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {selectingAll ? 'Selecting...' : `Select all${debouncedSearch || selectedCategoryName ? ' matching' : ''}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProducts([])}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_150px_130px_170px]">
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  <select
                    value={stockFilter}
                    onChange={(e) => {
                      setStockFilter(e.target.value)
                      setPagination((current) => ({ ...current, page: 1 }))
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="all">All stock</option>
                    <option value="in">In stock</option>
                    <option value="out">Out of stock</option>
                  </select>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPagination((current) => ({ ...current, page: 1 }))
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size} per page</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value)
                      setPagination((current) => ({ ...current, page: 1 }))
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="name">Name A–Z</option>
                    <option value="name_desc">Name Z–A</option>
                    <option value="price">Price low–high</option>
                    <option value="price_desc">Price high–low</option>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    The number on a selected card is its place on the homepage. 1 is the first product customers see.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOrderOpen(true)}
                    disabled={!selectedProducts.length}
                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Change order ({selectedProducts.length})
                  </button>
                </div>

                {pagination.total > 0 ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {renderPagination()}
                  </div>
                ) : null}
              </div>

              <div ref={productsGridRef} className="relative p-4 sm:p-6">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader size={28} className="animate-spin text-violet-500" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Package size={40} className="text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-600">No products found</p>
                    <p className="text-xs text-slate-400">
                      {selectedCategoryName
                        ? `Nothing in ${selectedCategoryName} matches these filters.`
                        : 'Try a different search term'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {products.map((product) => {
                      const productId = normalizeProductId(product)
                      const isSelected = selectedIdSet.has(productId)
                      return (
                        <button
                          key={productId}
                          type="button"
                          onClick={() => toggleProduct(productId)}
                          className={`group relative rounded-2xl border p-3 text-left transition ${
                            isSelected
                              ? 'border-[#7B2BFF] bg-[#f6f1ff]'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          {isSelected ? (
                            <span className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7B2BFF] px-1 text-[10px] font-bold text-white">
                              {selectedRank.get(productId)}
                            </span>
                          ) : null}
                          <span className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border transition ${
                            isSelected
                              ? 'border-[#7B2BFF] bg-[#7B2BFF] text-white'
                              : 'border-slate-300 bg-white text-transparent group-hover:border-slate-400'
                          }`}>
                            <Check size={12} />
                          </span>

                          <div className="mb-3 flex justify-center">
                            <ProductThumb product={product} size={88} />
                          </div>

                          <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-800">
                            {product.name}
                          </p>
                          {product.sku ? (
                            <p className="mt-1 truncate text-[10px] text-slate-400">{product.sku}</p>
                          ) : null}

                          <div className="mt-2 flex items-center justify-between gap-1">
                            <span className="text-sm font-bold text-slate-900">
                              {currency}{Number(product.price || 0).toFixed(0)}
                            </span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              product.inStock
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-600'
                            }`}>
                              {product.inStock ? 'In stock' : 'Out'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {pagination.total > 0 ? (
                <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
                  {renderPagination()}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {orderOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close homepage order"
            onClick={() => setOrderOpen(false)}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-violet-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Homepage order</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedProducts.length} products. Drag a row or use the arrows. Position 1 is first on the storefront. Save changes when you are done.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-violet-50/40 px-5 py-4">
              <ul className="space-y-2">
                {selectedProducts.map((id, index) => {
                  const product = selectedDetails[normalizeProductId(id)] || previewCacheRef.current.get(normalizeProductId(id))
                  return (
                    <li
                      key={id}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (dragIndex == null) return
                        moveSelectedProduct(dragIndex, index)
                        setDragIndex(null)
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-3 ${
                        dragIndex === index ? 'border-[#7B2BFF] opacity-60' : 'border-violet-100'
                      }`}
                    >
                      <GripVertical size={16} className="shrink-0 cursor-grab text-slate-400" />
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7B2BFF] text-sm font-bold text-white">{index + 1}</span>
                      <ProductThumb product={product} size={52} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800">{product?.name || 'Product'}</span>
                        {product?.sku ? <span className="block text-xs text-slate-400">{product.sku}</span> : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => moveSelectedProduct(index, index - 1)}
                        disabled={index === 0}
                        className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move earlier"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSelectedProduct(index, index + 1)}
                        disabled={index === selectedProducts.length - 1}
                        className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move later"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setOrderOpen(false)}
                className="w-full rounded-lg bg-[#7B2BFF] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
