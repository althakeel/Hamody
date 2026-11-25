'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Loader2, Save, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'
import { hasShowcaseBannerImage, serializeShowcaseImageFields } from '@/lib/showcaseBannerImages'
import { uploadShowcaseBannerOriginal } from '@/lib/uploadShowcaseBanner'
import { inferShowcaseLinkType, normalizeShowcaseLinkType } from '@/lib/showcaseBannerLinks'
import {
  AccordionRow,
  ShowcaseLinkAccordion,
  ShowcaseLocaleImageGroups,
} from '@/components/store/preferences/bannerEditorShared'
import BrandsBannerCatalogSettings from '@/components/store/preferences/BrandsBannerCatalogSettings'

const sanitizeImageUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const withoutPathTransform = raw.replace(/\/tr:[^/]+\//i, '/')
  try {
    const url = new URL(withoutPathTransform)
    if (url.searchParams.has('tr')) {
      url.searchParams.delete('tr')
    }
    return url.toString()
  } catch {
    return withoutPathTransform
  }
}

function sanitizeImageFields(item = {}) {
  return {
    image: sanitizeImageUrl(item.image || ''),
    tabletImage: sanitizeImageUrl(item.tabletImage || ''),
    mobileImage: sanitizeImageUrl(item.mobileImage || ''),
    imageAr: sanitizeImageUrl(item.imageAr || ''),
    tabletImageAr: sanitizeImageUrl(item.tabletImageAr || ''),
    mobileImageAr: sanitizeImageUrl(item.mobileImageAr || ''),
  }
}

const IMAGE_SIZES = {
  image: { width: 1600, height: 500 },
  tabletImage: { width: 1280, height: 400 },
  mobileImage: { width: 800, height: 250 },
  imageAr: { width: 1600, height: 500 },
  tabletImageAr: { width: 1280, height: 400 },
  mobileImageAr: { width: 800, height: 250 },
}

const createBannerItem = (overrides = {}) => ({
  id: overrides.id || `brands-banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  ...serializeShowcaseImageFields(sanitizeImageFields(overrides)),
  link: overrides.linkType === 'none' ? '' : (overrides.link || ''),
  linkType: normalizeShowcaseLinkType(overrides.linkType)
    || inferShowcaseLinkType(overrides.link || '').type,
  targetBlank: Boolean(overrides.targetBlank),
  alt: overrides.alt || '',
})

const DEFAULT_FORM = {
  enabled: false,
  desktopInterval: 4000,
  mobileInterval: 3000,
  desktopHeight: 220,
  mobileHeight: 120,
  items: [createBannerItem({ id: 'brands-banner-1', alt: 'Banner 1' })],
  categoryIds: [],
  productIds: [],
  productsTitle: '',
  productsTitleAr: '',
}

function idList(value, limit) {
  return Array.from(new Set(
    (Array.isArray(value) ? value : [])
      .map((id) => String(id || '').trim())
      .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
  )).slice(0, limit)
}

function getSlideImageCount(item) {
  return ['image', 'tabletImage', 'mobileImage', 'imageAr', 'tabletImageAr', 'mobileImageAr']
    .filter((key) => String(item?.[key] || '').trim())
    .length
}

export default function BrandsBannerEditor({ embedded = false }) {
  const { user, loading: authLoading, getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loadedShowcase, setLoadedShowcase] = useState({})
  const [categoryOptions, setCategoryOptions] = useState([])
  const [productOptions, setProductOptions] = useState([])
  const [openSlideId, setOpenSlideId] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const res = await axios.get('/api/store/preferences/shop-showcase', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const savedItems = Array.isArray(res.data?.shopShowcase?.brandsBannerItems)
        ? res.data.shopShowcase.brandsBannerItems
        : []
      const hasSavedImage = savedItems.some((item) => hasShowcaseBannerImage(item))
      const hidden = res.data?.shopShowcase?.brandsBannerHidden === true

      setLoadedShowcase(res.data?.shopShowcase || {})
      setForm({
        enabled: hidden ? false : (hasSavedImage || res.data?.shopShowcase?.brandsBannerEnabled === true),
        desktopInterval: Number(res.data?.shopShowcase?.brandsBannerDesktopInterval || 4000),
        mobileInterval: Number(res.data?.shopShowcase?.brandsBannerMobileInterval || 3000),
        desktopHeight: Number(res.data?.shopShowcase?.brandsBannerDesktopHeight || 220),
        mobileHeight: Number(res.data?.shopShowcase?.brandsBannerMobileHeight || 120),
        items: (savedItems.length ? savedItems : [{}]).map((current, index) => createBannerItem({
          ...current,
          id: current.id || `brands-banner-${index + 1}`,
          alt: current.alt || `Banner ${index + 1}`,
        })),
        categoryIds: idList(res.data?.shopShowcase?.brandsBannerCategoryIds, 40),
        productIds: idList(res.data?.shopShowcase?.brandsBannerProductIds, 18),
        productsTitle: String(res.data?.shopShowcase?.brandsBannerProductsTitle || ''),
        productsTitleAr: String(res.data?.shopShowcase?.brandsBannerProductsTitleAr || ''),
      })
    } catch (error) {
      toast.error('Failed to load the Top Brands banner')
      console.error(error)
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
    loadData()
  }, [authLoading, user])

  useEffect(() => {
    let active = true

    const loadLinkTargets = async () => {
      try {
        const token = await getToken()
        const [categoriesRes, productsRes] = await Promise.all([
          axios.get('/api/store/categories', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).catch(() => ({ data: { categories: [] } })),
          fetch('/api/products?limit=400&slim=true', { cache: 'no-store' }),
        ])
        const categoriesData = categoriesRes?.data || {}
        const productsData = productsRes.ok ? await productsRes.json() : { products: [] }
        if (!active) return
        setCategoryOptions(Array.isArray(categoriesData?.categories) ? categoriesData.categories : [])
        setProductOptions(Array.isArray(productsData?.products) ? productsData.products : [])
      } catch {
        if (!active) return
        setCategoryOptions([])
        setProductOptions([])
      }
    }

    loadLinkTargets()
    return () => {
      active = false
    }
  }, [getToken])

  const updateItem = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }))
  }

  const uploadItemField = async (index, field, file) => {
    if (!file) return

    try {
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again to upload the banner')
        return
      }

      const url = sanitizeImageUrl(await uploadShowcaseBannerOriginal(file, token))
      updateItem(index, field, url)
      setForm((prev) => ({ ...prev, enabled: true }))
      toast.success('Image uploaded')
    } catch (error) {
      toast.error(error?.message || 'Banner upload failed')
      console.error(error)
    }
  }

  const addItem = () => {
    setForm((prev) => {
      if (prev.items.length >= 6) return prev
      const nextItem = createBannerItem({ alt: `Banner ${prev.items.length + 1}` })
      setOpenSlideId(nextItem.id)
      return { ...prev, items: [...prev.items, nextItem] }
    })
  }

  const removeItem = (index) => {
    setForm((prev) => {
      const removed = prev.items[index]
      const items = prev.items.filter((_, itemIndex) => itemIndex !== index)
      if (removed?.id && openSlideId === removed.id) setOpenSlideId(null)
      return { ...prev, items: items.length ? items : [createBannerItem({ alt: 'Banner 1' })] }
    })
  }

  const save = async () => {
    if (!user) {
      toast.error('Please sign in first')
      return
    }

    try {
      setSaving(true)
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again to save the banners')
        return
      }

      const brandsBannerItems = form.items.map((item, index) => {
        const images = serializeShowcaseImageFields(sanitizeImageFields(item))
        return {
          id: item.id,
          ...images,
          link: normalizeShowcaseLinkType(item.linkType) === 'none' ? '' : String(item.link || '').trim(),
          linkType: normalizeShowcaseLinkType(item.linkType) || inferShowcaseLinkType(item.link).type,
          targetBlank: Boolean(item.targetBlank),
          alt: String(item.alt || `Banner ${index + 1}`).trim(),
        }
      })

      const response = await axios.put('/api/store/preferences/shop-showcase', {
        ...loadedShowcase,
        brandsBannerEnabled: !!form.enabled,
        brandsBannerHidden: !form.enabled,
        brandsBannerDesktopInterval: Number(form.desktopInterval || 4000),
        brandsBannerMobileInterval: Number(form.mobileInterval || 3000),
        brandsBannerDesktopHeight: Number(form.desktopHeight || 220),
        brandsBannerMobileHeight: Number(form.mobileHeight || 120),
        brandsBannerItems,
        brandsBannerCategoryIds: idList(form.categoryIds, 40),
        brandsBannerProductIds: idList(form.productIds, 18),
        brandsBannerProductsTitle: String(form.productsTitle || '').trim().slice(0, 80),
        brandsBannerProductsTitleAr: String(form.productsTitleAr || '').trim().slice(0, 80),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setLoadedShowcase(response.data?.shopShowcase || loadedShowcase)
      toast.success('Banners saved. They appear on the homepage just before Top Brands.')
      await loadData()
    } catch (error) {
      toast.error('Failed to save the banners')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5" />
          <div>
            <h2 className="text-xl font-semibold">Sign in required</h2>
            <p className="mt-2 text-sm text-amber-900/80">Please sign in with your store account to edit these banners.</p>
            <Link href="/store/login" className="mt-4 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
              Go to Store Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Banners before Top Brands</h2>
            <p className="mt-1 text-sm text-slate-600">
              These slides sit on the homepage immediately before the Top Brands row. Upload the banners, connect categories, and choose the products customers see under the banner.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.enabled}
              onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-slate-700">Show on homepage</span>
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Banner size</h3>
          <p className="mt-1 text-sm text-slate-600">
            Width 1600 px · Height 500 px · Ratio 16:5. The homepage banner before Top Brands keeps this ratio.
          </p>
          <div
            className="mt-4 w-full max-w-xl overflow-hidden rounded-md border border-slate-200 bg-slate-100"
            style={{ aspectRatio: '1600 / 500' }}
          >
            <div className="flex h-full items-center justify-center text-[10px] font-medium uppercase tracking-wide text-slate-500">
              16:5
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Desktop slide interval (ms)</span>
            <input
              type="number"
              min="1500"
              max="15000"
              step="500"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              value={form.desktopInterval}
              onChange={(event) => setForm((prev) => ({ ...prev, desktopInterval: Number(event.target.value) || 4000 }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Mobile slide interval (ms)</span>
            <input
              type="number"
              min="1500"
              max="15000"
              step="500"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              value={form.mobileInterval}
              onChange={(event) => setForm((prev) => ({ ...prev, mobileInterval: Number(event.target.value) || 3000 }))}
            />
          </label>
        </div>

        <BrandsBannerCatalogSettings
          categories={categoryOptions}
          categoryIds={form.categoryIds}
          productIds={form.productIds}
          productsTitle={form.productsTitle}
          productsTitleAr={form.productsTitleAr}
          getToken={getToken}
          onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
        />

        <div className="space-y-3">
          {form.items.map((item, index) => {
            const slideId = item.id || `brands-banner-${index}`
            const isOpen = openSlideId === slideId
            const imageCount = getSlideImageCount(item)
            const linkLabel = item.link || 'No link'

            return (
              <AccordionRow
                key={slideId}
                title={`Banner ${index + 1}`}
                summary={`${imageCount} of 6 images · ${linkLabel}${item.targetBlank ? ' · new window' : ''} · click to ${isOpen ? 'hide' : 'edit'}`}
                open={isOpen}
                onToggle={() => setOpenSlideId((current) => (current === slideId ? null : slideId))}
                actions={(
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Remove
                  </button>
                )}
              >
                <div className="space-y-3">
                  <ShowcaseLocaleImageGroups
                    item={item}
                    recommendedSizes={IMAGE_SIZES}
                    onUpload={(field, file) => uploadItemField(index, field, file)}
                    onChange={(field, value) => updateItem(index, field, value)}
                  />
                  <ShowcaseLinkAccordion
                    link={item.link}
                    linkType={item.linkType}
                    targetBlank={item.targetBlank}
                    categories={categoryOptions}
                    products={productOptions}
                    onLinkChange={(value) => updateItem(index, 'link', value)}
                    onLinkTypeChange={(value) => updateItem(index, 'linkType', value)}
                    onTargetBlankChange={(value) => updateItem(index, 'targetBlank', value)}
                  />
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Alt text</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={item.alt}
                      onChange={(event) => updateItem(index, 'alt', event.target.value)}
                    />
                  </label>
                </div>
              </AccordionRow>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addItem}
          disabled={form.items.length >= 6}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add banner
        </button>

        <div className="flex justify-end border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
