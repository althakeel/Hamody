import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStorefrontMarket } from '@/lib/useStorefrontMarket';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import CurrencySymbol from '@/components/CurrencySymbol';

export function CartSummaryActions({
  checkoutDisabled = false,
  className = '',
  layout = 'stacked',
}) {
  const router = useRouter();
  const { t } = useStorefrontI18n();

  const continueButton = (
    <button
      type="button"
      className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
      onClick={() => router.push('/shop')}
    >
      {t('cart.continueShopping')}
    </button>
  );

  const checkoutButton = (
    <button
      type="button"
      className={`w-full rounded-xl py-3 text-sm font-bold text-white transition ${
        checkoutDisabled ? 'cursor-not-allowed bg-slate-400' : 'bg-[#1F5C4A] hover:bg-[#123D33]'
      }`}
      onClick={() => {
        if (checkoutDisabled) return;
        router.push('/checkout');
      }}
      disabled={checkoutDisabled}
    >
      {checkoutDisabled ? t('cart.checkoutUnavailable') : t('cart.checkout')}
    </button>
  );

  if (layout === 'row') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <div className="flex-1">{continueButton}</div>
        <div className="flex-1">{checkoutButton}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-3">{continueButton}</div>
      {checkoutButton}
    </div>
  );
}

export default function CartSummaryBox({
  subtotal,
  shipping,
  total,
  productValue = null,
  discount = null,
  checkoutDisabled = false,
  checkoutNote = "",
  showShipping = true,
  hideMobileActions = false,
}) {
  const { market, formatAmount } = useStorefrontMarket();
  const { t } = useStorefrontI18n();
  // Temporarily hidden on cart — keep Tabby available at checkout.
  const showTabbyPromo = false;
  const tabbyPublicKey = process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY || '';
  const tabbyMerchantCode = process.env.NEXT_PUBLIC_TABBY_MERCHANT_CODE || process.env.TABBY_MERCHANT_CODE || 'HAMODY';

  const listValue = Number(productValue);
  const discountAmount = Number(discount);
  const showPriceBreakdown =
    Number.isFinite(listValue)
    && Number.isFinite(discountAmount)
    && listValue > Number(subtotal || 0)
    && discountAmount > 0.009;

  useEffect(() => {
    if (!showTabbyPromo) return undefined;
    if (typeof window === 'undefined') return undefined;

    const initTabbyPromo = () => {
      if (!window.TabbyPromo || !tabbyPublicKey || !tabbyMerchantCode) return;
      const price = Number(total || 0).toFixed(2);
      if (Number(price) <= 0) return;

      try {
        new window.TabbyPromo({
          selector: '#tabbyPromoCart',
          currency: 'AED',
          price,
          lang: 'en',
          source: 'cart',
          shouldInheritBg: false,
          publicKey: tabbyPublicKey,
          merchantCode: tabbyMerchantCode,
        });
      } catch (error) {
        console.error('TabbyPromo init failed on cart page:', error);
      }
    };

    if (window.TabbyPromo) {
      initTabbyPromo();
      return undefined;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.tabby.ai/tabby-promo.js';
    script.async = true;
    script.onload = initTabbyPromo;
    document.body.appendChild(script);
    return undefined;
  }, [showTabbyPromo, total, tabbyPublicKey, tabbyMerchantCode]);

  return (
    <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4">
        {showPriceBreakdown ? (
          <>
            <div className="mb-2 flex min-w-0 items-start justify-between gap-3 text-sm text-gray-500">
              <span className="min-w-0">{t('cart.productValue')}</span>
              <span className="inline-flex shrink-0 items-baseline gap-1 text-end tabular-nums"><CurrencySymbol currency={market.currency} />{formatAmount(listValue)}</span>
            </div>
            <div className="mb-2 flex min-w-0 items-start justify-between gap-3 text-sm text-gray-500">
              <span className="min-w-0">{t('cart.salePrice')}</span>
              <span className="inline-flex shrink-0 items-baseline gap-1 text-end tabular-nums"><CurrencySymbol currency={market.currency} />{formatAmount(subtotal)}</span>
            </div>
            <div className="mb-2 flex min-w-0 items-start justify-between gap-3 text-sm font-medium text-emerald-600">
              <span className="min-w-0">{t('cart.discount')}</span>
              <span className="inline-flex shrink-0 items-baseline gap-1 text-end tabular-nums">− <CurrencySymbol currency={market.currency} />{formatAmount(discountAmount)}</span>
            </div>
          </>
        ) : (
          <div className="mb-2 flex min-w-0 items-start justify-between gap-3 text-sm text-gray-500">
            <span className="min-w-0">{t('cart.items')}</span>
            <span className="inline-flex shrink-0 items-baseline gap-1 text-end tabular-nums"><CurrencySymbol currency={market.currency} />{formatAmount(subtotal)}</span>
          </div>
        )}
        {showShipping && (
          <div className="mb-2 flex min-w-0 items-start justify-between gap-3 text-sm">
            <span className={shipping === 0 ? 'text-green-600' : 'text-gray-400'}>
              {t('cart.shippingAndHandling')}
            </span>
            <span className={shipping === 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
              {shipping === 0 ? t('cart.free') : (
                <span className="inline-flex items-baseline gap-1">
                  <CurrencySymbol currency={market.currency} />
                  {formatAmount(shipping)}
                </span>
              )}
            </span>
          </div>
        )}
        <hr className="my-2" />
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-bold text-gray-800">
          <span>{t('cart.total')}</span>
          <span className="inline-flex items-baseline gap-1 text-[clamp(16px,4vw,18px)] tabular-nums"><CurrencySymbol currency={market.currency} />{formatAmount(total)}</span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {t('cart.freeDeliveryNote')}
        </p>
        {showTabbyPromo ? <div id="tabbyPromoCart" className="mt-3" /> : null}
      </div>
      {checkoutNote && (
        <p className="text-xs text-red-600 mb-3">{checkoutNote}</p>
      )}
      <div className={hideMobileActions ? 'hidden lg:block' : ''}>
        <CartSummaryActions checkoutDisabled={checkoutDisabled} />
      </div>
    </div>
  );
}
