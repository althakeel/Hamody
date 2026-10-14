'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'
import { getProductThumbnailUrl } from '@/lib/productMedia'
import {
  createCustomBadgeRule,
  createCustomDateRule,
  createDayRangeRule,
  createStandardBadgeRule,
  formatDeliveryMoment,
  normalizeTimeBadges,
  TIME_BADGE_PAGES,
  timeBadgeLookDefaults,
} from '@/lib/timeBadgeSettings'
import { DeliveryTimeMark } from '@/components/TimeDeliveryBadge'
import { compressImageForUpload } from '@/lib/compressImageForUpload'

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900'

function EnableSwitch({ enabled, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold" role="group" aria-label="Enable or disable">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-full px-3 py-1 ${enabled ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
      >
        Enable
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-full px-3 py-1 ${enabled ? 'text-slate-500' : 'bg-slate-800 text-white'}`}
      >
        Disable
      </button>
    </div>
  )
}

function productIdOf(product) {
  return String(product?._id || product?.id || '')
}

let catalogPromise = null

function loadProductCatalog(getToken) {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const [categoryRes, brandRes] = await Promise.all([
        axios.get('/api/categories'),
        token
          ? axios.get('/api/store/product', { headers, params: { manage: 'true', distinct: 'brands' } })
          : Promise.resolve({ data: { brands: [] } }),
      ])
      const items = Array.isArray(categoryRes.data?.categories) ? categoryRes.data.categories : []
      const byParent = new Map()
      items.forEach((item) => {
        const parent = String(item?.parentId || '')
        if (!byParent.has(parent)) byParent.set(parent, [])
        byParent.get(parent).push(item)
      })
      const categories = []
      const walk = (parentId, depth) => {
        const children = (byParent.get(parentId) || []).slice().sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
        children.forEach((item) => {
          const id = String(item?._id || item?.id || '')
          if (!id) return
          categories.push({ id, label: `${depth ? `${'— '.repeat(depth)}` : ''}${item.name || id}` })
          walk(id, depth + 1)
        })
      }
      walk('', 0)
      if (!categories.length) {
        items.forEach((item) => {
          const id = String(item?._id || item?.id || '')
          if (id) categories.push({ id, label: item.name || id })
        })
      }
      const brands = (Array.isArray(brandRes.data?.brands) ? brandRes.data.brands : [])
        .map((brand) => String(brand || '').trim())
        .filter(Boolean)
      return { categories, brands }
    })().catch((error) => {
      catalogPromise = null
      throw error
    })
  }
  return catalogPromise
}

function MultiPick({ options, selected, onChange, placeholder, emptyLabel }) {
  const [filter, setFilter] = useState('')
  const term = filter.trim().toLowerCase()
  const shown = options.filter((option) => !term || option.label.toLowerCase().includes(term))
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter((item) => item !== id))
    else onChange([...selected, id])
  }
  return (
    <div className="space-y-2">
      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      {selected.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const option = options.find((item) => item.id === id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <span className="truncate">{option?.label || id}</span>
                <span className="text-slate-400">Remove</span>
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
        {shown.length ? shown.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
            <input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
          </label>
        )) : (
          <p className="px-3 py-2 text-xs text-slate-400">{emptyLabel}</p>
        )}
      </div>
    </div>
  )
}

function ProductPicker({ productIds, onChange, getToken }) {
  const [mode, setMode] = useState('manual')
  const [query, setQuery] = useState('')
  const [minSold, setMinSold] = useState('')
  const [priceAbove, setPriceAbove] = useState('')
  const [minStock, setMinStock] = useState('')
  const [categoryIds, setCategoryIds] = useState([])
  const [brandNames, setBrandNames] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let mounted = true
    const loadSelected = async () => {
      if (!productIds.length) {
        setSelected([])
        return
      }
      try {
        const token = await getToken()
        const { data } = await axios.get('/api/store/product', {
          params: { ids: productIds.join(',') },
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!mounted) return
        const byId = new Map((data.products || []).map((product) => [productIdOf(product), product]))
        setSelected(productIds.map((id) => byId.get(id)).filter(Boolean))
      } catch {
        if (mounted) setSelected([])
      }
    }
    loadSelected()
    return () => {
      mounted = false
    }
  }, [productIds, getToken])

  useEffect(() => {
    let mounted = true
    loadProductCatalog(getToken)
      .then((catalog) => {
        if (!mounted) return
        setCategories(catalog.categories)
        setBrands(catalog.brands)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [getToken])

  useEffect(() => {
    const term = query.trim()
    if (mode === 'manual' && term.length < 2) {
      setResults([])
      return undefined
    }
    if (mode === 'category' && !categoryIds.length) {
      setResults([])
      return undefined
    }
    if (mode === 'brand' && !brandNames.length) {
      setResults([])
      return undefined
    }
    if (mode === 'sold' && minSold.trim() === '') {
      setResults([])
      return undefined
    }
    if (mode === 'price' && priceAbove.trim() === '') {
      setResults([])
      return undefined
    }
    if (mode === 'stock' && minStock.trim() === '') {
      setResults([])
      return undefined
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true)
        const token = await getToken()
        const params = { manage: 'true', limit: 200, sort: 'name', page: 1 }
        if (mode === 'manual') params.search = term
        if (mode === 'category') params.categories = categoryIds.join(',')
        if (mode === 'brand') params.brands = JSON.stringify(brandNames)
        if (mode === 'sold') {
          params.minSold = minSold
          params.sort = 'sold'
        }
        if (mode === 'price') {
          params.priceAbove = priceAbove
          params.sort = 'price_desc'
        }
        if (mode === 'stock') {
          params.minStock = minStock
          params.sort = 'stock'
        }
        const { data } = await axios.get('/api/store/product', {
          params,
          headers: { Authorization: `Bearer ${token}` },
        })
        setResults(data.products || [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, mode === 'category' || mode === 'brand' ? 0 : 300)
    return () => clearTimeout(timer)
  }, [mode, query, categoryIds, brandNames, minSold, priceAbove, minStock, getToken])

  const toggleProduct = (product) => {
    const id = productIdOf(product)
    if (!id) return
    if (productIds.includes(id)) onChange(productIds.filter((item) => item !== id))
    else onChange([...productIds, id])
  }

  const addShown = () => {
    const ids = results.map(productIdOf).filter(Boolean)
    onChange(Array.from(new Set([...productIds, ...ids])))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'manual', label: 'Manual' },
          { id: 'category', label: 'Category' },
          { id: 'brand', label: 'Brand' },
          { id: 'sold', label: 'Sold more than' },
          { id: 'price', label: 'Price more than' },
          { id: 'stock', label: 'Stock more than' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${mode === option.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {mode === 'sold' ? (
        <label className="block space-y-1 text-xs text-slate-500">
          Sold more than
          <input
            type="number"
            min="0"
            value={minSold}
            onChange={(event) => setMinSold(event.target.value)}
            placeholder="100"
            className={inputClass}
          />
          <span className="block">Only products sold more than this number. Tick them, or add all shown. Up to 200.</span>
        </label>
      ) : null}
      {mode === 'price' ? (
        <label className="block space-y-1 text-xs text-slate-500">
          Price more than
          <input
            type="number"
            min="0"
            value={priceAbove}
            onChange={(event) => setPriceAbove(event.target.value)}
            placeholder="50"
            className={inputClass}
          />
          <span className="block">Only products priced above this amount. Tick them, or add all shown. Up to 200.</span>
        </label>
      ) : null}
      {mode === 'stock' ? (
        <label className="block space-y-1 text-xs text-slate-500">
          Stock more than
          <input
            type="number"
            min="0"
            value={minStock}
            onChange={(event) => setMinStock(event.target.value)}
            placeholder="10"
            className={inputClass}
          />
          <span className="block">Only products with stock above this number. Tick them, or add all shown. Up to 200.</span>
        </label>
      ) : null}
      {mode === 'manual' ? (
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search product name or SKU, then tick more than one"
          className={inputClass}
        />
      ) : null}
      {mode === 'category' ? (
        <MultiPick
          options={categories}
          selected={categoryIds}
          onChange={setCategoryIds}
          placeholder="Find a category, then tick more than one"
          emptyLabel="No categories match"
        />
      ) : null}
      {mode === 'brand' ? (
        <MultiPick
          options={brands.map((name) => ({ id: name, label: name }))}
          selected={brandNames}
          onChange={setBrandNames}
          placeholder="Find a brand, then tick more than one"
          emptyLabel="No brands match"
        />
      ) : null}
      {searching ? <p className="text-xs text-slate-500">Searching…</p> : null}
      {results.length > 0 ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs text-slate-500">{results.length} found</span>
            <button type="button" onClick={addShown} className="text-xs font-semibold text-slate-900">
              Add all shown
            </button>
          </div>
          <ul>
            {results.map((product) => {
              const id = productIdOf(product)
              const checked = productIds.includes(id)
              return (
                <li key={id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={checked} onChange={() => toggleProduct(product)} />
                    <img src={getProductThumbnailUrl(product)} alt="" className="h-8 w-8 rounded object-cover" />
                    <span className="min-w-0 flex-1 truncate">{product.name}</span>
                    {mode === 'sold' ? <span className="shrink-0 text-xs text-slate-500">{Number(product.soldCount) || 0} sold</span> : null}
                    {mode === 'price' ? <span className="shrink-0 text-xs text-slate-500">{Number(product.price) || 0}</span> : null}
                    {mode === 'stock' ? <span className="shrink-0 text-xs text-slate-500">{Number(product.stockQuantity) || 0} in stock</span> : null}
                    <span className="text-xs text-slate-400">{product.sku || ''}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {selected.map((product) => {
          const id = productIdOf(product)
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(productIds.filter((item) => item !== id))}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
            >
              <img src={getProductThumbnailUrl(product)} alt="" className="h-5 w-5 rounded object-cover" />
              <span className="truncate">{product.name}</span>
              <span className="text-slate-400">Remove</span>
            </button>
          )
        })}
        {productIds.length > selected.length ? (
          <span className="text-xs text-slate-400">{productIds.length} selected</span>
        ) : null}
      </div>
    </div>
  )
}

const STYLE_OPTIONS = [
  { id: 'countdown', label: 'Countdown' },
  { id: 'express', label: 'Express' },
  { id: 'pill', label: 'Blue text' },
]

function ColorField({ label, value, onChange }) {
  return (
    <label className="space-y-1 text-xs text-slate-500">
      {label}
      <span className="flex items-center gap-2">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#111111'} onChange={(event) => onChange(event.target.value)} className="h-9 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1" />
        <input value={value || ''} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      </span>
    </label>
  )
}

function ChoiceRow({ label, value, options, onChange }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${value === option.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function LogoField({ value, onChange, getToken }) {
  const [uploading, setUploading] = useState(false)

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setUploading(true)
      const token = await getToken?.()
      if (!token) {
        toast.error('Please sign in again')
        return
      }
      const compressed = await compressImageForUpload(file)
      const body = new FormData()
      body.append('image', compressed)
      body.append('type', 'category')
      const response = await fetch('/api/store/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) {
        toast.error(data?.error || 'Could not upload logo')
        return
      }
      onChange(data.url)
    } catch {
      toast.error('Could not upload logo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-700">Logo or icon</p>
      <p className="text-xs text-slate-500">Square image, 64×64 px. PNG with a transparent background stays sharp on the badge.</p>
      <div className="flex flex-wrap items-center gap-3">
        {value ? <img src={value} alt="" className="h-8 w-8 rounded border border-slate-200 bg-white object-contain" /> : null}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {uploading ? <Loader2 className="animate-spin" size={14} /> : null}
          {value ? 'Change logo or icon' : 'Upload logo or icon'}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={uploading} onChange={onFile} />
        </label>
        {value ? (
          <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-red-600">Remove</button>
        ) : null}
      </div>
    </div>
  )
}

function ArabicField({ value, english, placeholder, max = 80, onChange, getToken }) {
  const [busy, setBusy] = useState(false)

  async function translate() {
    const text = String(english || '').trim()
    if (!text) {
      toast.error('Enter the English text first')
      return
    }
    try {
      setBusy(true)
      const token = await getToken?.()
      if (!token) {
        toast.error('Please sign in again')
        return
      }
      const { data } = await axios.post(
        '/api/store/categories/translate-arabic',
        { text },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const translated = String(data?.descriptionAr || data?.nameAr || '').replace(/\s+/g, ' ').trim().slice(0, max)
      if (!translated) {
        toast.error('Could not translate to Arabic')
        return
      }
      onChange(translated)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to translate to Arabic')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex gap-2">
      <input value={value || ''} dir="rtl" onChange={(event) => onChange(event.target.value)} className={inputClass} placeholder={placeholder} />
      <button
        type="button"
        onClick={translate}
        disabled={busy || !String(english || '').trim()}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="animate-spin" size={14} /> : null}
        Translate
      </button>
    </div>
  )
}

function Fold({ title, note, actions, children }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
          {!open && note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {open ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>
      {open ? <div className="mt-3 space-y-3">{children}</div> : null}
    </section>
  )
}

function DeliverySchedule({ date, time, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs text-slate-500">
        Delivery date
        <input type="date" value={date || ''} onChange={(event) => onChange({ date: event.target.value })} className={inputClass} />
      </label>
      <label className="space-y-1 text-xs text-slate-500">
        Delivery time, UAE, optional
        <input type="time" value={time || ''} onChange={(event) => onChange({ time: event.target.value })} className={inputClass} />
      </label>
    </div>
  )
}

function BadgeFields({ rule, onChange, showCutoff = false, rollover = null, mention = '', getToken, placements, onPlacements, showPages = false, hover = 'none' }) {
  const [pagesOpen, setPagesOpen] = useState(false)
  const express = rule.style === 'express'
  const shownLabel = rule.label || mention
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {STYLE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(rule.style === option.id ? { style: option.id } : { style: option.id, ...timeBadgeLookDefaults(option.id) })}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${rule.style === option.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}
          >
            {option.label}
          </button>
        ))}
        {showPages ? (
          <button
            type="button"
            onClick={() => setPagesOpen(true)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            Pages
          </button>
        ) : null}
        <DeliveryTimeMark
          hover={hover}
          key={`${rule.icon || 'lightning'}-${rule.arrow}-${rule.logo || ''}-${hover}`}
          badge={{
            style: rule.style,
            prefix: rule.prefix,
            label: shownLabel,
            cutoff: rule.cutoff,
            backgroundColor: rule.backgroundColor,
            textColor: rule.textColor,
            accentColor: rule.accentColor,
            accentTextColor: rule.accentTextColor,
            fontFamily: rule.fontFamily,
            fontWeight: rule.fontWeight,
            fontSize: rule.fontSize,
            italic: rule.italic,
            uppercase: rule.uppercase,
            shape: rule.shape,
            icon: rule.icon,
            arrow: rule.arrow === true,
            logo: rule.logo,
            animation: rule.animation || '',
            rollover,
          }}
        />
      </div>
      {pagesOpen ? (
        <PagesPopup placements={placements} onChange={onPlacements} onClose={() => setPagesOpen(false)} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {express ? (
          <>
            <ColorField label="Left background" value={rule.accentColor} onChange={(accentColor) => onChange({ accentColor })} />
            <ColorField label="Left text color" value={rule.accentTextColor} onChange={(accentTextColor) => onChange({ accentTextColor })} />
            <ColorField label="Right background" value={rule.backgroundColor} onChange={(backgroundColor) => onChange({ backgroundColor })} />
            <ColorField label="Right text color" value={rule.textColor} onChange={(textColor) => onChange({ textColor })} />
          </>
        ) : (
          <>
            <ColorField label="Badge color" value={rule.backgroundColor} onChange={(backgroundColor) => onChange({ backgroundColor })} />
            <ColorField label="Text color" value={rule.textColor} onChange={(textColor) => onChange({ textColor })} />
          </>
        )}
      </div>
      {showCutoff && rule.style === 'countdown' ? (
        <label className="block max-w-[12rem] space-y-1 text-xs text-slate-500">
          Cutoff time, UAE
          <input type="time" value={rule.cutoff || '20:00'} onChange={(event) => onChange({ cutoff: event.target.value })} className={inputClass} />
        </label>
      ) : null}
      {rule.style === 'countdown' || express ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={rule.prefix || ''} onChange={(event) => onChange({ prefix: event.target.value })} className={inputClass} placeholder={express ? 'express' : 'GET IN'} />
          <ArabicField value={rule.prefixAr} english={rule.prefix} max={24} placeholder="الكلمة الأولى بالعربي" getToken={getToken} onChange={(prefixAr) => onChange({ prefixAr })} />
        </div>
      ) : null}
      {rule.style === 'countdown' ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={rule.label || ''} onChange={(event) => onChange({ label: event.target.value })} className={inputClass} placeholder={mention || (express ? 'Tomorrow' : 'Badge text')} />
          <ArabicField value={rule.labelAr} english={rule.label || mention} max={80} placeholder={mention ? 'النص بالعربي، اتركه فارغاً ليظهر المدى' : 'النص بالعربي'} getToken={getToken} onChange={(labelAr) => onChange({ labelAr })} />
        </div>
      )}
      {mention ? (
        <p className="text-xs text-slate-500">Leave the text blank and the badge shows {mention}. Type your own text to replace it.</p>
      ) : null}
      <ChoiceRow
        label="Animation"
        value={rule.animation || 'same'}
        onChange={(animation) => onChange({ animation: animation === 'same' ? '' : animation })}
        options={[
          { id: 'same', label: 'Same as all' },
          { id: 'none', label: 'None' },
          { id: 'lift', label: 'Lift' },
          { id: 'brighten', label: 'Brighten' },
          { id: 'grow', label: 'Grow' },
          { id: 'glow', label: 'Glow' },
          { id: 'pulse', label: 'Pulse' },
          { id: 'float', label: 'Float' },
        ]}
      />
      <ChoiceRow
        label="Icon"
        value={rule.icon || 'lightning'}
        onChange={(icon) => onChange({ icon })}
        options={[{ id: 'lightning', label: 'Lightning' }, { id: 'plus', label: 'Plus' }, { id: 'none', label: 'None' }]}
      />
      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={rule.arrow !== false} onChange={(event) => onChange({ arrow: event.target.checked })} />
        Arrow
      </label>
      <LogoField value={rule.logo} getToken={getToken} onChange={(logo) => onChange({ logo })} />
      <ChoiceRow label="Shape" value={rule.shape} onChange={(shape) => onChange({ shape })} options={[{ id: 'pill', label: 'Pill' }, { id: 'rounded', label: 'Rounded' }, { id: 'square', label: 'Square' }]} />
      <ChoiceRow label="Font" value={rule.fontFamily} onChange={(fontFamily) => onChange({ fontFamily })} options={[{ id: 'sans', label: 'Sans' }, { id: 'serif', label: 'Serif' }]} />
      <label className="block max-w-[12rem] space-y-1 text-xs text-slate-500">
        Font size
        <span className="flex items-center gap-2">
          <input
            type="number"
            min="8"
            max="28"
            value={Number(rule.fontSize) || 10}
            onChange={(event) => onChange({ fontSize: event.target.value })}
            className={inputClass}
          />
          <span className="shrink-0 text-slate-500">px</span>
        </span>
      </label>
      <ChoiceRow label="Weight" value={String(rule.fontWeight)} onChange={(fontWeight) => onChange({ fontWeight })} options={[{ id: '500', label: 'Medium' }, { id: '600', label: 'Semibold' }, { id: '700', label: 'Bold' }, { id: '800', label: 'Extra bold' }]} />
      <div className="flex flex-wrap gap-4 text-sm text-slate-700">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={rule.italic === true} onChange={(event) => onChange({ italic: event.target.checked })} />
          Italic
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={rule.uppercase !== false} onChange={(event) => onChange({ uppercase: event.target.checked })} />
          Uppercase
        </label>
      </div>
    </div>
  )
}

function PagesPopup({ placements, onChange, onClose }) {
  const cardPages = TIME_BADGE_PAGES.filter((page) => page.id !== 'productPage')
  const productPage = TIME_BADGE_PAGES.find((page) => page.id === 'productPage')
  const selected = new Set(placements?.allCards ? cardPages.map((page) => page.id) : placements?.pages || [])

  const toggleCard = (id, checked) => {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    const pages = cardPages.map((page) => page.id).filter((pageId) => next.has(pageId))
    onChange({ ...placements, allCards: pages.length === cardPages.length, cards: pages.length === cardPages.length, pages })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()} lang="en" dir="ltr">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Where to show</h3>
            <p className="mt-1 text-sm text-slate-500">Choose every page. Product cards sit under the price. The product page sits under the title.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Close</button>
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={placements?.allCards !== false && selected.size === cardPages.length}
            onChange={(event) => onChange({
              ...placements,
              allCards: event.target.checked,
              cards: event.target.checked,
              pages: event.target.checked ? cardPages.map((page) => page.id) : [],
            })}
          />
          <span>
            <span className="font-semibold">All product cards</span>
            <span className="mt-0.5 block text-xs text-slate-500">Show the badge under the price on every product card.</span>
          </span>
        </label>
        <div className="mt-3 space-y-2">
          {cardPages.map((page) => (
            <label key={page.id} className="flex items-start gap-3 text-sm text-slate-800">
              <input type="checkbox" className="mt-1" checked={selected.has(page.id)} onChange={(event) => toggleCard(page.id, event.target.checked)} />
              <span>
                <span className="font-semibold">{page.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{page.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={placements?.productPage === true}
            onChange={(event) => onChange({ ...placements, productPage: event.target.checked })}
          />
          <span>
            <span className="font-semibold">{productPage.label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{productPage.hint}</span>
          </span>
        </label>
      </div>
    </div>
  )
}

export default function TimeBadgesPage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [openId, setOpenId] = useState('')
  const [form, setForm] = useState(normalizeTimeBadges())

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const token = await getToken()
        const { data } = await axios.get('/api/store/appearance/sections', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (mounted) setForm(normalizeTimeBadges(data?.timeBadges))
      } catch (error) {
        toast.error('Failed to load time badges')
        console.error(error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [getToken])

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const timeBadges = normalizeTimeBadges(form)
      await axios.post('/api/store/appearance/sections', { timeBadges }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setForm(timeBadges)
      toast.success('Time badges saved')
    } catch (error) {
      toast.error('Could not save time badges')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const patchGroup = (key, patch) => {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const patchList = (key, index, patch) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500" lang="en" dir="ltr">
        <Loader2 className="animate-spin" size={20} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6" lang="en" dir="ltr">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Time Badge</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Pick the products, then the condition decides the badge on the product card. Today delivery counts down until the cutoff. After that time those products switch to the tomorrow badge.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Save
        </button>
      </div>

      <Fold title="Common for all badges" note="Rotation, hover, and the pages where badges show.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Switch multiple badges</p>
            <p className="text-xs text-slate-500">When one product has more than one badge, they take turns on the card.</p>
          </div>
          <EnableSwitch
            enabled={form.common?.rotate !== false}
            onChange={(rotate) => setForm((prev) => ({ ...prev, common: { ...prev.common, rotate } }))}
          />
        </div>
        <label className="block max-w-[12rem] space-y-1 text-xs text-slate-500">
          Change every (seconds)
          <input
            type="number"
            min="1"
            max="30"
            value={form.common?.rotateSeconds ?? 3}
            onChange={(event) => setForm((prev) => ({ ...prev, common: { ...prev.common, rotateSeconds: event.target.value } }))}
            className={inputClass}
          />
        </label>
        <div className="border-t border-slate-100 pt-3">
          <ChoiceRow
            label="Hover effect"
            value={form.common?.hover || 'none'}
            onChange={(hover) => setForm((prev) => ({ ...prev, common: { ...prev.common, hover } }))}
            options={[
              { id: 'none', label: 'None' },
              { id: 'lift', label: 'Lift' },
              { id: 'brighten', label: 'Brighten' },
              { id: 'grow', label: 'Grow' },
              { id: 'glow', label: 'Glow' },
              { id: 'pulse', label: 'Pulse' },
              { id: 'float', label: 'Float' },
            ]}
          />
          <p className="mt-1 text-xs text-slate-500">Used when a badge is set to Same as all. Pulse and Float play on the card. The others show when the badge is hovered.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Where badges show</p>
            <p className="text-xs text-slate-500">Choose the pages for every badge.</p>
          </div>
          <button
            type="button"
            onClick={() => setPagesOpen(true)}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Pages
          </button>
        </div>
      </Fold>
      {pagesOpen ? (
        <PagesPopup
          placements={form.placements}
          onChange={(placements) => setForm((prev) => ({ ...prev, placements }))}
          onClose={() => setPagesOpen(false)}
        />
      ) : null}

      {['today', 'tomorrow'].map((key) => (
        <Fold
          key={key}
          title={key === 'today' ? 'Today delivery' : 'Tomorrow delivery'}
          note={key === 'today' ? 'Countdown until the cutoff, then the tomorrow badge.' : 'Express badge for next-day products.'}
          actions={<EnableSwitch enabled={form[key].enabled !== false} onChange={(enabled) => patchGroup(key, { enabled })} />}
        >
          <p className="text-xs text-slate-500">
            {key === 'today'
              ? 'Today delivery means the order can still arrive today when it is placed before the cutoff. The card shows a live countdown, such as GET IN 1 HR 7 MIN. After the cutoff, the same products show the tomorrow badge.'
              : 'Tomorrow delivery means the order arrives the next day. Those products show the express Tomorrow badge. Today-delivery products use this badge after the cutoff.'}
          </p>
          <BadgeFields
            rule={form[key]}
            hover={form.common?.hover}
            getToken={getToken}
            showCutoff={key === 'today'}
            rollover={key === 'today' ? { style: 'express', prefix: form.tomorrow.prefix, label: form.tomorrow.label, logo: form.tomorrow.logo, backgroundColor: form.tomorrow.backgroundColor, textColor: form.tomorrow.textColor, accentColor: form.tomorrow.accentColor, accentTextColor: form.tomorrow.accentTextColor, fontFamily: form.tomorrow.fontFamily, fontWeight: form.tomorrow.fontWeight, fontSize: form.tomorrow.fontSize, italic: form.tomorrow.italic, uppercase: form.tomorrow.uppercase, shape: form.tomorrow.shape } : null}
            onChange={(patch) => patchGroup(key, patch)}
          />
          <ProductPicker productIds={form[key].productIds} onChange={(productIds) => patchGroup(key, { productIds })} getToken={getToken} />
        </Fold>
      ))}

      <Fold
        title="Standard delivery"
        note="A date you choose. Time is optional."
        actions={<EnableSwitch enabled={form.standard?.enabled !== false} onChange={(enabled) => patchGroup('standard', { enabled })} />}
      >
        <p className="text-xs text-slate-500">
          Standard delivery is for products that arrive on a date you choose. Time is optional. Colors work the same way as Tomorrow delivery. Leave the badge text blank and the card shows that date.
        </p>
        <DeliverySchedule
          date={form.standard?.date}
          time={form.standard?.time}
          onChange={(patch) => patchGroup('standard', patch)}
        />
        <BadgeFields
          rule={form.standard || {}}
          hover={form.common?.hover}
          getToken={getToken}
          mention={formatDeliveryMoment(form.standard?.date, form.standard?.time) || '14 Oct, 6:00 pm'}
          onChange={(patch) => patchGroup('standard', patch)}
        />
        <ProductPicker productIds={form.standard?.productIds || []} onChange={(productIds) => patchGroup('standard', { productIds })} getToken={getToken} />
      </Fold>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">More badges</h2>
            <p className="mt-1 text-xs text-slate-500">Each badge is saved on its own. Add a custom badge, or add another standard delivery with its own date, time, and colors.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={(form.customBadges || []).length >= 8}
              onClick={() => setForm((prev) => ({ ...prev, customBadges: [...(prev.customBadges || []), createCustomBadgeRule()] }))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              <Plus size={14} /> Add badge
            </button>
            <button
              type="button"
              disabled={(form.customBadges || []).length >= 8}
              onClick={() => setForm((prev) => ({ ...prev, customBadges: [...(prev.customBadges || []), createStandardBadgeRule()] }))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              <Plus size={14} /> Add standard delivery
            </button>
          </div>
        </div>
        {(form.customBadges || []).map((rule, index) => (
          <div key={rule.id} className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={rule.name || ''}
                onChange={(event) => patchList('customBadges', index, { name: event.target.value })}
                className={inputClass + ' max-w-xs'}
                placeholder="Badge name"
              />
              <EnableSwitch enabled={rule.enabled !== false} onChange={(enabled) => patchList('customBadges', index, { enabled })} />
              <button type="button" onClick={() => setOpenId((value) => (value === rule.id ? '' : rule.id))} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {openId === rule.id ? 'Close' : 'Edit'}
              </button>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, customBadges: prev.customBadges.filter((_, itemIndex) => itemIndex !== index) }))} className="ms-auto text-red-600" aria-label="Remove badge">
                <Trash2 size={16} />
              </button>
            </div>
            {openId === rule.id ? (
              <>
                <DeliverySchedule
                  date={rule.date}
                  time={rule.time}
                  onChange={(patch) => patchList('customBadges', index, patch)}
                />
                <BadgeFields
                  rule={rule}
                  hover={form.common?.hover}
                  getToken={getToken}
                  mention={formatDeliveryMoment(rule.date, rule.time)}
                  onChange={(patch) => patchList('customBadges', index, patch)}
                />
                <ProductPicker productIds={rule.productIds} onChange={(productIds) => patchList('customBadges', index, { productIds })} getToken={getToken} />
              </>
            ) : null}
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Custom date</h2>
            <p className="mt-1 text-xs text-slate-500">Pick a date, then choose the products that use that badge.</p>
          </div>
          <button
            type="button"
            disabled={form.customDates.length >= 8}
            onClick={() => setForm((prev) => ({ ...prev, customDates: [...prev.customDates, createCustomDateRule()] }))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            <Plus size={14} /> Add date
          </button>
        </div>
        {form.customDates.map((rule, index) => (
          <div key={rule.id} className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={rule.date} onChange={(event) => patchList('customDates', index, { date: event.target.value })} className={inputClass + ' max-w-[12rem]'} />
              <EnableSwitch enabled={rule.enabled !== false} onChange={(enabled) => patchList('customDates', index, { enabled })} />
              <button type="button" onClick={() => setOpenId((value) => (value === rule.id ? '' : rule.id))} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {openId === rule.id ? 'Close' : 'Edit'}
              </button>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, customDates: prev.customDates.filter((_, itemIndex) => itemIndex !== index) }))} className="ms-auto text-red-600" aria-label="Remove date">
                <Trash2 size={16} />
              </button>
            </div>
            {openId === rule.id ? (
              <>
                <BadgeFields rule={rule} hover={form.common?.hover} getToken={getToken} onChange={(patch) => patchList('customDates', index, patch)} />
                <ProductPicker productIds={rule.productIds} onChange={(productIds) => patchList('customDates', index, { productIds })} getToken={getToken} />
              </>
            ) : null}
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Delivery in a few days</h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              Use this when a product arrives in 2–5 days or 3–5 days. Add one range for each window, then choose those products. Leave the badge text blank and it reads 2-5 DAYS. A product that is also in Today or Tomorrow uses that badge instead.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[[2, 5], [3, 5], [2, 4], [4, 7]].map(([minDays, maxDays]) => (
            <button
              key={`${minDays}-${maxDays}`}
              type="button"
              disabled={form.dayRanges.length >= 8}
              onClick={() => setForm((prev) => ({ ...prev, dayRanges: [...prev.dayRanges, createDayRangeRule(minDays, maxDays)] }))}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              <Plus size={14} /> {minDays}–{maxDays} days
            </button>
          ))}
        </div>
        {form.dayRanges.map((rule, index) => (
          <div key={rule.id} className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="space-y-1 text-xs text-slate-500">
                From days
                <input type="number" min="1" max="60" value={rule.minDays} onChange={(event) => patchList('dayRanges', index, { minDays: Number(event.target.value) })} className={inputClass + ' w-24'} />
              </label>
              <label className="space-y-1 text-xs text-slate-500">
                To days
                <input type="number" min="1" max="60" value={rule.maxDays} onChange={(event) => patchList('dayRanges', index, { maxDays: Number(event.target.value) })} className={inputClass + ' w-24'} />
              </label>
              <span className="pb-2 text-sm font-semibold text-slate-700">{rule.minDays}-{rule.maxDays} days</span>
              <EnableSwitch enabled={rule.enabled !== false} onChange={(enabled) => patchList('dayRanges', index, { enabled })} />
              <button type="button" onClick={() => setOpenId((value) => (value === rule.id ? '' : rule.id))} className="mb-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {openId === rule.id ? 'Close' : 'Edit'}
              </button>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, dayRanges: prev.dayRanges.filter((_, itemIndex) => itemIndex !== index) }))} className="ms-auto mb-2 text-red-600" aria-label="Remove range">
                <Trash2 size={16} />
              </button>
            </div>
            {openId === rule.id ? (
              <>
                <BadgeFields rule={rule} hover={form.common?.hover} getToken={getToken} mention={`${rule.minDays}-${rule.maxDays} DAYS`} onChange={(patch) => patchList('dayRanges', index, patch)} />
                <p className="text-xs font-semibold text-slate-700">Products that arrive in {rule.minDays}–{rule.maxDays} days</p>
                <ProductPicker productIds={rule.productIds} onChange={(productIds) => patchList('dayRanges', index, { productIds })} getToken={getToken} />
              </>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  )
}
