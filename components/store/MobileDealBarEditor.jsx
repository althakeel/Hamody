'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Gift, Loader2, Save, Upload } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import MobilePathPicker from '@/components/store/MobilePathPicker'
import EnableSwitch from '@/components/store/EnableSwitch'
import { uploadStoreImage } from '@/lib/uploadStoreImage'
import { normalizeMobileFeatures } from '@/lib/mobileFeatures'
import { normalizeDealBar } from '@/lib/mobileDealBar'

function ColorField({ label, value, onChange }) {
  const picker = /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? value : '#5b4dff'
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input type="color" value={picker} onChange={(event) => onChange(event.target.value)} className="h-9 w-12 rounded border border-slate-200 bg-white" />
        <input value={value || ''} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900" />
      </span>
    </label>
  )
}

function DealPreview({ section }) {
  return (
    <div className="flex justify-center">
      <div className="w-[300px] rounded-[2.6rem] border-[11px] border-slate-900 bg-slate-900 shadow-xl">
        <div className="overflow-hidden rounded-[1.85rem] bg-slate-50">
          <div className="flex h-8 items-center justify-center bg-white">
            <span className="h-[18px] w-[92px] rounded-full bg-slate-900" />
          </div>
          <div className="px-2 py-4">
            <div className="flex items-center gap-2 rounded-xl px-2 py-2" style={{ background: section.backgroundColor }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ background: section.iconBackground }}>
                {section.iconUrl ? (
                  <img src={section.iconUrl} alt="" className="h-5 w-5 object-contain" />
                ) : (
                  <Gift size={14} className="text-indigo-600" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-extrabold" style={{ color: section.titleColor }}>{section.title}</span>
                {section.subtitle ? (
                  <span className="mt-0.5 block text-[8px] leading-snug" style={{ color: section.subtitleColor }}>{section.subtitle}</span>
                ) : null}
              </span>
              {section.buttonEnabled ? (
                <span
                  className="shrink-0 px-2 py-1 text-[8px] font-bold"
                  style={{
                    background: section.buttonColor,
                    color: section.buttonTextColor,
                    borderRadius: section.buttonRadiusPx ?? 12,
                  }}
                >
                  {section.buttonText}{section.buttonArrow ? ' →' : ''}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MobileDealBarEditor() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState(() => normalizeDealBar())
  const patch = (next) => setForm((prev) => ({ ...prev, ...next }))

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const { data } = await axios.get('/api/store/mobile-features', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const normalized = normalizeMobileFeatures(data?.mobileFeatures)
      setForm(normalizeDealBar(normalized.dealBar))
    } catch (error) {
      console.error(error)
      toast.error('Failed to load the deal bar')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  const uploadIcon = async (file) => {
    if (!file) return
    try {
      setUploading(true)
      const token = await getToken()
      const data = await uploadStoreImage(file, { token, type: 'navbar-logo', compress: false })
      const url = data?.url || data?.imageUrl
      if (!url) throw new Error('No image URL returned')
      patch({ iconUrl: url })
      toast.success('Icon uploaded')
    } catch (error) {
      toast.error(error?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      await axios.put(
        '/api/store/mobile-features',
        { mobileFeatures: { dealBar: normalizeDealBar(form) } },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      toast.success('Deal bar saved')
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/store/mobile-features" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} />
            Mobile
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Deal bar</h1>
          <p className="mt-1 text-sm text-slate-500">
            The slim deals strip. Change the icon, background, and the Shop Deals button.
          </p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-800">Show this section in the mobile app</span>
              <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => patch({ enabled })} />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full" style={{ background: form.iconBackground }}>
                {form.iconUrl ? <img src={form.iconUrl} alt="" className="h-8 w-8 object-contain" /> : <Gift size={22} className="text-indigo-600" />}
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload size={14} />}
                Upload icon
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) uploadIcon(file) }} />
              </label>
            </div>
            <label className="block text-xs font-medium text-slate-600">
              Title
              <input value={form.title} onChange={(event) => patch({ title: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Subtitle
              <input value={form.subtitle} onChange={(event) => patch({ subtitle: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField label="Background" value={form.backgroundColor} onChange={(value) => patch({ backgroundColor: value })} />
              <ColorField label="Icon circle" value={form.iconBackground} onChange={(value) => patch({ iconBackground: value })} />
              <ColorField label="Title color" value={form.titleColor} onChange={(value) => patch({ titleColor: value })} />
              <ColorField label="Subtitle color" value={form.subtitleColor} onChange={(value) => patch({ subtitleColor: value })} />
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">Show Shop Deals button</span>
                <EnableSwitch enabled={form.buttonEnabled !== false} onChange={(enabled) => patch({ buttonEnabled: enabled })} />
              </div>
              {form.buttonEnabled !== false ? (
                <>
                  <label className="block text-xs font-medium text-slate-600">
                    Button text
                    <input value={form.buttonText} onChange={(event) => patch({ buttonText: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
                  </label>
                  <div className="text-xs font-medium text-slate-600">
                    Button path
                    <div className="mt-1">
                      <MobilePathPicker value={form.buttonPath} onChange={(value) => patch({ buttonPath: value })} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ColorField label="Button color" value={form.buttonColor} onChange={(value) => patch({ buttonColor: value })} />
                    <ColorField label="Button text color" value={form.buttonTextColor} onChange={(value) => patch({ buttonTextColor: value })} />
                    <label className="block text-xs font-medium text-slate-600">
                      Corner
                      <input type="number" min={0} max={40} value={form.buttonRadiusPx ?? 12} onChange={(event) => patch({ buttonRadiusPx: Number(event.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-800">Show arrow</span>
                      <EnableSwitch enabled={form.buttonArrow !== false} onChange={(enabled) => patch({ buttonArrow: enabled })} />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        </div>
        <aside className="lg:sticky lg:top-4">
          <DealPreview section={form} />
        </aside>
      </div>
    </div>
  )
}
