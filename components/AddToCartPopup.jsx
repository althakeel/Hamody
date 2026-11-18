'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, X } from 'lucide-react';
import { ADD_TO_CART_POPUP_EVENT } from '@/lib/addToCartPopup';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { useProductWishlist } from '@/lib/useProductWishlist';
import { getLocalizedProductName } from '@/lib/displayText';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { PLACEHOLDER_IMAGE } from '@/lib/mediaUrls';

export default function AddToCartPopup() {
  const { t, language } = useStorefrontI18n();
  const [product, setProduct] = useState(null);
  const { isInWishlist, loading, toggleWishlist } = useProductWishlist(product);

  useEffect(() => {
    const open = (event) => {
      const next = event?.detail?.product;
      if (!next) return;
      setProduct(next);
    };
    window.addEventListener(ADD_TO_CART_POPUP_EVENT, open);
    return () => window.removeEventListener(ADD_TO_CART_POPUP_EVENT, open);
  }, []);

  useEffect(() => {
    if (!product) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setProduct(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [product]);

  if (!product) return null;

  const name = getLocalizedProductName(product, language, product.name || product.title || '');
  const image = getProductThumbnailUrl(product, { fallback: '' });

  const onWishlist = async () => {
    if (isInWishlist || loading) return;
    await toggleWishlist();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={t('product.notifyClose')}
        className="absolute inset-0 bg-[#05090D]/45"
        onClick={() => setProduct(null)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-cart-popup-title"
        className="relative w-full max-w-sm rounded-2xl border border-[#E2E7E8] bg-white p-5 shadow-[0_18px_50px_rgba(5,9,13,0.18)]"
      >
        <button
          type="button"
          onClick={() => setProduct(null)}
          className="absolute end-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5E6870] transition hover:bg-[#F2F5F5] hover:text-[#05090D]"
          aria-label={t('product.notifyClose')}
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 pe-8">
          {image && image !== PLACEHOLDER_IMAGE ? (
            <img
              src={image}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg border border-[#E2E7E8] object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p id="add-to-cart-popup-title" className="text-base font-semibold text-[#05090D]">
              {t('product.addedToCartToast')}
            </p>
            {name ? <p className="mt-1 line-clamp-2 text-sm text-[#5E6870]">{name}</p> : null}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/cart"
            onClick={() => setProduct(null)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#C8F404] px-4 text-sm font-semibold text-[#05090D] transition hover:bg-[#ADD300]"
          >
            {t('product.viewCart')}
          </Link>
          {isInWishlist ? (
            <Link
              href="/wishlist"
              onClick={() => setProduct(null)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#05090D] px-4 text-sm font-semibold text-[#05090D] transition hover:bg-[#F8FEE6]"
            >
              <Heart size={16} fill="currentColor" />
              {t('product.addedToWishlistToast')}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onWishlist}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#05090D] px-4 text-sm font-semibold text-[#05090D] transition hover:bg-[#F8FEE6] disabled:opacity-60"
            >
              <Heart size={16} />
              {t('product.addToWishlist')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
