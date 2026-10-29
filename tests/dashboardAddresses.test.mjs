import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteDashboardAddress,
  loadDashboardAddresses,
  saveDashboardAddress,
} from '../lib/dashboardAddresses.js';

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return body;
    },
  };
}

test('loads dashboard addresses from the authenticated singular address endpoint', async () => {
  const calls = [];
  const addresses = [{ _id: 'address-1', street: 'abc building', zip: '0000' }];

  const result = await loadDashboardAddresses({
    getToken: async () => 'token-123',
    request: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ addresses });
    },
  });

  assert.deepEqual(result, addresses);
  assert.deepEqual(calls, [{
    url: '/api/address',
    options: {
      method: 'GET',
      headers: { Authorization: 'Bearer token-123' },
    },
  }]);
});

test('saves canonical address fields through the authenticated address endpoint', async () => {
  const calls = [];
  const address = {
    name: 'Customer',
    email: 'customer@example.com',
    street: 'Villa 10',
    city: 'Dubai',
    state: 'Dubai',
    district: 'Al Barsha 3',
    zip: '0000',
    country: 'United Arab Emirates',
    phone: '501234567',
    phoneCode: '+971',
  };

  const result = await saveDashboardAddress({
    getToken: async () => 'token-456',
    address,
    request: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ message: 'Address saved', newAddress: { _id: 'address-2', ...address } }, { status: 201 });
    },
  });

  assert.equal(result.newAddress.street, 'Villa 10');
  assert.equal(result.newAddress.zip, '0000');
  assert.equal(calls[0].url, '/api/address');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-456');
  assert.deepEqual(JSON.parse(calls[0].options.body), { address });
});

test('deletes an address through the authenticated address endpoint', async () => {
  const calls = [];

  await deleteDashboardAddress({
    getToken: async () => 'token-789',
    addressId: 'address/3',
    request: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ message: 'Address deleted successfully' });
    },
  });

  assert.deepEqual(calls, [{
    url: '/api/address/address%2F3',
    options: {
      method: 'DELETE',
      headers: { Authorization: 'Bearer token-789' },
    },
  }]);
});
