'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'

const DEFAULT_BADGES = [
  { label: 'Price Lower Than Usual', backgroundColor: '#007600', textColor: '#ffffff', borderRadius: 0 },
  { label: 'Hot Deal', backgroundColor: '#cc0c39', textColor: '#ffffff', borderRadius: 0 },
  { label: 'Best Seller', backgroundColor: '#c45500', textColor: '#ffffff', borderRadius: 0 },
  { label: 'New Arrival', backgroundColor: '#0066c0', textColor: '#ffffff', borderRadius: 0 },
  { label: 'Limited Stock', backgroundColor: '#b12704', textColor: '#ffffff', borderRadius: 0 },
  { label: 'Free Shipping', backgroundColor: '#007185', textColor: '#ffffff', borderRadius: 0 }
]

const DEFAULT_FORM = {
  returnsText: 'Easy Returns',
  vatText: 'All prices include VAT.',
  deliveryPrefix: 'Estimated delivery',
  deliverySuffix: '— timelines are estimates.',
  cutoffHour: 23,
  cutoffMinute: 0,
  deliveryMinDays: 2,
  deliveryMaxDays: 3,
  badgeSettings: {
    badges: DEFAULT_BADGES
  }
}

const MINUTE_OPTIONS = ['00', '15', '30', '45']

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900'

function formatCutoff(hour24, minute) {
  const hour = Number(hour24) || 0
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const period = hour >= 12 ? 'PM' : 'AM'
  return `${hour12}:${String(Number(minute) || 0).padStart(2, '0')} ${period}`
}

export default function ProductPageCustomizePage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [savedSnapshot, setSavedSnapshot] = useState('')

  const badges = form.badgeSettings?.badges || []
  const dirty = savedSnapshot !== '' && JSON.stringify(form) !== savedSnapshot

  const updateBadge = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      badgeSettings: {
        badges: (prev.badgeSettings?.badges || []).map((badge, badgeIndex) => (
          badgeIndex === index ? { ...badge, [key]: value } : badge
        ))
      }
    }))
  }

  const addBadge = () => {
    setForm((prev) => ({
      ...prev,
      badgeSettings: {
        badges: [
          ...(prev.badgeSettings?.badges || []),
          { label: '', backgroundColor: '#565959', textColor: '#ffffff', borderRadius: 6 }
        ]
      }
    }))
  }

  const removeBadge = (index) => {
    setForm((prev) => ({
      ...prev,
      badgeSettings: {
        badges: (prev.badgeSettings?.badges || []).filter((_, badgeIndex) => badgeIndex !== index)
      }
    }))
  }

  const moveBadge = (index, direction) => {
    setForm((prev) => {
      const list = [...(prev.badgeSettings?.badges || [])]
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= list.length) return prev
      const [moved] = list.splice(index, 1)
      list.splice(nextIndex, 0, moved)
      return { ...prev, badgeSettings: { badges: list } }
    })
  }

  const cutoffHour24 = Number(form.cutoffHour) || 0
  const cutoffHour12 = cutoffHour24 % 12 === 0 ? 12 : cutoffHour24 % 12
  const cutoffMinute = Number(form.cutoffMinute) || 0
  const cutoffPeriod = cutoffHour24 >= 12 ? 'PM' : 'AM'
  const minuteChoices = useMemo(() => {
    const current = String(cutoffMinute).padStart(2, '0')
    return [...new Set([...MINUTE_OPTIONS, current])].sort()
  }, [cutoffMinute])

  const updateCutoffTime = (nextHour12, nextMinute, nextPeriod) => {
    const safeHour12 = Number(nextHour12) || 12
    const safeMinute = Number(nextMinute) || 0
    const safePeriod = nextPeriod === 'PM' ? 'PM' : 'AM'

    let nextHour24 = safeHour12 % 12
    if (safePeriod === 'PM') nextHour24 += 12

    setForm((prev) => ({
      ...prev,
      cutoffHour: nextHour24,
      cutoffMinute: safeMinute
    }))
  }

  const minDays = Math.max(0, Number(form.deliveryMinDays) || 0)
  const maxDays = Math.max(0, Number(form.deliveryMaxDays) || 0)
  const dayRange = minDays === maxDays ? `${minDays} day${minDays === 1 ? '' : 's'}` : `${Math.min(minDays, maxDays)}–${Math.max(minDays, maxDays)} days`
  const previewBadges = badges.filter((badge) => String(badge.label || '').trim())

  const loadData = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const res = await axios.get('/api/store/appearance/sections', {
        headers: { Authorization: `Bearer ${token}` }
      })

      const nextForm = {
        ...DEFAULT_FORM,
        ...(res.data?.productPageInfo || {}),
        badgeSettings: {
          badges: Array.isArray(res.data?.productPageInfo?.badgeSettings?.badges) && res.data.productPageInfo.badgeSettings.badges.length
            ? res.data.productPageInfo.badgeSettings.badges
            : DEFAULT_BADGES
        }
      }
      setForm(nextForm)
      setSavedSnapshot(JSON.stringify(nextForm))
    } catch (error) {
      toast.error('Failed to load product page settings')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const earliest = Math.max(0, Number(form.deliveryMinDays) || 0)
      const latest = Math.max(earliest, Number(form.deliveryMaxDays) || 0)

      const payload = {
        productPageInfo: {
          ...form,
          deliveryMinDays: earliest,
          deliveryMaxDays: latest,
          cutoffHour: Math.max(0, Math.min(23, Number(form.cutoffHour) || 0)),
          cutoffMinute: Math.max(0, Math.min(59, Number(form.cutoffMinute) || 0)),
          badgeSettings: {
            badges: (form.badgeSettings?.badges || [])
              .map((badge) => ({
                label: String(badge?.label || '').trim(),
                backgroundColor: String(badge?.backgroundColor || '').trim(),
                textColor: String(badge?.textColor || '').trim(),
                borderRadius: Math.max(0, Math.min(24, Number(badge.borderRadius) || 0))
              }))
              .filter((badge) => badge.label)
          }
        }
      }

      await axios.post('/api/store/appearance/sections', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const savedForm = {
        ...form,
        deliveryMinDays: earliest,
        deliveryMaxDays: latest,
        badgeSettings: payload.productPageInfo.badgeSettings
      }
      setForm(savedForm)
      setSavedSnapshot(JSON.stringify(savedForm))
      toast.success('Product page saved')
    } catch (error) {
      toast.error('Could not save the product page')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center" lang="en" dir="ltr">
        <Loader2 className="animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6" lang="en" dir="ltr">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Product page labels</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          Change the returns line, delivery wording, and the badges you can attach to a product. The preview updates as you type.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Returns and VAT</h2>
              <p className="mt-1 text-sm text-slate-500">Short lines shown with the price and delivery details.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Returns line" hint="Example: Easy Returns">
                <input
                  className={inputClass}
                  value={form.returnsText}
                  onChange={(e) => setForm((prev) => ({ ...prev, returnsText: e.target.value }))}
                />
              </Field>
              <Field label="VAT note" hint="Example: All prices include VAT.">
                <input
                  className={inputClass}
                  value={form.vatText}
                  onChange={(e) => setForm((prev) => ({ ...prev, vatText: e.target.value }))}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Delivery</h2>
              <p className="mt-1 text-sm text-slate-500">
                Customers see one delivery line. Orders placed after the cutoff count from the next day.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Opening words" hint="Comes before the number of days.">
                <input
                  className={inputClass}
                  value={form.deliveryPrefix}
                  onChange={(e) => setForm((prev) => ({ ...prev, deliveryPrefix: e.target.value }))}
                />
              </Field>
              <Field label="Closing note" hint="Comes after the delivery window.">
                <input
                  className={inputClass}
                  value={form.deliverySuffix}
                  onChange={(e) => setForm((prev) => ({ ...prev, deliverySuffix: e.target.value }))}
                />
              </Field>
              <Field label="Earliest arrival" hint="How soon an order can arrive.">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className={inputClass}
                    value={form.deliveryMinDays}
                    onChange={(e) => setForm((prev) => ({ ...prev, deliveryMinDays: e.target.value }))}
                  />
                  <span className="shrink-0 text-sm text-slate-500">days</span>
                </div>
              </Field>
              <Field label="Latest arrival" hint="The last day in the delivery window.">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="45"
                    className={inputClass}
                    value={form.deliveryMaxDays}
                    onChange={(e) => setForm((prev) => ({ ...prev, deliveryMaxDays: e.target.value }))}
                  />
                  <span className="shrink-0 text-sm text-slate-500">days</span>
                </div>
              </Field>
            </div>
            {minDays > maxDays ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Earliest arrival is later than the latest. Saving will use {minDays}–{minDays} days.
              </p>
            ) : null}
            <Field label="Order cutoff" hint="Orders after this time move to the next day’s window.">
              <div className="grid grid-cols-3 gap-3">
                <span className="space-y-1">
                  <span className="block text-xs font-medium text-slate-500">Hour</span>
                  <select
                    className={inputClass}
                    value={String(cutoffHour12)}
                    onChange={(e) => updateCutoffTime(e.target.value, cutoffMinute, cutoffPeriod)}
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                </span>
                <span className="space-y-1">
                  <span className="block text-xs font-medium text-slate-500">Minute</span>
                  <select
                    className={inputClass}
                    value={String(cutoffMinute).padStart(2, '0')}
                    onChange={(e) => updateCutoffTime(cutoffHour12, e.target.value, cutoffPeriod)}
                  >
                    {minuteChoices.map((minute) => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                </span>
                <span className="space-y-1">
                  <span className="block text-xs font-medium text-slate-500">AM / PM</span>
                  <select
                    className={inputClass}
                    value={cutoffPeriod}
                    onChange={(e) => updateCutoffTime(cutoffHour12, cutoffMinute, e.target.value)}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </span>
              </div>
            </Field>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Product badges</h2>
                <p className="mt-1 text-sm text-slate-500">
                  These names appear when you edit a product. The first badge is listed first.
                </p>
              </div>
              <button
                type="button"
                onClick={addBadge}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus size={16} />
                Add badge
              </button>
            </div>

            {badges.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No badges yet. Add one to offer it on products.
              </p>
            ) : (
              <div className="space-y-3">
                {badges.map((badge, index) => {
                  const radius = Math.max(0, Math.min(24, Number(badge.borderRadius) || 0))
                  return (
                    <div key={`badge-${index}`} className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span
                          className="inline-flex max-w-full items-center px-2.5 py-1 text-xs font-bold"
                          style={{
                            backgroundColor: badge.backgroundColor || '#565959',
                            color: badge.textColor || '#ffffff',
                            borderRadius: `${radius}px`
                          }}
                        >
                          {badge.label || 'Badge name'}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveBadge(index, -1)}
                            disabled={index === 0}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                            aria-label="Move badge up"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBadge(index, 1)}
                            disabled={index === badges.length - 1}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                            aria-label="Move badge down"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBadge(index)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 px-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Name" hint="Up to 40 characters. A blank name is not saved.">
                          <input
                            className={inputClass}
                            value={badge.label || ''}
                            onChange={(e) => updateBadge(index, 'label', e.target.value.slice(0, 40))}
                            placeholder="Limited time deal"
                          />
                        </Field>
                        <Field label="Corner roundness" hint={radius === 0 ? 'Square corners' : radius >= 16 ? 'Very round' : 'Slightly round'}>
                          <input
                            type="range"
                            min="0"
                            max="24"
                            value={radius}
                            onChange={(e) => updateBadge(index, 'borderRadius', e.target.value)}
                            className="w-full accent-slate-900"
                          />
                        </Field>
                        <Field label="Background">
                          <span className="flex items-center gap-2">
                            <input
                              type="color"
                              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                              value={badge.backgroundColor || '#565959'}
                              onChange={(e) => updateBadge(index, 'backgroundColor', e.target.value)}
                            />
                            <input
                              className={inputClass}
                              value={badge.backgroundColor || ''}
                              onChange={(e) => updateBadge(index, 'backgroundColor', e.target.value)}
                            />
                          </span>
                        </Field>
                        <Field label="Text color">
                          <span className="flex items-center gap-2">
                            <input
                              type="color"
                              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                              value={badge.textColor || '#ffffff'}
                              onChange={(e) => updateBadge(index, 'textColor', e.target.value)}
                            />
                            <input
                              className={inputClass}
                              value={badge.textColor || ''}
                              onChange={(e) => updateBadge(index, 'textColor', e.target.value)}
                            />
                          </span>
                        </Field>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Customer preview</h2>
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Sample product</p>
              <p className="text-lg font-bold text-slate-900">AED 99</p>
              {previewBadges.length ? (
                <div className="flex flex-wrap gap-2">
                  {previewBadges.slice(0, 3).map((badge, index) => (
                    <span
                      key={`${badge.label}-${index}`}
                      className="inline-flex items-center px-2.5 py-1 text-[12px] font-bold"
                      style={{
                        backgroundColor: badge.backgroundColor || '#565959',
                        color: badge.textColor || '#ffffff',
                        borderRadius: `${Math.max(0, Math.min(24, Number(badge.borderRadius) || 0))}px`
                      }}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Add a badge name to see it here.</p>
              )}
              <p className="text-sm text-slate-800">{form.returnsText || 'Returns line'}</p>
              <p className="text-sm text-slate-800">
                <span className="font-medium">{form.deliveryPrefix || 'Delivery'}</span>
                {' '}in {dayRange}. Order before {formatCutoff(cutoffHour24, cutoffMinute)}.
              </p>
              {form.deliverySuffix ? <p className="text-xs text-slate-500">{form.deliverySuffix}</p> : null}
              <p className="text-xs text-slate-500">{form.vatText || 'VAT note'}</p>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {previewBadges.length} badge{previewBadges.length === 1 ? '' : 's'} will be available in the product editor.
            </p>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {dirty ? 'You have unsaved changes.' : 'All changes are saved.'}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
