import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSkuList } from '../lib/parseSkuList.js';

test('splits comma, space, and newline SKU lists and drops duplicates', () => {
  assert.deepEqual(parseSkuList('123456,123456,654321'), ['123456', '654321']);
  assert.deepEqual(parseSkuList('ST4006 ST4007\nST4008;ST4006'), ['ST4006', 'ST4007', 'ST4008']);
  assert.deepEqual(parseSkuList('  '), []);
});
