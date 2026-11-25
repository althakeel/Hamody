import { revalidatePath, revalidateTag } from 'next/cache';
import { invalidateCachePattern } from '@/lib/cache';

/** Clear storefront category caches after a category save, then refresh the public pages. */
export function invalidateCategoryCaches() {
  invalidateCachePattern('public:categories:');
  try {
    revalidateTag('homepage', 'max');
    revalidatePath('/', 'layout');
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/categories');
  } catch (error) {
    console.error('[category-cache] revalidate failed', error);
  }
}
