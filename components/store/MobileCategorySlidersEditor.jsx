'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import EnableSwitch from '@/components/store/EnableSwitch'
import StoreDropdown from '@/components/store/StoreDropdown'
import MobilePathPicker from '@/components/store/MobilePathPicker'
import { uploadStoreImage } from '@/lib/uploadStoreImage'
import { normalizeMobileFeatures } from '@/lib/mobileFeatures'
import { buildCategoryAncestorChain, resolveCategoryHref } from '@/lib/categoryTreeUtils'
import {
  MAX_CATEGORY_SLIDER_ITEMS,
  MIN_CATEGORY_SLIDER_ITEMS,
  createEmptyCategorySliderItem,
  expandCategoryMobileSliders,
  normalizeCategoryMobileSliders,
} from '@/lib/mobileCategorySliders'

function flattenCategories(items = [], depth = 0, seen = new Set()) {
  return (items || []).flatMap((item) => {
    const id = String(item?._id || item?.id || '').trim()
    if (!id || seen.has(id)) return []
    seen.add(id)
    const row = [{ value: id, label: `${'— '.repeat(depth)}${item.name || 'Category'}` }]
    return row.concat(flattenCategories(item.children || [], depth + 1, seen))
  })
}

function categoryPath(categories, category) {
  if (!category) return ''
  const chain = buildCategoryAncestorChain(categories, category)
  if (!chain.length) return ''
  return resolveCategoryHref(chain.slice(0, -1), category)
}

export default function MobileCategorySlidersEditor() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState('')
  const [form, setForm] = useState(() => normalizeCategoryMobileSliders())
  const [categories, setCategories] = useState([])

  const byId = useMemo(() => {
    const map = new Map()
    categories.forEach((category) => {
      const id = String(category?._id || '')
      if (id) map.set(id, category)
    })
    return map
  }, [categories])

  const manualOptions = useMemo(() => flattenCategories(categories.filter((item) => !item?.parentId).length
    ? categories.filter((item) => !item?.parentId)
    : categories), [categories])

  const parentOptions = useMemo(
    () => categories
      .filter((category) => Array.isArray(category?.children) && category.children.length > 0)
      .map((category) => ({ value: String(category._id), label: category.name || 'Category' })),
    [categories],
  )

  const preview = useMemo(
    () => expandCategoryMobileSliders(form, categories),
    [form, categories],
  )

  const patchItem = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const [featuresRes, categoryRes] = await Promise.all([
        axios.get('/api/store/mobile-features', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/categories').catch(() => ({ data: {} })),
      ])
      const normalized = normalizeMobileFeatures(featuresRes.data?.mobileFeatures)
      setForm(normalizeCategoryMobileSliders(normalized.categoryMobileSliders))
      setCategories(Array.isArray(categoryRes.data?.categories) ? categoryRes.data.categories : [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load category sliders')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  const chooseManualCategory = (index, categoryId) => {
    const category = byId.get(categoryId)
    patchItem(index, {
      categoryId,
      title: category?.name || '',
      titleAr: category?.nameAr || '',
      image: category?.image || '',
      path: categoryPath(categories, category),
    })
  }

  const uploadImage = async (index, file) => {
    if (!file) return
    const itemId = form.items[index]?.id || String(index)
    try {
      setUploadingId(itemId)
      const token = await getToken()
      const data = await uploadStoreImage(file, { token, type: 'category', compress: false })
      const url = data?.url || data?.imageUrl
      if (!url) throw new Error('No image URL returned')
      patchItem(index, { image: url })
      toast.success('Image uploaded')
    } catch (error) {
      toast.error(error?.message || 'Upload failed')
    } finally {
      setUploadingId('')
    }
  }

  const addItem = () => {
    setForm((prev) => {
      if (prev.items.length >= MAX_CATEGORY_SLIDER_ITEMS) return prev
      return { ...prev, items: [...prev.items, createEmptyCategorySliderItem()] }
    })
  }

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length <= MIN_CATEGORY_SLIDER_ITEMS) return prev
      return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) }
    })
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const categoryMobileSliders = normalizeCategoryMobileSliders(form)
      await axios.put(
        '/api/store/mobile-features',
        { mobileFeatures: { categoryMobileSliders } },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setForm(categoryMobileSliders)
      toast.success('Category sliders saved')
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
    <div lang="en" dir="ltr" className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/store/mobile-features" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} />
            Mobile
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Category sliders</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            At least {MIN_CATEGORY_SLIDER_ITEMS} choices. Add more if you need them. A parent category sends its child categories to the app. A manual choice uses the image, title, and path you set here.
          </p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-800">Show this slider in the app</span>
          <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => setForm((prev) => ({ ...prev, enabled }))} />
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {preview.items.length ? preview.items.map((chip, chipIndex) => (
            <div key={`${chip.categoryId || chip.path}-${chipIndex}`} className="w-20 shrink-0 text-center">
              <div className="mx-auto h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                {chip.image ? <img src={chip.image} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-700">{chip.title || 'Untitled'}</p>
            </div>
          )) : (
            <p className="text-sm text-slate-400">Choose categories to see the chips the app will show.</p>
          )}
        </div>
      </section>

      <div className="space-y-4">
        {form.items.map((item, index) => {
          const parent = item.source === 'parent' ? byId.get(item.categoryId) : null
          const children = parent?.children || []
          return (
            <section key={item.id || index} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">Choice {index + 1}</h2>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={form.items.length <= MIN_CATEGORY_SLIDER_ITEMS}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['parent', 'Parent category'],
                  ['manual', 'Manual category'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patchItem(index, { source: id })}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${item.source === id ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {item.source === 'parent' ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-slate-800">
                    Parent category
                    <div className="mt-1">
                      <StoreDropdown
                        portal
                        searchable
                        value={item.categoryId}
                        onChange={(categoryId) => patchItem(index, { categoryId })}
                        options={parentOptions}
                        placeholder="Select a parent category"
                      />
                    </div>
                  </label>
                  <p className="text-xs text-slate-500">
                    The app shows this parent’s child categories. Image, title, and path come from each child.
                  </p>
                  {children.length ? (
                    <div className="flex gap-3 overflow-x-auto">
                      {children.map((child) => (
                        <div key={String(child._id)} className="w-24 shrink-0">
                          <div className="h-16 overflow-hidden rounded-xl bg-slate-100">
                            {child.image ? <img src={child.image} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <p className="mt-1 truncate text-xs font-medium text-slate-800">{child.name}</p>
                          <p className="truncate text-[10px] text-slate-400">{categoryPath(categories, child)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">This parent has no child categories yet.</p>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <label className="block text-sm font-medium text-slate-800">
                    Category
                    <div className="mt-1">
                      <StoreDropdown
                        portal
                        searchable
                        value={item.categoryId}
                        onChange={(categoryId) => chooseManualCategory(index, categoryId)}
                        options={manualOptions}
                        placeholder="Select a category"
                      />
                    </div>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                    <div>
                      <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <span className="text-[11px] text-slate-400">No image</span>}
                      </div>
                      <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-sky-700">
                        {uploadingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        Upload image
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            event.target.value = ''
                            uploadImage(index, file)
                          }}
                        />
                      </label>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-800">
                        Title
                        <input
                          value={item.title}
                          onChange={(event) => patchItem(index, { title: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-800">
                        Title in Arabic
                        <input
                          dir="rtl"
                          value={item.titleAr}
                          onChange={(event) => patchItem(index, { titleAr: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-800">
                        Path
                        <div className="mt-1">
                          <MobilePathPicker value={item.path} onChange={(path) => patchItem(index, { path })} />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={form.items.length >= MAX_CATEGORY_SLIDER_ITEMS}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-40"
      >
        <Plus size={16} />
        Add another
      </button>
    </div>
  )
}
