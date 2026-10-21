'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import StoreDropdown from '@/components/store/StoreDropdown'
import MobilePathPicker from '@/components/store/MobilePathPicker'
import EnableSwitch from '@/components/store/EnableSwitch'
import { uploadStoreImage } from '@/lib/uploadStoreImage'
import { normalizeMobileFeatures } from '@/lib/mobileFeatures'
import { normalizeShopBlocks } from '@/lib/mobileShopBlocks'
import { HERO_FONT_OPTIONS, heroFontFamily } from '@/lib/mobileBannerLayout'

function ChoiceChips({ value, options, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            value === option.id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ImageSlot({ label, image, path, uploading, onUpload, onPath, onRemove }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-slate-100">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Upload size={16} className="text-slate-400" />
        )}
        <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-1 text-center text-[10px] font-semibold text-white">
          {uploading ? '…' : image ? 'Change' : 'Upload'}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) onUpload(file)
          }}
        />
      </label>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-800">{label}</p>
          {onRemove ? (
            <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
              <Trash2 size={12} /> Remove
            </button>
          ) : null}
        </div>
        <MobilePathPicker value={path} onChange={onPath} />
      </div>
    </div>
  )
}

function ShopPreview({ form }) {
  const slides = (form.slides || []).filter((slide) => slide.image)
  const [index, setIndex] = useState(0)
  useEffect(() => {
    setIndex(0)
  }, [slides.length, slides[0]?.image])
  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, Math.max(2, Number(form.slideIntervalSeconds) || 4) * 1000)
    return () => clearInterval(timer)
  }, [slides.length, form.slideIntervalSeconds])
  const current = slides[index] || slides[0]

  return (
    <div className="flex justify-center">
      <div className="w-[300px] rounded-[2.6rem] border-[11px] border-slate-900 bg-slate-900 shadow-xl">
        <div className="overflow-hidden rounded-[1.85rem] bg-slate-50">
          <div className="flex h-8 items-center justify-center bg-white">
            <span className="h-[18px] w-[92px] rounded-full bg-slate-900" />
          </div>
          <div className="px-2 py-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl p-2" style={{ background: form.gridBackground }}>
                <p
                  className={`text-[11px] ${form.gridTitleWeight === 'regular' ? 'font-medium' : 'font-extrabold'}`}
                  style={{
                    color: form.gridTitleColor,
                    textAlign: form.gridTitleAlign || 'center',
                    fontFamily: heroFontFamily(form.gridTitleFont),
                  }}
                >
                  {form.gridTitle}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {form.tiles.map((tile) => (
                    <div key={tile.id} className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white">
                      {tile.image ? (
                        <img src={tile.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[8px] text-slate-300">Image</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-slate-200">
                {current?.image ? (
                  <img src={current.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full min-h-36 items-center justify-center text-[10px] text-slate-400">Image</div>
                )}
                {slides.length > 1 ? (
                  <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
                    {slides.map((slide, dot) => (
                      <span key={slide.id} className={`h-1.5 w-1.5 rounded-full ${dot === index ? 'bg-white' : 'bg-white/50'}`} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MobileShopBlocksEditor() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState('')
  const [form, setForm] = useState(() => normalizeShopBlocks())

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get('/api/store/mobile-features', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const normalized = normalizeMobileFeatures(data?.mobileFeatures)
      setForm(normalizeShopBlocks(normalized.shopBlocks))
    } catch (error) {
      console.error(error)
      toast.error('Failed to load shop blocks')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  const upload = async (file, key, apply) => {
    if (!file) return
    try {
      setUploadingKey(key)
      const token = await getToken()
      const data = await uploadStoreImage(file, { token, type: 'banner', compress: false })
      const url = data?.url || data?.imageUrl
      if (!url) throw new Error('No image URL returned')
      apply(url)
      toast.success('Image uploaded')
    } catch (error) {
      toast.error(error?.message || 'Upload failed')
    } finally {
      setUploadingKey('')
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      await axios.put(
        '/api/store/mobile-features',
        { mobileFeatures: { shopBlocks: normalizeShopBlocks(form) } },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      toast.success('Shop blocks saved')
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

  const readySlides = form.slides.filter((slide) => slide.image).length

  const patchTile = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      tiles: prev.tiles.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }
  const patchSlide = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      slides: prev.slides.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/store/mobile-features" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} />
            Mobile
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Shop blocks</h1>
        </div>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800">Show on the app home</span>
              <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => setForm((prev) => ({ ...prev, enabled }))} />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Budget card</h2>
              <p className="mt-0.5 text-xs text-slate-500">The yellow card. Title on top, four images underneath.</p>
            </div>
            <label className="block text-xs font-medium text-slate-600">
              Title
              <input value={form.gridTitle} onChange={(event) => setForm((prev) => ({ ...prev, gridTitle: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-medium text-slate-600">
                Font
                <div className="mt-1">
                  <StoreDropdown
                    portal
                    value={form.gridTitleFont || 'inherit'}
                    onChange={(value) => setForm((prev) => ({ ...prev, gridTitleFont: value }))}
                    options={HERO_FONT_OPTIONS.map((font) => ({ value: font.id, label: font.label }))}
                  />
                </div>
              </label>
              <div className="text-xs font-medium text-slate-600">
                Style
                <div className="mt-1">
                  <ChoiceChips
                    value={form.gridTitleWeight || 'bold'}
                    options={[{ id: 'regular', label: 'Regular' }, { id: 'bold', label: 'Bold' }]}
                    onChange={(id) => setForm((prev) => ({ ...prev, gridTitleWeight: id }))}
                  />
                </div>
              </div>
              <div className="text-xs font-medium text-slate-600">
                Align
                <div className="mt-1">
                  <ChoiceChips
                    value={form.gridTitleAlign || 'center'}
                    options={[{ id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }, { id: 'right', label: 'Right' }]}
                    onChange={(id) => setForm((prev) => ({ ...prev, gridTitleAlign: id }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                Card color
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.gridBackground) ? form.gridBackground : '#f6c445'} onChange={(event) => setForm((prev) => ({ ...prev, gridBackground: event.target.value }))} className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white" />
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                Title color
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.gridTitleColor) ? form.gridTitleColor : '#5c3b16'} onChange={(event) => setForm((prev) => ({ ...prev, gridTitleColor: event.target.value }))} className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white" />
              </label>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {form.tiles.map((tile, index) => (
                <ImageSlot
                  key={tile.id}
                  label={`Image ${index + 1}`}
                  image={tile.image}
                  path={tile.path}
                  uploading={uploadingKey === tile.id}
                  onUpload={(file) => upload(file, tile.id, (url) => patchTile(index, { image: url }))}
                  onPath={(path) => patchTile(index, { path })}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Promo image</h2>
                <p className="mt-0.5 text-xs text-slate-500">Sits beside the budget card. Add a second image to make it slide.</p>
              </div>
              {readySlides > 1 ? (
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  Every
                  <input type="number" min={2} max={30} value={form.slideIntervalSeconds} onChange={(event) => setForm((prev) => ({ ...prev, slideIntervalSeconds: Number(event.target.value) || 4 }))} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                  sec
                </label>
              ) : null}
            </div>
            {form.slides.map((slide, index) => (
              <ImageSlot
                key={slide.id}
                label={`Promo ${index + 1}`}
                image={slide.image}
                path={slide.path}
                uploading={uploadingKey === slide.id}
                onUpload={(file) => upload(file, slide.id, (url) => patchSlide(index, { image: url }))}
                onPath={(path) => patchSlide(index, { path })}
                onRemove={form.slides.length > 1 ? () => setForm((prev) => ({ ...prev, slides: prev.slides.filter((_, itemIndex) => itemIndex !== index) })) : null}
              />
            ))}
            {form.slides.length < 8 ? (
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, slides: [...prev.slides, { id: `slide-${Date.now()}`, image: '', path: '/shop' }] }))} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Plus size={16} /> Add promo image
              </button>
            ) : null}
          </section>
        </div>
        <aside className="xl:sticky xl:top-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</p>
            <ShopPreview form={form} />
          </div>
        </aside>
      </div>
    </div>
  )
}
