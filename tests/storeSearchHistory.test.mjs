import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canRecordStoreSearchQuery,
  isManualSearchSource,
  normalizeStoreSearchQuery,
} from '../lib/storeSearchHistory.js';

test('normalizes and rejects private-looking search terms', () => {
  assert.equal(normalizeStoreSearchQuery('  Smart   Watch  '), 'Smart Watch');
  assert.equal(canRecordStoreSearchQuery('Smart Watch'), true);
  assert.equal(canRecordStoreSearchQuery('a'), false);
  assert.equal(canRecordStoreSearchQuery('user@example.com'), false);
  assert.equal(canRecordStoreSearchQuery('+971501234567'), false);
});

test('only submitted navbar searches are stored, not autocomplete', () => {
  assert.equal(isManualSearchSource('navbar'), true);
  assert.equal(isManualSearchSource('shop'), false);
  assert.equal(isManualSearchSource('autocomplete'), false);
});
