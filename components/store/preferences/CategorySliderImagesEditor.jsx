'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Languages, Loader2, Plus, Save, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'
import { readableUploadUrl } from '@/lib/readableUploadUrl'
import { slugifyCategory, toPublicCategoryPath } from '@/lib/categorySlug'

function sliderImage(category) {
  const own = String(category?.image || '').trim()
  if (own) return own
  const child = (category?.children || []).find((item) => String(item?.image || '').trim())
  return child ? String(child.image).trim() : ''
}

function displayPath(category) {
  const url = String(category?.url || '').trim()
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/') && !url.startsWith('/category/')) return url
  return toPublicCategoryPath(category?.slug)
}

function parsePathInput(value, currentSlug) {
  const raw = String(value || '').trim()
  if (!raw) return { error: 'Path is required' }
  if (/^https?:\/\//i.test(raw)) return { url: raw, slug: currentSlug }
  const path = raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`
  if (path.startsWith('/category/')) {
    const slug = slugifyCategory(path.split('/').filter(Boolean).pop() || '')
    if (!slug) return { error: 'Enter a path like /category/electronics' }
    return { url: `/category/${slug}`, slug }
  }
  if (path.startsWith('/')) return { url: path, slug: currentSlug }
  return { error: 'Path must start with / or https://' }
}

export default function CategorySliderImagesEditor() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [drafts, setDrafts] = useState({})
  const [files, setFiles] = useState({})
  const [savingId, setSavingId] = useState('')
  const [translatingId, setTranslatingId] = useState('')
  const [translatingAll, setTranslatingAll] = useState(false)
  const [adding, setAdding] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newDraft, setNewDraft] = useState({ name: '', nameAr: '', path: '' })
  const [newFile, setNewFile] = useState(null)

  const loadCategories = useCallback(async () => {
    const token = await getToken()
    const { data } = await axios.get('/api/store/categories', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    setCategories(Array.isArray(data?.categories) ? data.categories : [])
  }, [getToken])

  useEffect(() => {
    let active = true
    setLoading(true)
    loadCategories()
      .catch((error) => {
        console.error(error)
        toast.error('Failed to load category slider')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadCategories])

  const cards = useMemo(() => {
    return categories
      .filter((category) => {
        const slug = String(category?.slug || '').trim().toLowerCase()
        return slug && !String(category?.parentId || '').trim()
      })
      .map((category) => ({
        id: String(category._id),
        name: String(category.name || ''),
        nameAr: String(category.nameAr || ''),
        slug: String(category.slug || ''),
        path: displayPath(category),
        image: sliderImage(category),
        isActive: category.isActive !== false,
      }))
  }, [categories])

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current }
      for (const card of cards) {
        if (!next[card.id]) {
          next[card.id] = {
            name: card.name,
            nameAr: card.nameAr,
            path: card.path,
            image: card.image,
          }
        }
      }
      return next
    })
  }, [cards])

  const requestArabicName = async (text, slug) => {
    const english = String(text || '').trim()
    if (!english) {
      toast.error('Enter the English category name first')
      return ''
    }
    const token = await getToken()
    const { data } = await axios.post('/api/store/categories/translate-arabic', {
      text: english,
      slug,
      kind: 'name',
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const translated = String(data?.nameAr || data?.descriptionAr || '').trim()
    if (!translated) {
      toast.error('Could not translate the category name')
    }
    return translated
  }

  const translateCard = async (card) => {
    const draft = drafts[card.id] || card
    try {
      setTranslatingId(card.id)
      const translated = await requestArabicName(draft.name, card.slug)
      if (!translated) return
      patchDraft(card.id, { nameAr: translated })
      toast.success('Arabic name filled')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to translate the category name')
    } finally {
      setTranslatingId('')
    }
  }

  const translateNewCategory = async () => {
    try {
      setTranslatingId('new')
      const translated = await requestArabicName(newDraft.name, '')
      if (!translated) return
      setNewDraft((current) => ({ ...current, nameAr: translated }))
      toast.success('Arabic name filled')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to translate the category name')
    } finally {
      setTranslatingId('')
    }
  }

  const translateEmptyArabic = async () => {
    const pending = cards.filter((card) => {
      const draft = drafts[card.id] || card
      return String(draft.name || '').trim() && !String(draft.nameAr || '').trim()
    })
    if (!pending.length) {
      toast.success('Arabic names are already filled')
      return
    }

    try {
      setTranslatingAll(true)
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const { data } = await axios.post('/api/store/categories/translate-arabic', {
        kind: 'name',
        items: pending.map((card) => ({
          id: card.id,
          text: String((drafts[card.id] || card).name || '').trim(),
          slug: card.slug,
        })),
      }, { headers })

      const byId = new Map((Array.isArray(data?.items) ? data.items : []).map((item) => [
        String(item.id),
        String(item.nameAr || '').trim(),
      ]))
      let saved = 0
      for (const card of pending) {
        const nameAr = byId.get(card.id)
        if (!nameAr) continue
        const draft = drafts[card.id] || card
        await axios.put(`/api/store/categories/${card.id}`, {
          name: String(draft.name || card.name).trim(),
          nameAr,
          slug: card.slug,
        }, { headers })
        saved += 1
        setCategories((current) => current.map((category) => (
          String(category._id) === card.id ? { ...category, nameAr } : category
        )))
        setDrafts((current) => ({
          ...current,
          [card.id]: { ...(current[card.id] || card), nameAr },
        }))
      }
      if (!saved) {
        toast.error('Could not translate the category names')
        return
      }
      toast.success(saved === 1 ? 'Filled 1 Arabic name' : `Filled ${saved} Arabic names`)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to translate the category names')
    } finally {
      setTranslatingAll(false)
    }
  }

  const patchDraft = (id, patch) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }))
  }

  const saveCard = async (card) => {
    const draft = drafts[card.id] || card
    const name = String(draft.name || '').trim()
    if (!name) {
      toast.error('Category name is required')
      return
    }
    const parsed = parsePathInput(draft.path, card.slug)
    if (parsed.error) {
      toast.error(parsed.error)
      return
    }

    try {
      setSavingId(card.id)
      const token = await getToken()
      let image = card.image
      const file = files[card.id]?.file
      if (file) {
        if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
          toast.error('Use a JPG, PNG, or WebP image')
          return
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image must be 5MB or smaller')
          return
        }
        const base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Failed to read image'))
          reader.readAsDataURL(file)
        })
        const { data } = await axios.post('/api/store/upload-category-image', {
          base64Image,
          fileName: `${parsed.slug || card.slug || 'category'}-slider`,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        })
        image = String(data?.url || '').trim()
        if (!image) throw new Error('Upload did not return an image')
      }

      await axios.put(`/api/store/categories/${card.id}`, {
        name,
        nameAr: String(draft.nameAr || '').trim(),
        slug: parsed.slug,
        url: parsed.url,
        image,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const saved = {
        name,
        nameAr: String(draft.nameAr || '').trim(),
        slug: parsed.slug,
        path: parsed.url.startsWith('/category/') ? parsed.url : toPublicCategoryPath(parsed.slug),
        image,
      }
      setCategories((current) => current.map((category) => (
        String(category._id) === card.id
          ? { ...category, name: saved.name, nameAr: saved.nameAr, slug: saved.slug, url: parsed.url, image: saved.image }
          : category
      )))
      setDrafts((current) => ({
        ...current,
        [card.id]: {
          name: saved.name,
          nameAr: saved.nameAr,
          path: parsed.url,
          image: saved.image,
        },
      }))
      setFiles((current) => {
        const previous = current[card.id]?.preview
        if (previous) URL.revokeObjectURL(previous)
        const next = { ...current }
        delete next[card.id]
        return next
      })
      toast.success(`${name} saved`)
    } catch (error) {
      console.error(error)
      toast.error(error?.response?.data?.error || 'Failed to save category')
    } finally {
      setSavingId('')
    }
  }

  const createCategory = async () => {
    const name = String(newDraft.name || '').trim()
    if (!name) {
      toast.error('Category name is required')
      return
    }
    const fallbackSlug = slugifyCategory(name)
    const parsed = String(newDraft.path || '').trim()
      ? parsePathInput(newDraft.path, fallbackSlug)
      : { url: toPublicCategoryPath(fallbackSlug), slug: fallbackSlug }
    if (parsed.error || !parsed.slug) {
      toast.error(parsed.error || 'Enter a path like /category/electronics')
      return
    }

    try {
      setCreating(true)
      const token = await getToken()
      let image = ''
      const file = newFile?.file
      if (file) {
        if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
          toast.error('Use a JPG, PNG, or WebP image')
          return
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image must be 5MB or smaller')
          return
        }
        const base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Failed to read image'))
          reader.readAsDataURL(file)
        })
        const { data } = await axios.post('/api/store/upload-category-image', {
          base64Image,
          fileName: `${parsed.slug}-slider`,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        })
        image = String(data?.url || '').trim()
        if (!image) throw new Error('Upload did not return an image')
      }

      await axios.post('/api/store/categories', {
        name,
        nameAr: String(newDraft.nameAr || '').trim(),
        slug: parsed.slug,
        url: parsed.url,
        image: image || null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (newFile?.preview) URL.revokeObjectURL(newFile.preview)
      setNewFile(null)
      setNewDraft({ name: '', nameAr: '', path: '' })
      setAdding(false)
      await loadCategories()
      toast.success(`${name} added`)
    } catch (error) {
      console.error(error)
      toast.error(error?.response?.data?.error || 'Failed to add category')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Category slider</h2>
          <p className="mt-1 text-xs text-slate-500">
            Every top-level category from the store appears here and on the homepage. Each card is 127×110 with an 80×80 image. Edit the image, name, and path, then save. A category path looks like /category/electronics. You can also use /shop or a full https:// link.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={translateEmptyArabic}
            disabled={translatingAll || creating || Boolean(savingId)}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {translatingAll ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
            {translatingAll ? 'Translating...' : 'Translate Arabic'}
          </button>
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus size={12} />
            Add category
          </button>
        </div>
      </div>
      {adding ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 sm:grid-cols-[112px_minmax(0,1fr)]">
          <div>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[#F4F6F8]">
              {newFile?.preview ? (
                <img src={newFile.preview} alt="" className="h-full w-full object-contain p-2" />
              ) : (
                <span className="px-2 text-center text-[11px] text-slate-400">80×80</span>
              )}
            </div>
            <label className={`mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 ${creating ? 'pointer-events-none opacity-60' : ''}`}>
              <Upload size={12} />
              {newFile?.preview ? 'Replace' : 'Add image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                disabled={creating}
                onChange={(event) => {
                  const file = event.target.files?.[0] || null
                  setNewFile((current) => {
                    if (current?.preview) URL.revokeObjectURL(current.preview)
                    return file ? { file, preview: URL.createObjectURL(file) } : null
                  })
                  event.target.value = ''
                }}
              />
            </label>
            <p className="mt-1 text-center text-[10px] text-slate-400">80×80 in a 127×110 card</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Name</span>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={newDraft.name}
                disabled={creating}
                onChange={(event) => setNewDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                Arabic name
                <button
                  type="button"
                  onClick={translateNewCategory}
                  disabled={creating || translatingAll || translatingId === 'new' || !newDraft.name.trim()}
                  className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {translatingId === 'new' ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
                  Translate
                </button>
              </span>
              <input
                dir="rtl"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={newDraft.nameAr}
                disabled={creating}
                onChange={(event) => setNewDraft((current) => ({ ...current, nameAr: event.target.value }))}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">Path</span>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={newDraft.path}
                disabled={creating}
                placeholder="/category/electronics"
                onChange={(event) => setNewDraft((current) => ({ ...current, path: event.target.value }))}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={createCategory}
                disabled={creating}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add category
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {cards.length ? (
        <div className="mt-4 space-y-3">
          {cards.map((card) => {
            const draft = drafts[card.id] || card
            const preview = files[card.id]?.preview || readableUploadUrl(draft.image)
            const busy = savingId === card.id
            return (
              <div key={card.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                <div>
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[#F4F6F8]">
                    {preview ? (
                      <img src={preview} alt="" className="h-full w-full object-contain p-2" />
                    ) : (
                      <span className="px-2 text-center text-[11px] text-slate-400">No image</span>
                    )}
                  </div>
                  <label className={`mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                    <Upload size={12} />
                    {preview ? 'Replace' : 'Add image'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null
                        setFiles((current) => {
                          const previous = current[card.id]?.preview
                          if (previous) URL.revokeObjectURL(previous)
                          return {
                            ...current,
                            [card.id]: file ? { file, preview: URL.createObjectURL(file) } : null,
                          }
                        })
                        event.target.value = ''
                      }}
                    />
                  </label>
                  <p className="mt-1 text-center text-[10px] text-slate-400">80×80 in a 127×110 card</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
                      Name
                      {card.isActive ? null : <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Inactive</span>}
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      value={draft.name}
                      disabled={busy}
                      onChange={(event) => patchDraft(card.id, { name: event.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                      Arabic name
                      <button
                        type="button"
                        onClick={() => translateCard(card)}
                        disabled={busy || translatingAll || translatingId === card.id || !String(draft.name || '').trim()}
                        className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                      >
                        {translatingId === card.id ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
                        Translate
                      </button>
                    </span>
                    <input
                      dir="rtl"
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      value={draft.nameAr}
                      disabled={busy}
                      onChange={(event) => patchDraft(card.id, { nameAr: event.target.value })}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Path</span>
                    <input
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      value={draft.path}
                      disabled={busy}
                      placeholder="/category/electronics"
                      onChange={(event) => patchDraft(card.id, { path: event.target.value })}
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => saveCard(card)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No categories yet. Use Add category to create the first card.</p>
      )}
    </div>
  )
}
