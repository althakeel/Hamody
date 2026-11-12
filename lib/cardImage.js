import { withImageKitDelivery } from '@/lib/imageKitDelivery';

const PRODUCT_IMAGE_HOST = 'store1920-images.s3.ap-south-1.amazonaws.com';
export const CARD_IMAGE_WIDTH = 384;

function isCardSource(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname !== PRODUCT_IMAGE_HOST) return false;
    return parsed.pathname.startsWith('/products/') || parsed.pathname.startsWith('/categories/');
  } catch {
    return false;
  }
}

/** Card-sized delivery URL. Full product photos stay on the product page. */
export function cardImageSrc(url = '', width = CARD_IMAGE_WIDTH) {
  const raw = String(url || '').trim();
  if (!raw || raw.startsWith('/api/img')) return raw;

  const w = Math.max(128, Math.min(512, Math.round(Number(width) || CARD_IMAGE_WIDTH)));
  if (raw.includes('imagekit.io')) {
    return withImageKitDelivery(raw, { width: w, quality: 60 });
  }
  if (!isCardSource(raw)) return raw;
  return `/api/img?w=${w}&src=${encodeURIComponent(raw)}`;
}
