'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_FOOTER, DEFAULT_PAYMENT_MARKS, FOOTER_PAYMENT_METHOD_IDS, normalizeFooter } from '@/lib/footerSettings'

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900'
const PAYMENT_LABELS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  tabby: 'Tabby',
  tamara: 'Tamara',
  cod: 'Cash on delivery',
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  )
}

function moveItem(list, index, direction) {
  const next = [...list]
  const target = index + direction
  if (target < 0 || target >= next.length) return list
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

export default function FooterCustomizePage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPaymentId, setUploadingPaymentId] = useState('')
  const [form, setForm] = useState(DEFAULT_FOOTER)

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const token = await getToken()
        const { data } = await axios.get('/api/store/appearance/sections', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!mounted) return
        setForm(normalizeFooter(data?.footer || DEFAULT_FOOTER))
      } catch (error) {
        toast.error('Failed to load footer settings')
        console.error(error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [getToken])

  const save = async () => {
    try {
      setSaving(true)
      const missingImage = form.paymentMethods.some((item) => (
        !FOOTER_PAYMENT_METHOD_IDS.includes(item.id) && !String(item.image || '').trim()
      ))
      if (missingImage) {
        toast.error('Upload an image for each added payment mark')
        return
      }
      const token = await getToken()
      const footer = normalizeFooter(form)
      await axios.post('/api/store/appearance/sections', { footer }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setForm(footer)
      toast.success('Footer saved')
    } catch (error) {
      toast.error('Could not save the footer')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const updatePaymentMethod = (id, patch) => {
    setForm((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    }))
  }

  const addPaymentMethod = () => {
    setForm((prev) => {
      const extraCount = prev.paymentMethods.filter((item) => !FOOTER_PAYMENT_METHOD_IDS.includes(item.id)).length
      if (extraCount >= 12) return prev
      const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      return {
        ...prev,
        paymentMethods: [
          ...prev.paymentMethods,
          { id, label: '', image: '', enabled: true },
        ],
      }
    })
  }

  const removePaymentMethod = (id) => {
    setForm((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((item) => item.id !== id),
    }))
  }

  const uploadPaymentImage = async (id, file) => {
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
      setUploadingPaymentId(id)
      const token = await getToken()
      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', 'footer-payment')
      const { data } = await axios.post('/api/store/upload-image', formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const url = String(data?.url || '').trim()
      if (!url) throw new Error('Upload returned no URL')
      updatePaymentMethod(id, { image: url })
      toast.success('Image uploaded. Save the footer to publish it.')
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Image upload failed')
    } finally {
      setUploadingPaymentId('')
    }
  }

  const updateColumn = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      columns: prev.columns.map((column, columnIndex) => (
        columnIndex === index ? { ...column, ...patch } : column
      )),
    }))
  }

  const updateLink = (columnIndex, linkIndex, patch) => {
    setForm((prev) => ({
      ...prev,
      columns: prev.columns.map((column, index) => {
        if (index !== columnIndex) return column
        return {
          ...column,
          links: column.links.map((link, current) => (
            current === linkIndex ? { ...link, ...patch } : link
          )),
        }
      }),
    }))
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500" lang="en" dir="ltr">
        <Loader2 className="animate-spin" size={20} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6" lang="en" dir="ltr">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Footer</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Edit the customer footer: description, contact, addresses, link columns, payment marks, and social links. The logo stays in Menu Management. Use {'{legalName}'} and {'{year}'} in the operated-by and copyright lines.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Save footer
        </button>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Brand text</h2>
        <Field label="Description">
          <textarea value={form.description} rows={3} onChange={(event) => setField('description', event.target.value)} className={inputClass} />
        </Field>
        <Field label="Description (Arabic)">
          <textarea value={form.descriptionAr} rows={3} dir="rtl" onChange={(event) => setField('descriptionAr', event.target.value)} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal name">
            <input value={form.legalName} onChange={(event) => setField('legalName', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Legal name (Arabic)">
            <input value={form.legalNameAr} dir="rtl" onChange={(event) => setField('legalNameAr', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Operated by" hint="Example: Operated by {legalName}">
            <input value={form.operatedBy} onChange={(event) => setField('operatedBy', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Operated by (Arabic)">
            <input value={form.operatedByAr} dir="rtl" onChange={(event) => setField('operatedByAr', event.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Contact and addresses</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" hint="Digits only. Shown with spaces on the storefront.">
            <input value={form.phone} onChange={(event) => setField('phone', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(event) => setField('email', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Registered office label">
            <input value={form.registeredOfficeLabel} onChange={(event) => setField('registeredOfficeLabel', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Registered office label (Arabic)">
            <input value={form.registeredOfficeLabelAr} dir="rtl" onChange={(event) => setField('registeredOfficeLabelAr', event.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Registered office" hint="One line per row.">
          <textarea value={form.registeredOffice} rows={3} onChange={(event) => setField('registeredOffice', event.target.value)} className={inputClass} />
        </Field>
        <Field label="Registered office (Arabic)">
          <textarea value={form.registeredOfficeAr} rows={3} dir="rtl" onChange={(event) => setField('registeredOfficeAr', event.target.value)} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fulfilment label">
            <input value={form.fulfilmentLabel} onChange={(event) => setField('fulfilmentLabel', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Fulfilment label (Arabic)">
            <input value={form.fulfilmentLabelAr} dir="rtl" onChange={(event) => setField('fulfilmentLabelAr', event.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Fulfilment and returns address" hint="One line per row.">
          <textarea value={form.fulfilmentAddress} rows={3} onChange={(event) => setField('fulfilmentAddress', event.target.value)} className={inputClass} />
        </Field>
        <Field label="Fulfilment address (Arabic)">
          <textarea value={form.fulfilmentAddressAr} rows={3} dir="rtl" onChange={(event) => setField('fulfilmentAddressAr', event.target.value)} className={inputClass} />
        </Field>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Payment marks</h2>
            <p className="mt-1 text-xs text-slate-500">Replace the built-in logos, or add more. Save the footer after uploading.</p>
          </div>
          <button
            type="button"
            onClick={addPaymentMethod}
            disabled={form.paymentMethods.filter((item) => !FOOTER_PAYMENT_METHOD_IDS.includes(item.id)).length >= 12}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={14} /> Add payment mark
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FOOTER_PAYMENT_METHOD_IDS.map((id) => {
            const method = form.paymentMethods.find((item) => item.id === id)
            const fallback = DEFAULT_PAYMENT_MARKS.find((item) => item.id === id)
            const image = method?.image || fallback?.image || ''
            const enabled = method?.enabled !== false
            const isDefaultImage = image === fallback?.image
            const uploading = uploadingPaymentId === id
            return (
              <div key={id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-md bg-black px-2">
                  {image ? (
                    <img src={image} alt={PAYMENT_LABELS[id]} className="h-9 w-auto max-w-full object-contain" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">{PAYMENT_LABELS[id]}</span>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) => updatePaymentMethod(id, { enabled: event.target.checked })}
                      />
                      Show
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      {uploading ? 'Uploading...' : 'Replace image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          event.target.value = ''
                          uploadPaymentImage(id, file)
                        }}
                      />
                    </label>
                    {!isDefaultImage ? (
                      <button
                        type="button"
                        onClick={() => updatePaymentMethod(id, { image: fallback?.image || '' })}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Use original
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
          {form.paymentMethods
            .filter((item) => !FOOTER_PAYMENT_METHOD_IDS.includes(item.id))
            .map((method) => {
              const uploading = uploadingPaymentId === method.id
              return (
                <div key={method.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-md bg-black px-2">
                    {method.image ? (
                      <img src={method.image} alt={method.label || 'Payment'} className="h-9 w-auto max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400">No image</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={method.label || ''}
                        onChange={(event) => updatePaymentMethod(method.id, { label: event.target.value })}
                        className={inputClass}
                        placeholder="Name, for example Apple Pay"
                      />
                      <label className="inline-flex shrink-0 items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={method.enabled !== false}
                          onChange={(event) => updatePaymentMethod(method.id, { enabled: event.target.checked })}
                        />
                        Show
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {uploading ? 'Uploading...' : method.image ? 'Replace image' : 'Upload image'}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            event.target.value = ''
                            uploadPaymentImage(method.id, file)
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removePaymentMethod(method.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Link columns</h2>
          <button
            type="button"
            disabled={form.columns.length >= 6}
            onClick={() => setForm((prev) => ({
              ...prev,
              columns: [...prev.columns, { title: 'New column', titleAr: '', enabled: true, links: [{ label: 'Link', labelAr: '', href: '/', enabled: true, requiresAuth: false }] }],
            }))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={14} /> Add column
          </button>
        </div>
        {form.columns.map((column, columnIndex) => (
          <div key={`column-${columnIndex}`} className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={column.enabled !== false}
                  onChange={(event) => updateColumn(columnIndex, { enabled: event.target.checked })}
                />
                Show
              </label>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, columns: moveItem(prev.columns, columnIndex, -1) }))} className="rounded border border-slate-200 p-1" aria-label="Move column up"><ChevronUp size={14} /></button>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, columns: moveItem(prev.columns, columnIndex, 1) }))} className="rounded border border-slate-200 p-1" aria-label="Move column down"><ChevronDown size={14} /></button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, columns: prev.columns.filter((_, index) => index !== columnIndex) }))}
                className="ms-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600"
              >
                <Trash2 size={14} /> Remove column
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={column.title} onChange={(event) => updateColumn(columnIndex, { title: event.target.value })} className={inputClass} placeholder="Column title" />
              <input value={column.titleAr} dir="rtl" onChange={(event) => updateColumn(columnIndex, { titleAr: event.target.value })} className={inputClass} placeholder="العنوان بالعربي" />
            </div>
            {column.links.map((link, linkIndex) => (
              <div key={`link-${columnIndex}-${linkIndex}`} className="grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input value={link.label} onChange={(event) => updateLink(columnIndex, linkIndex, { label: event.target.value })} className={inputClass} placeholder="Link label" />
                <input value={link.labelAr} dir="rtl" onChange={(event) => updateLink(columnIndex, linkIndex, { labelAr: event.target.value })} className={inputClass} placeholder="الاسم بالعربي" />
                <input value={link.href} onChange={(event) => updateLink(columnIndex, linkIndex, { href: event.target.value })} className={inputClass} placeholder="/page or https://" />
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <input type="checkbox" checked={link.requiresAuth === true} onChange={(event) => updateLink(columnIndex, linkIndex, { requiresAuth: event.target.checked })} />
                    Sign in
                  </label>
                  <button
                    type="button"
                    onClick={() => updateColumn(columnIndex, { links: column.links.filter((_, index) => index !== linkIndex) })}
                    className="text-red-600"
                    aria-label="Remove link"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={column.links.length >= 12}
              onClick={() => updateColumn(columnIndex, { links: [...column.links, { label: '', labelAr: '', href: '/', enabled: true, requiresAuth: false }] })}
              className="text-xs font-semibold text-slate-700 hover:underline disabled:opacity-50"
            >
              Add link
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Social links</h2>
        {form.socialLinks.map((item) => (
          <div key={item.id} className="grid items-center gap-2 sm:grid-cols-[8rem_1fr_auto]">
            <span className="text-sm font-medium capitalize text-slate-700">{item.id}</span>
            <input
              value={item.url}
              onChange={(event) => {
                const url = event.target.value
                setForm((prev) => ({
                  ...prev,
                  socialLinks: prev.socialLinks.map((social) => social.id === item.id ? { ...social, url } : social),
                }))
              }}
              className={inputClass}
              placeholder="https://"
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={item.enabled !== false}
                onChange={(event) => {
                  const enabled = event.target.checked
                  setForm((prev) => ({
                    ...prev,
                    socialLinks: prev.socialLinks.map((social) => social.id === item.id ? { ...social, enabled } : social),
                  }))
                }}
              />
              Show
            </label>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Copyright</h2>
        <Field label="Copyright" hint="{year} and {legalName} are filled in on the storefront.">
          <textarea value={form.copyright} rows={3} onChange={(event) => setField('copyright', event.target.value)} className={inputClass} />
        </Field>
        <Field label="Copyright (Arabic)">
          <textarea value={form.copyrightAr} rows={3} dir="rtl" onChange={(event) => setField('copyrightAr', event.target.value)} className={inputClass} />
        </Field>
      </section>
    </div>
  )
}
