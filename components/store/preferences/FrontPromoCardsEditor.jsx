'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Loader2, Plus, Save, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'
import { uploadStoreImage } from '@/lib/uploadStoreImage'
import { normalizeFrontPromoCards } from '@/lib/frontPromoCards'

const IMAGE_FIELDS = [
  'image',
  'wideImage',
  'tabletImage',
  'mobileImage',
  'imageAr',
  'wideImageAr',
  'tabletImageAr',
  'mobileImageAr',
]

function emptySlide(index) {
  return {
    id: `full-width-large-banner-${index + 1}`,
    image: '',
    link: '/shop',
    alt: `Banner ${index + 1}`,
  }
}

function previewUrl(slide) {
  return IMAGE_FIELDS.map((field) => String(slide?.[field] || '').trim()).find(Boolean) || ''
}

function hasImage(slide) {
  return Boolean(previewUrl(slide))
}

function slideFromSaved(item, index) {
  const slide = emptySlide(index)
  slide.id = String(item?.id || slide.id)
  slide.link = String(item?.link || '/shop')
  slide.alt = String(item?.alt || slide.alt)
  slide.linkType = String(item?.linkType || '')
  slide.targetBlank = Boolean(item?.targetBlank)
  IMAGE_FIELDS.forEach((field) => {
    slide[field] = String(item?.[field] || '')
  })
  return slide
}

export default function FrontPromoCardsEditor() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState('')
  const [slides, setSlides] = useState([emptySlide(0)])
  const [cards, setCards] = useState(() => normalizeFrontPromoCards())

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const response = await axios.get('/api/store/preferences/shop-showcase', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const showcase = response.data?.shopShowcase || {}
      const savedSlides = Array.isArray(showcase.fullWidthBannerSliderItems)
        ? showcase.fullWidthBannerSliderItems.map(slideFromSaved).filter(hasImage)
        : []
      if (!savedSlides.length && showcase.fullWidthBannerImage) {
        savedSlides.push(slideFromSaved({
          image: showcase.fullWidthBannerImage,
          link: showcase.fullWidthBannerLink,
          alt: 'Banner 1',
        }, 0))
      }
      setSlides(savedSlides.length ? savedSlides : [emptySlide(0)])
      setCards(normalizeFrontPromoCards(showcase.frontPromoCards))
    } catch (error) {
      toast.error('Failed to load homepage front')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateSlide = (index, patch) => {
    setSlides((current) => current.map((slide, slideIndex) => (
      slideIndex === index ? { ...slide, ...patch } : slide
    )))
  }

  const updateCard = (index, patch) => {
    setCards((current) => current.map((card, cardIndex) => (
      cardIndex === index ? { ...card, ...patch } : card
    )))
  }

  const uploadFile = async (key, file, onUrl) => {
    if (!file) return
    try {
      setUploadingKey(key)
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again to upload')
        return
      }
      const data = await uploadStoreImage(file, { token, type: 'banner', compress: true })
      const url = String(data?.url || '').trim()
      if (!url) throw new Error('Upload did not return an image URL')
      onUrl(url)
      toast.success('Image uploaded')
    } catch (error) {
      toast.error('Failed to upload image')
      console.error(error)
    } finally {
      setUploadingKey('')
    }
  }

  const saveFront = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const bannerSlides = slides
        .filter(hasImage)
        .slice(0, 8)
        .map((slide, index) => ({
          ...slide,
          id: slide.id || `full-width-large-banner-${index + 1}`,
          link: String(slide.link || '/shop').trim() || '/shop',
          alt: String(slide.alt || `Banner ${index + 1}`).trim(),
        }))
      const first = bannerSlides[0]

      await axios.put(
        '/api/store/preferences/shop-showcase',
        {
          fullWidthBannerEnabled: bannerSlides.length > 0,
          fullWidthBannerSliderEnabled: true,
          fullWidthBannerSliderItems: bannerSlides,
          fullWidthBannerImage: first ? previewUrl(first) : '',
          fullWidthBannerLink: first?.link || '/shop',
          frontPromoCards: normalizeFrontPromoCards(cards),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Homepage front saved')
      await loadData()
    } catch (error) {
      toast.error('Failed to save homepage front')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }

  const busy = saving || uploadingKey !== ''

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Homepage front</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload the top banner slider and the four cards under it. On a phone the cards show two at a time. Save after you upload.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Top banner slider</h3>
        <p className="mt-1 text-sm text-slate-600">Wide images. They rotate at the top of the homepage.</p>
        <div className="mt-4 space-y-4">
          {slides.map((slide, index) => {
            const uploadKey = `slide-${index}`
            return (
              <div key={slide.id || uploadKey} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Slide {index + 1}</div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"
                    onClick={() => setSlides((current) => {
                      const next = current.filter((_, slideIndex) => slideIndex !== index)
                      return next.length ? next : [emptySlide(0)]
                    })}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
                <div className="mb-3 overflow-hidden rounded-xl bg-slate-100">
                  {previewUrl(slide) ? (
                    <img src={previewUrl(slide)} alt={slide.alt || `Slide ${index + 1}`} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="flex h-36 items-center justify-center text-sm text-slate-400">No image</div>
                  )}
                </div>
                <label className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {uploadingKey === uploadKey ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploadingKey === uploadKey ? 'Uploading…' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingKey === uploadKey}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      uploadFile(uploadKey, file, (url) => updateSlide(index, { image: url }))
                    }}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700">Link</span>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={slide.link}
                      onChange={(event) => updateSlide(index, { link: event.target.value })}
                      placeholder="/shop"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700">Image description</span>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={slide.alt}
                      onChange={(event) => updateSlide(index, { alt: event.target.value })}
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          disabled={slides.length >= 8}
          onClick={() => setSlides((current) => [...current, emptySlide(current.length)])}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus size={16} />
          Add slide
        </button>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Cards under the banner</h3>
          <p className="mt-1 text-sm text-slate-600">Portrait images, about 819×1024. Four cards.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card, index) => {
            const uploadKey = `card-${index}`
            return (
              <div key={`front-promo-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-900">Card {index + 1}</div>
                <div className="mb-3 overflow-hidden rounded-xl bg-slate-100">
                  {card.image ? (
                    <img src={card.image} alt={card.alt || `Card ${index + 1}`} className="aspect-[4/5] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/5] items-center justify-center text-sm text-slate-400">No image</div>
                  )}
                </div>
                <label className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {uploadingKey === uploadKey ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploadingKey === uploadKey ? 'Uploading…' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingKey === uploadKey}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      uploadFile(uploadKey, file, (url) => updateCard(index, { image: url }))
                    }}
                  />
                </label>
                <label className="mb-3 block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Link</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={card.link}
                    onChange={(event) => updateCard(index, { link: event.target.value })}
                    placeholder="/category/camping"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Image description</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={card.alt}
                    onChange={(event) => updateCard(index, { alt: event.target.value })}
                  />
                </label>
              </div>
            )
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={saveFront}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save homepage front
      </button>
    </div>
  )
}
