'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { uploadStoreImage } from '@/lib/uploadStoreImage'
import { loaderMediaTypeFromFile } from '@/lib/mobileAppLoader'
import StoreDropdown from '@/components/store/StoreDropdown'
import MobilePathPicker from '@/components/store/MobilePathPicker'
import EnableSwitch from '@/components/store/EnableSwitch'
import {
  BANNER_HOME_SLOTS,
  HERO_FONT_OPTIONS,
  HERO_HOVER_OPTIONS,
  MOBILE_BANNER_SECTIONS,
  createEmptySlide,
  createEmptyTile,
  isHeroBannerSection,
} from '@/lib/mobileBannerLayout'
import { normalizeMobileFeatures } from '@/lib/mobileFeatures'
import MobileHomeBannerPreview, { HeroSliderPreview } from '@/components/store/MobileHomeBannerPreview'

const BANNER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024

const PLACE_X = [
  { id: 'left', label: 'Left' },
  { id: 'center', label: 'Center' },
  { id: 'right', label: 'Right' },
]
const PLACE_Y = [
  { id: 'top', label: 'Top' },
  { id: 'center', label: 'Middle' },
  { id: 'bottom', label: 'Bottom' },
]
const BUTTON_ALIGN = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
]

function ChoiceChips({ value, options, onChange }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            value === option.id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function HeroSlideFields({ item, onChange }) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label className="block text-xs font-medium text-slate-600">
        Video URL
        <input
          type="url"
          value={item.video || ''}
          onChange={(e) => onChange({ video: e.target.value, mediaType: e.target.value ? 'video' : 'image' })}
          placeholder="https://...mp4"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Subtitle
        <input
          type="text"
          value={item.subtitle || ''}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="text-xs font-medium text-slate-600">
          Text position
          <ChoiceChips value={item.contentPosition || 'left'} options={PLACE_X} onChange={(id) => onChange({ contentPosition: id })} />
        </div>
        <div className="text-xs font-medium text-slate-600">
          Vertical
          <ChoiceChips value={item.contentVertical || 'center'} options={PLACE_Y} onChange={(id) => onChange({ contentVertical: id })} />
        </div>
        <div className="text-xs font-medium text-slate-600">
          Text align
          <ChoiceChips value={item.textAlign || 'left'} options={PLACE_X} onChange={(id) => onChange({ textAlign: id })} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-600">
          Title color
          <input type="color" value={item.titleColor || '#ffffff'} onChange={(e) => onChange({ titleColor: e.target.value })} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white" />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Subtitle color
          <input type="color" value={item.subtitleColor || '#e2e8f0'} onChange={(e) => onChange({ subtitleColor: e.target.value })} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white" />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Title size
          <input type="number" min={16} max={64} value={item.titleSizePx ?? 32} onChange={(e) => onChange({ titleSizePx: Number(e.target.value) || 32 })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Subtitle size
          <input type="number" min={10} max={32} value={item.subtitleSizePx ?? 15} onChange={(e) => onChange({ subtitleSizePx: Number(e.target.value) || 15 })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
        </label>
      </div>
      <label className="block text-xs font-medium text-slate-600">
        Font
        <div className="mt-1">
          <StoreDropdown
            portal
            value={item.fontFamily || 'inherit'}
            onChange={(value) => onChange({ fontFamily: value })}
            options={HERO_FONT_OPTIONS.map((font) => ({ value: font.id, label: font.label }))}
          />
        </div>
      </label>
      <div className="text-xs font-medium text-slate-600">
        Hover animation
        <ChoiceChips
          value={item.hoverAnimation || 'none'}
          options={HERO_HOVER_OPTIONS}
          onChange={(id) => onChange({ hoverAnimation: id })}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-800">Show button</span>
        <EnableSwitch enabled={item.buttonEnabled === true} onChange={(enabled) => onChange({ buttonEnabled: enabled })} />
      </div>
      {item.buttonEnabled ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            Button text
            <input type="text" value={item.buttonText || ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </label>
          <div className="text-xs font-medium text-slate-600">
            Button align
            <ChoiceChips value={item.buttonAlign || 'left'} options={BUTTON_ALIGN} onChange={(id) => onChange({ buttonAlign: id })} />
          </div>
          <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
            Button path
            <div className="mt-1">
              <MobilePathPicker value={item.buttonPath || ''} onChange={(value) => onChange({ buttonPath: value })} />
            </div>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Button color
            <input type="color" value={item.buttonColor || '#f97316'} onChange={(e) => onChange({ buttonColor: e.target.value })} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white" />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Button text color
            <input type="color" value={item.buttonTextColor || '#ffffff'} onChange={(e) => onChange({ buttonTextColor: e.target.value })} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white" />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Button corner
            <input type="number" min={0} max={40} value={item.buttonRadiusPx ?? 8} onChange={(e) => onChange({ buttonRadiusPx: Number(e.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export default function MobileBannerSectionEditor({ sectionKey }) {
  const meta = MOBILE_BANNER_SECTIONS[sectionKey]
  const isHero = isHeroBannerSection(sectionKey)
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [allFeatures, setAllFeatures] = useState(() => normalizeMobileFeatures())
  const [form, setForm] = useState(() => normalizeMobileFeatures()[sectionKey])

  const listKey = meta?.listKey || 'slides'
  const items = Array.isArray(form?.[listKey]) ? form[listKey] : []
  const previewFeatures = {
    ...allFeatures,
    [sectionKey]: form,
  }

  const load = useCallback(async () => {
    if (!meta) return
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get('/api/store/mobile-features', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const normalized = normalizeMobileFeatures(data?.mobileFeatures)
      setAllFeatures(normalized)
      setForm(normalized[sectionKey])
    } catch (error) {
      console.error(error)
      toast.error(error?.response?.data?.error || 'Failed to load banner settings')
    } finally {
      setLoading(false)
    }
  }, [getToken, meta, sectionKey])

  useEffect(() => {
    load()
  }, [load])

  const updateItem = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      [listKey]: (prev[listKey] || []).map((item, i) => (
        i === index
          ? {
              ...item,
              ...patch,
              ...(patch.link != null || patch.path != null
                ? {
                    link: patch.link ?? patch.path ?? item.link,
                    path: patch.path ?? patch.link ?? item.path,
                  }
                : {}),
            }
          : item
      )),
    }))
  }

  const addItem = () => {
    setForm((prev) => {
      const current = prev[listKey] || []
      if (current.length >= meta.maxItems) return prev
      const nextItem = meta.isTiles
        ? createEmptyTile({ title: `Tile ${current.length + 1}` })
        : createEmptySlide({ title: `Slide ${current.length + 1}` })
      return { ...prev, [listKey]: [...current, nextItem] }
    })
  }

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      [listKey]: (prev[listKey] || []).filter((_, i) => i !== index),
    }))
  }

  const moveItem = (index, direction) => {
    setForm((prev) => {
      const list = [...(prev[listKey] || [])]
      const target = index + direction
      if (target < 0 || target >= list.length) return prev
      ;[list[index], list[target]] = [list[target], list[index]]
      return { ...prev, [listKey]: list }
    })
  }

  const uploadImage = async (index, file) => {
    if (!file) return
    const mediaType = isHero ? loaderMediaTypeFromFile(file) : 'image'
    const isVideo = mediaType === 'video'
    try {
      setUploadingIndex(index)
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again to upload')
        return
      }
      let uploadFile = file
      if (!isVideo) {
        uploadFile = await compressImageForUpload(file, {
          maxBytes: BANNER_UPLOAD_MAX_BYTES,
          maxWidth: 2048,
          maxHeight: 2048,
        })
        if (uploadFile.size > BANNER_UPLOAD_MAX_BYTES) {
          toast.error('Image is still over 4 MB after compression. Try a smaller file.')
          return
        }
      }
      const data = await uploadStoreImage(uploadFile, {
        token,
        type: 'banner',
        compress: false,
      })
      const url = data?.url || data?.imageUrl || data?.secure_url
      if (!url) throw new Error('No file URL returned')
      if (isVideo) updateItem(index, { video: url, mediaType: 'video' })
      else updateItem(index, { image: url, mediaType: 'image', video: '' })
      toast.success(`${isVideo ? 'Video' : 'Image'} ${index + 1} uploaded`)
    } catch (error) {
      console.error(error)
      toast.error(error?.response?.data?.error || error?.message || 'Upload failed')
    } finally {
      setUploadingIndex(null)
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      await axios.post(
        `/api/store/${meta.apiPath}`,
        isHero
          ? {
              ...form,
              heightPx: meta.frameHeight,
              ...(isHero ? { useWebsiteHomeBanners: false } : {}),
            }
          : form,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      toast.success(`${meta.label} saved`)
      await load()
    } catch (error) {
      console.error(error)
      toast.error(error?.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!meta) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-600">
        Unknown banner section.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    )
  }

  const itemLabel = meta.isTiles ? 'Tile' : 'Slide'

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/store/mobile-features"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} />
            Mobile Features
          </Link>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-sky-600" />
            <h1 className="text-2xl font-bold text-slate-900">{isHero ? 'Banners' : meta.label}</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isHero
              ? 'Four banners in different places on the app home. Banner 1 is the top hero.'
              : meta.description}
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      {isHero ? (
        <>
          <div className="flex flex-wrap gap-2">
            {BANNER_HOME_SLOTS.map((slot) => (
              <Link
                key={slot.key}
                href={slot.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  sectionKey === slot.key
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {slot.label}
              </Link>
            ))}
          </div>
          <HeroSliderPreview features={previewFeatures} activeKey={sectionKey} />
        </>
      ) : null}

      <div className={isHero ? 'space-y-6' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'}>
      <div className="space-y-6 min-w-0">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-800">
            <span>Show this section in the mobile app</span>
            <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => setForm((prev) => ({ ...prev, enabled }))} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            {meta.supportsInterval && items.filter((item) => item?.enabled !== false && (item.image || item.video)).length > 1 ? (
              <label className="inline-flex items-center gap-2">
                <span>Auto-slide (sec)</span>
                <input
                  type="number"
                  min={2}
                  max={30}
                  step={1}
                  value={form.slideIntervalSeconds ?? meta.defaultIntervalSeconds}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    slideIntervalSeconds: Number(e.target.value) || meta.defaultIntervalSeconds,
                  }))}
                  className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900"
                />
              </label>
            ) : null}

            {isHero ? (
              <span className="text-sm text-slate-600">Size {meta.frameWidth} × {meta.frameHeight}</span>
            ) : meta.supportsHeight ? (
              <label className="inline-flex items-center gap-2">
                <span>Height (px)</span>
                <input
                  type="number"
                  min={meta.minHeightPx}
                  max={meta.maxHeightPx}
                  step={1}
                  value={form.heightPx ?? meta.defaultHeightPx}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    heightPx: Number(e.target.value) || meta.defaultHeightPx,
                  }))}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900"
                />
                <span className="text-xs text-slate-400">
                  {meta.minHeightPx}–{meta.maxHeightPx}
                </span>
              </label>
            ) : (
              <span className="text-xs text-slate-500">Fixed 2-column tile layout</span>
            )}
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <ImagePlus className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">No {itemLabel.toLowerCase()}s yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add up to {meta.maxItems} items. Empty or disabled sections are hidden in the app.
            </p>
            <button
              type="button"
              onClick={addItem}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <Plus size={16} />
              Add {itemLabel.toLowerCase()}
            </button>
          </div>
        ) : (
          items.map((item, index) => (
            <section
              key={item.id || index}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  {itemLabel} {index + 1}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    title="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    title="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <EnableSwitch enabled={item.enabled !== false} onChange={(enabled) => updateItem(index, { enabled })} />
                  {meta.supportsAdBadge ? (
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">Ad badge</span>
                      <EnableSwitch enabled={Boolean(item.showAdBadge)} onChange={(enabled) => updateItem(index, { showAdBadge: enabled })} />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {isHero && item.mediaType === 'video' && item.video ? (
                    <video src={item.video} className="aspect-[16/9] w-full object-cover" muted playsInline autoPlay loop />
                  ) : item.image ? (
                    <img
                      src={item.image}
                      alt={item.alt || item.title || `${itemLabel} ${index + 1}`}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center text-xs text-slate-400">
                      No file
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center justify-center gap-2 border-t border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">
                    {uploadingIndex === index ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    {isHero ? 'Upload image or video' : 'Upload'}
                    <input
                      type="file"
                      accept={isHero ? 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov' : 'image/*'}
                      className="hidden"
                      disabled={uploadingIndex === index}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (file) uploadImage(index, file)
                      }}
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {isHero ? null : (
                  <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                    Image URL
                    <input
                      type="url"
                      value={item.image || ''}
                      onChange={(e) => updateItem(index, { image: e.target.value })}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  )}
                  <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                    {isHero ? 'Banner path' : 'Link / path'}
                    <input
                      type="text"
                      value={item.link || item.path || ''}
                      onChange={(e) => updateItem(index, { link: e.target.value, path: e.target.value })}
                      placeholder="/offers or https://..."
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className={`block text-xs font-medium text-slate-600 ${isHero ? 'sm:col-span-2' : ''}`}>
                    {isHero ? 'Main title' : 'Title'}
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => updateItem(index, { title: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  {meta.isTiles ? (
                    <>
                      <label className="block text-xs font-medium text-slate-600">
                        Subtitle
                        <input
                          type="text"
                          value={item.subtitle || ''}
                          onChange={(e) => updateItem(index, { subtitle: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        />
                      </label>
                      <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                        Button text
                        <input
                          type="text"
                          value={item.buttonText || ''}
                          onChange={(e) => updateItem(index, { buttonText: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        />
                      </label>
                    </>
                  ) : isHero ? null : (
                    <label className="block text-xs font-medium text-slate-600">
                      Alt text
                      <input
                        type="text"
                        value={item.alt || ''}
                        onChange={(e) => updateItem(index, { alt: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                  )}
                </div>
                {isHero ? (
                  <div className="sm:col-span-2">
                    <HeroSlideFields item={item} onChange={(patch) => updateItem(index, patch)} />
                  </div>
                ) : null}
              </div>
            </section>
          ))
        )}
      </div>

      {items.length > 0 && items.length < meta.maxItems ? (
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
        >
          <Plus size={16} />
          Add {itemLabel.toLowerCase()}
        </button>
      ) : null}
      </div>

      {isHero ? null : (
      <aside className="space-y-4 lg:sticky lg:top-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <MobileHomeBannerPreview
            features={previewFeatures}
            highlightSectionKey={sectionKey}
            compact
          />
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Live preview updates as you edit. Save to push to the app APIs.
          </p>
        </div>
      </aside>
      )}
      </div>
    </div>
  )
}
