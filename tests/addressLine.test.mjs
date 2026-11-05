import test from 'node:test';
import assert from 'node:assert/strict';
import {
  composeAddressStreetLine,
  hasCompleteAddressStreetLine,
  splitAddressStreetLine,
} from '../lib/addressLine.js';

test('composes required address parts and an optional apartment into one backend line', () => {
  assert.equal(
    composeAddressStreetLine({
      buildingOrVilla: 'Villa 12',
      streetName: 'Palm Street',
      apartmentOrFloor: 'Floor 2',
    }),
    'Villa 12, Palm Street, Floor 2',
  );
  assert.equal(
    composeAddressStreetLine({ buildingOrVilla: 'Villa 12', streetName: 'Palm Street' }),
    'Villa 12, Palm Street',
  );
});

test('checks only the required building and street parts', () => {
  assert.equal(hasCompleteAddressStreetLine({ buildingOrVilla: 'Villa 12', streetName: 'Palm Street' }), true);
  assert.equal(hasCompleteAddressStreetLine({ buildingOrVilla: '', streetName: 'Palm Street' }), false);
  assert.equal(hasCompleteAddressStreetLine({ buildingOrVilla: 'Villa 12', streetName: '' }), false);
});

test('splits saved combined lines and keeps legacy one-line addresses readable', () => {
  assert.deepEqual(splitAddressStreetLine('Villa 12, Palm Street, Floor 2'), {
    buildingOrVilla: 'Villa 12',
    streetName: 'Palm Street',
    apartmentOrFloor: 'Floor 2',
  });
  assert.deepEqual(splitAddressStreetLine('Palm Street'), {
    buildingOrVilla: '',
    streetName: 'Palm Street',
    apartmentOrFloor: '',
  });
});
