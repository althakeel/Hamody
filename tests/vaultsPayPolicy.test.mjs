import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VAULTSPAY_CALLBACK_PATH,
  VAULTSPAY_EXPIRY_SECONDS,
  createVaultsPayCheckout,
  normalizeVaultsPayStatus,
} from '../lib/vaultsPay.js';
import {
  getVaultsPayTerminalFailure,
  isVaultsPayUnpaidTimeout,
  resolveVaultsPayWebhookIdentifiers,
} from '../lib/vaultsPayWebhookPolicy.js';

function vaultsPayResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload);
    },
  };
}

test('VaultsPay checkout policy uses a 30-minute expiry and the callback endpoint', () => {
  assert.equal(VAULTSPAY_EXPIRY_SECONDS, 1800);
  assert.equal(VAULTSPAY_CALLBACK_PATH, '/api/vaultspay/callback');
});

test('VaultsPay initiated transactions remain unpaid and pending', () => {
  assert.equal(normalizeVaultsPayStatus('Initiated'), 'PENDING');
  assert.equal(normalizeVaultsPayStatus('pending'), 'PENDING');
});

test('VaultsPay expired transactions remain distinct from cancellations', () => {
  assert.equal(normalizeVaultsPayStatus('Expired'), 'EXPIRED');
  assert.equal(normalizeVaultsPayStatus('Cancelled'), 'CANCELLED');
});

test('VaultsPay success statuses are the only statuses normalized as successful', () => {
  for (const status of ['Success', 'Captured', 'Paid', 'Completed']) {
    assert.equal(normalizeVaultsPayStatus(status), 'SUCCESS');
  }
  for (const status of ['Initiated', 'Pending', 'Failed', 'Declined', 'Expired']) {
    assert.notEqual(normalizeVaultsPayStatus(status), 'SUCCESS');
  }
});

test('VaultsPay initialization sends the shared expiry and callback URL', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalClientId = process.env.VAULTSPAY_CLIENT_ID;
  const originalClientSecret = process.env.VAULTSPAY_CLIENT_SECRET;
  const calls = [];
  process.env.VAULTSPAY_CLIENT_ID = 'client-id';
  process.env.VAULTSPAY_CLIENT_SECRET = 'client-secret';

  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/merchant-auth')) {
      return vaultsPayResponse({ data: { access_token: 'access-token', stores: [{ channelName: 'web' }] } });
    }
    if (String(url).endsWith('/get-vaultspay-allowed-payment-methods')) {
      return vaultsPayResponse({ data: [{ code: 'CARD', name: 'Visa / Mastercard' }] });
    }
    return vaultsPayResponse({ data: { paymentUrl: 'https://pay.example/checkout', paymentId: 'payment-1' } });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalClientId === undefined) delete process.env.VAULTSPAY_CLIENT_ID;
    else process.env.VAULTSPAY_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.VAULTSPAY_CLIENT_SECRET;
    else process.env.VAULTSPAY_CLIENT_SECRET = originalClientSecret;
  });

  await createVaultsPayCheckout({
    amount: 125.5,
    orderId: 'order-1',
    callbackUrl: `https://www.store1920.com${VAULTSPAY_CALLBACK_PATH}`,
    redirectUrl: 'https://www.store1920.com/order-success',
  });

  const initialization = JSON.parse(calls[2].options.body);
  assert.equal(initialization.expiryInSeconds, 1800);
  assert.equal(initialization.callBackUrl, 'https://www.store1920.com/api/vaultspay/callback');
});

test('VaultsPay checkout rejects a missing callback URL before gateway authentication', async () => {
  await assert.rejects(
    createVaultsPayCheckout({ amount: 50, orderId: 'order-2' }),
    /callback URL/i,
  );
});

test('VaultsPay callback resolves transaction and order references from body aliases', () => {
  assert.deepEqual(
    resolveVaultsPayWebhookIdentifiers({
      body: { payment_id: 'payment-22', clientReference: '100022' },
      url: 'https://www.store1920.com/api/vaultspay/callback',
    }),
    { transactionId: 'payment-22', orderId: '100022' },
  );
});

test('VaultsPay callback resolves identifiers from query parameters and safely accepts an empty callback', () => {
  assert.deepEqual(
    resolveVaultsPayWebhookIdentifiers({
      body: {},
      url: 'https://www.store1920.com/api/vaultspay/callback?transactionId=payment-23&orderId=order-23',
    }),
    { transactionId: 'payment-23', orderId: 'order-23' },
  );
  assert.deepEqual(
    resolveVaultsPayWebhookIdentifiers({
      body: {},
      url: 'https://www.store1920.com/api/vaultspay/callback',
    }),
    { transactionId: '', orderId: '' },
  );
});

test('VaultsPay expired transactions produce an expired order outcome', () => {
  assert.deepEqual(getVaultsPayTerminalFailure('EXPIRED'), {
    paymentStatus: 'expired',
    reason: 'payment_expired',
    recoveryReason: 'Card payment expired',
  });
  assert.equal(getVaultsPayTerminalFailure('PENDING'), null);
});

test('VaultsPay only fails unpaid transactions after their checkout expiry', () => {
  const now = new Date('2026-10-30T12:00:00.000Z');
  const expiresAt = new Date('2026-10-30T11:59:59.000Z');
  assert.equal(isVaultsPayUnpaidTimeout('Initiated', expiresAt, now), true);
  assert.equal(isVaultsPayUnpaidTimeout('Pending', expiresAt, now), true);
  assert.equal(isVaultsPayUnpaidTimeout('Initiated', new Date(now.getTime() + 1), now), false);
  assert.equal(isVaultsPayUnpaidTimeout('Completed', expiresAt, now), false);
  assert.equal(isVaultsPayUnpaidTimeout('Unknown', expiresAt, now), false);
});
