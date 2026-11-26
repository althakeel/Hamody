'use client'

import { useStorefrontI18n } from '@/lib/useStorefrontI18n'

export const NEW_PRODUCT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

export function isRecentProduct(product) {
  const createdMs = new Date(product?.createdAt || product?.created_at || product?.publishedAt || 0).getTime()
  if (!Number.isFinite(createdMs) || createdMs <= 0) return false
  const ageMs = Date.now() - createdMs
  return ageMs >= 0 && ageMs <= NEW_PRODUCT_WINDOW_MS
}

export default function ProductStatusTags({ showSale = false, showNew = false, size = 'card' }) {
  const { t } = useStorefrontI18n()
  if (!showSale && !showNew) return null

  const labelClass = size === 'page'
    ? 'min-w-[72px] rounded-lg px-4 py-1.5 text-sm font-bold uppercase leading-none tracking-wide text-white'
    : 'min-w-[52px] rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-wide text-white sm:text-xs'

  return (
    <div className="pointer-events-none absolute start-3 top-3 z-30 flex flex-col items-start gap-1.5">
      {showSale ? (
        <span className={`inline-flex items-center justify-center bg-[#FF2A2A] ${labelClass}`}>
          {t('common.sale')}
        </span>
      ) : null}
      {showNew ? (
        <span className={`inline-flex items-center justify-center bg-[#00C853] ${labelClass}`}>
          {t('common.new')}
        </span>
      ) : null}
    </div>
  )
}
