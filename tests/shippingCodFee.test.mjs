import test from 'node:test';
import assert from 'node:assert/strict';
import { getCODFee } from '../lib/shipping.js';

test('COD fee is charged when the COD surcharge setting is enabled', () => {
  assert.equal(getCODFee({ enableCOD: true, enableCODFee: true, codFee: 8 }, 'COD'), 8);
});

test('COD fee remains enabled for existing settings without the surcharge flag', () => {
  assert.equal(getCODFee({ enableCOD: true, codFee: 8 }, 'COD'), 8);
});

test('COD fee is not charged when the surcharge is disabled', () => {
  assert.equal(getCODFee({ enableCOD: true, enableCODFee: false, codFee: 8 }, 'COD'), 0);
});
