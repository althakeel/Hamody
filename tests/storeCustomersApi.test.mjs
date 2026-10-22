import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRegisteredCustomerWithoutOrders,
  customerSearchIdStrings,
  isValidCustomerImage,
  placeCustomersWithoutOrders,
} from '../lib/storeCustomersApi.js';

test('customer search ids stay as unique strings', () => {
  assert.deepEqual(customerSearchIdStrings(['  abc  ', 'abc', '', null]), ['abc']);
});

test('a registered account with no orders is added after order customers', () => {
  const extra = buildRegisteredCustomerWithoutOrders({
    _id: 'customer-saeed-alqassimi',
    name: 'saeed alqassimi',
    createdAt: '2026-10-22T05:18:00.000Z',
  });
  assert.equal(extra.name, 'saeed alqassimi');
  assert.equal(extra.totalOrders, 0);
  assert.equal(extra.email, 'No email');

  const placed = placeCustomersWithoutOrders([], [extra], { page: 1, limit: 20, orderTotal: 0 });
  assert.equal(placed.total, 1);
  assert.equal(placed.customers[0].id, 'customer-saeed-alqassimi');
});

test('placeholder images are rejected', () => {
  assert.equal(isValidCustomerImage('/placeholder.png'), false);
  assert.equal(isValidCustomerImage('https://cdn.example/a.jpg'), true);
});
