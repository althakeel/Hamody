import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearCache,
  getCachedData,
  getCacheStats,
  setCachedData,
} from '../lib/cache.js';

test('cache stats and full clear', () => {
  clearCache();
  setCachedData('products:demo', { ok: true }, 60);
  setCachedData('public:shop-showcase', { ok: true }, 60);
  const before = getCacheStats();
  assert.equal(before.size >= 2, true);
  assert.equal(getCachedData('products:demo').ok, true);
  const cleared = clearCache();
  assert.equal(cleared >= 2, true);
  assert.equal(getCacheStats().size, 0);
});
