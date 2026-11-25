'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Images, LayoutGrid, LayoutTemplate, Loader2, Rows3, Save, GalleryHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'
import ShowcaseBannersEditor from '@/components/store/preferences/ShowcaseBannersEditor'
import Banner2SectionEditor from '@/components/store/preferences/Banner2SectionEditor'
import BrandsBannerEditor from '@/components/store/preferences/BrandsBannerEditor'
import FrontPromoCardsEditor from '@/components/store/preferences/FrontPromoCardsEditor'
import CategorySliderImagesEditor from '@/components/store/preferences/CategorySliderImagesEditor'

const TABS = [
  {
    id: 'general',
    label: 'Preference',
    description: 'Referral rewards and general showcase settings.',
    icon: LayoutTemplate,
  },
  {
    id: 'showcase',
    label: 'Showcase banners',
    description: 'Top, bottom, and full-width banners in the showcase strip.',
    icon: Images,
  },
  {
    id: 'front',
    label: 'Homepage front',
    description: 'Upload the wide banner slider at the top of the homepage.',
    icon: GalleryHorizontal,
  },
  {
    id: 'categories',
    label: 'Category slider',
    description: '127×110 category cards with an 80×80 image. Every category is listed, and you can add more.',
    icon: LayoutGrid,
  },
  {
    id: 'banner2',
    label: 'Banner 2 Section',
    description: 'Rotating banner slides after the featured sections.',
    icon: Rows3,
  },
  {
    id: 'brands-banner',
    label: 'Before Top Brands',
    description: 'Upload the banner before Top Brands, then choose the categories and products shown under it.',
    icon: Images,
  },
]

const initialReferralState = {
  referralRewardCoins: 25,
}

function PreferencesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()
  const activeTab = TABS.some((tab) => tab.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'general'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadedShowcase, setLoadedShowcase] = useState({})
  const [form, setForm] = useState(initialReferralState)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const prefRes = await axios.get('/api/store/preferences/shop-showcase', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const savedShowcase = prefRes.data?.shopShowcase || {}
      setLoadedShowcase(savedShowcase)
      setForm({
        referralRewardCoins: Number(savedShowcase.referralRewardCoins ?? 25),
      })
    } catch (error) {
      toast.error('Failed to load preferences')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  const setTab = (tabId) => {
    router.replace(`/store/preferences?tab=${tabId}`, { scroll: false })
  }

  const saveGeneral = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const parsed = Number(form.referralRewardCoins || 0)

      await axios.put(
        '/api/store/preferences/shop-showcase',
        {
          ...loadedShowcase,
          referralRewardCoins: Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success('Preference saved')
      await loadData()
    } catch (error) {
      toast.error('Failed to save')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (loading && activeTab === 'general') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Homepage Showcase Settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage the homepage front, referral rewards, showcase banners, category slider images, the banner before Top Brands, and the Banner 2 slider from one place.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon size={18} />
                </div>
                <div className="text-sm font-semibold text-slate-900">{tab.label}</div>
                <p className="mt-1 text-xs text-slate-500">{tab.description}</p>
              </button>
            )
          })}
        </div>

        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Referral Reward Settings</h2>
              <p className="mt-1 text-sm text-slate-600">
                When an invited customer places their first order, the inviter receives this wallet amount.
              </p>
              <label className="mt-4 block max-w-sm space-y-1">
                <span className="text-sm font-medium text-slate-700">Inviter wallet reward (coins)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={Number(form.referralRewardCoins || 0)}
                  onChange={(event) => {
                    const parsed = Number(event.target.value)
                    setForm({
                      referralRewardCoins: Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0,
                    })
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={saveGeneral}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Preference
            </button>
          </div>
        )}

        {activeTab === 'showcase' && <ShowcaseBannersEditor embedded />}
        {activeTab === 'categories' && <CategorySliderImagesEditor />}
        {activeTab === 'front' && <FrontPromoCardsEditor />}
        {activeTab === 'banner2' && <Banner2SectionEditor embedded />}
        {activeTab === 'brands-banner' && <BrandsBannerEditor embedded />}
      </div>
    </div>
  )
}

export default function PreferencePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      }
    >
      <PreferencesContent />
    </Suspense>
  )
}
