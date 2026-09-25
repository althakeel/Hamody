'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { Check, ChevronDown, ChevronUp, Loader2, Plus, Save, Search, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'
import {
  createLargeBannerSlide,
  normalizeLargeBannerSliderItemsForEditor,
  normalizeFullWidthBannerHeight,
  FULL_WIDTH_BANNER_HEIGHT_MIN,
  FULL_WIDTH_BANNER_HEIGHT_MAX,
  FULL_WIDTH_BANNER_HEIGHT_DEFAULT,
  normalizeLowerFullWidthBannerHeight,
  LOWER_FULL_WIDTH_BANNER_HEIGHT_MIN,
  LOWER_FULL_WIDTH_BANNER_HEIGHT_MAX,
  LOWER_FULL_WIDTH_BANNER_HEIGHT_DEFAULT,
  normalizeFullWidthBannerGap,
  FULL_WIDTH_BANNER_GAP_MIN,
  FULL_WIDTH_BANNER_GAP_MAX,
  FULL_WIDTH_BANNER_GAP_DEFAULT,
} from '@/lib/shopShowcaseLargeBanners'
import { hasShowcaseBannerImage, serializeShowcaseImageFields } from '@/lib/showcaseBannerImages'
import {
  createShowcaseLinkFromChoice,
  flattenShowcaseCategories,
  inferShowcaseLinkType,
  readShowcaseLinkChoice,
} from '@/lib/showcaseBannerLinks'

const createBanner = (overrides = {}) => ({
  image: '',
  tabletImage: '',
  mobileImage: '',
  imageAr: '',
  tabletImageAr: '',
  mobileImageAr: '',
  title: '',
  subtitle: '',
  buttonText: '',
  link: '',
  linkType: '',
  targetBlank: false,
  file: null,
  previewUrl: '',
  ...overrides,
})

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

const IMAGE_GROUPS = [
  {
    id: 'en',
    title: 'English images',
    hint: 'Used when the storefront is English. Also used as fallback if an Arabic image is empty.',
    slots: [
      { key: 'image', label: 'Desktop' },
      { key: 'tabletImage', label: 'Tablet' },
      { key: 'mobileImage', label: 'Mobile' },
    ],
  },
  {
    id: 'ar',
    title: 'Arabic images',
    hint: 'Used when the storefront is Arabic. Falls back to the English image for that device if empty.',
    slots: [
      { key: 'imageAr', label: 'Desktop' },
      { key: 'tabletImageAr', label: 'Tablet' },
      { key: 'mobileImageAr', label: 'Mobile' },
    ],
  },
]

const TOP_BANNER_SIZES = {
  image: { width: 3054, height: 1080 },
  tabletImage: { width: 1536, height: 544 },
  mobileImage: { width: 768, height: 432 },
  imageAr: { width: 3054, height: 1080 },
  tabletImageAr: { width: 1536, height: 544 },
  mobileImageAr: { width: 768, height: 432 },
}

const BOTTOM_BANNER_SIZES = {
  image: { width: 3054, height: 370 },
  tabletImage: { width: 1536, height: 186 },
  mobileImage: { width: 768, height: 200 },
  imageAr: { width: 3054, height: 370 },
  tabletImageAr: { width: 1536, height: 186 },
  mobileImageAr: { width: 768, height: 200 },
}

function getFullWidthBannerSizes(height = FULL_WIDTH_BANNER_HEIGHT_DEFAULT) {
  const desktopHeight = normalizeFullWidthBannerHeight(height)
  const tabletHeight = Math.round(desktopHeight * 0.6)
  const mobileHeight = Math.min(260, Math.round(desktopHeight * 0.5))
  return {
    image: { width: 1920, height: desktopHeight },
    tabletImage: { width: 1024, height: tabletHeight },
    mobileImage: { width: 768, height: mobileHeight },
    imageAr: { width: 1920, height: desktopHeight },
    tabletImageAr: { width: 1024, height: tabletHeight },
    mobileImageAr: { width: 768, height: mobileHeight },
  }
}

function getLowerFullWidthBannerSizes(height = LOWER_FULL_WIDTH_BANNER_HEIGHT_DEFAULT) {
  const desktopHeight = normalizeLowerFullWidthBannerHeight(height)
  const tabletHeight = Math.round(desktopHeight * 0.7)
  const mobileHeight = Math.min(180, Math.round(desktopHeight * 0.6))
  return {
    image: { width: 1920, height: desktopHeight },
    tabletImage: { width: 1024, height: tabletHeight },
    mobileImage: { width: 768, height: mobileHeight },
    imageAr: { width: 1920, height: desktopHeight },
    tabletImageAr: { width: 1024, height: tabletHeight },
    mobileImageAr: { width: 768, height: mobileHeight },
  }
}

const PRODUCT_BANNER_SIZES = {
  image: { width: 1225, height: 639 },
  tabletImage: { width: 800, height: 418 },
  mobileImage: { width: 640, height: 334 },
  imageAr: { width: 1225, height: 639 },
  tabletImageAr: { width: 800, height: 418 },
  mobileImageAr: { width: 640, height: 334 },
}

function gcd(first, second) {
  return second ? gcd(second, first % second) : first
}

function formatImageRatio(width, height) {
  const divisor = gcd(width, height)
  const ratioWidth = width / divisor
  const ratioHeight = height / divisor
  if (ratioWidth <= 40 && ratioHeight <= 40) {
    return `${ratioWidth}:${ratioHeight}`
  }
  return `${(width / height).toFixed(2)}:1`
}

function DesignerSizeGuide({ sizes }) {
  const [open, setOpen] = useState(false)
  const desktop = sizes?.image || {}
  const tablet = sizes?.tabletImage || {}
  const mobile = sizes?.mobileImage || {}
  const rows = [
    { label: 'Desktop', size: desktop },
    { label: 'Tablet', size: tablet },
    { label: 'Mobile', size: mobile },
  ]

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {rows.map((row) => (
            <span
              key={row.label}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
            >
              {row.label} {row.size.width}×{row.size.height}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          {open ? 'Hide designer notes' : 'Designer notes'}
        </button>
      </div>
      {open ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500">
            Upload desktop, tablet, and mobile. Add Arabic files only if the Arabic storefront should use different art. Keep the offer in the center — wide screens crop the sides.
          </p>
          <ul className="mt-2 list-disc space-y-1 ps-4 text-xs text-slate-500">
            <li>Full screen on all monitors. Do not design for 1400 px inner width.</li>
            <li>JPG or PNG, landscape. Optional 4K: 2560 × {desktop.height} px.</li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function ShowcaseImageSlot({ label, size, value, onUpload, onClear }) {
  const width = Number(size?.width) || 0
  const height = Number(size?.height) || 0
  const ratio = width && height ? formatImageRatio(width, height) : ''

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="mb-1.5">
        <div className="text-xs font-semibold text-slate-700">{label}</div>
        {width && height ? (
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
            Width {width} px · Height {height} px · Ratio {ratio}
          </p>
        ) : null}
      </div>
      <div
        className="relative mb-2 overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50"
        style={{ aspectRatio: width && height ? `${width} / ${height}` : '16 / 9' }}
      >
        {value ? (
          <Image src={value} alt={label} fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-400">No image</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
          <Upload size={12} />
          Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              onUpload(event.target.files?.[0] || null)
              event.target.value = ''
            }}
          />
        </label>
        {value ? (
          <button type="button" onClick={onClear} className="text-xs font-medium text-red-600 hover:underline">
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}

function countFilledSlots(item, slots) {
  return slots.filter((slot) => String(item?.[slot.key] || '').trim()).length
}

function getLinkSummary(link, linkType) {
  const choice = readShowcaseLinkChoice(link, linkType)
  if (choice.type === 'category') return choice.value ? `Category · ${choice.value}` : 'Category · not selected'
  if (choice.type === 'product') return choice.value ? `Product · ${choice.value}` : 'Product · not selected'
  return choice.value ? `Custom URL · ${choice.value}` : 'Custom URL · not set'
}

function SmoothPanel({ open, children }) {
  return (
    <div
      className={`grid min-w-0 transition-[grid-template-rows] duration-300 ease-out ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className={`min-h-0 min-w-0 ${open ? 'overflow-visible' : 'overflow-hidden'}`}>
        <div className={`min-w-0 border-t border-slate-200 px-3 pb-3 pt-3 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}>
          {children}
        </div>
      </div>
    </div>
  )
}

function VisibilitySwitch({ enabled, onChange }) {
  return (
    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={!!enabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="relative h-6 w-11 rounded-full bg-slate-300 transition after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-5" />
      <span className="text-xs font-medium text-slate-700">{enabled ? 'Enabled' : 'Disabled'}</span>
    </label>
  )
}

function AccordionRow({ title, summary, preview, open, onToggle, children, actions, className = '' }) {
  return (
    <div className={`min-w-0 rounded-xl border border-slate-200 bg-white ${className}`.trim()}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          {preview ? (
            <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
              <Image src={preview} alt="" fill unoptimized className="object-cover" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {summary ? <div className="truncate text-xs text-slate-500">{summary}</div> : null}
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {actions}
      </div>
      <SmoothPanel open={open}>{children}</SmoothPanel>
    </div>
  )
}

const LINK_TYPE_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
  { value: 'custom', label: 'Custom URL' },
]

function useClickOutside(open, onClose) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) onClose()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open, onClose])

  return rootRef
}

function ShowcaseSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useClickOutside(open, () => setOpen(false))
  const selected = options.find((option) => option.value === value) || options[0]

  return (
    <div ref={rootRef} className="relative z-30 min-w-0 w-full max-w-full">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-w-0 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm outline-none hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="relative z-50 mt-2 w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`flex w-full min-w-0 items-center justify-between px-3 py-2.5 text-left text-sm ${
                  isSelected ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {isSelected ? <Check size={16} className="shrink-0 text-emerald-600" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function ShowcaseSearchDropdown({
  label,
  placeholder,
  query,
  onQueryChange,
  items,
  selectedValue,
  selectedLabel,
  emptyText,
  onSelect,
  renderItem,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useClickOutside(open, () => setOpen(false))

  return (
    <div ref={rootRef} className="relative z-20 min-w-0 w-full max-w-full">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left shadow-sm outline-none hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        aria-expanded={open}
      >
        <span className={`min-w-0 truncate text-sm ${selectedLabel ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="relative z-50 mt-2 w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="relative min-w-0">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search..."
                className="w-full min-w-0 rounded-md border border-slate-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-x-hidden overflow-y-auto py-1">
            {items.length ? items.map((item) => {
              const isSelected = item.value === selectedValue
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onSelect(item)
                    setOpen(false)
                  }}
                  className={`flex w-full min-w-0 items-start justify-between gap-2 px-3 py-2.5 text-left ${
                    isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="min-w-0 flex-1 overflow-hidden">{renderItem(item, isSelected)}</span>
                  {isSelected ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : null}
                </button>
              )
            }) : (
              <p className="px-3 py-3 text-sm text-slate-500">{emptyText}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ShowcaseLinkAccordion({ flat = false, ...props }) {
  const [open, setOpen] = useState(false)
  const summary = getLinkSummary(props.link, props.linkType)

  if (flat) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <p className="text-sm font-semibold text-slate-900">Where this slide goes</p>
        <p className="mb-3 text-xs text-slate-500">{summary}</p>
        <ShowcaseLinkFields {...props} />
      </div>
    )
  }

  return (
    <AccordionRow
      title="Link"
      summary={`${summary} · click to ${open ? 'hide' : 'edit'}`}
      open={open}
      onToggle={() => setOpen((current) => !current)}
      className="bg-slate-50/70"
    >
      <ShowcaseLinkFields {...props} />
    </AccordionRow>
  )
}

function ShowcaseLinkFields({
  link,
  linkType,
  targetBlank,
  categories,
  products,
  onLinkChange,
  onLinkTypeChange,
  onTargetBlankChange,
}) {
  const choice = readShowcaseLinkChoice(link, linkType)
  const [categoryQuery, setCategoryQuery] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const categoryRows = flattenShowcaseCategories(categories)
  const categorySearch = categoryQuery.trim().toLowerCase()
  const filteredCategories = categoryRows.filter((category) => {
    if (!categorySearch) return true
    return `${category.label} ${category.slug}`.toLowerCase().includes(categorySearch)
  })
  const productSearch = productQuery.trim().toLowerCase()
  const productList = Array.isArray(products) ? products : []
  const filteredProducts = productList.filter((product) => {
    if (!productSearch) return true
    return [product?.name, product?.slug, product?.sku]
      .some((value) => String(value || '').toLowerCase().includes(productSearch))
  })

  const applyChoice = (type, value, extra = {}) => {
    onLinkTypeChange(type)
    onLinkChange(createShowcaseLinkFromChoice(type, value, extra))
  }

  const selectType = (type) => {
    onLinkTypeChange(type)
    const inferred = inferShowcaseLinkType(link)
    if (type !== 'custom' && inferred.type !== type) {
      onLinkChange('')
    }
    if (type !== 'product') setProductQuery('')
    if (type !== 'category') setCategoryQuery('')
  }

  const selectedCategory = categoryRows.find((category) => category.slug === choice.value)
  const selectedProduct = productList.find((product) => (product?.slug || '') === choice.value)

  return (
    <div className="grid min-w-0 gap-3">
      <ShowcaseSelect
        label="Link to"
        value={choice.type}
        options={LINK_TYPE_OPTIONS}
        onChange={selectType}
      />

      {choice.type === 'category' ? (
        <ShowcaseSearchDropdown
          label="Category"
          placeholder="Select a category"
          query={categoryQuery}
          onQueryChange={setCategoryQuery}
          items={filteredCategories.map((category) => ({
            value: category.slug,
            label: category.label,
          }))}
          selectedValue={choice.value}
          selectedLabel={selectedCategory?.label || choice.value}
          emptyText={categorySearch ? 'No categories match this search' : 'No categories found'}
          onSelect={(item) => applyChoice('category', item.value)}
          renderItem={(item, isSelected) => (
            <span className={`block truncate text-sm ${isSelected ? 'font-semibold text-emerald-800' : 'text-slate-700'}`}>
              {item.label}
            </span>
          )}
        />
      ) : null}

      {choice.type === 'product' ? (
        <ShowcaseSearchDropdown
          label="Product"
          placeholder="Select a product"
          query={productQuery}
          onQueryChange={setProductQuery}
          items={filteredProducts.map((product) => ({
            value: product?.slug || '',
            label: product?.name || product?.slug || '',
            sku: product?.sku || product?.slug || '',
            useProductsPath: Boolean(product?.useProductsPath),
          }))}
          selectedValue={choice.value}
          selectedLabel={selectedProduct?.name || choice.value}
          emptyText={productSearch ? 'No products match this search' : 'No products loaded'}
          onSelect={(item) => applyChoice('product', item.value, { useProductsPath: item.useProductsPath })}
          renderItem={(item, isSelected) => (
            <span className="block min-w-0 max-w-full overflow-hidden">
              <span className={`block truncate text-sm ${isSelected ? 'font-semibold text-emerald-800' : 'text-slate-800'}`}>
                {item.label}
              </span>
              <span className="block truncate text-xs text-slate-500">{item.sku}</span>
            </span>
          )}
        />
      ) : null}

      {choice.type === 'custom' ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Custom URL</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={choice.value}
            onChange={(event) => applyChoice('custom', event.target.value)}
            placeholder="/shop or https://example.com"
          />
        </label>
      ) : null}

      <label className="inline-flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
        <span className="text-sm text-slate-700">Open in new window</span>
        <input
          type="checkbox"
          checked={Boolean(targetBlank)}
          onChange={(event) => onTargetBlankChange(event.target.checked)}
        />
      </label>
    </div>
  )
}

function ShowcaseLocaleImageGroups({ item, recommendedSizes, onUpload, onChange, defaultOpen = 'en' }) {
  const [openGroups, setOpenGroups] = useState({ [defaultOpen]: true })

  return (
    <div className="space-y-3">
      {IMAGE_GROUPS.map((group) => {
        const filled = countFilledSlots(item, group.slots)
        const isOpen = !!openGroups[group.id]

        return (
          <AccordionRow
            key={group.id}
            title={group.title}
            summary={`${filled} of ${group.slots.length} uploaded · click to ${isOpen ? 'hide' : 'edit'}`}
            open={isOpen}
            onToggle={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
            className="bg-slate-50/70"
          >
            <p className="mb-3 text-xs text-slate-500">{group.hint}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {group.slots.map((slot) => (
                <ShowcaseImageSlot
                  key={slot.key}
                  label={slot.label}
                  size={recommendedSizes?.[slot.key]}
                  value={item[slot.key]}
                  onUpload={(file) => onUpload(slot.key, file)}
                  onClear={() => onChange(slot.key, '')}
                />
              ))}
            </div>
          </AccordionRow>
        )
      })}
    </div>
  )
}

function slideOrdinalLabel(index) {
  if (index === 0) return '1st in slider'
  if (index === 1) return '2nd in slider'
  if (index === 2) return '3rd in slider'
  return `${index + 1}th in slider`
}

function LargeBannerSlideCard({
  slide,
  index,
  total,
  recommendedSizes,
  open,
  onToggle,
  onMove,
  onRemove,
  onUpload,
  onChange,
  categoryOptions,
  productOptions,
}) {
  return (
    <AccordionRow
      title={`Slide ${index + 1}`}
      summary={slide.image || slide.imageAr ? `${slideOrdinalLabel(index)} · click to ${open ? 'hide' : 'edit'}` : 'Upload a desktop image, then add tablet and mobile if you have them'}
      preview={slide.image || slide.imageAr || ''}
      open={open}
      onToggle={onToggle}
      actions={(
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="Move up (earlier in slider)"
            className="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="Move down (later in slider)"
            className="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      )}
    >
      <div className="space-y-3">
        <ShowcaseLocaleImageGroups
          item={slide}
          recommendedSizes={recommendedSizes}
          onUpload={onUpload}
          onChange={onChange}
        />
        <ShowcaseLinkAccordion
          flat
          link={slide.link}
          linkType={slide.linkType}
          targetBlank={slide.targetBlank}
          categories={categoryOptions}
          products={productOptions}
          onLinkChange={(value) => onChange('link', value)}
          onLinkTypeChange={(value) => onChange('linkType', value)}
          onTargetBlankChange={(value) => onChange('targetBlank', value)}
        />
      </div>
    </AccordionRow>
  )
}

const DEFAULT_FORM = {
  mainBannerEnabled: true,
  topBannerEnabled: true,
  bottomBannerEnabled: true,
  fullWidthBannerEnabled: false,
  lowerFullWidthBannerEnabled: false,
  topBannerImage: '',
  topBannerTitle: '',
  topBannerSubtitle: '',
  topBannerCtaText: '',
  topBannerTitleEnabled: true,
  topBannerSubtitleEnabled: true,
  topBannerCtaEnabled: true,
  topBannerCtaBgColor: '#ef2d2d',
  topBannerCtaTextColor: '#ffffff',
  topBannerLink: '/shop',
  topBannerSliderEnabled: true,
  topBannerSliderInterval: 4000,
  topBannerSliderItems: [createLargeBannerSlide({ alt: 'Top banner 1' })],
  bottomBannerImage: '',
  bottomBannerTitle: '',
  bottomBannerSubtitle: '',
  bottomBannerCtaText: '',
  bottomBannerTitleEnabled: true,
  bottomBannerSubtitleEnabled: true,
  bottomBannerCtaEnabled: true,
  bottomBannerCtaBgColor: '#ef2d2d',
  bottomBannerCtaTextColor: '#ffffff',
  bottomBannerLink: '/shop',
  bottomBannerSliderEnabled: true,
  bottomBannerSliderInterval: 4000,
  bottomBannerSliderItems: [createLargeBannerSlide({ alt: 'Bottom banner 1' })],
  fullWidthBannerImage: '',
  fullWidthBannerTitle: '',
  fullWidthBannerSubtitle: '',
  fullWidthBannerCtaText: '',
  fullWidthBannerTitleEnabled: false,
  fullWidthBannerSubtitleEnabled: false,
  fullWidthBannerCtaEnabled: false,
  fullWidthBannerCtaBgColor: '#ef2d2d',
  fullWidthBannerCtaTextColor: '#ffffff',
  fullWidthBannerLink: '/shop',
  fullWidthBannerSliderEnabled: true,
  fullWidthBannerSliderInterval: 4000,
  fullWidthBannerDesktopHeight: FULL_WIDTH_BANNER_HEIGHT_DEFAULT,
  fullWidthBannerSliderItems: [createLargeBannerSlide({ alt: 'Full-width banner 1' })],
  lowerFullWidthBannerImage: '',
  lowerFullWidthBannerTitle: '',
  lowerFullWidthBannerSubtitle: '',
  lowerFullWidthBannerCtaText: '',
  lowerFullWidthBannerTitleEnabled: false,
  lowerFullWidthBannerSubtitleEnabled: false,
  lowerFullWidthBannerCtaEnabled: false,
  lowerFullWidthBannerCtaBgColor: '#ef2d2d',
  lowerFullWidthBannerCtaTextColor: '#ffffff',
  lowerFullWidthBannerLink: '/shop',
  lowerFullWidthBannerSliderEnabled: true,
  lowerFullWidthBannerSliderInterval: 4000,
  lowerFullWidthBannerDesktopHeight: LOWER_FULL_WIDTH_BANNER_HEIGHT_DEFAULT,
  fullWidthBannerGap: FULL_WIDTH_BANNER_GAP_DEFAULT,
  lowerFullWidthBannerSliderItems: [createLargeBannerSlide({ alt: 'Lower full-width banner 1' })],
  productBanners: [
    createBanner(),
    createBanner(),
    createBanner(),
    createBanner(),
  ],
}

const PRODUCT_SLOT_LABELS = ['Card 1', 'Card 2', 'Card 3', 'Card 4']

function mapSliderItemsForEditor(showcase, itemsKey, legacyImageKey, legacyLinkKey, prefix, defaultAlt) {
  return normalizeLargeBannerSliderItemsForEditor(
    showcase?.[itemsKey],
    showcase?.[legacyImageKey],
    showcase?.[legacyLinkKey] || '/shop',
    prefix,
  ).map((slide) => ({
    ...slide,
    file: null,
    ...sanitizeImageFields(slide),
    linkType: ['category', 'product', 'custom'].includes(slide.linkType)
      ? slide.linkType
      : inferShowcaseLinkType(slide.link).type,
  }))
}

function mergeSavedSliderItems(localItems = [], serverItems = []) {
  if (!localItems.length) {
    return serverItems.map((slide) => ({
      ...slide,
      file: null,
      ...sanitizeImageFields(slide),
    }))
  }

  return localItems.map((localSlide, index) => {
    const serverSlide = serverItems.find((item) => item?.id && item.id === localSlide.id) || serverItems[index]
    const merged = {
      ...localSlide,
      ...(serverSlide || {}),
    }

    return {
      ...merged,
      id: localSlide.id || serverSlide?.id,
      ...sanitizeImageFields(merged),
      link: String(serverSlide?.link || localSlide.link || '/shop').trim(),
      alt: String(serverSlide?.alt || localSlide.alt || '').trim(),
      file: null,
    }
  })
}

function buildShowcaseFormState(showcase = {}, previousForm = null) {
  const savedBanners = Array.isArray(showcase?.productBanners) ? showcase.productBanners : []

  return {
    mainBannerEnabled: typeof showcase?.mainBannerEnabled === 'boolean'
      ? showcase.mainBannerEnabled
      : true,
    topBannerEnabled: showcase?.topBannerEnabled !== false,
    bottomBannerEnabled: showcase?.bottomBannerEnabled !== false,
    fullWidthBannerEnabled: showcase?.fullWidthBannerEnabled === true,
    lowerFullWidthBannerEnabled: showcase?.lowerFullWidthBannerEnabled === true,
    topBannerImage: sanitizeImageUrl(showcase?.topBannerImage || ''),
    topBannerTitle: showcase?.topBannerTitle || '',
    topBannerSubtitle: showcase?.topBannerSubtitle || '',
    topBannerCtaText: showcase?.topBannerCtaText || '',
    topBannerTitleEnabled: typeof showcase?.topBannerTitleEnabled === 'boolean'
      ? showcase.topBannerTitleEnabled
      : true,
    topBannerSubtitleEnabled: typeof showcase?.topBannerSubtitleEnabled === 'boolean'
      ? showcase.topBannerSubtitleEnabled
      : true,
    topBannerCtaEnabled: typeof showcase?.topBannerCtaEnabled === 'boolean'
      ? showcase.topBannerCtaEnabled
      : true,
    topBannerCtaBgColor: showcase?.topBannerCtaBgColor || '#ef2d2d',
    topBannerCtaTextColor: showcase?.topBannerCtaTextColor || '#ffffff',
    topBannerLink: showcase?.topBannerLink || '/shop',
    topBannerSliderEnabled: showcase?.topBannerSliderEnabled !== false,
    topBannerSliderInterval: Number(showcase?.topBannerSliderInterval) || 4000,
    topBannerSliderItems: (() => {
      const items = mapSliderItemsForEditor(showcase, 'topBannerSliderItems', 'topBannerImage', 'topBannerLink', 'top-large-banner', 'Top banner')
      const baseItems = items.length ? items : [createLargeBannerSlide({ alt: 'Top banner 1', file: null })]
      if (previousForm?.topBannerSliderItems?.length) {
        return mergeSavedSliderItems(previousForm.topBannerSliderItems, baseItems)
      }
      return baseItems
    })(),
    bottomBannerImage: sanitizeImageUrl(showcase?.bottomBannerImage || ''),
    bottomBannerTitle: showcase?.bottomBannerTitle || '',
    bottomBannerSubtitle: showcase?.bottomBannerSubtitle || '',
    bottomBannerCtaText: showcase?.bottomBannerCtaText || '',
    bottomBannerTitleEnabled: typeof showcase?.bottomBannerTitleEnabled === 'boolean'
      ? showcase.bottomBannerTitleEnabled
      : true,
    bottomBannerSubtitleEnabled: typeof showcase?.bottomBannerSubtitleEnabled === 'boolean'
      ? showcase.bottomBannerSubtitleEnabled
      : true,
    bottomBannerCtaEnabled: typeof showcase?.bottomBannerCtaEnabled === 'boolean'
      ? showcase.bottomBannerCtaEnabled
      : true,
    bottomBannerCtaBgColor: showcase?.bottomBannerCtaBgColor || '#ef2d2d',
    bottomBannerCtaTextColor: showcase?.bottomBannerCtaTextColor || '#ffffff',
    bottomBannerLink: showcase?.bottomBannerLink || '/shop',
    bottomBannerSliderEnabled: showcase?.bottomBannerSliderEnabled !== false,
    bottomBannerSliderInterval: Number(showcase?.bottomBannerSliderInterval) || 4000,
    bottomBannerSliderItems: (() => {
      const items = mapSliderItemsForEditor(showcase, 'bottomBannerSliderItems', 'bottomBannerImage', 'bottomBannerLink', 'bottom-large-banner', 'Bottom banner')
      const baseItems = items.length ? items : [createLargeBannerSlide({ alt: 'Bottom banner 1', file: null })]
      if (previousForm?.bottomBannerSliderItems?.length) {
        return mergeSavedSliderItems(previousForm.bottomBannerSliderItems, baseItems)
      }
      return baseItems
    })(),
    fullWidthBannerImage: sanitizeImageUrl(showcase?.fullWidthBannerImage || ''),
    fullWidthBannerTitle: showcase?.fullWidthBannerTitle || '',
    fullWidthBannerSubtitle: showcase?.fullWidthBannerSubtitle || '',
    fullWidthBannerCtaText: showcase?.fullWidthBannerCtaText || '',
    fullWidthBannerTitleEnabled: showcase?.fullWidthBannerTitleEnabled === true,
    fullWidthBannerSubtitleEnabled: showcase?.fullWidthBannerSubtitleEnabled === true,
    fullWidthBannerCtaEnabled: showcase?.fullWidthBannerCtaEnabled === true,
    fullWidthBannerCtaBgColor: showcase?.fullWidthBannerCtaBgColor || '#ef2d2d',
    fullWidthBannerCtaTextColor: showcase?.fullWidthBannerCtaTextColor || '#ffffff',
    fullWidthBannerLink: showcase?.fullWidthBannerLink || '/shop',
    fullWidthBannerSliderEnabled: showcase?.fullWidthBannerSliderEnabled !== false,
    fullWidthBannerSliderInterval: Number(showcase?.fullWidthBannerSliderInterval) || 4000,
    fullWidthBannerDesktopHeight: normalizeFullWidthBannerHeight(showcase?.fullWidthBannerDesktopHeight),
    fullWidthBannerSliderItems: (() => {
      const items = mapSliderItemsForEditor(showcase, 'fullWidthBannerSliderItems', 'fullWidthBannerImage', 'fullWidthBannerLink', 'full-width-large-banner', 'Full-width banner')
      const baseItems = items.length ? items : [createLargeBannerSlide({ alt: 'Full-width banner 1', file: null })]
      if (previousForm?.fullWidthBannerSliderItems?.length) {
        return mergeSavedSliderItems(previousForm.fullWidthBannerSliderItems, baseItems)
      }
      return baseItems
    })(),
    lowerFullWidthBannerImage: sanitizeImageUrl(showcase?.lowerFullWidthBannerImage || ''),
    lowerFullWidthBannerTitle: showcase?.lowerFullWidthBannerTitle || '',
    lowerFullWidthBannerSubtitle: showcase?.lowerFullWidthBannerSubtitle || '',
    lowerFullWidthBannerCtaText: showcase?.lowerFullWidthBannerCtaText || '',
    lowerFullWidthBannerTitleEnabled: showcase?.lowerFullWidthBannerTitleEnabled === true,
    lowerFullWidthBannerSubtitleEnabled: showcase?.lowerFullWidthBannerSubtitleEnabled === true,
    lowerFullWidthBannerCtaEnabled: showcase?.lowerFullWidthBannerCtaEnabled === true,
    lowerFullWidthBannerCtaBgColor: showcase?.lowerFullWidthBannerCtaBgColor || '#ef2d2d',
    lowerFullWidthBannerCtaTextColor: showcase?.lowerFullWidthBannerCtaTextColor || '#ffffff',
    lowerFullWidthBannerLink: showcase?.lowerFullWidthBannerLink || '/shop',
    lowerFullWidthBannerSliderEnabled: showcase?.lowerFullWidthBannerSliderEnabled !== false,
    lowerFullWidthBannerSliderInterval: Number(showcase?.lowerFullWidthBannerSliderInterval) || 4000,
    lowerFullWidthBannerDesktopHeight: normalizeLowerFullWidthBannerHeight(showcase?.lowerFullWidthBannerDesktopHeight),
    fullWidthBannerGap: normalizeFullWidthBannerGap(showcase?.fullWidthBannerGap),
    lowerFullWidthBannerSliderItems: (() => {
      const items = mapSliderItemsForEditor(showcase, 'lowerFullWidthBannerSliderItems', 'lowerFullWidthBannerImage', 'lowerFullWidthBannerLink', 'lower-full-width-large-banner', 'Lower full-width banner')
      const baseItems = items.length ? items : [createLargeBannerSlide({ alt: 'Lower full-width banner 1', file: null })]
      if (previousForm?.lowerFullWidthBannerSliderItems?.length) {
        return mergeSavedSliderItems(previousForm.lowerFullWidthBannerSliderItems, baseItems)
      }
      return baseItems
    })(),
    topBannerFile: null,
    bottomBannerFile: null,
    productBanners: (() => {
      const mapped = Array.from({ length: Math.max(1, Math.min(4, savedBanners.length || 1)) }, (_, index) => {
        const current = savedBanners[index] || {}
        const fallbackTitle = `Product Title ${index + 1}`
        const normalizedTitle = String(current.title || '').trim()
        const normalizedSubtitle = String(current.subtitle || '').trim()
        const normalizedButtonText = String(current.buttonText || '').trim()
        const normalizedLink = String(current.link || '').trim()

        return createBanner({
          ...sanitizeImageFields(current),
          title: normalizedTitle && normalizedTitle !== fallbackTitle ? normalizedTitle : '',
          subtitle: normalizedSubtitle && normalizedSubtitle !== 'Order now' ? normalizedSubtitle : '',
          buttonText: normalizedButtonText && normalizedButtonText !== 'Order now' ? normalizedButtonText : '',
          link: normalizedLink && normalizedLink !== '/shop' ? normalizedLink : '',
          linkType: ['category', 'product', 'custom'].includes(current.linkType)
            ? current.linkType
            : inferShowcaseLinkType(normalizedLink).type,
          targetBlank: Boolean(current.targetBlank),
          file: null,
          previewUrl: sanitizeImageUrl(current.image || ''),
        })
      })

      if (previousForm?.productBanners?.length && previousForm.productBanners.length === mapped.length) {
        return previousForm.productBanners.map((localBanner, index) => {
          const serverBanner = mapped[index]
          const merged = {
            ...localBanner,
            ...serverBanner,
          }
          const images = sanitizeImageFields(merged)
          return {
            ...merged,
            ...images,
            previewUrl: localBanner.previewUrl || images.image,
            file: null,
          }
        })
      }

      return mapped
    })(),
  }
}

export default function ShowcaseBannersEditor({ embedded = false }) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [categoryOptions, setCategoryOptions] = useState([])
  const [productOptions, setProductOptions] = useState([])
  const [openTopSlideId, setOpenTopSlideId] = useState(null)
  const [openBottomSlideId, setOpenBottomSlideId] = useState(null)
  const [openFullWidthSlideId, setOpenFullWidthSlideId] = useState(null)
  const [openLowerFullWidthSlideId, setOpenLowerFullWidthSlideId] = useState(null)
  const [openProductIndex, setOpenProductIndex] = useState(null)
  const [openLayoutGuide, setOpenLayoutGuide] = useState(false)
  const [openTopText, setOpenTopText] = useState(false)
  const [openBottomText, setOpenBottomText] = useState(false)
  const [openFullWidthText, setOpenFullWidthText] = useState(false)
  const [openLowerFullWidthText, setOpenLowerFullWidthText] = useState(false)
  const [loadedShowcase, setLoadedShowcase] = useState({})
  const formRef = useRef(form)
  const loadedShowcaseRef = useRef(loadedShowcase)
  const saveRef = useRef(async () => {})
  formRef.current = form
  loadedShowcaseRef.current = loadedShowcase

  const setBannerEnabled = (key, enabled) => {
    setForm((prev) => {
      const next = { ...prev, [key]: enabled }
      if (enabled && key === 'fullWidthBannerEnabled') {
        next.topBannerEnabled = false
        next.bottomBannerEnabled = false
        next.fullWidthBannerSliderEnabled = true
        setOpenLayoutGuide(true)
        const firstSlide = next.fullWidthBannerSliderItems?.[0]
        if (firstSlide?.id) setOpenFullWidthSlideId(firstSlide.id)
      }
      if (enabled && key === 'lowerFullWidthBannerEnabled') {
        setOpenLayoutGuide(true)
      }
      if (enabled && (key === 'topBannerEnabled' || key === 'bottomBannerEnabled')) {
        next.fullWidthBannerEnabled = false
      }
      formRef.current = next
      return next
    })
    if (
      key === 'fullWidthBannerEnabled'
      || key === 'mainBannerEnabled'
      || key === 'topBannerEnabled'
      || key === 'bottomBannerEnabled'
      || key === 'lowerFullWidthBannerEnabled'
    ) {
      window.setTimeout(() => {
        void saveRef.current()
      }, 0)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const res = await axios.get('/api/store/preferences/shop-showcase', {
        headers: { Authorization: `Bearer ${token}` }
      })

      const nextForm = buildShowcaseFormState(res.data?.shopShowcase || {})
      setLoadedShowcase(res.data?.shopShowcase || {})
      setForm(nextForm)
      const firstFullWidth = nextForm.fullWidthBannerSliderItems?.[0]
      if (nextForm.fullWidthBannerEnabled && firstFullWidth?.id) {
        setOpenFullWidthSlideId(firstFullWidth.id)
      }
    } catch (error) {
      toast.error('Failed to load showcase banners')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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
  }, [])

  const updateBanner = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      productBanners: prev.productBanners.map((banner, bannerIndex) => (
        bannerIndex === index ? { ...banner, [key]: value } : banner
      ))
    }))
  }

  const addProductBanner = () => {
    setForm((prev) => {
      if (prev.productBanners.length >= 4) return prev
      return {
        ...prev,
        productBanners: [...prev.productBanners, createBanner()],
      }
    })
  }

  const removeProductBanner = (index) => {
    setForm((prev) => {
      if (prev.productBanners.length <= 1) {
        return {
          ...prev,
          productBanners: [createBanner()],
        }
      }
      return {
        ...prev,
        productBanners: prev.productBanners.filter((_, bannerIndex) => bannerIndex !== index),
      }
    })
  }

  const moveProductBanner = (index, direction) => {
    setForm((prev) => {
      const items = [...prev.productBanners]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= items.length) return prev
      const [item] = items.splice(index, 1)
      items.splice(targetIndex, 0, item)
      return { ...prev, productBanners: items }
    })
  }

  const updateLargeBannerSlide = (itemsKey, index, key, value) => {
    setForm((prev) => ({
      ...prev,
      [itemsKey]: prev[itemsKey].map((slide, slideIndex) => (
        slideIndex === index ? { ...slide, [key]: value } : slide
      )),
    }))
  }

  const addLargeBannerSlide = (itemsKey, altPrefix) => {
    setForm((prev) => {
      if (prev[itemsKey].length >= 8) return prev
      const nextSlide = createLargeBannerSlide({ alt: `${altPrefix} ${prev[itemsKey].length + 1}`, file: null })
      if (itemsKey === 'fullWidthBannerSliderItems' && nextSlide.id) {
        setOpenFullWidthSlideId(nextSlide.id)
      }
      return {
        ...prev,
        [itemsKey]: [...prev[itemsKey], nextSlide],
      }
    })
  }

  const removeLargeBannerSlide = (itemsKey, index) => {
    setForm((prev) => ({
      ...prev,
      [itemsKey]: prev[itemsKey].filter((_, slideIndex) => slideIndex !== index),
    }))
  }

  const moveLargeBannerSlide = (itemsKey, index, direction) => {
    setForm((prev) => {
      const items = [...prev[itemsKey]]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= items.length) return prev
      const [item] = items.splice(index, 1)
      items.splice(targetIndex, 0, item)
      return { ...prev, [itemsKey]: items }
    })
  }

  const uploadLargeBannerSlideField = async (itemsKey, index, field, file) => {
    if (!file) return
    try {
      const token = await getToken()
      const url = sanitizeImageUrl(await uploadImage(file, token))
      setForm((prev) => ({
        ...prev,
        [itemsKey]: prev[itemsKey].map((slide, slideIndex) => (
          slideIndex === index ? { ...slide, [field]: url, file: null } : slide
        )),
      }))
      toast.success('Image uploaded')
    } catch (error) {
      toast.error('Failed to upload image')
      console.error(error)
    }
  }

  const uploadProductBannerField = async (index, field, file) => {
    if (!file) return
    try {
      const token = await getToken()
      const url = sanitizeImageUrl(await uploadImage(file, token))
      setForm((prev) => ({
        ...prev,
        productBanners: prev.productBanners.map((banner, bannerIndex) => (
          bannerIndex === index
            ? {
                ...banner,
                [field]: url,
                file: field === 'image' ? null : banner.file,
                previewUrl: field === 'image' ? url : banner.previewUrl,
              }
            : banner
        )),
      }))
      toast.success('Image uploaded')
    } catch (error) {
      toast.error('Failed to upload image')
      console.error(error)
    }
  }

  const handleHeroImageChange = (field, file) => {
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setForm((prev) => ({
      ...prev,
      [field]: previewUrl,
      [field === 'topBannerImage' ? 'topBannerFile' : 'bottomBannerFile']: file,
    }))
  }

  const uploadImage = async (file, token) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('uploadContext', 'showcase-banner')

    const response = await axios.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`
      }
    })

    return response.data.url
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const currentForm = formRef.current

      const productBanners = []
      for (const banner of currentForm.productBanners) {
        const persistedPreview = String(banner.previewUrl || '').startsWith('blob:')
          ? ''
          : banner.previewUrl
        const images = serializeShowcaseImageFields({
          ...banner,
          image: sanitizeImageUrl(banner.image || persistedPreview),
          tabletImage: sanitizeImageUrl(banner.tabletImage),
          mobileImage: sanitizeImageUrl(banner.mobileImage),
          imageAr: sanitizeImageUrl(banner.imageAr),
          tabletImageAr: sanitizeImageUrl(banner.tabletImageAr),
          mobileImageAr: sanitizeImageUrl(banner.mobileImageAr),
        })
        if (banner.file) {
          images.image = sanitizeImageUrl(await uploadImage(banner.file, token))
        }
        if (!hasShowcaseBannerImage(images)) continue

        productBanners.push({
          ...images,
          title: String(banner.title || '').trim(),
          subtitle: String(banner.subtitle || '').trim(),
          buttonText: String(banner.buttonText || '').trim(),
          link: String(banner.link || '').trim(),
          linkType: ['category', 'product', 'custom'].includes(banner.linkType)
            ? banner.linkType
            : inferShowcaseLinkType(banner.link).type,
          targetBlank: Boolean(banner.targetBlank),
        })
      }

      let topBannerImage = sanitizeImageUrl(currentForm.topBannerImage)
      let bottomBannerImage = sanitizeImageUrl(currentForm.bottomBannerImage)

      const serializeSlideForSave = async (slide, fallbackLink) => {
        const images = serializeShowcaseImageFields({
          image: sanitizeImageUrl(slide.image),
          tabletImage: sanitizeImageUrl(slide.tabletImage),
          mobileImage: sanitizeImageUrl(slide.mobileImage),
          imageAr: sanitizeImageUrl(slide.imageAr),
          tabletImageAr: sanitizeImageUrl(slide.tabletImageAr),
          mobileImageAr: sanitizeImageUrl(slide.mobileImageAr),
        })
        if (slide.file) {
          images.image = sanitizeImageUrl(await uploadImage(slide.file, token))
        }
        return {
          id: slide.id,
          ...images,
          link: String(slide.link || fallbackLink || '/shop').trim(),
          linkType: ['category', 'product', 'custom'].includes(slide.linkType)
            ? slide.linkType
            : inferShowcaseLinkType(slide.link).type,
          targetBlank: Boolean(slide.targetBlank),
          alt: String(slide.alt || '').trim(),
        }
      }

      const topBannerSliderItems = []
      for (const slide of currentForm.topBannerSliderItems) {
        topBannerSliderItems.push(await serializeSlideForSave(slide, currentForm.topBannerLink))
      }

      const bottomBannerSliderItems = []
      for (const slide of currentForm.bottomBannerSliderItems) {
        bottomBannerSliderItems.push(await serializeSlideForSave(slide, currentForm.bottomBannerLink))
      }

      const fullWidthBannerSliderItems = []
      for (const slide of currentForm.fullWidthBannerSliderItems || []) {
        fullWidthBannerSliderItems.push(await serializeSlideForSave(slide, currentForm.fullWidthBannerLink))
      }

      const lowerFullWidthBannerSliderItems = []
      for (const slide of currentForm.lowerFullWidthBannerSliderItems || []) {
        lowerFullWidthBannerSliderItems.push(await serializeSlideForSave(slide, currentForm.lowerFullWidthBannerLink))
      }

      topBannerImage = topBannerSliderItems.find((slide) => slide.image)?.image || topBannerImage
      bottomBannerImage = bottomBannerSliderItems.find((slide) => slide.image)?.image || bottomBannerImage
      let fullWidthBannerImage = sanitizeImageUrl(currentForm.fullWidthBannerImage)
      fullWidthBannerImage = fullWidthBannerSliderItems.find((slide) => slide.image)?.image || fullWidthBannerImage
      let lowerFullWidthBannerImage = sanitizeImageUrl(currentForm.lowerFullWidthBannerImage)
      lowerFullWidthBannerImage = lowerFullWidthBannerSliderItems.find((slide) => slide.image)?.image || lowerFullWidthBannerImage

      if (currentForm.topBannerFile) {
        topBannerImage = sanitizeImageUrl(await uploadImage(currentForm.topBannerFile, token))
      }

      if (currentForm.bottomBannerFile) {
        bottomBannerImage = sanitizeImageUrl(await uploadImage(currentForm.bottomBannerFile, token))
      }

      const latestResponse = await axios.get('/api/store/preferences/shop-showcase', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const latestShowcase = latestResponse.data?.shopShowcase || loadedShowcaseRef.current || {}

      const response = await axios.put('/api/store/preferences/shop-showcase', {
        ...latestShowcase,
        mainBannerEnabled: !!currentForm.mainBannerEnabled,
        topBannerEnabled: !!currentForm.topBannerEnabled,
        bottomBannerEnabled: !!currentForm.bottomBannerEnabled,
        fullWidthBannerEnabled: !!currentForm.fullWidthBannerEnabled,
        lowerFullWidthBannerEnabled: !!currentForm.lowerFullWidthBannerEnabled,
        productBanners,
        topBannerImage,
        topBannerTitle: String(currentForm.topBannerTitle || '').trim(),
        topBannerTitleEnabled: !!currentForm.topBannerTitleEnabled,
        topBannerSubtitle: String(currentForm.topBannerSubtitle || '').trim(),
        topBannerSubtitleEnabled: !!currentForm.topBannerSubtitleEnabled,
        topBannerCtaText: String(currentForm.topBannerCtaText || '').trim(),
        topBannerCtaEnabled: !!currentForm.topBannerCtaEnabled,
        topBannerCtaBgColor: String(currentForm.topBannerCtaBgColor || '').trim(),
        topBannerCtaTextColor: String(currentForm.topBannerCtaTextColor || '').trim(),
        topBannerLink: String(currentForm.topBannerLink || '/shop').trim(),
        topBannerSliderEnabled: !!currentForm.topBannerSliderEnabled,
        topBannerSliderInterval: Number(currentForm.topBannerSliderInterval) || 4000,
        topBannerSliderItems,
        bottomBannerImage,
        bottomBannerTitle: String(currentForm.bottomBannerTitle || '').trim(),
        bottomBannerTitleEnabled: !!currentForm.bottomBannerTitleEnabled,
        bottomBannerSubtitle: String(currentForm.bottomBannerSubtitle || '').trim(),
        bottomBannerSubtitleEnabled: !!currentForm.bottomBannerSubtitleEnabled,
        bottomBannerCtaText: String(currentForm.bottomBannerCtaText || '').trim(),
        bottomBannerCtaEnabled: !!currentForm.bottomBannerCtaEnabled,
        bottomBannerCtaBgColor: String(currentForm.bottomBannerCtaBgColor || '').trim(),
        bottomBannerCtaTextColor: String(currentForm.bottomBannerCtaTextColor || '').trim(),
        bottomBannerLink: String(currentForm.bottomBannerLink || '/shop').trim(),
        bottomBannerSliderEnabled: !!currentForm.bottomBannerSliderEnabled,
        bottomBannerSliderInterval: Number(currentForm.bottomBannerSliderInterval) || 4000,
        bottomBannerSliderItems,
        fullWidthBannerImage,
        fullWidthBannerTitle: String(currentForm.fullWidthBannerTitle || '').trim(),
        fullWidthBannerTitleEnabled: !!currentForm.fullWidthBannerTitleEnabled,
        fullWidthBannerSubtitle: String(currentForm.fullWidthBannerSubtitle || '').trim(),
        fullWidthBannerSubtitleEnabled: !!currentForm.fullWidthBannerSubtitleEnabled,
        fullWidthBannerCtaText: String(currentForm.fullWidthBannerCtaText || '').trim(),
        fullWidthBannerCtaEnabled: !!currentForm.fullWidthBannerCtaEnabled,
        fullWidthBannerCtaBgColor: String(currentForm.fullWidthBannerCtaBgColor || '').trim(),
        fullWidthBannerCtaTextColor: String(currentForm.fullWidthBannerCtaTextColor || '').trim(),
        fullWidthBannerLink: String(currentForm.fullWidthBannerLink || '/shop').trim(),
        fullWidthBannerSliderEnabled: true,
        fullWidthBannerSliderInterval: Number(currentForm.fullWidthBannerSliderInterval) || 4000,
        fullWidthBannerDesktopHeight: normalizeFullWidthBannerHeight(currentForm.fullWidthBannerDesktopHeight),
        fullWidthBannerSliderItems,
        lowerFullWidthBannerImage,
        lowerFullWidthBannerTitle: String(currentForm.lowerFullWidthBannerTitle || '').trim(),
        lowerFullWidthBannerTitleEnabled: !!currentForm.lowerFullWidthBannerTitleEnabled,
        lowerFullWidthBannerSubtitle: String(currentForm.lowerFullWidthBannerSubtitle || '').trim(),
        lowerFullWidthBannerSubtitleEnabled: !!currentForm.lowerFullWidthBannerSubtitleEnabled,
        lowerFullWidthBannerCtaText: String(currentForm.lowerFullWidthBannerCtaText || '').trim(),
        lowerFullWidthBannerCtaEnabled: !!currentForm.lowerFullWidthBannerCtaEnabled,
        lowerFullWidthBannerCtaBgColor: String(currentForm.lowerFullWidthBannerCtaBgColor || '').trim(),
        lowerFullWidthBannerCtaTextColor: String(currentForm.lowerFullWidthBannerCtaTextColor || '').trim(),
        lowerFullWidthBannerLink: String(currentForm.lowerFullWidthBannerLink || '/shop').trim(),
        lowerFullWidthBannerSliderEnabled: !!currentForm.lowerFullWidthBannerSliderEnabled,
        lowerFullWidthBannerSliderInterval: Number(currentForm.lowerFullWidthBannerSliderInterval) || 4000,
        lowerFullWidthBannerDesktopHeight: normalizeLowerFullWidthBannerHeight(currentForm.lowerFullWidthBannerDesktopHeight),
        fullWidthBannerGap: normalizeFullWidthBannerGap(currentForm.fullWidthBannerGap),
        lowerFullWidthBannerSliderItems,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const savedShowcase = response.data?.shopShowcase || {}
      setLoadedShowcase(savedShowcase)
      setForm(buildShowcaseFormState(savedShowcase, currentForm))
      toast.success('Published to storefront')
    } catch (error) {
      toast.error('Failed to save showcase banners')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  saveRef.current = save

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  const fullWidthSizes = getFullWidthBannerSizes(form.fullWidthBannerDesktopHeight)
  const lowerFullWidthSizes = getLowerFullWidthBannerSizes(form.lowerFullWidthBannerDesktopHeight)

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
      <div className={embedded ? '' : 'mb-6'}>
        {!embedded && (
          <>
            <h1 className="text-3xl font-bold text-slate-900">Showcase 4-Grid Banners</h1>
            <p className="mt-2 text-sm text-slate-600">
              Upload images and edit the four product banners shown under the main showcase.
            </p>
          </>
        )}

        <AccordionRow
          title="Layout Upload Guide"
          summary={`Click to ${openLayoutGuide ? 'hide' : 'show'} the storefront layout preview`}
          open={openLayoutGuide}
          onToggle={() => setOpenLayoutGuide((current) => !current)}
          className="mt-4 shadow-sm"
        >
          <p className="mb-3 text-xs text-slate-500">
            English and Arabic can use different photos. This preview updates as you add images. The storefront does not change until you click Publish.
          </p>

          {form.fullWidthBannerEnabled || form.lowerFullWidthBannerEnabled ? (
            <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {form.fullWidthBannerEnabled ? (
                <div className="relative w-full overflow-hidden bg-slate-900">
                  <div
                    className="relative w-full"
                    style={{ height: Math.round(normalizeFullWidthBannerHeight(form.fullWidthBannerDesktopHeight) * 0.45) }}
                  >
                    {form.fullWidthBannerSliderItems?.[0]?.image || form.fullWidthBannerImage ? (
                      <Image
                        src={form.fullWidthBannerSliderItems?.[0]?.image || form.fullWidthBannerImage}
                        alt="Full width banner preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-300">
                        Full Width Banner image
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                      Full Width Banner · desktop full width · {normalizeFullWidthBannerHeight(form.fullWidthBannerDesktopHeight)} px height
                    </span>
                  </div>
                </div>
              ) : null}

              {form.lowerFullWidthBannerEnabled ? (
                <div
                  className="relative w-full overflow-hidden bg-slate-900"
                  style={{
                    marginTop: form.fullWidthBannerEnabled
                      ? normalizeFullWidthBannerGap(form.fullWidthBannerGap)
                      : 0,
                  }}
                >
                  <div
                    className="relative w-full"
                    style={{ height: Math.max(70, Math.round(normalizeLowerFullWidthBannerHeight(form.lowerFullWidthBannerDesktopHeight) * 0.45)) }}
                  >
                    {form.lowerFullWidthBannerSliderItems?.[0]?.image || form.lowerFullWidthBannerImage ? (
                      <Image
                        src={form.lowerFullWidthBannerSliderItems?.[0]?.image || form.lowerFullWidthBannerImage}
                        alt="Lower full width banner preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-300">
                        Lower Full Width Banner image
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                      Lower Full Width Banner · desktop full width · {normalizeLowerFullWidthBannerHeight(form.lowerFullWidthBannerDesktopHeight)} px height
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Left sidebar</div>
              <div className="mt-2 flex h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs font-medium text-slate-500">
                Category menu
              </div>
            </div>

            <div className="grid gap-3">
              {form.topBannerEnabled && !form.fullWidthBannerEnabled ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                  <div className="relative aspect-[3054/1080] w-full">
                    {form.topBannerSliderItems[0]?.image || form.topBannerImage ? (
                      <Image src={form.topBannerSliderItems[0]?.image || form.topBannerImage} alt="Top large banner preview" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-300">Top Large Banner image</div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                      Top Large Banner · 3054 × 1080 px · {formatImageRatio(3054, 1080)}
                    </span>
                  </div>
                </div>
              </div>
              ) : null}

              {form.bottomBannerEnabled && !form.fullWidthBannerEnabled ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                  <div className="relative aspect-[3054/370] w-full">
                    {form.bottomBannerSliderItems[0]?.image || form.bottomBannerImage ? (
                      <Image src={form.bottomBannerSliderItems[0]?.image || form.bottomBannerImage} alt="Bottom large banner preview" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-300">Bottom Large Banner image</div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                      Bottom Large Banner · 3054 × 370 px · {formatImageRatio(3054, 370)}
                    </span>
                  </div>
                </div>
              </div>
              ) : null}

              {form.fullWidthBannerEnabled ? (
                <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-xs text-slate-500">
                  Top and Bottom Large Banners are off while Full Width Banner is enabled.
                </div>
              ) : null}

              <div className={`grid gap-2 ${(() => {
                const count = form.productBanners.filter((banner) => banner.previewUrl || hasShowcaseBannerImage(banner)).length || form.productBanners.length
                if (count <= 1) return 'grid-cols-1'
                if (count === 2) return 'grid-cols-2'
                if (count === 3) return 'grid-cols-3'
                return 'grid-cols-2 sm:grid-cols-4'
              })()}`}>
                {form.productBanners.map((banner, index) => (
                  <div key={`layout-slot-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                      <div className="relative aspect-[1225/639] w-full">
                        {banner.previewUrl || banner.image || banner.imageAr ? (
                          <Image
                            src={banner.previewUrl || banner.image || banner.imageAr}
                            alt={`${PRODUCT_SLOT_LABELS[index] || `Card ${index + 1}`} preview`}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-300">
                            {PRODUCT_SLOT_LABELS[index] || `Card ${index + 1}`}
                          </div>
                        )}
                        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {PRODUCT_SLOT_LABELS[index] || `Card ${index + 1}`} · 1225 × 639 · {formatImageRatio(1225, 639)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AccordionRow>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Main Banner Visibility</h2>
              <p className="text-xs text-slate-500">Enable or disable the big main banner on storefront.</p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.mainBannerEnabled}
                onChange={(event) => setBannerEnabled('mainBannerEnabled', event.target.checked)}
                className="sr-only peer"
              />
              <span className="h-6 w-11 rounded-full bg-slate-300 relative transition peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
              <span className="text-xs font-medium text-slate-700">
                {form.mainBannerEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          {form.mainBannerEnabled ? (
            <p className="mt-3 text-xs text-slate-500">
              The main banner stays inside the page width. It can stay on together with the Full Width Banner.
            </p>
          ) : null}
        </div>

        <div className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Full Width Banner</h2>
              <p className="text-xs text-slate-500">
                Spans the full screen edge to edge, not the 1400px content width. The main banner can stay on. Enabling this turns off the Top and Bottom Large Banners.
              </p>
            </div>
            <VisibilitySwitch
              enabled={!!form.fullWidthBannerEnabled}
              onChange={(enabled) => setBannerEnabled('fullWidthBannerEnabled', enabled)}
            />
          </div>
          {form.fullWidthBannerEnabled ? (
          <div className="mt-4 space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
            <div
              className="relative w-full"
              style={{ height: Math.max(120, Math.round(normalizeFullWidthBannerHeight(form.fullWidthBannerDesktopHeight) * 0.4)) }}
            >
              {form.fullWidthBannerSliderItems?.[0]?.image || form.fullWidthBannerImage ? (
                <Image
                  src={form.fullWidthBannerSliderItems?.[0]?.image || form.fullWidthBannerImage}
                  alt="Full width banner preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-300">
                  Upload slide 1 to see a live preview
                </div>
              )}
            </div>
          </div>

          <DesignerSizeGuide sizes={fullWidthSizes} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Height · {normalizeFullWidthBannerHeight(form.fullWidthBannerDesktopHeight)} px
              </span>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[350, 400, 450, 500].map((height) => (
                  <button
                    key={height}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, fullWidthBannerDesktopHeight: height }))}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      normalizeFullWidthBannerHeight(form.fullWidthBannerDesktopHeight) === height
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {height}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={FULL_WIDTH_BANNER_HEIGHT_MIN}
                max={FULL_WIDTH_BANNER_HEIGHT_MAX}
                step="10"
                className="w-full accent-emerald-600"
                value={normalizeFullWidthBannerHeight(form.fullWidthBannerDesktopHeight)}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  fullWidthBannerDesktopHeight: normalizeFullWidthBannerHeight(event.target.value),
                }))}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Slide every {Math.round((Number(form.fullWidthBannerSliderInterval) || 4000) / 1000)} seconds
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[3, 4, 5, 6, 8, 10].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, fullWidthBannerSliderInterval: seconds * 1000 }))}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      Math.round((Number(form.fullWidthBannerSliderInterval) || 4000) / 1000) === seconds
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">Slides</p>
            <p className="mb-3 text-xs text-slate-500">
              Add one or more images. They rotate on the live homepage — this is not a static file.
            </p>
            <div className="space-y-3">
              {(form.fullWidthBannerSliderItems || []).map((slide, index) => {
                const slideId = slide.id || `full-width-slide-${index}`
                return (
                  <LargeBannerSlideCard
                    key={slideId}
                    slide={slide}
                    index={index}
                    total={form.fullWidthBannerSliderItems.length}
                    recommendedSizes={fullWidthSizes}
                    open={openFullWidthSlideId === slideId}
                    onToggle={() => setOpenFullWidthSlideId((current) => (current === slideId ? null : slideId))}
                    onMove={(direction) => moveLargeBannerSlide('fullWidthBannerSliderItems', index, direction)}
                    onRemove={() => removeLargeBannerSlide('fullWidthBannerSliderItems', index)}
                    onUpload={(field, file) => uploadLargeBannerSlideField('fullWidthBannerSliderItems', index, field, file)}
                    onChange={(field, value) => updateLargeBannerSlide('fullWidthBannerSliderItems', index, field, value)}
                    categoryOptions={categoryOptions}
                    productOptions={productOptions}
                  />
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => addLargeBannerSlide('fullWidthBannerSliderItems', 'Full-width banner')}
              disabled={(form.fullWidthBannerSliderItems || []).length >= 8}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Add slide
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">Optional text on the banner</p>
            <p className="mt-1 text-xs text-slate-500">Leave these off to show only the image.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="flex items-center justify-between text-sm text-slate-700">
                  Title
                  <input
                    type="checkbox"
                    checked={!!form.fullWidthBannerTitleEnabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullWidthBannerTitleEnabled: event.target.checked }))}
                  />
                </span>
                {form.fullWidthBannerTitleEnabled ? (
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.fullWidthBannerTitle}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullWidthBannerTitle: event.target.value }))}
                    placeholder="Title"
                  />
                ) : null}
              </label>
              <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="flex items-center justify-between text-sm text-slate-700">
                  Subtitle
                  <input
                    type="checkbox"
                    checked={!!form.fullWidthBannerSubtitleEnabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullWidthBannerSubtitleEnabled: event.target.checked }))}
                  />
                </span>
                {form.fullWidthBannerSubtitleEnabled ? (
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.fullWidthBannerSubtitle}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullWidthBannerSubtitle: event.target.value }))}
                    placeholder="Subtitle"
                  />
                ) : null}
              </label>
              <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="flex items-center justify-between text-sm text-slate-700">
                  Button
                  <input
                    type="checkbox"
                    checked={!!form.fullWidthBannerCtaEnabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullWidthBannerCtaEnabled: event.target.checked }))}
                  />
                </span>
                {form.fullWidthBannerCtaEnabled ? (
                  <div className="mt-2 space-y-2">
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={form.fullWidthBannerCtaText}
                      onChange={(event) => setForm((prev) => ({ ...prev, fullWidthBannerCtaText: event.target.value }))}
                      placeholder="Button text"
                    />
                    <div className="flex gap-2">
                      <input
                        type="color"
                        className="h-9 w-12 rounded border border-slate-300"
                        value={form.fullWidthBannerCtaBgColor}
                        onChange={(event) => setForm((prev) => ({ ...prev, fullWidthBannerCtaBgColor: event.target.value }))}
                      />
                      <input
                        type="color"
                        className="h-9 w-12 rounded border border-slate-300"
                        value={form.fullWidthBannerCtaTextColor}
                        onChange={(event) => setForm((prev) => ({ ...prev, fullWidthBannerCtaTextColor: event.target.value }))}
                      />
                    </div>
                  </div>
                ) : null}
              </label>
            </div>
          </div>
          </div>
          ) : null}
        </div>

        <div className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Lower Full Width Banner</h2>
              <p className="text-xs text-slate-500">
                Shows below the Full Width Banner · desktop full width · height up to 300 px
              </p>
            </div>
            <VisibilitySwitch
              enabled={!!form.lowerFullWidthBannerEnabled}
              onChange={(enabled) => setBannerEnabled('lowerFullWidthBannerEnabled', enabled)}
            />
          </div>
          {form.lowerFullWidthBannerEnabled ? (
          <div className="mt-4">
            <DesignerSizeGuide sizes={lowerFullWidthSizes} />
            <label className="mb-4 block max-w-md">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Gap below Full Width Banner ({normalizeFullWidthBannerGap(form.fullWidthBannerGap)} px)
              </span>
              <input
                type="range"
                min={FULL_WIDTH_BANNER_GAP_MIN}
                max={FULL_WIDTH_BANNER_GAP_MAX}
                step="2"
                className="w-full"
                value={normalizeFullWidthBannerGap(form.fullWidthBannerGap)}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  fullWidthBannerGap: normalizeFullWidthBannerGap(event.target.value),
                }))}
              />
              <input
                type="number"
                min={FULL_WIDTH_BANNER_GAP_MIN}
                max={FULL_WIDTH_BANNER_GAP_MAX}
                step="2"
                className="mt-2 w-28 rounded-lg border border-slate-300 px-3 py-2"
                value={normalizeFullWidthBannerGap(form.fullWidthBannerGap)}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  fullWidthBannerGap: normalizeFullWidthBannerGap(event.target.value),
                }))}
              />
            </label>
            <label className="mb-4 block max-w-md">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Desktop height ({normalizeLowerFullWidthBannerHeight(form.lowerFullWidthBannerDesktopHeight)} px)
              </span>
              <input
                type="range"
                min={LOWER_FULL_WIDTH_BANNER_HEIGHT_MIN}
                max={LOWER_FULL_WIDTH_BANNER_HEIGHT_MAX}
                step="10"
                className="w-full"
                value={normalizeLowerFullWidthBannerHeight(form.lowerFullWidthBannerDesktopHeight)}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  lowerFullWidthBannerDesktopHeight: normalizeLowerFullWidthBannerHeight(event.target.value),
                }))}
              />
              <input
                type="number"
                min={LOWER_FULL_WIDTH_BANNER_HEIGHT_MIN}
                max={LOWER_FULL_WIDTH_BANNER_HEIGHT_MAX}
                step="10"
                className="mt-2 w-28 rounded-lg border border-slate-300 px-3 py-2"
                value={normalizeLowerFullWidthBannerHeight(form.lowerFullWidthBannerDesktopHeight)}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  lowerFullWidthBannerDesktopHeight: normalizeLowerFullWidthBannerHeight(event.target.value),
                }))}
              />
            </label>

            <label className="mb-4 block max-w-xs">
              <span className="mb-1 block text-sm font-medium text-slate-700">Slide interval (ms)</span>
              <input
                type="number"
                min="2000"
                max="15000"
                step="500"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.lowerFullWidthBannerSliderInterval}
                onChange={(event) => setForm((prev) => ({ ...prev, lowerFullWidthBannerSliderInterval: Number(event.target.value) || 4000 }))}
              />
            </label>

            <div className="space-y-3">
              {(form.lowerFullWidthBannerSliderItems || []).map((slide, index) => {
                const slideId = slide.id || `lower-full-width-slide-${index}`
                return (
                  <LargeBannerSlideCard
                    key={slideId}
                    slide={slide}
                    index={index}
                    total={form.lowerFullWidthBannerSliderItems.length}
                    recommendedSizes={lowerFullWidthSizes}
                    open={openLowerFullWidthSlideId === slideId}
                    onToggle={() => setOpenLowerFullWidthSlideId((current) => (current === slideId ? null : slideId))}
                    onMove={(direction) => moveLargeBannerSlide('lowerFullWidthBannerSliderItems', index, direction)}
                    onRemove={() => removeLargeBannerSlide('lowerFullWidthBannerSliderItems', index)}
                    onUpload={(field, file) => uploadLargeBannerSlideField('lowerFullWidthBannerSliderItems', index, field, file)}
                    onChange={(field, value) => updateLargeBannerSlide('lowerFullWidthBannerSliderItems', index, field, value)}
                    categoryOptions={categoryOptions}
                    productOptions={productOptions}
                  />
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => addLargeBannerSlide('lowerFullWidthBannerSliderItems', 'Lower full-width banner')}
              disabled={(form.lowerFullWidthBannerSliderItems || []).length >= 8}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Add lower full-width banner slide
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Use the Sizes for designer table above. Desktop {lowerFullWidthSizes.image.width} × {lowerFullWidthSizes.image.height} px. Max height 300 px.
            </p>

            <AccordionRow
              title="Lower full-width banner text"
              summary={`Optional title, subtitle, and button · click to ${openLowerFullWidthText ? 'hide' : 'edit'}`}
              open={openLowerFullWidthText}
              onToggle={() => setOpenLowerFullWidthText((current) => !current)}
              className="mt-4"
            >
              <div className="grid gap-3">
                <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">Enable title</span>
                  <input
                    type="checkbox"
                    checked={!!form.lowerFullWidthBannerTitleEnabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, lowerFullWidthBannerTitleEnabled: event.target.checked }))}
                  />
                </label>
                {form.lowerFullWidthBannerTitleEnabled ? (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.lowerFullWidthBannerTitle}
                      onChange={(event) => setForm((prev) => ({ ...prev, lowerFullWidthBannerTitle: event.target.value }))}
                    />
                  </label>
                ) : null}

                <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">Enable subtitle</span>
                  <input
                    type="checkbox"
                    checked={!!form.lowerFullWidthBannerSubtitleEnabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, lowerFullWidthBannerSubtitleEnabled: event.target.checked }))}
                  />
                </label>
                {form.lowerFullWidthBannerSubtitleEnabled ? (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Subtitle</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={form.lowerFullWidthBannerSubtitle}
                      onChange={(event) => setForm((prev) => ({ ...prev, lowerFullWidthBannerSubtitle: event.target.value }))}
                    />
                  </label>
                ) : null}

                <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">Enable button</span>
                  <input
                    type="checkbox"
                    checked={!!form.lowerFullWidthBannerCtaEnabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, lowerFullWidthBannerCtaEnabled: event.target.checked }))}
                  />
                </label>
                {form.lowerFullWidthBannerCtaEnabled ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Button text</span>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={form.lowerFullWidthBannerCtaText}
                        onChange={(event) => setForm((prev) => ({ ...prev, lowerFullWidthBannerCtaText: event.target.value }))}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Button BG</span>
                        <input
                          type="color"
                          className="h-10 w-full rounded-lg border border-slate-300"
                          value={form.lowerFullWidthBannerCtaBgColor}
                          onChange={(event) => setForm((prev) => ({ ...prev, lowerFullWidthBannerCtaBgColor: event.target.value }))}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Button Text</span>
                        <input
                          type="color"
                          className="h-10 w-full rounded-lg border border-slate-300"
                          value={form.lowerFullWidthBannerCtaTextColor}
                          onChange={(event) => setForm((prev) => ({ ...prev, lowerFullWidthBannerCtaTextColor: event.target.value }))}
                        />
                      </label>
                    </div>
                  </>
                ) : null}
              </div>
            </AccordionRow>
          </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Top Large Banner</h2>
                <p className="text-xs text-slate-500">Row 1 right side. Enabling this turns off Full Width Banner.</p>
              </div>
              <VisibilitySwitch
                enabled={!!form.topBannerEnabled}
                onChange={(enabled) => setBannerEnabled('topBannerEnabled', enabled)}
              />
            </div>
            {form.topBannerEnabled ? (
            <div className="mt-4">
            <p className="mb-3 text-xs font-medium text-slate-500">
              Upload multiple images for a slider · Slide 1 plays first
            </p>

            <label className="mb-4 block max-w-xs">
              <span className="mb-1 block text-sm font-medium text-slate-700">Slide interval (ms)</span>
              <input
                type="number"
                min="2000"
                max="15000"
                step="500"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.topBannerSliderInterval}
                onChange={(event) => setForm((prev) => ({ ...prev, topBannerSliderInterval: Number(event.target.value) || 4000 }))}
              />
            </label>

            <div className="space-y-3">
              {form.topBannerSliderItems.map((slide, index) => {
                const slideId = slide.id || `top-slide-${index}`
                return (
                  <LargeBannerSlideCard
                    key={slideId}
                    slide={slide}
                    index={index}
                    total={form.topBannerSliderItems.length}
                    recommendedSizes={TOP_BANNER_SIZES}
                    open={openTopSlideId === slideId}
                    onToggle={() => setOpenTopSlideId((current) => (current === slideId ? null : slideId))}
                    onMove={(direction) => moveLargeBannerSlide('topBannerSliderItems', index, direction)}
                    onRemove={() => removeLargeBannerSlide('topBannerSliderItems', index)}
                    onUpload={(field, file) => uploadLargeBannerSlideField('topBannerSliderItems', index, field, file)}
                    onChange={(field, value) => updateLargeBannerSlide('topBannerSliderItems', index, field, value)}
                    categoryOptions={categoryOptions}
                    productOptions={productOptions}
                  />
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => addLargeBannerSlide('topBannerSliderItems', 'Top banner')}
              disabled={form.topBannerSliderItems.length >= 8}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Add top banner slide
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Desktop: width 3054 px · height 1080 px · ratio {formatImageRatio(3054, 1080)}. Tablet and mobile sizes are shown on each upload.
            </p>

            <AccordionRow
              title="Top banner text"
              summary={`Title, subtitle, and button · click to ${openTopText ? 'hide' : 'edit'}`}
              open={openTopText}
              onToggle={() => setOpenTopText((current) => !current)}
              className="mt-4"
            >
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.topBannerTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerTitle: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show title</span>
                <input
                  type="checkbox"
                  checked={!!form.topBannerTitleEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerTitleEnabled: event.target.checked }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Subtitle</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.topBannerSubtitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerSubtitle: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show subtitle</span>
                <input
                  type="checkbox"
                  checked={!!form.topBannerSubtitleEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerSubtitleEnabled: event.target.checked }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Button text</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.topBannerCtaText}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerCtaText: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show button</span>
                <input
                  type="checkbox"
                  checked={!!form.topBannerCtaEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerCtaEnabled: event.target.checked }))}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Button BG</span>
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg border border-slate-300"
                    value={form.topBannerCtaBgColor}
                    onChange={(event) => setForm((prev) => ({ ...prev, topBannerCtaBgColor: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Button Text</span>
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg border border-slate-300"
                    value={form.topBannerCtaTextColor}
                    onChange={(event) => setForm((prev) => ({ ...prev, topBannerCtaTextColor: event.target.value }))}
                  />
                </label>
              </div>
            </div>
            </AccordionRow>
            </div>
            ) : null}
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Bottom Large Banner</h2>
                <p className="text-xs text-slate-500">Row 2 right side. Enabling this turns off Full Width Banner.</p>
              </div>
              <VisibilitySwitch
                enabled={!!form.bottomBannerEnabled}
                onChange={(enabled) => setBannerEnabled('bottomBannerEnabled', enabled)}
              />
            </div>
            {form.bottomBannerEnabled ? (
            <div className="mt-4">
            <p className="mb-3 text-xs font-medium text-slate-500">
              Upload multiple images for a slider · Slide 1 plays first
            </p>

            <label className="mb-4 block max-w-xs">
              <span className="mb-1 block text-sm font-medium text-slate-700">Slide interval (ms)</span>
              <input
                type="number"
                min="2000"
                max="15000"
                step="500"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.bottomBannerSliderInterval}
                onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerSliderInterval: Number(event.target.value) || 4000 }))}
              />
            </label>

            <div className="space-y-3">
              {form.bottomBannerSliderItems.map((slide, index) => {
                const slideId = slide.id || `bottom-slide-${index}`
                return (
                  <LargeBannerSlideCard
                    key={slideId}
                    slide={slide}
                    index={index}
                    total={form.bottomBannerSliderItems.length}
                    recommendedSizes={BOTTOM_BANNER_SIZES}
                    open={openBottomSlideId === slideId}
                    onToggle={() => setOpenBottomSlideId((current) => (current === slideId ? null : slideId))}
                    onMove={(direction) => moveLargeBannerSlide('bottomBannerSliderItems', index, direction)}
                    onRemove={() => removeLargeBannerSlide('bottomBannerSliderItems', index)}
                    onUpload={(field, file) => uploadLargeBannerSlideField('bottomBannerSliderItems', index, field, file)}
                    onChange={(field, value) => updateLargeBannerSlide('bottomBannerSliderItems', index, field, value)}
                    categoryOptions={categoryOptions}
                    productOptions={productOptions}
                  />
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => addLargeBannerSlide('bottomBannerSliderItems', 'Bottom banner')}
              disabled={form.bottomBannerSliderItems.length >= 8}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Add bottom banner slide
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Desktop: width 3054 px · height 370 px · ratio {formatImageRatio(3054, 370)}. Tablet and mobile sizes are shown on each upload.
            </p>

            <AccordionRow
              title="Bottom banner text"
              summary={`Title, subtitle, and button · click to ${openBottomText ? 'hide' : 'edit'}`}
              open={openBottomText}
              onToggle={() => setOpenBottomText((current) => !current)}
              className="mt-4"
            >
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.bottomBannerTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerTitle: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show title</span>
                <input
                  type="checkbox"
                  checked={!!form.bottomBannerTitleEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerTitleEnabled: event.target.checked }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Subtitle</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.bottomBannerSubtitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerSubtitle: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show subtitle</span>
                <input
                  type="checkbox"
                  checked={!!form.bottomBannerSubtitleEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerSubtitleEnabled: event.target.checked }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Button text</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.bottomBannerCtaText}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerCtaText: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show button</span>
                <input
                  type="checkbox"
                  checked={!!form.bottomBannerCtaEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerCtaEnabled: event.target.checked }))}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Button BG</span>
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg border border-slate-300"
                    value={form.bottomBannerCtaBgColor}
                    onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerCtaBgColor: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Button Text</span>
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg border border-slate-300"
                    value={form.bottomBannerCtaTextColor}
                    onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerCtaTextColor: event.target.value }))}
                  />
                </label>
              </div>
            </div>
            </AccordionRow>
            </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Product banner cards</h2>
            <p className="text-xs text-slate-500">
              Up to 4 cards · remove empty slots · storefront auto-resizes to 1–4 columns
            </p>
          </div>
          <button
            type="button"
            onClick={addProductBanner}
            disabled={form.productBanners.length >= 4}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Add banner card
          </button>
        </div>
        {form.productBanners.map((banner, index) => (
          <AccordionRow
            key={`product-banner-${index}`}
            title={`Banner ${index + 1}`}
            summary={`${PRODUCT_SLOT_LABELS[index] || `Card ${index + 1}`} · 1225 × 639 px · ratio ${formatImageRatio(1225, 639)} · click to ${openProductIndex === index ? 'hide' : 'edit'}`}
            open={openProductIndex === index}
            onToggle={() => setOpenProductIndex((current) => (current === index ? null : index))}
            className="shadow-sm"
            actions={(
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveProductBanner(index, -1)}
                  disabled={index === 0}
                  title="Move left (earlier)"
                  className="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveProductBanner(index, 1)}
                  disabled={index === form.productBanners.length - 1}
                  title="Move right (later)"
                  className="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeProductBanner(index)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            )}
          >
            <p className="mb-3 text-xs font-medium text-slate-500">
              Cards without any image are hidden on the storefront. Desktop width 1225 px · height 639 px · ratio {formatImageRatio(1225, 639)}.
            </p>

            <div className="mb-4">
              <ShowcaseLocaleImageGroups
                item={banner}
                recommendedSizes={PRODUCT_BANNER_SIZES}
                onUpload={(field, file) => uploadProductBannerField(index, field, file)}
                onChange={(field, value) => updateBanner(index, field, value)}
              />
            </div>

            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={banner.title}
                  onChange={(event) => updateBanner(index, 'title', event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Subtitle</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={banner.subtitle}
                  onChange={(event) => updateBanner(index, 'subtitle', event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Button text</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={banner.buttonText}
                  onChange={(event) => updateBanner(index, 'buttonText', event.target.value)}
                />
              </label>

              <ShowcaseLinkAccordion
                link={banner.link}
                linkType={banner.linkType}
                targetBlank={banner.targetBlank}
                categories={categoryOptions}
                products={productOptions}
                onLinkChange={(value) => updateBanner(index, 'link', value)}
                onLinkTypeChange={(value) => updateBanner(index, 'linkType', value)}
                onTargetBlankChange={(value) => updateBanner(index, 'targetBlank', value)}
              />
            </div>
          </AccordionRow>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-end gap-2">
        <p className="text-xs text-slate-500">
          Adding or uploading a banner only updates this preview. Click Publish to show it on the storefront.
        </p>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Publishing...' : 'Publish to storefront'}
        </button>
      </div>
    </div>
  )
}
