import { revalidatePath } from 'next/cache';
import { deleteCacheKey, invalidateCachePattern } from '@/lib/cache';

export const FEATURED_SECTIONS_CACHE_KEY = 'public:featured-sections:v18-slim';
export const HOMEPAGE_CACHE_KEY = 'server:homepage:v20-slim';

/** Clear storefront caches that embed category slider sections. */
export function invalidateCategorySliderCaches() {
  deleteCacheKey(FEATURED_SECTIONS_CACHE_KEY);
  deleteCacheKey(`${FEATURED_SECTIONS_CACHE_KEY}:slim-v1`);
  deleteCacheKey(`${FEATURED_SECTIONS_CACHE_KEY}:slim-v2-banner`);
  deleteCacheKey('public:featured-sections-count:v1');
  deleteCacheKey(HOMEPAGE_CACHE_KEY);
  deleteCacheKey(`${HOMEPAGE_CACHE_KEY}:i18n`);
  deleteCacheKey(`${HOMEPAGE_CACHE_KEY}:i18n:v3-slim`);
  invalidateCachePattern('public:featured-sections');
  invalidateCachePattern('public:home-sections');
  invalidateCachePattern('server:homepage');
  invalidateCachePattern('public:shop-showcase');
  // Legacy keys from earlier deployments.
  deleteCacheKey('public:featured-sections:v2');
  deleteCacheKey('public:featured-sections:v4');
  deleteCacheKey('server:homepage:v3');
  deleteCacheKey('server:homepage:v5');
  deleteCacheKey('server:homepage:v6');
  deleteCacheKey('server:homepage:v7');
  deleteCacheKey('server:homepage:v8');
  deleteCacheKey('server:homepage:v9');
  deleteCacheKey('public:featured-sections:v5');
  deleteCacheKey('public:featured-sections:v8');
  deleteCacheKey('public:featured-sections:v9');
  deleteCacheKey('public:featured-sections:v10');
  deleteCacheKey('public:featured-sections:v11');
  deleteCacheKey('public:featured-sections:v12');
  deleteCacheKey('public:featured-sections:v13');
  deleteCacheKey('public:featured-sections:v14');
  deleteCacheKey('public:featured-sections:v15');
  deleteCacheKey('server:homepage:v15');
  deleteCacheKey('server:homepage:v16');
  deleteCacheKey('server:homepage:v17');
  deleteCacheKey('public:category-sliders:v1');
  deleteCacheKey('public:category-sliders:v2');
  deleteCacheKey('public:category-sliders:v3');
  deleteCacheKey('public:category-sliders:v4');

  try {
    revalidatePath('/');
  } catch {
    // Safe when called outside a Next.js request context.
  }
}
