'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Bell, ImagePlus, Loader2, Send } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import MobilePathPicker from '@/components/store/MobilePathPicker'
import { uploadStoreImage } from '@/lib/uploadStoreImage'

const AUDIENCES = [
  { id: 'all', label: 'Android and iOS' },
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
]

function emptyDraft() {
  return {
    audience: 'all',
    title: '',
    body: '',
    imageUrl: '',
    buttonText: '',
    path: '/',
  }
}

export default function AppPushPage() {
  const { getToken } = useAuth()
  const [draft, setDraft] = useState(emptyDraft)
  const [devices, setDevices] = useState({ android: 0, ios: 0, total: 0 })
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/store/app-notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDevices(data.devices || { android: 0, ios: 0, total: 0 })
      setHistory(data.notifications || [])
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const uploadImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setUploading(true)
      const token = await getToken()
      const data = await uploadStoreImage(file, { token, type: 'banner' })
      if (!data?.url) throw new Error('Upload failed')
      setField('imageUrl', data.url)
    } catch (error) {
      toast.error(error?.message || 'Could not upload the image')
    } finally {
      setUploading(false)
    }
  }

  const send = async () => {
    try {
      setSending(true)
      const token = await getToken()
      const { data } = await axios.post('/api/store/app-notifications', draft, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const sent = data.notification
      if (!data.devices) {
        toast.success('Saved. No phones are registered yet, so nothing was delivered.')
      } else if (sent?.error) {
        toast.error(sent.error)
      } else {
        toast.success(`Sent to ${sent.successCount} phone${sent.successCount === 1 ? '' : 's'}`)
      }
      setDraft(emptyDraft())
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 text-slate-800" lang="en" dir="ltr">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Bell size={14} />
        Mobile
      </div>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Push notification</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Send a message to the Android app, the iOS app, or both. Add an image, a button, and the page that button opens.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Registered phones: <strong>{devices.total}</strong>
        {' '}· Android {devices.android} · iOS {devices.ios}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setField('audience', item.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${draft.audience === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Title</span>
            <input value={draft.title} maxLength={80} onChange={(event) => setField('title', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Message</span>
            <textarea value={draft.body} maxLength={240} rows={4} onChange={(event) => setField('body', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <div className="text-sm">
            <span className="font-medium text-slate-700">Image</span>
            <div className="mt-1 flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                Upload image
                <input type="file" accept="image/*" className="hidden" onChange={uploadImage} />
              </label>
              {draft.imageUrl ? (
                <button type="button" onClick={() => setField('imageUrl', '')} className="text-xs text-slate-500 underline">Remove</button>
              ) : null}
            </div>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Button text</span>
            <input value={draft.buttonText} maxLength={24} onChange={(event) => setField('buttonText', event.target.value)} placeholder="Shop now" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <div className="text-sm">
            <span className="font-medium text-slate-700">Button path</span>
            <div className="mt-1">
              <MobilePathPicker value={draft.path} onChange={(value) => setField('path', value)} />
            </div>
          </div>
          <button
            type="button"
            disabled={sending || loading}
            onClick={send}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send notification
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {draft.imageUrl ? <img src={draft.imageUrl} alt="" className="h-36 w-full object-cover" /> : null}
            <div className="space-y-2 p-4">
              <p className="text-sm font-semibold text-slate-900">{draft.title || 'Title'}</p>
              <p className="text-sm text-slate-600">{draft.body || 'Message'}</p>
              {draft.buttonText ? (
                <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{draft.buttonText}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Sent</h2>
        {loading ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : null}
        {!loading && !history.length ? <p className="mt-2 text-sm text-slate-500">Nothing sent yet.</p> : null}
        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {history.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-slate-500">{item.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.audience === 'all' ? 'Android and iOS' : item.audience === 'ios' ? 'iOS' : 'Android'}
                  {item.buttonText ? ` · ${item.buttonText} → ${item.path}` : ''}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {item.targetCount ? `${item.successCount}/${item.targetCount} delivered` : 'No phones registered'}
                {item.error ? ` · ${item.error}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
