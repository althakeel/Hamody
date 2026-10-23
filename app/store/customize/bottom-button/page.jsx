'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, ImagePlus, Languages, Loader2, Percent, Save, X } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import BusyButtonIcon from '@/components/store/BusyButtonIcon'
import StoreDropdown from '@/components/store/StoreDropdown'
import { slugifyCategory } from '@/lib/categorySlug'
import { flattenShowcaseCategories } from '@/lib/showcaseBannerLinks'
import {
  BOTTOM_NAV_ACCOUNT_OPTIONS,
  BOTTOM_NAV_LINK_TYPES,
  BOTTOM_NAV_PAGE_OPTIONS,
  createBottomNavLink,
  readBottomNavLinkChoice,
} from '@/lib/bottomNavLinkChoices'
import {
  DEFAULT_OFFERS_PAGE,
  OFFERS_NAV_ANIMATION_OPTIONS,
  normalizeOffersPage,
  readBottomNavSettings,
  splitOffersNavLabel,
} from '@/lib/offersPageSettings'

export default function BottomButtonCustomizePage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [translatingBelow, setTranslatingBelow] = useState(false)
  const [offersPage, setOffersPage] = useState(DEFAULT_OFFERS_PAGE)
  const [linkType, setLinkType] = useState('page')
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [products, setProducts] = useState([])
  const [landingPages, setLandingPages] = useState([])

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get('/api/store/appearance/sections', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const nextPage = normalizeOffersPage(data?.offersPage || DEFAULT_OFFERS_PAGE)
      setOffersPage(nextPage)
      setLinkType(readBottomNavLinkChoice(nextPage.bottomNavHref).type)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load the bottom button')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    let active = true
    const loadTargets = async () => {
      try {
        const token = await getToken()
        const headers = { Authorization: `Bearer ${token}` }
        const [categoryRes, brandRes, productRes, landingRes] = await Promise.all([
          axios.get('/api/categories'),
          axios.get('/api/store/brands', { headers }),
          axios.get('/api/store/product', {
            headers,
            params: { page: 1, limit: 500, manage: 'true', sort: 'name' },
          }),
          axios.get('/api/store/email-marketing/pages', { headers }),
        ])
        if (!active) return
        setCategories(Array.isArray(categoryRes.data?.categories) ? categoryRes.data.categories : [])
        setBrands(Array.isArray(brandRes.data?.brands) ? brandRes.data.brands : [])
        setProducts(Array.isArray(productRes.data?.products) ? productRes.data.products : [])
        setLandingPages(Array.isArray(landingRes.data?.pages) ? landingRes.data.pages : [])
      } catch (error) {
        console.error(error)
      }
    }
    void loadTargets()
    return () => {
      active = false
    }
  }, [getToken])

  const categoryOptions = useMemo(
    () => flattenShowcaseCategories(categories).map((category) => ({
      value: category.slug,
      label: category.label,
    })),
    [categories],
  )
  const brandOptions = useMemo(() => {
    const seen = new Set()
    return brands.flatMap((brand) => {
      const name = String(brand?.name || '').trim()
      const slug = slugifyCategory(name)
      if (!name || !slug || seen.has(slug)) return []
      seen.add(slug)
      return [{ value: slug, label: name }]
    })
  }, [brands])
  const productOptions = useMemo(() => products.flatMap((product) => {
    const slug = String(product?.slug || '').trim()
    const name = String(product?.name || slug).trim()
    if (!slug) return []
    return [{ value: slug, label: name }]
  }), [products])
  const landingOptions = useMemo(() => landingPages.flatMap((page) => {
    const slug = String(page?.slug || '').trim()
    if (!slug) return []
    const title = String(page?.title || slug).trim()
    const status = page?.status === 'published' ? 'Published' : 'Draft'
    return [{ value: slug, label: `${title} · ${status}` }]
  }), [landingPages])
  const linkChoice = readBottomNavLinkChoice(offersPage.bottomNavHref)
  const activeLinkType = linkType || linkChoice.type

  const patch = (next) => {
    setOffersPage((prev) => ({ ...prev, ...next }))
  }

  const uploadImage = async (file) => {
    if (!file) return
    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Choose an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2MB or smaller')
      return
    }

    try {
      setUploading(true)
      const token = await getToken()
      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', 'offers-nav')
      const { data } = await axios.post('/api/store/upload-image', formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const url = String(data?.url || '').trim()
      if (!url) throw new Error('Upload returned no URL')
      patch({ bottomNavMode: 'image', bottomNavImageUrl: url })
      toast.success('Image uploaded. Save to publish.')
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const translateBelowToArabic = async () => {
    const english = String(offersPage.bottomNavBelowText || '').trim()
    if (!english) {
      toast.error('Enter the English text below the circle first')
      return
    }

    try {
      setTranslatingBelow(true)
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again')
        return
      }
      const { data } = await axios.post(
        '/api/store/categories/translate-arabic',
        { text: english },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const translated = String(data?.descriptionAr || '').replace(/\s+/g, ' ').trim().slice(0, 24)
      if (!translated) {
        toast.error('Could not translate to Arabic')
        return
      }
      patch({ bottomNavBelowTextAr: translated })
      toast.success('Arabic text updated')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to translate to Arabic')
    } finally {
      setTranslatingBelow(false)
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const payload = normalizeOffersPage(offersPage)
      await axios.post('/api/store/appearance/sections', {
        offersPage: payload,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const bottomNav = readBottomNavSettings(payload)
      try {
        window.localStorage.setItem('offersNavLabelCache', JSON.stringify({
          en: payload.navLabel,
          ar: payload.navLabelAr,
          style: payload.navStyle,
          gif: payload.navGifUrl,
          bottomNav,
        }))
        window.dispatchEvent(new CustomEvent('offersNavLabelUpdated', {
          detail: {
            en: payload.navLabel,
            ar: payload.navLabelAr,
            style: payload.navStyle,
            gif: payload.navGifUrl,
            bottomNav,
          },
        }))
      } catch {
        // Ignore cache failures.
      }
      setOffersPage(payload)
      toast.success('Mobile bottom button saved')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save the bottom button')
    } finally {
      setSaving(false)
    }
  }

  const appearance = readBottomNavSettings(offersPage)
  const caption = appearance.belowText ? splitOffersNavLabel(appearance.belowText) : { top: '', bottom: '' }
  const showImage = appearance.mode === 'image' && appearance.imageUrl
  const showText = appearance.mode === 'text' && Boolean(appearance.circleText)

  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/store/customize"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Customize
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Mobile bottom button</h1>
          <p className="mt-1 text-sm text-slate-500">
            The raised circle on phones. Set the image or text, the link, the background color, and the animation.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
      </div>

      {loading ? (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-hidden="true">
          <div className="flex items-end justify-center rounded-xl border border-slate-200 bg-slate-50 py-6">
            <div className="flex flex-col items-center">
              <span className="h-[46px] w-[46px] animate-pulse rounded-full bg-slate-200" />
              <span className="mt-2 h-2 w-10 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="flex gap-2">
            <span className="h-8 w-24 animate-pulse rounded-lg bg-slate-200" />
            <span className="h-8 w-24 animate-pulse rounded-lg bg-slate-200" />
            <span className="h-8 w-24 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <span className="block h-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="grid gap-4 sm:grid-cols-2">
            <span className="block h-10 animate-pulse rounded-xl bg-slate-100" />
            <span className="block h-10 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <span className="block h-10 w-40 animate-pulse rounded-xl bg-slate-100" />
          <span className="block h-10 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-end justify-center rounded-xl border border-slate-200 bg-slate-50 py-6">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-full ring-[3px] ring-white ${appearance.animationClass || ''}`}
                style={{
                  background: showImage ? appearance.backgroundColor : appearance.background,
                  boxShadow: `0 4px 14px ${appearance.shadow}`,
                }}
              >
                {showImage ? (
                  <img src={appearance.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : showText ? (
                  <span className="max-w-[40px] truncate px-1 text-center text-[11px] font-extrabold leading-none text-white">
                    {appearance.circleText}
                  </span>
                ) : (
                  <Percent size={21} color="#ffffff" strokeWidth={2.5} />
                )}
              </span>
              {caption.top ? (
                <span
                  className="mt-1 text-center text-[8px] font-semibold leading-tight"
                  style={{ color: appearance.labelColor }}
                >
                  {caption.top}
                  {caption.bottom ? <><br />{caption.bottom}</> : null}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'icon', label: 'Percent icon' },
              { id: 'image', label: 'Round image' },
              { id: 'text', label: 'Circle text' },
            ].map((option) => {
              const active = appearance.mode === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => patch({ bottomNavMode: option.id })}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {appearance.mode === 'image' ? (
            <div className="flex items-center gap-3">
              {appearance.imageUrl ? (
                <span className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  <img src={appearance.imageUrl} alt="" className="h-full w-full object-cover" />
                </span>
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400">
                  <ImagePlus size={18} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
                  <BusyButtonIcon busy={uploading} icon={ImagePlus} size={12} />
                  {uploading ? 'Uploading...' : appearance.imageUrl ? 'Replace image' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg,image/gif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      uploadImage(file)
                    }}
                  />
                </label>
                {appearance.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => patch({ bottomNavImageUrl: '' })}
                    className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600"
                  >
                    <X size={12} />
                    Remove
                  </button>
                ) : null}
                <p className="mt-1 text-[11px] text-slate-400">Square image works best. It is cropped into a circle. Max 2MB.</p>
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Text inside the circle</span>
            <input
              type="text"
              value={offersPage.bottomNavCircleText || ''}
              maxLength={12}
              onChange={(event) => {
                const value = event.target.value.slice(0, 12)
                patch({
                  bottomNavCircleText: value,
                  bottomNavMode: value.trim()
                    ? 'text'
                    : (offersPage.bottomNavMode === 'text' ? 'icon' : offersPage.bottomNavMode),
                })
              }}
              placeholder="10:10"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              White text in the circle, up to 12 characters. Leave blank to keep the percent icon. You can use this together with the text below.
            </p>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Text below the circle (English)</span>
              <input
                type="text"
                value={offersPage.bottomNavBelowText || ''}
                maxLength={24}
                onChange={(event) => patch({ bottomNavBelowText: event.target.value.slice(0, 24) })}
                placeholder="10:10"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">Text below the circle (Arabic)</span>
                <button
                  type="button"
                  onClick={translateBelowToArabic}
                  disabled={translatingBelow || !String(offersPage.bottomNavBelowText || '').trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <BusyButtonIcon busy={translatingBelow} icon={Languages} size={12} />
                  {translatingBelow ? 'Translating...' : 'Translate'}
                </button>
              </span>
              <input
                type="text"
                dir="rtl"
                value={offersPage.bottomNavBelowTextAr || ''}
                maxLength={24}
                onChange={(event) => patch({ bottomNavBelowTextAr: event.target.value.slice(0, 24) })}
                placeholder="١٠:١٠"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
          <p className="-mt-3 text-[11px] text-slate-400">
            Sits under the circle, like 10:10. Leave both fields blank and nothing shows below the circle. A space makes two lines, such as UNDER 99.
          </p>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Background color</span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={appearance.backgroundColor}
                onChange={(event) => patch({ bottomNavBackgroundColor: event.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                aria-label="Background color"
              />
              <input
                type="text"
                value={offersPage.bottomNavBackgroundColor || appearance.backgroundColor}
                onChange={(event) => patch({ bottomNavBackgroundColor: event.target.value })}
                className="w-32 rounded-xl border border-slate-200 px-3 py-2.5 text-sm uppercase focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Fills the circle. The words under it use the same color.</p>
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Animation</span>
            <div className="flex flex-wrap gap-1.5">
              {OFFERS_NAV_ANIMATION_OPTIONS.map((option) => {
                const active = appearance.animation === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => patch({ bottomNavAnimation: option.id })}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Link</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <StoreDropdown
                value={activeLinkType}
                onChange={(type) => setLinkType(type)}
                options={BOTTOM_NAV_LINK_TYPES}
                placeholder="Choose what to open"
              />
              {activeLinkType === 'page' ? (
                <StoreDropdown
                  searchable
                  value={linkChoice.type === 'page' ? linkChoice.value : ''}
                  onChange={(value) => {
                    setLinkType('page')
                    patch({ bottomNavHref: createBottomNavLink('page', value) })
                  }}
                  options={BOTTOM_NAV_PAGE_OPTIONS}
                  placeholder="Select a page"
                  searchPlaceholder="Search pages"
                />
              ) : null}
              {activeLinkType === 'account' ? (
                <StoreDropdown
                  searchable
                  value={linkChoice.type === 'account' ? linkChoice.value : ''}
                  onChange={(value) => {
                    setLinkType('account')
                    patch({ bottomNavHref: createBottomNavLink('account', value) })
                  }}
                  options={BOTTOM_NAV_ACCOUNT_OPTIONS}
                  placeholder="Select an account page"
                  searchPlaceholder="Search account pages"
                />
              ) : null}
              {activeLinkType === 'category' ? (
                <StoreDropdown
                  searchable
                  value={linkChoice.type === 'category' ? linkChoice.value : ''}
                  onChange={(value) => {
                    setLinkType('category')
                    patch({ bottomNavHref: createBottomNavLink('category', value) })
                  }}
                  options={categoryOptions}
                  placeholder="Select a category"
                  searchPlaceholder="Search categories"
                />
              ) : null}
              {activeLinkType === 'brand' ? (
                <StoreDropdown
                  searchable
                  value={linkChoice.type === 'brand' ? linkChoice.value : ''}
                  onChange={(value) => {
                    setLinkType('brand')
                    patch({ bottomNavHref: createBottomNavLink('brand', value) })
                  }}
                  options={brandOptions}
                  placeholder="Select a brand"
                  searchPlaceholder="Search brands"
                />
              ) : null}
              {activeLinkType === 'product' ? (
                <StoreDropdown
                  searchable
                  value={linkChoice.type === 'product' ? linkChoice.value : ''}
                  onChange={(value) => {
                    setLinkType('product')
                    patch({ bottomNavHref: createBottomNavLink('product', value) })
                  }}
                  options={productOptions}
                  placeholder="Select a product"
                  searchPlaceholder="Search products"
                />
              ) : null}
              {activeLinkType === 'landing' ? (
                <StoreDropdown
                  searchable
                  value={linkChoice.type === 'landing' ? linkChoice.value : ''}
                  onChange={(value) => {
                    setLinkType('landing')
                    patch({ bottomNavHref: createBottomNavLink('landing', value) })
                  }}
                  options={landingOptions}
                  placeholder={landingOptions.length ? 'Select a landing page' : 'No landing pages yet'}
                  searchPlaceholder="Search landing pages"
                />
              ) : null}
              {activeLinkType === 'custom' ? (
                <input
                  type="text"
                  value={linkChoice.type === 'custom' ? linkChoice.value : ''}
                  onChange={(event) => {
                    setLinkType('custom')
                    patch({ bottomNavHref: event.target.value })
                  }}
                  placeholder="https://example.com or /your-page"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              ) : null}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Opens {offersPage.bottomNavHref || '/offers'}. Pick a page, category, brand, product, or a landing page you created.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
