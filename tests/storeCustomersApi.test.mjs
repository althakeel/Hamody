import test from 'node:test';
import assert from 'node:assert/strict';
import { customerSearchIdStrings, isValidCustomerImage } from '../lib/storeCustomersApi.js';

test('customer search ids stay as unique strings', () => {
  assert.deepEqual(customerSearchIdStrings(['  abc  ', 'abc', '', null]), ['abc']);
});

test('placeholder images are rejected', () => {
  assert.equal(isValidCustomerImage('/placeholder.png'), false);
  assert.equal(isValidCustomerImage('https://cdn.example/a.jpg'), true);
});
