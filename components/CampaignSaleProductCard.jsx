'use client';

import { useEffect, useState } from 'react';
import Image from '@/components/SafeNextImage';
import Link from 'next/link';
import { FaStar } from 'react-icons/fa';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { addToCart, uploadCart, removeFromCart } from '@/lib/features/cart/cartSlice';
import { useStorefrontMarket } from '@/lib/useStorefrontMarket';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { getLocalizedProductName } from '@/lib/displayText';
import { openAddToCartPopup } from '@/lib/addToCartPopup';
import { PLACEHOLDER_IMAGE as PLACEHOLDER } from '@/lib/mediaUrls';
import { getImageUrlAt, getProductThumbnailUrl, normalizeProductImages } from '@/lib/productMedia';
import { trackProductAddToCart } from '@/lib/ecommerceTracking';
import { registerItemListImpression, trackSelectItem } from '@/lib/ga4Ecommerce';
import { pushGtmEcommerceEvent } from '@/lib/pushGtmEcommerceEvent';
import { productToGa4Item } from '@/lib/ga4Item';
import { isStorefrontProductInStock } from '@/lib/productVisibility';
import { GTM_EVENTS } from '@/lib/gtmEvents';
import { STORE_CURRENCY } from '@/lib/storeCurrency';
import { getProductPath } from '@/lib/productUrl';
import CurrencySymbol, { StruckPrice } from '@/components/CurrencySymbol';

const parseAmount = (value) => {
  const num = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isNaN(num) ? 0 : num;
};

export default function CampaignSaleProductCard({
  product,
  accent = '#18181b',
  itemListId = 'campaign-sale',
  itemListName = 'Campaign sale',
  itemListIndex = 0,
}) {
  if (!product || typeof product !== 'object' || !product.name || !product.slug) return null;

  const dispatch = useDispatch();
  const pathname = usePathname();
  const { getToken } = useAuth();
  const { convertPrice, formatNumber } = useStorefrontMarket();
  const { t, language } = useStorefrontI18n();
  const cartItems = useSelector((state) => state.cart.cartItems);
  const [hovered, setHovered] = useState(false);
  const [isCartHydrated, setIsCartHydrated] = useState(false);

  const productId = String(product._id || product.id || '');
  const cartEntry = cartItems[productId];
  const itemQuantity = (() => {
    if (!cartEntry) return 0;
    if (typeof cartEntry === 'number') return cartEntry;
    if (typeof cartEntry === 'object' && typeof cartEntry.quantity === 'number') return cartEntry.quantity;
    return 0;
  })();

  useEffect(() => {
    setIsCartHydrated(true);
  }, []);

  useEffect(() => {
    registerItemListImpression(product, {
      itemListId,
      itemListName,
      index: itemListIndex,
      pathname,
    });
  }, [productId, itemListId, itemListName, itemListIndex, pathname]);

  const priceNum = parseAmount(product.price ?? product.salePrice);
  const AEDNum = parseAmount(product.AED ?? product.mrp ?? product.compareAtPrice);
  const discount = AEDNum > priceNum && priceNum > 0
    ? Math.round(((AEDNum - priceNum) / AEDNum) * 100)
    : 0;
  const livePrice = priceNum > 0 ? priceNum : AEDNum;
  const comparePrice = priceNum > 0 && AEDNum > priceNum ? AEDNum : 0;
  const isOutOfStock = !isStorefrontProductInStock(product);
  const productName = getLocalizedProductName(product, language, product.name || product.title || t('common.untitledProduct'));
  const primaryImage = getProductThumbnailUrl(product)
    || product.image
    || PLACEHOLDER;
  const secondaryImage = getImageUrlAt(product?.images, 1);
  const hasSecondary = secondaryImage
    && secondaryImage !== PLACEHOLDER
    && secondaryImage !== primaryImage
    && normalizeProductImages(product.images).length > 1;
  const ratingValue = Math.round(Number(product.averageRating) || 0);
  const reviewCount = Math.max(0, Number(product.ratingCount ?? product.reviewCount) || 0);
  const href = getProductPath(product);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    const unitPrice = Number(priceNum > 0 ? priceNum : product.price || 0);
    trackProductAddToCart({
      product,
      productId,
      name: product.name || product.title || 'Product',
      price: unitPrice,
      quantity: 1,
      currency: STORE_CURRENCY,
    });
    dispatch(addToCart({
      productId,
      price: priceNum > 0 ? priceNum : undefined,
    }));
    dispatch(uploadCart({ getToken }));
    openAddToCartPopup(product);
  };

  return (
    <article
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden bg-zinc-50"
        onClick={() => trackSelectItem(product, {
          itemListId,
          itemListName,
          index: itemListIndex,
          pathname,
        })}
      >
        <Image
          src={hovered && hasSecondary ? secondaryImage : primaryImage}
          alt={productName}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-contain p-2 sm:p-3"
        />
        {discount > 0 ? (
          <span className="absolute start-2 top-2 rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:start-2.5 sm:top-2.5 sm:text-[11px]">
            -{discount}%
          </span>
        ) : null}
        {isOutOfStock ? (
          <span className="absolute inset-x-2 bottom-2 bg-black/70 px-2 py-1 text-center text-[10px] font-semibold text-white sm:text-[11px]">
            {t('common.outOfStock')}
          </span>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-3">
        <Link
          href={href}
          className="line-clamp-2 min-h-[2.25rem] text-[12px] font-medium leading-snug text-zinc-900 hover:underline sm:min-h-[2.5rem] sm:text-sm"
        >
          {productName}
        </Link>

        {reviewCount > 0 ? (
          <div className="flex items-center gap-0.5 text-[10px] text-zinc-500 sm:text-[11px]">
            {Array.from({ length: 5 }).map((_, index) => (
              <FaStar key={index} className={index < ratingValue ? 'text-amber-400' : 'text-zinc-200'} size={9} />
            ))}
            <span className="ms-0.5">({reviewCount})</span>
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums text-zinc-900 sm:text-base">
              <CurrencySymbol /> {formatNumber(convertPrice(livePrice))}
            </p>
            {comparePrice > 0 ? (
              <p className="text-[10px] text-zinc-400 line-through sm:text-xs">
                <StruckPrice>
                  <CurrencySymbol /> {formatNumber(convertPrice(comparePrice))}
                </StruckPrice>
              </p>
            ) : null}
          </div>

          {!isOutOfStock ? (
            isCartHydrated && itemQuantity > 0 ? (
              <div
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 py-1 text-white"
                style={{ background: accent }}
              >
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center hover:bg-white/15"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const unitPrice = Number(priceNum > 0 ? priceNum : product.price || 0);
                    pushGtmEcommerceEvent(GTM_EVENTS.REMOVE_FROM_CART, {
                      currency: STORE_CURRENCY,
                      value: unitPrice,
                      items: [productToGa4Item(product, { price: unitPrice, quantity: 1 })],
                    });
                    dispatch(removeFromCart({ productId }));
                    dispatch(uploadCart({ getToken }));
                  }}
                  aria-label={itemQuantity === 1 ? 'Remove' : 'Decrease'}
                >
                  {itemQuantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                </button>
                <span className="min-w-4 text-center text-xs font-bold">{itemQuantity}</span>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center hover:bg-white/15"
                  onClick={handleAddToCart}
                  aria-label="Increase"
                >
                  <Plus size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white sm:h-9 sm:w-9"
                style={{ background: accent }}
                aria-label="Add to cart"
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4"
                  style={{
                    backgroundColor: 'currentColor',
                    WebkitMask: 'url(/icons/navbar-cart.png) center / contain no-repeat',
                    mask: 'url(/icons/navbar-cart.png) center / contain no-repeat',
                  }}
                />
              </button>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
