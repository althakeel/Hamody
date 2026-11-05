import { deleteCacheKey, invalidateStorefrontProductCaches } from '@/lib/cache';

export function invalidateProductReviewCaches(productId) {
  const normalizedProductId = String(productId || '').trim();
  if (normalizedProductId) {
    deleteCacheKey(`reviews:product:v2:${normalizedProductId}`);
  }
  invalidateStorefrontProductCaches();
}
