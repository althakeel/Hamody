'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import StoreDropdown from '@/components/store/StoreDropdown'
import EnableSwitch from '@/components/store/EnableSwitch'
import { normalizeMobileFeatures } from '@/lib/mobileFeatures'
import { HERO_FONT_OPTIONS, heroFontFamily } from '@/lib/mobileBannerLayout'
import {
  couponMinOrderLabel,
  couponOfferLabel,
  normalizeCouponBanner,
} from '@/lib/mobileCouponBanner'

function ColorField({ label, value, onChange, fallback }) {
  const picker = /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : fallback
  return (
    <label className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
      {label}
      <input type="color" value={picker} onChange={(event) => onChange(event.target.value)} className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white" />
    </label>
  )
}

function CouponPreview({ form }) {
  return (
    <div className="flex justify-center">
      <div className="w-[300px] rounded-[2.6rem] border-[11px] border-slate-900 bg-slate-900 shadow-xl">
        <div className="overflow-hidden rounded-[1.85rem] bg-slate-50">
          <div className="flex h-8 items-center justify-center bg-white">
            <span className="h-[18px] w-[92px] rounded-full bg-slate-900" />
          </div>
          <div className="px-2 py-4">
            <div className="flex items-center gap-2 px-3 py-3" style={{ background: form.backgroundColor, borderRadius: form.radiusPx }}>
              <div className="min-w-0 flex-1">
                <p
                  className="font-extrabold uppercase leading-tight"
                  style={{
                    color: form.titleColor,
                    fontFamily: heroFontFamily(form.titleFont),
                    fontSize: Math.max(11, Math.round((form.titleSizePx || 18) * 0.7)),
                  }}
                >
                  {form.title}
                </p>
                {form.subtitle ? (
                  <p
                    className="mt-1 leading-snug"
                    style={{
                      color: form.subtitleColor,
                      fontFamily: heroFontFamily(form.subtitleFont),
                      fontSize: Math.max(8, Math.round((form.subtitleSizePx || 12) * 0.75)),
                    }}
                  >
                    {form.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="relative w-[108px] shrink-0">
                <span
                  className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 font-bold leading-none"
                  style={{
                    background: form.codeBackground,
                    color: form.codeColor,
                    fontFamily: heroFontFamily(form.codeFont),
                    fontSize: Math.max(8, Math.round((form.codeSizePx || 11) * 0.75)),
                    padding: `${Math.max(1, Math.round((form.codePaddingY || 0) * 0.6))}px ${Math.max(2, Math.round((form.codePaddingX || 0) * 0.7))}px`,
                    borderRadius: Math.round((form.codeRadiusPx || 0) * 0.7),
                  }}
                >
                  {form.codeText || 'CODE'}
                </span>
                <div
                  className="rounded-xl border border-dashed px-2 pb-2 pt-3 text-center"
                  style={{ background: form.cardBackground, borderColor: form.codeBackground }}
                >
                  <p className="text-[13px] font-extrabold leading-tight" style={{ color: form.offerColor }}>
                    {form.offerText || 'Offer'}
                  </p>
                  {form.minOrderText ? (
                    <p className="mt-0.5 text-[8px]" style={{ color: form.minOrderColor }}>{form.minOrderText}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MobileCouponBannerEditor() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [coupons, setCoupons] = useState([])
  const [form, setForm] = useState(() => normalizeCouponBanner())

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      const [featuresRes, couponRes] = await Promise.all([
        axios.get('/api/store/mobile-features', { headers }),
        axios.get('/api/store/coupon', { headers }).catch(() => ({ data: {} })),
      ])
      const normalized = normalizeMobileFeatures(featuresRes.data?.mobileFeatures)
      setForm(normalizeCouponBanner(normalized.couponBanner))
      setCoupons(Array.isArray(couponRes.data?.coupons) ? couponRes.data.coupons : [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load the coupon banner')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  const patch = (next) => setForm((prev) => ({ ...prev, ...next }))

  const chooseCoupon = (code) => {
    const coupon = coupons.find((item) => String(item.code || '').toUpperCase() === String(code || '').toUpperCase())
    if (!coupon) {
      patch({ couponCode: '', couponId: '' })
      return
    }
    patch({
      couponCode: coupon.code,
      couponId: String(coupon._id || ''),
      codeText: coupon.code,
      offerText: couponOfferLabel(coupon),
      minOrderText: couponMinOrderLabel(coupon),
    })
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      await axios.put(
        '/api/store/mobile-features',
        { mobileFeatures: { couponBanner: normalizeCouponBanner(form) } },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      toast.success('Coupon banner saved')
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

  const couponOptions = coupons.map((coupon) => ({
    value: String(coupon.code || '').toUpperCase(),
    label: `${coupon.code}${coupon.title ? ` · ${coupon.title}` : ''}${coupon.isActive === false ? ' · Off' : ''}`,
  }))

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/store/mobile-features" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} />
            Mobile
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Coupon banner</h1>
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
              <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => patch({ enabled })} />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Coupon</h2>
              <p className="mt-0.5 text-xs text-slate-500">The code, offer, and minimum order come from the coupon you choose.</p>
            </div>
            <label className="block text-xs font-medium text-slate-600">
              Title
              <input value={form.title} onChange={(event) => patch({ title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="text-xs font-medium text-slate-600">
                Title font
                <div className="mt-1">
                  <StoreDropdown
                    portal
                    value={form.titleFont || 'inherit'}
                    onChange={(value) => patch({ titleFont: value })}
                    options={HERO_FONT_OPTIONS.map((font) => ({ value: font.id, label: font.label }))}
                  />
                </div>
              </div>
              <label className="block text-xs font-medium text-slate-600">
                Title size
                <input type="number" min={12} max={36} value={form.titleSizePx ?? 18} onChange={(event) => patch({ titleSizePx: Number(event.target.value) || 18 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
              </label>
            </div>
            <label className="block text-xs font-medium text-slate-600">
              Subtitle
              <input value={form.subtitle} onChange={(event) => patch({ subtitle: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="text-xs font-medium text-slate-600">
                Subtitle font
                <div className="mt-1">
                  <StoreDropdown
                    portal
                    value={form.subtitleFont || 'inherit'}
                    onChange={(value) => patch({ subtitleFont: value })}
                    options={HERO_FONT_OPTIONS.map((font) => ({ value: font.id, label: font.label }))}
                  />
                </div>
              </div>
              <label className="block text-xs font-medium text-slate-600">
                Subtitle size
                <input type="number" min={10} max={24} value={form.subtitleSizePx ?? 12} onChange={(event) => patch({ subtitleSizePx: Number(event.target.value) || 12 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="text-xs font-medium text-slate-600 sm:col-span-3">
                Code
                <div className="mt-1">
                  {couponOptions.length ? (
                    <StoreDropdown
                      portal
                      searchable
                      value={form.couponCode}
                      onChange={chooseCoupon}
                      placeholder="Choose an existing coupon"
                      searchPlaceholder="Search coupons"
                      options={couponOptions}
                    />
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-normal text-slate-500">
                      No coupons yet. Add one in <Link href="/store/coupons" className="font-semibold text-sky-700">Coupons</Link>, then come back.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
                <div className="text-xs font-medium text-slate-600">
                  Code font
                  <div className="mt-1">
                    <StoreDropdown
                      portal
                      value={form.codeFont || 'inherit'}
                      onChange={(value) => patch({ codeFont: value })}
                      options={HERO_FONT_OPTIONS.map((font) => ({ value: font.id, label: font.label }))}
                    />
                  </div>
                </div>
                <label className="block text-xs font-medium text-slate-600">
                  Code size
                  <input type="number" min={8} max={22} value={form.codeSizePx ?? 11} onChange={(event) => patch({ codeSizePx: Number(event.target.value) || 11 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Side padding
                  <input type="number" min={0} max={32} value={form.codePaddingX ?? 10} onChange={(event) => patch({ codePaddingX: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Top padding
                  <input type="number" min={0} max={20} value={form.codePaddingY ?? 3} onChange={(event) => patch({ codePaddingY: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Corner
                  <input type="number" min={0} max={24} value={form.codeRadiusPx ?? 8} onChange={(event) => patch({ codeRadiusPx: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                </label>
              </div>
              <label className="block text-xs font-medium text-slate-600">
                Offer
                <input value={form.offerText} readOnly placeholder="From the coupon" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Minimum order
                <input value={form.minOrderText} readOnly placeholder="From the coupon" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" />
              </label>
            </div>
            <p className="text-xs text-slate-500">A tap on this banner copies the coupon code. It does not open a page.</p>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">Colors</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField label="Background" value={form.backgroundColor} fallback="#2a1868" onChange={(value) => patch({ backgroundColor: value })} />
              <ColorField label="Title" value={form.titleColor} fallback="#ffffff" onChange={(value) => patch({ titleColor: value })} />
              <ColorField label="Subtitle" value={form.subtitleColor} fallback="#ddd4f7" onChange={(value) => patch({ subtitleColor: value })} />
              <ColorField label="Card" value={form.cardBackground} fallback="#ffffff" onChange={(value) => patch({ cardBackground: value })} />
              <ColorField label="Code pill" value={form.codeBackground} fallback="#5b46e8" onChange={(value) => patch({ codeBackground: value })} />
              <ColorField label="Code text" value={form.codeColor} fallback="#ffffff" onChange={(value) => patch({ codeColor: value })} />
              <ColorField label="Offer" value={form.offerColor} fallback="#1e1b4b" onChange={(value) => patch({ offerColor: value })} />
              <ColorField label="Minimum order" value={form.minOrderColor} fallback="#94a3b8" onChange={(value) => patch({ minOrderColor: value })} />
            </div>
          </section>
        </div>
        <aside className="xl:sticky xl:top-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</p>
            <CouponPreview form={form} />
          </div>
        </aside>
      </div>
    </div>
  )
}
