'use client'

import { useStorefrontI18n } from '@/lib/useStorefrontI18n'
import ProductNotifyMeForm from './ProductNotifyMeForm'

export default function MobileProductActions({
  onOrderNow,
  onAddToCart,
  isOutOfStock = false,
  isOrdering = false,
  quantity = 1,
  formatQuantity = (value) => String(value),
  notifyProductId = '',
  notifySku = '',
  notifyEmail = '',
  noonHref = '',
  jomlaHref = '',
  amazonHref = '',
}) {
  const { t, isArabic } = useStorefrontI18n()

  const orderLabel = isOrdering
    ? t('common.processing')
    : t('common.orderNow')

  const showQuantityBadge = !isOutOfStock && quantity > 1

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.08)] safe-area-bottom" dir={isArabic ? 'rtl' : 'ltr'}>
      {noonHref ? (
        <div className={`px-3 pt-3 grid gap-2 ${amazonHref && jomlaHref ? 'grid-cols-3' : jomlaHref ? 'grid-cols-2' : ''}`}>
          <a
            href={noonHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('product.orderOnNoon')}
            className={jomlaHref
              ? 'flex h-11 items-center justify-center rounded-xl border border-black/10 bg-[#FEEE00] px-3 text-black active:bg-[#FFE14A]'
              : 'flex h-11 w-full items-center justify-center rounded-lg bg-[#FEEE00] px-4 text-sm font-semibold text-black shadow-sm active:bg-[#FFE14A]'}
          >
            {jomlaHref ? (
              <img src="/logo/noon.png" alt="" className="h-8 w-auto max-w-full object-contain" />
            ) : t('product.orderOnNoon')}
          </a>
          {jomlaHref ? (
            <a
              href={jomlaHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('product.orderOnJomla')}
              className="flex h-11 items-center justify-center rounded-xl bg-[#E52D27] px-3 text-white active:bg-[#B31217]"
            >
              <img src="/logo/jomla.png" alt="" className="h-7 w-auto max-w-full object-contain" />
            </a>
          ) : null}
          {amazonHref ? (
            <a
              href={amazonHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('product.orderOnAmazon')}
              className="flex h-11 items-center justify-center rounded-xl bg-[#232F3E] px-1.5 active:bg-[#1a2533]"
            >
              <img src="/logo/amazon.png" alt="" className="h-6 w-auto max-w-full object-contain" />
            </a>
          ) : null}
        </div>
      ) : null}
      <div className={`flex items-center gap-2.5 px-3 py-3 ${isArabic ? '' : 'flex-row-reverse'}`} dir="ltr">
        {!isOutOfStock ? (
          <button
            type="button"
            onClick={onAddToCart}
            disabled={isOrdering}
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 transition active:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t('common.addToCart')}
          >
            <img
              src="/icons/navbar-cart.png"
              alt=""
              width={18}
              height={18}
              draggable={false}
              aria-hidden="true"
              className="h-[18px] w-[18px] select-none object-contain"
            />
            {showQuantityBadge ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C8F404] px-1 text-[10px] font-bold leading-none text-[#05090D] shadow-sm">
                {formatQuantity(quantity)}
              </span>
            ) : null}
          </button>
        ) : null}

        <div className="relative flex h-12 min-w-0 flex-1 items-center">
          {isOutOfStock ? (
            <ProductNotifyMeForm
              productId={notifyProductId}
              sku={notifySku}
              defaultEmail={notifyEmail}
              buttonClassName="flex h-12 w-full items-center justify-center rounded-lg bg-[#C8F404] text-base font-bold text-[#05090D] active:bg-[#82A000]"
            />
          ) : (
            <button
              onClick={onOrderNow}
              disabled={isOrdering}
              className={`flex h-12 w-full items-center justify-center text-[#05090D] transition-all ${
                jomlaHref ? 'flex-col rounded-xl' : 'rounded-lg text-base font-bold'
              } ${
                isOrdering
                  ? 'cursor-not-allowed bg-gray-400 opacity-70'
                  : 'bg-[#C8F404] active:bg-[#82A000]'
              }`}
            >
              {isOrdering ? (
                <span className="inline-flex items-center gap-2 text-base font-bold">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white" />
                  {orderLabel}
                </span>
              ) : (
                <span className={jomlaHref ? 'text-sm font-bold leading-none' : ''}>{orderLabel}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
