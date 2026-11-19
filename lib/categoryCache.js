import { deleteCacheKey, invalidateCachePattern } from '@/lib/cache';

/** Clear storefront + store dashboard category list caches after mutations. */
export function invalidateCategoryCaches() {
  invalidateCachePattern('public:categories:tree:v2');
  invalidateCachePattern('public:categories:tree:v7');
  deleteCacheKey('public:categories:tree:v3');
  deleteCacheKey('public:categories:tree:v5');
  deleteCacheKey('public:categories:tree:v6');
  deleteCacheKey('public:categories:tree:v7');
  deleteCacheKey('public:categories:tree:v9');
  deleteCacheKey('public:categories:tree:v10');
  deleteCacheKey('public:categories:tree:v11');
  deleteCacheKey('public:categories:tree:v12');
}
