'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { BadgePercent, Download, FileSpreadsheet, FolderTree, Loader2, Save, Search, Tag, Upload } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import EnableSwitch from '@/components/store/EnableSwitch'
import { applyAppProductDiscount } from '@/lib/appProductDiscount'
import { rowsToAppPrices } from '@/lib/appDiscountSheet'
import { getProductThumbnailUrl } from '@/lib/productMedia'

const MODES = [
  {
    id: 'manual',
    title: 'Choose products',
    text: 'Search by name or SKU, then type the mobile price.',
    icon: Search,
  },
  {
    id: 'category',
    title: 'By category',
    text: 'Choose categories and cut the app price by a percent.',
    icon: FolderTree,
  },
  {
    id: 'brand',
    title: 'By brand',
    text: 'Choose brands and cut the app price by a percent.',
    icon: Tag,
  },
  {
    id: 'excel',
    title: 'Excel',
    text: 'Fill SKU and Mobile price, then upload the file.',
    icon: FileSpreadsheet,
  },
  {
    id: 'set',
    title: 'With a discount',
    text: 'Products that already have a lower mobile price.',
    icon: BadgePercent,
  },
]

function money(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function withDraft(product) {
  const sale = Number(product.price) || 0
  const enabled = product.appDiscountEnabled === true
  const type = product.appDiscountType === 'amount' ? 'amount' : 'percent'
  const value = product.appDiscountValue || ''
  const appPrice = applyAppProductDiscount(sale, {
    appDiscountEnabled: enabled,
    appDiscountType: type,
    appDiscountValue: value,
  })
  return {
    ...product,
    draftEnabled: enabled,
    draftType: type,
    draftValue: value,
    draftMobilePrice: enabled && appPrice < sale ? String(appPrice) : '',
  }
}

function MultiCheckList({ options, selected, onToggle, empty }) {
  const [filter, setFilter] = useState('')
  const term = filter.trim().toLowerCase()
  const shown = term
    ? options.filter((option) => option.label.toLowerCase().includes(term))
    : options
  return (
    <div>
      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter the list"
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
      />
      <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
        {shown.length ? shown.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm text-slate-800 last:border-b-0 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={() => onToggle(option.id)}
            />
            <span>{option.label}</span>
          </label>
        )) : (
          <p className="px-3 py-6 text-center text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  )
}

function categoryChoices(categories = []) {
  const byId = new Map(categories.map((category) => [String(category._id), category]))
  return categories
    .map((category) => {
      const parent = category.parentId ? byId.get(String(category.parentId)) : null
      const name = String(category.name || '').trim()
      if (!name) return null
      return {
        id: String(category._id),
        label: parent?.name ? `${parent.name} / ${name}` : name,
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.label.localeCompare(right.label))
}

export default function AppDiscountPage() {
  const { getToken } = useAuth()
  const [mode, setMode] = useState('manual')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState('')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
  const [selectedBrandNames, setSelectedBrandNames] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [percent, setPercent] = useState('10')
  const [applying, setApplying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [productTotal, setProductTotal] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const { data } = await axios.get('/api/store/categories', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (active) setCategories(categoryChoices(data?.categories || []))
      } catch {
        if (active) setCategories([])
      }
      try {
        const token = await getToken()
        const brandsResponse = await axios.get('/api/store/product', {
          headers: { Authorization: `Bearer ${token}` },
          params: { manage: 'true', distinct: 'brands' },
        })
        if (active) {
          setBrands((brandsResponse.data?.brands || []).map((name) => ({ id: name, label: name })))
        }
      } catch {
        if (active) setBrands([])
      }
    })()
    return () => {
      active = false
    }
  }, [getToken])

  const categoryKey = selectedCategoryIds.join(',')
  const brandKey = selectedBrandNames.join('\n')

  useEffect(() => {
    if (mode !== 'category') return undefined
    if (!selectedCategoryIds.length) {
      setProducts([])
      setProductTotal(0)
      setSelectedIds([])
      return undefined
    }
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true)
        await loadProducts({ categories: selectedCategoryIds })
      } catch (error) {
        if (active) toast.error(error?.response?.data?.error || 'Could not load these categories')
      } finally {
        if (active) setLoading(false)
      }
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [mode, categoryKey])

  useEffect(() => {
    if (mode !== 'brand') return undefined
    if (!selectedBrandNames.length) {
      setProducts([])
      setProductTotal(0)
      setSelectedIds([])
      return undefined
    }
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true)
        await loadProducts({ brands: selectedBrandNames })
      } catch (error) {
        if (active) toast.error(error?.response?.data?.error || 'Could not load these brands')
      } finally {
        if (active) setLoading(false)
      }
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [mode, brandKey])

  const loadProducts = async ({ search = '', categories: categoryIds = [], brands: brandNames = [], appDiscount = '' } = {}) => {
    const token = await getToken()
    const params = {
      page: 1,
      limit: appDiscount === 'set' || categoryIds.length || brandNames.length ? 200 : 50,
      manage: 'true',
      search,
      appDiscount,
    }
    if (categoryIds.length) params.categories = categoryIds.join(',')
    if (brandNames.length) params.brands = JSON.stringify(brandNames)
    const { data } = await axios.get('/api/store/product', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })
    setProducts((data?.products || []).map(withDraft))
    setProductTotal(Number(data?.pagination?.total) || 0)
    setSelectedIds([])
  }

  const loadDiscounted = async () => {
    try {
      setLoading(true)
      await loadProducts({ appDiscount: 'set' })
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not load discounted products')
    } finally {
      setLoading(false)
    }
  }

  const search = async (event) => {
    event?.preventDefault()
    const term = query.trim()
    if (term.length < 2) {
      toast.error('Type at least 2 letters or a SKU')
      return
    }
    try {
      setLoading(true)
      await loadProducts({ search: term })
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not search products')
    } finally {
      setLoading(false)
    }
  }

  const toggleValue = (current, value) => (
    current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  )

  const applyPercent = async (scope) => {
    const value = Number(percent)
    if (!Number.isFinite(value) || value <= 0 || value >= 100) {
      toast.error('Enter a percent between 1 and 99')
      return
    }
    try {
      setApplying(true)
      const token = await getToken()
      const { data } = await axios.post('/api/store/product/app-discount', {
        percent: value,
        ...scope,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success(data.message || 'App prices updated')
      if (mode === 'category') await loadProducts({ categories: selectedCategoryIds })
      else if (mode === 'brand') await loadProducts({ brands: selectedBrandNames })
      else if (mode === 'set') await loadProducts({ appDiscount: 'set' })
      else if (query.trim().length >= 2) await loadProducts({ search: query.trim() })
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not apply this percent')
    } finally {
      setApplying(false)
    }
  }

  const patchProduct = (id, patch) => {
    setProducts((prev) => prev.map((product) => (product._id === id ? { ...product, ...patch } : product)))
  }

  const setMobilePrice = (product, raw) => {
    const sale = Number(product.price) || 0
    const mobile = Number(raw)
    if (raw === '') {
      patchProduct(product._id, { draftMobilePrice: '', draftType: 'amount', draftValue: '' })
      return
    }
    if (Number.isFinite(mobile) && mobile > 0 && mobile < sale) {
      patchProduct(product._id, {
        draftMobilePrice: raw,
        draftEnabled: true,
        draftType: 'amount',
        draftValue: String(Math.round((sale - mobile) * 100) / 100),
      })
      return
    }
    patchProduct(product._id, { draftMobilePrice: raw })
  }

  const save = async (product) => {
    try {
      setSavingId(product._id)
      const token = await getToken()
      const { data } = await axios.put('/api/store/product/app-discount', {
        productId: product._id,
        enabled: product.draftEnabled,
        type: product.draftType,
        value: Number(product.draftValue) || 0,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      patchProduct(product._id, withDraft({ ...product, ...data.product }))
      toast.success('App price saved')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save')
    } finally {
      setSavingId('')
    }
  }

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const sheet = XLSX.utils.aoa_to_sheet([
      ['SKU', 'Mobile price'],
      ['EXAMPLE-SKU', 69],
    ])
    sheet['!cols'] = [{ wch: 24 }, { wch: 16 }]
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'App prices')
    XLSX.writeFile(book, 'app-discount-template.xlsx')
  }

  const readExcelFile = async (file) => {
    if (!file) return
    const name = file.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      toast.error('Upload the template as .xlsx, .xls, or .csv')
      return
    }
    try {
      setUploading(true)
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const parsed = rowsToAppPrices(XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true }))
      if (!parsed.length) {
        toast.error('Use the columns SKU and Mobile price')
        return
      }
      const token = await getToken()
      const { data } = await axios.post('/api/store/product/app-discount', {
        rows: parsed,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUploadResult({
        fileName: file.name,
        message: data.message || 'App prices updated',
        updated: Number(data.updated) || 0,
        missing: Array.isArray(data.missing) ? data.missing : [],
        tooHigh: Array.isArray(data.tooHigh)
          ? data.tooHigh.map((row) => (typeof row === 'string' ? row : row?.sku)).filter(Boolean)
          : [],
      })
      toast.success(data.message || 'App prices updated')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not read this file')
    } finally {
      setUploading(false)
    }
  }

  const uploadExcel = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    await readExcelFile(file)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-16" lang="en" dir="ltr">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">App discount</h1>
        <p className="mt-1 text-sm text-slate-500">
          The website sale price stays the same. The mobile price is used only when the product is bought in the app.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {MODES.map((item) => {
          const Icon = item.icon
          const selected = mode === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id)
                setProducts([])
                setProductTotal(0)
                if (item.id === 'set') loadDiscounted()
              }}
              className={`rounded-2xl border p-4 text-start shadow-sm transition ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
            >
              <Icon size={18} className={selected ? 'text-white' : 'text-slate-500'} />
              <p className="mt-3 text-sm font-semibold">{item.title}</p>
              <p className={`mt-1 text-xs leading-5 ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{item.text}</p>
            </button>
          )
        })}
      </div>

      {mode === 'manual' ? (
        <form onSubmit={search} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or SKU"
              className="h-11 w-full rounded-xl border border-slate-200 ps-9 pe-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </div>
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </form>
      ) : null}

      {mode === 'category' || mode === 'brand' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {mode === 'category' ? 'Categories' : 'Brands'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {mode === 'category'
                  ? `${selectedCategoryIds.length} selected. The percent applies to every product in those categories.`
                  : `${selectedBrandNames.length} selected. The percent applies to every product in those brands.`}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-slate-600">
                Percent off
                <input
                  type="number"
                  min="1"
                  max="99"
                  step="0.01"
                  value={percent}
                  onChange={(event) => setPercent(event.target.value)}
                  className="mt-1 h-10 w-28 rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={applying || (mode === 'category' ? !selectedCategoryIds.length : !selectedBrandNames.length)}
                onClick={() => applyPercent(mode === 'category'
                  ? { categoryIds: selectedCategoryIds }
                  : { brands: selectedBrandNames })}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgePercent size={15} />}
                Apply %
              </button>
            </div>
          </div>
          {mode === 'category' ? (
            <MultiCheckList
              options={categories}
              selected={selectedCategoryIds}
              onToggle={(id) => setSelectedCategoryIds((current) => toggleValue(current, id))}
              empty="No categories match."
            />
          ) : (
            <MultiCheckList
              options={brands}
              selected={selectedBrandNames}
              onToggle={(id) => setSelectedBrandNames((current) => toggleValue(current, id))}
              empty="No brands match."
            />
          )}
          {productTotal > products.length ? (
            <p className="mt-3 text-xs text-slate-500">
              Showing {products.length} of {productTotal}. Apply % still updates every product in this selection.
            </p>
          ) : null}
        </section>
      ) : null}

      {mode === 'excel' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 1</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">Download the template</h2>
            <p className="mt-1 text-sm text-slate-500">Keep these two columns. Put the app price in Mobile price.</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 font-mono text-xs">
              <div className="grid grid-cols-[32px_1fr_1fr] bg-emerald-700 text-white">
                <span />
                <span className="border-s border-emerald-600 px-3 py-1.5">A</span>
                <span className="border-s border-emerald-600 px-3 py-1.5">B</span>
              </div>
              <div className="grid grid-cols-[32px_1fr_1fr] border-t border-slate-200 bg-slate-50 font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span className="py-2 text-center">1</span>
                <span className="border-s border-slate-200 px-3 py-2">SKU</span>
                <span className="border-s border-slate-200 px-3 py-2">Mobile price</span>
              </div>
              <div className="grid grid-cols-[32px_1fr_1fr] border-t border-slate-200 text-slate-800">
                <span className="bg-slate-50 py-2 text-center text-slate-400">2</span>
                <span className="border-s border-slate-200 px-3 py-2">EXAMPLE-SKU</span>
                <span className="border-s border-slate-200 px-3 py-2">69</span>
              </div>
              {[3, 4, 5].map((row) => (
                <div key={row} className="grid grid-cols-[32px_1fr_1fr] border-t border-slate-100 text-slate-300">
                  <span className="bg-slate-50 py-2 text-center">{row}</span>
                  <span className="border-s border-slate-100 px-3 py-2"> </span>
                  <span className="border-s border-slate-100 px-3 py-2"> </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Download size={16} />
              Download template
            </button>
          </section>

          <section
            className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${dragOver ? 'border-slate-900' : 'border-slate-200'}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragOver(false)
              readExcelFile(event.dataTransfer.files?.[0])
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 2</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">Upload the filled file</h2>
            <p className="mt-1 text-sm text-slate-500">Each mobile price must be lower than that product’s website sale price.</p>
            <label className="mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-slate-500" /> : <Upload className="text-slate-400" size={22} />}
              <span className="mt-3 text-sm font-semibold text-slate-800">
                {uploading ? 'Reading the file…' : 'Drop the file here, or browse'}
              </span>
              <span className="mt-1 text-xs text-slate-500">.xlsx, .xls, or .csv</span>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={uploadExcel} />
            </label>
          </section>

          {uploadResult ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <p className="text-sm font-semibold text-slate-900">{uploadResult.fileName}</p>
              <p className="mt-1 text-sm text-slate-500">{uploadResult.message}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-medium text-emerald-700">Updated</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-900">{uploadResult.updated}</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-700">SKU not found</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-900">{uploadResult.missing.length}</p>
                </div>
                <div className="rounded-xl bg-rose-50 px-4 py-3">
                  <p className="text-xs font-medium text-rose-700">Price not lower</p>
                  <p className="mt-1 text-2xl font-semibold text-rose-900">{uploadResult.tooHigh.length}</p>
                </div>
              </div>
              {uploadResult.missing.length ? (
                <p className="mt-4 text-sm text-slate-600">
                  Not found: {uploadResult.missing.slice(0, 12).join(', ')}
                  {uploadResult.missing.length > 12 ? ` and ${uploadResult.missing.length - 12} more` : ''}
                </p>
              ) : null}
              {uploadResult.tooHigh.length ? (
                <p className="mt-2 text-sm text-slate-600">
                  Not saved: {uploadResult.tooHigh.slice(0, 12).join(', ')}
                  {uploadResult.tooHigh.length > 12 ? ` and ${uploadResult.tooHigh.length - 12} more` : ''}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}

      {mode === 'set' && !loading ? (
        <p className="text-sm text-slate-600">
          {productTotal === 1 ? '1 product has a mobile price.' : `${productTotal} products have a mobile price.`}
        </p>
      ) : null}

      {mode !== 'excel' && products.length ? (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="pb-2 text-sm text-slate-600">{selectedIds.length} selected</p>
          <label className="text-xs font-medium text-slate-600">
            Percent off
            <input
              type="number"
              min="1"
              max="99"
              step="0.01"
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
              className="mt-1 h-10 w-28 rounded-xl border border-slate-200 px-3 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={applying || !selectedIds.length}
            onClick={() => applyPercent({ productIds: selectedIds })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgePercent size={15} />}
            Apply % to selected
          </button>
        </div>
      ) : null}

      {mode !== 'excel' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all products"
                      checked={products.length > 0 && products.every((product) => selectedIds.includes(String(product._id)))}
                      onChange={() => {
                        const visible = products.map((product) => String(product._id))
                        const allOn = visible.every((id) => selectedIds.includes(id))
                        setSelectedIds(allOn ? [] : visible)
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">SKU</th>
                  <th className="px-3 py-3 font-medium">Website</th>
                  <th className="px-3 py-3 font-medium">Mobile price</th>
                  <th className="px-3 py-3 font-medium">App price</th>
                  <th className="px-3 py-3 font-medium">On</th>
                  <th className="px-4 py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : null}
                {!loading && !products.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-500">
                      {mode === 'category'
                        ? 'Choose one or more categories.'
                        : mode === 'brand'
                          ? 'Choose one or more brands.'
                          : mode === 'set'
                            ? 'No products have a mobile price yet.'
                            : 'Search a product name or SKU.'}
                    </td>
                  </tr>
                ) : null}
                {!loading && products.map((product) => {
                  const preview = applyAppProductDiscount(product.price, {
                    appDiscountEnabled: product.draftEnabled,
                    appDiscountType: product.draftType,
                    appDiscountValue: product.draftValue,
                  })
                  const image = getProductThumbnailUrl(product, { fallback: '' })
                  const lower = product.draftEnabled && preview < Number(product.price || 0)
                  return (
                    <tr key={product._id} className="border-t border-slate-100">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${product.name}`}
                          checked={selectedIds.includes(String(product._id))}
                          onChange={() => setSelectedIds((current) => toggleValue(current, String(product._id)))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {image ? (
                              <Image src={image} alt="" fill className="object-cover" sizes="44px" />
                            ) : null}
                          </div>
                          <span className="font-medium text-slate-900">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{product.sku || '—'}</td>
                      <td className="px-3 py-3 text-slate-700">{money(product.price)}</td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.draftMobilePrice}
                          onChange={(event) => setMobilePrice(product, event.target.value)}
                          placeholder="Lower than website"
                          className="h-9 w-36 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-slate-400"
                        />
                      </td>
                      <td className={`px-3 py-3 font-semibold ${lower ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {money(preview)}
                      </td>
                      <td className="px-3 py-3">
                        <EnableSwitch enabled={product.draftEnabled} onChange={(enabled) => patchProduct(product._id, { draftEnabled: enabled })} />
                      </td>
                      <td className="px-4 py-3 text-end">
                        <button
                          type="button"
                          onClick={() => save(product)}
                          disabled={savingId === product._id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {savingId === product._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save size={13} />}
                          Save
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
