'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import StoreDropdown from '@/components/store/StoreDropdown'
import { useAuth } from '@/lib/useAuth'
import { BOTTOM_NAV_PAGE_OPTIONS } from '@/lib/bottomNavLinkChoices'
import { slugifyCategory, toPublicCategoryPath } from '@/lib/categorySlug'
import { flattenShowcaseCategories } from '@/lib/showcaseBannerLinks'

let cachedOptions = null
let loadingPromise = null

function loadPathOptions(getToken) {
  if (cachedOptions) return Promise.resolve(cachedOptions)
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const [categoryRes, brandRes, pageRes] = await Promise.all([
        axios.get('/api/categories').catch(() => ({ data: {} })),
        axios.get('/api/store/brands', { headers }).catch(() => ({ data: {} })),
        axios.get('/api/store/email-marketing/pages', { headers }).catch(() => ({ data: {} })),
      ])

      const pages = BOTTOM_NAV_PAGE_OPTIONS.map((page) => ({
        value: page.value,
        label: page.label,
        group: 'Pages',
      }))

      const seenPages = new Set(pages.map((page) => page.value))
      const landingPages = (pageRes.data?.pages || []).flatMap((page) => {
        const slug = String(page?.slug || '').trim()
        if (!slug) return []
        const value = `/c/${slug}`
        if (seenPages.has(value)) return []
        seenPages.add(value)
        return [{ value, label: page.title || slug, group: 'Pages' }]
      })

      const categories = flattenShowcaseCategories(categoryRes.data?.categories || []).map((category) => ({
        value: toPublicCategoryPath(category.slug),
        label: category.label,
        group: 'Categories',
      }))

      const seenBrands = new Set()
      const brands = (brandRes.data?.brands || []).flatMap((brand) => {
        const name = String(brand?.name || '').trim()
        const slug = slugifyCategory(name)
        if (!name || !slug || seenBrands.has(slug)) return []
        seenBrands.add(slug)
        return [{ value: `/brand/${slug}`, label: name, group: 'Brands' }]
      })

      cachedOptions = [...pages, ...landingPages, ...categories, ...brands]
      return cachedOptions
    })().catch((error) => {
      loadingPromise = null
      throw error
    })
  }
  return loadingPromise
}

export default function MobilePathPicker({
  value = '',
  onChange,
  placeholder = 'Choose a page, category, or brand',
}) {
  const { getToken } = useAuth()
  const [options, setOptions] = useState(() => cachedOptions || [])
  const [customOpen, setCustomOpen] = useState(false)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    let active = true
    loadPathOptions(getToken)
      .then((next) => {
        if (!active) return
        setOptions(next)
        const current = valueRef.current
        if (current && !next.some((option) => option.value === current)) setCustomOpen(true)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [getToken])

  const matched = options.some((option) => option.value === value)

  return (
    <div className="space-y-1.5">
      <StoreDropdown
        portal
        searchable
        value={matched ? value : ''}
        onChange={(next) => {
          setCustomOpen(false)
          onChange(next)
        }}
        placeholder={placeholder}
        searchPlaceholder="Search pages, categories, brands"
        options={options}
      />
      {customOpen ? (
        <input
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/your-page or https://"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
      ) : (
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className="text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
        >
          {value && !matched ? value : 'Use a custom link'}
        </button>
      )}
    </div>
  )
}
