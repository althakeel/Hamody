'use client'

import { useEffect, useState } from 'react'
import { getProductThumbnailUrl } from '@/lib/productMedia'

const DIRHAM = 'https://www.hamody.com/currency/aed-dirham.png'

function slideSrc(slide) {
  return String(slide?.mobileImage || slide?.tabletImage || slide?.image || '').trim()
}

function slidesFrom(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({ src: slideSrc(item) }))
    .filter((item) => item.src)
    .slice(0, 8)
}

function bannerBlocks(config = {}) {
  const fullOn = config.fullWidthBannerEnabled === true
  const blocks = []
  const push = (key, slides) => {
    if (slides.length) blocks.push({ key, slides })
  }
  if (fullOn) push('full', slidesFrom(config.fullWidthBannerSliderItems))
  if (!fullOn && config.mainBannerEnabled) {
    const src = String(config.mainBannerMobileImage || config.mainBannerImage || '').trim()
    if (src) blocks.push({ key: 'main', slides: [{ src }] })
  }
  if (!fullOn && config.topBannerEnabled) push('top', slidesFrom(config.topBannerSliderItems))
  if (!fullOn && config.bottomBannerEnabled) push('bottom', slidesFrom(config.bottomBannerSliderItems))
  if (config.lowerFullWidthBannerEnabled) push('lower', slidesFrom(config.lowerFullWidthBannerSliderItems))
  if (config.bannerSliderEnabled !== false) push('banner', slidesFrom(config.bannerSliderItems))
  if (config.secondaryBannerSliderEnabled) push('secondary', slidesFrom(config.secondaryBannerSliderItems))
  return blocks
}

function productImage(product) {
  return getProductThumbnailUrl(product) || product?.image || product?.images?.[0] || ''
}

function salePrice(product) {
  const price = Number(product?.price)
  if (Number.isFinite(price) && price > 0) return Math.round(price)
  const aed = Number(product?.AED)
  const mrp = Number(product?.mrp)
  if (Number.isFinite(aed) && aed > 0) return Math.round(aed)
  if (Number.isFinite(mrp) && mrp > 0) return Math.round(mrp)
  return 0
}

function comparePrice(product, live) {
  const mrp = Number(product?.mrp)
  const aed = Number(product?.AED)
  const higher = [mrp, aed].filter((value) => Number.isFinite(value) && value > live)
  if (!higher.length) return 0
  return Math.round(Math.max(...higher))
}

function titleKey(value) {
  return String(value || '').trim().toLowerCase()
}

function isTopDeal(section) {
  const raw = `${section?.key || ''} ${section?.section || ''} ${section?.sectionType || ''}`
    .toLowerCase()
    .replace(/[-_\s]/g, '')
  return raw.includes('topdeals') && section?.isActive !== false
}

function Price({ product }) {
  const live = salePrice(product)
  if (!live) return null
  const old = comparePrice(product, live)
  return (
    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#020617]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={DIRHAM} alt="" className="h-[0.7em] w-auto" />
      <span>{live}</span>
      {old > live ? (
        <span className="flex items-center gap-0.5 text-[9px] font-medium text-[#94a3b8] line-through">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DIRHAM} alt="" className="h-[0.7em] w-auto opacity-70" />
          {old}
        </span>
      ) : null}
    </p>
  )
}

function ProductStrip({ products, firstImage = '' }) {
  const cards = []
  if (firstImage) cards.push({ key: 'phone-image', image: firstImage, name: '' })
  ;(products || []).slice(0, 8).forEach((product, index) => {
    cards.push({
      key: String(product?._id || product?.id || index),
      image: productImage(product),
      name: product?.name || '',
      product,
    })
  })
  if (!cards.length) return null
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {cards.map((card) => (
        <div key={card.key} className="w-[92px] shrink-0">
          <div className="overflow-hidden rounded-[2px] border border-[#e2e8f0] bg-white">
            <div className="aspect-square bg-slate-100">
              {card.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.image} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            {card.name ? (
              <div className="px-1.5 py-1.5">
                <p className="line-clamp-2 text-[10px] font-semibold leading-3 text-[#0f172a]">{card.name}</p>
                {card.product ? <Price product={card.product} /> : null}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function ColoredRow({ section }) {
  const products = Array.isArray(section?.products) ? section.products : []
  if (!products.length && !section?.mobileImage) return null
  return (
    <section className="px-3 py-3" style={{ backgroundColor: section.backgroundColor || '#f8fafc' }}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold leading-4 text-[#0f172a]">{section.title}</h3>
          {section.subtitle ? (
            <p className="mt-0.5 text-[10px] leading-3 text-[#475569]">{section.subtitle}</p>
          ) : null}
        </div>
        {section.viewAllEnabled && section.viewAllHref ? (
          <span className="shrink-0 text-[10px] font-semibold text-[#0f172a]">View all</span>
        ) : null}
      </div>
      <ProductStrip products={products} firstImage={section.mobileImage || ''} />
    </section>
  )
}

export default function AppHomePhonePreview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [showcase, categories, featured, rows, home, explore] = await Promise.all([
          fetch('/api/public/shop-showcase').then((response) => response.json()),
          fetch('/api/categories?limit=200&offset=0').then((response) => response.json()),
          fetch('/api/store/featured-products?includeProducts=true').then((response) => response.json()),
          fetch('/api/public/featured-sections').then((response) => response.json()),
          fetch('/api/home/sections').then((response) => response.json()),
          fetch('/api/store/explore-interests/public').then((response) => response.json()),
        ])
        let exploreProducts = []
        const ids = Array.isArray(explore?.productIds) ? explore.productIds.slice(0, 12) : []
        if (explore?.enabled && ids.length) {
          const batch = await fetch('/api/products/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: ids }),
          }).then((response) => response.json()).catch(() => ({ products: [] }))
          exploreProducts = Array.isArray(batch?.products) ? batch.products : []
        }
        if (!cancelled) {
          setData({
            banners: bannerBlocks(showcase?.config || {}),
            categories: Array.isArray(categories?.categories) ? categories.categories : [],
            featured,
            rows: Array.isArray(rows?.sections) ? rows.sections : [],
            home: Array.isArray(home?.sections) ? home.sections : [],
            exploreProducts: explore?.enabled ? exploreProducts : [],
          })
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Could not load the app home')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = data?.categories || []
  const withImage = categories.filter((category) => String(category?.image || '').trim())
  const tiles = [
    ...withImage.filter((category) => !category.parentId),
    ...withImage.filter((category) => category.parentId),
  ].slice(0, 16)
  const featuredProducts = Array.isArray(data?.featured?.products) ? data.featured.products : []
  const featuredTitle = data?.featured?.sectionTitle || 'TOP PICKS FOR YOU'
  const rowTitles = new Set((data?.rows || []).map((section) => titleKey(section.title)))
  const deals = (data?.home || []).filter((section) => {
    if (!isTopDeal(section)) return false
    if (rowTitles.has(titleKey(section.title))) return false
    return Array.isArray(section.products) && section.products.length > 0
  })

  return (
    <div className="mx-auto w-[340px]">
      <div className="overflow-hidden rounded-[32px] border-[8px] border-slate-900 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-white px-4 pb-1 pt-2 text-[10px] font-semibold text-slate-900">
          <span>9:41</span>
          <span className="h-4 w-16 rounded-full bg-slate-900" />
          <span>5G</span>
        </div>
        <div className="border-b border-slate-100 px-3 py-2">
          <p className="text-sm font-bold tracking-tight text-slate-900">Hamody</p>
          <div className="mt-2 h-8 rounded-full bg-slate-100" />
        </div>
        <div className="h-[640px] overflow-y-auto bg-white [scrollbar-width:thin]">
          {!data && !error ? (
            <div className="space-y-3 p-3">
              <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : null}
          {error ? <p className="p-4 text-xs text-rose-600">{error}</p> : null}
          {data ? (
            <>
              {data.banners.map((block) => (
                <div key={block.key} className="relative bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={block.slides[0].src} alt="" className="h-auto w-full object-contain" />
                  {block.slides.length > 1 ? (
                    <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
                      {block.slides.slice(0, 6).map((slide, index) => (
                        <span key={slide.src} className={`h-1 w-1 rounded-full ${index === 0 ? 'bg-white' : 'bg-white/50'}`} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              {tiles.length ? (
                <div className="overflow-x-auto px-3 py-3 [scrollbar-width:none]">
                <div className="grid w-max grid-flow-col grid-rows-2 gap-2">
                  {tiles.map((category) => (
                    <div key={String(category._id || category.slug)} className="w-14">
                      <div className="h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={category.image} alt="" className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-center text-[9px] leading-3 text-slate-700">{category.name}</p>
                    </div>
                  ))}
                </div>
                </div>
              ) : null}

              {featuredProducts.length ? (
                <section className="px-3 py-3">
                  <h3 className="text-[13px] font-bold text-[#0f172a]">{featuredTitle}</h3>
                  {data.featured?.sectionDescription ? (
                    <p className="mt-0.5 text-[10px] text-[#475569]">{data.featured.sectionDescription}</p>
                  ) : null}
                  <div className="mt-2">
                    <ProductStrip products={featuredProducts} />
                  </div>
                </section>
              ) : null}

              <div>
                {(data.rows || []).map((section) => (
                  <ColoredRow key={String(section._id || section.title)} section={section} />
                ))}
              </div>

              {deals.map((section) => (
                <section key={String(section.id || section.title)} className="px-3 py-3">
                  <h3 className="text-[13px] font-bold text-[#0f172a]">{section.title}</h3>
                  {section.subtitle ? (
                    <p className="mt-0.5 text-[10px] text-[#475569]">{section.subtitle}</p>
                  ) : null}
                  <div className="mt-2">
                    <ProductStrip products={section.products} />
                  </div>
                </section>
              ))}

              {data.exploreProducts?.length ? (
                <section className="px-3 py-3">
                  <h3 className="text-[13px] font-bold text-[#0f172a]">Explore your interests</h3>
                  <div className="mt-2">
                    <ProductStrip products={data.exploreProducts} />
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">
        Live app home. Recently viewed stays hidden until a shopper is signed in.
      </p>
    </div>
  )
}
