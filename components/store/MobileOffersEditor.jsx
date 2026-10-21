'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, Save, Upload, X, Zap } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import StoreDropdown from '@/components/store/StoreDropdown'
import MobilePathPicker from '@/components/store/MobilePathPicker'
import EnableSwitch from '@/components/store/EnableSwitch'
import { uploadStoreImage } from '@/lib/uploadStoreImage'
import { getProductThumbnailUrl } from '@/lib/productMedia'
import { normalizeMobileFeatures } from '@/lib/mobileFeatures'
import { normalizeOffersSection } from '@/lib/mobileOffersSection'

const SOURCES = [
  { id: 'category', label: 'Category' },
  { id: 'brand', label: 'Brand' },
  { id: 'manual', label: 'Choose products' },
]

function flattenCategories(items = [], depth = 0, seen = new Set()) {
  return (items || []).flatMap((item) => {
    const id = String(item?._id || item?.id || '').trim()
    if (!id || seen.has(id)) return []
    seen.add(id)
    const row = [{ value: id, label: `${'— '.repeat(depth)}${item.name || 'Category'}` }]
    return row.concat(flattenCategories(item.children || [], depth + 1, seen))
  })
}

function money(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function productPrices(product) {
  const current = Number(product?.offerPrice ?? product?.price ?? 0)
  const list = Number(product?.price ?? 0)
  const sale = Number.isFinite(current) ? current : 0
  const compare = Number.isFinite(list) && list > sale ? list : 0
  const off = compare ? Math.max(1, Math.round((1 - sale / compare) * 100)) : 0
  return { sale, compare, off }
}

function ColorField({ label, value, onChange }) {
  const picker = /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : '#6d4aff'
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input type="color" value={picker} onChange={(event) => onChange(event.target.value)} className="h-9 w-12 rounded border border-slate-200 bg-white" />
        <input value={value || ''} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900" />
      </span>
    </label>
  )
}

function OffersPreview({ section, products }) {
  return (
    <div className="flex justify-center">
      <div className="w-[300px] rounded-[2.6rem] border-[11px] border-slate-900 bg-slate-900 shadow-xl">
        <div className="overflow-hidden rounded-[1.85rem] bg-white">
          <div className="flex h-8 items-center justify-center bg-white">
            <span className="h-[18px] w-[92px] rounded-full bg-slate-900" />
          </div>
          <div className="aspect-[9/19.5] overflow-y-auto bg-slate-50">
            <div className="px-2 py-3" style={{ background: section.backgroundColor }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/15">
                    {section.iconUrl ? (
                      <img src={section.iconUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Zap size={16} color="#f6c445" fill="#f6c445" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-extrabold uppercase leading-tight" style={{ color: section.titleColor }}>
                      {section.title}
                    </span>
                    {section.subtitle ? (
                      <span className="mt-0.5 block truncate text-[10px]" style={{ color: section.subtitleColor }}>
                        {section.subtitle}
                      </span>
                    ) : null}
                  </span>
                </div>
                {section.viewAllEnabled ? (
                  <span
                    className="shrink-0 px-2.5 py-1.5 text-[9px] font-bold"
                    style={{
                      background: section.buttonColor,
                      color: section.buttonTextColor,
                      borderRadius: section.viewAllRadiusPx ?? 14,
                    }}
                  >
                    {section.viewAllText}{section.viewAllArrow ? ' →' : ''}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2 overflow-hidden">
                {(products.length ? products : [null, null]).slice(0, 2).map((product, index) => {
                  const prices = product ? productPrices(product) : { sale: 20, compare: 40, off: 50 }
                  const image = product ? getProductThumbnailUrl(product) : ''
                  return (
                    <div key={product?._id || index} className="w-[46%] shrink-0 rounded-xl bg-white p-2">
                      {prices.off ? (
                        <span className="inline-block rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white" style={{ background: section.cardButtonColor }}>
                          {prices.off}% off
                        </span>
                      ) : <span className="inline-block h-3" />}
                      <div className="mt-1 flex h-16 items-center justify-center">
                        {image ? <img src={image} alt="" className="h-full w-full object-contain" /> : <span className="h-10 w-10 rounded bg-slate-100" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[9px] font-semibold leading-tight text-slate-800">
                        {product?.name || 'Product name'}
                      </p>
                      <p className="mt-1 text-[11px] font-extrabold text-slate-900">
                        {money(prices.sale)}
                        {prices.compare ? <span className="ms-1 text-[9px] font-medium text-slate-400 line-through">{money(prices.compare)}</span> : null}
                      </p>
                      <span className="mt-1 block rounded-md py-1 text-center text-[8px] font-bold text-white" style={{ background: section.cardButtonColor }}>
                        Add to cart
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MobileOffersEditor() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState(() => normalizeOffersSection())
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [products, setProducts] = useState([])

  const patch = (next) => setForm((prev) => ({ ...prev, ...next }))

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      const [featuresRes, categoryRes, brandRes] = await Promise.all([
        axios.get('/api/store/mobile-features', { headers }),
        axios.get('/api/store/categories', { headers }).catch(() => ({ data: {} })),
        axios.get('/api/store/brands', { headers }).catch(() => ({ data: {} })),
      ])
      const normalized = normalizeMobileFeatures(featuresRes.data?.mobileFeatures)
      setForm(normalizeOffersSection(normalized.offersSection))
      const categoryTree = categoryRes.data?.categories || categoryRes.data || []
      const roots = categoryTree.filter((item) => !item?.parentId)
      setCategories(flattenCategories(roots.length ? roots : categoryTree))
      const brandSeen = new Set()
      setBrands((brandRes.data?.brands || []).flatMap((brand) => {
        const name = String(brand?.name || '').trim()
        const key = name.toLowerCase()
        if (!name || brandSeen.has(key)) return []
        brandSeen.add(key)
        return [{ value: name, label: name }]
      }))
    } catch (error) {
      console.error(error)
      toast.error('Failed to load offers')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancel = false
    const run = async () => {
      try {
        const token = await getToken()
        const headers = { Authorization: `Bearer ${token}` }
        if (form.productSource === 'manual') {
          if (!form.productIds.length) {
            if (!cancel) setProducts([])
            return
          }
          const { data } = await axios.get('/api/store/product', {
            params: { ids: form.productIds.join(',') },
            headers,
          })
          if (!cancel) setProducts(data.products || [])
          return
        }
        if (form.productSource === 'category' && !form.categoryId) {
          if (!cancel) setProducts([])
          return
        }
        if (form.productSource === 'brand' && !form.brandName) {
          if (!cancel) setProducts([])
          return
        }
        const { data } = await axios.get('/api/store/product', {
          params: {
            page: 1,
            limit: form.limit,
            categories: form.productSource === 'category' ? form.categoryId : undefined,
            brand: form.productSource === 'brand' ? form.brandName : undefined,
          },
          headers,
        })
        if (!cancel) setProducts(data.products || [])
      } catch (error) {
        if (!cancel) setProducts([])
      }
    }
    run()
    return () => {
      cancel = true
    }
  }, [form.productSource, form.categoryId, form.brandName, form.productIds, form.limit, getToken])

  const searchProducts = async (value) => {
    setSearch(value)
    if (value.trim().length < 2) {
      setResults([])
      return
    }
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/store/product', {
        params: { page: 1, limit: 8, search: value.trim() },
        headers: { Authorization: `Bearer ${token}` },
      })
      setResults(data.products || [])
    } catch {
      setResults([])
    }
  }

  const uploadIcon = async (file) => {
    if (!file) return
    try {
      setUploading(true)
      const token = await getToken()
      const data = await uploadStoreImage(file, { token, type: 'navbar-logo', compress: false })
      const url = data?.url || data?.imageUrl
      if (!url) throw new Error('No image URL returned')
      patch({ iconUrl: url })
      toast.success('Icon uploaded')
    } catch (error) {
      toast.error(error?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      await axios.put(
        '/api/store/mobile-features',
        { mobileFeatures: { offersSection: normalizeOffersSection(form) } },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      toast.success('Offers saved')
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/store/mobile-features" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} />
            Mobile
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Offers</h1>
          <p className="mt-1 text-sm text-slate-500">
            The deals row on the app home. Set the icon, title, view-all link, and which products to show.
          </p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800">Show this section in the mobile app</span>
              <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => patch({ enabled })} />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {form.iconUrl ? <img src={form.iconUrl} alt="" className="h-full w-full object-cover" /> : <Zap size={22} className="text-amber-500" />}
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload size={14} />}
                Upload icon or image
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) uploadIcon(file) }} />
              </label>
            </div>
            <label className="block text-xs font-medium text-slate-600">
              Title
              <input value={form.title} onChange={(event) => patch({ title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Subtitle
              <input value={form.subtitle} onChange={(event) => patch({ subtitle: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField label="Background" value={form.backgroundColor} onChange={(value) => patch({ backgroundColor: value })} />
              <ColorField label="Title color" value={form.titleColor} onChange={(value) => patch({ titleColor: value })} />
              <ColorField label="Subtitle color" value={form.subtitleColor} onChange={(value) => patch({ subtitleColor: value })} />
              <ColorField label="Add to cart" value={form.cardButtonColor} onChange={(value) => patch({ cardButtonColor: value })} />
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">Show View all button</span>
                <EnableSwitch enabled={form.viewAllEnabled !== false} onChange={(enabled) => patch({ viewAllEnabled: enabled })} />
              </div>
              {form.viewAllEnabled !== false ? (
                <>
                  <label className="block text-xs font-medium text-slate-600">
                    Button text
                    <input value={form.viewAllText} onChange={(event) => patch({ viewAllText: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
                  </label>
                  <div className="text-xs font-medium text-slate-600">
                    Button path
                    <div className="mt-1">
                      <MobilePathPicker value={form.viewAllPath} onChange={(value) => patch({ viewAllPath: value })} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ColorField label="Button color" value={form.buttonColor} onChange={(value) => patch({ buttonColor: value })} />
                    <ColorField label="Button text color" value={form.buttonTextColor} onChange={(value) => patch({ buttonTextColor: value })} />
                    <label className="block text-xs font-medium text-slate-600">
                      Corner
                      <input type="number" min={0} max={40} value={form.viewAllRadiusPx ?? 14} onChange={(event) => patch({ viewAllRadiusPx: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-800">Show arrow</span>
                      <EnableSwitch enabled={form.viewAllArrow !== false} onChange={(enabled) => patch({ viewAllArrow: enabled })} />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Products</p>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => patch({ productSource: source.id })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${form.productSource === source.id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                >
                  {source.label}
                </button>
              ))}
            </div>
            {form.productSource === 'category' ? (
              <StoreDropdown portal searchable value={form.categoryId} onChange={(value) => patch({ categoryId: value })} options={categories} placeholder="Select a category" />
            ) : null}
            {form.productSource === 'brand' ? (
              <StoreDropdown portal searchable value={form.brandName} onChange={(value) => patch({ brandName: value })} options={brands} placeholder="Select a brand" />
            ) : null}
            {form.productSource === 'manual' ? (
              <div className="space-y-3">
                <input value={search} onChange={(event) => searchProducts(event.target.value)} placeholder="Search products" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                {results.length ? (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                    {results.map((product) => (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => patch({ productIds: form.productIds.includes(String(product._id)) ? form.productIds : [...form.productIds, String(product._id)].slice(0, 24) })}
                        className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-start text-sm text-slate-800 last:border-b-0 hover:bg-slate-50"
                      >
                        <img src={getProductThumbnailUrl(product)} alt="" className="h-8 w-8 rounded object-cover" />
                        <span className="truncate">{product.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {form.productIds.map((id) => {
                    const product = products.find((item) => String(item._id) === id)
                    return (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {product?.name || id}
                        <button type="button" onClick={() => patch({ productIds: form.productIds.filter((item) => item !== id) })} aria-label="Remove">
                          <X size={12} />
                        </button>
                      </span>
                    )
                  })}
                </div>
              </div>
            ) : null}
            <label className="block text-xs font-medium text-slate-600">
              How many products
              <input type="number" min={2} max={20} value={form.limit} onChange={(event) => patch({ limit: Number(event.target.value) || 8 })} className="mt-1 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </section>
        </div>
        <aside className="lg:sticky lg:top-4">
          <OffersPreview
            section={form}
            products={form.productSource === 'manual'
              ? form.productIds.map((id) => products.find((item) => String(item._id) === id)).filter(Boolean)
              : products}
          />
        </aside>
      </div>
    </div>
  )
}
