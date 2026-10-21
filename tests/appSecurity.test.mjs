import test from 'node:test';
import assert from 'node:assert/strict';
import { isTrustedAppRequest } from '../lib/appSecurity.js';

function requestWith(headers) {
  return {
    headers: {
      get(name) {
        return headers[String(name).toLowerCase()] || '';
      },
    },
  };
}

test('app calls must send the matching app id and security key', () => {
  process.env.STORE1920_APP_ID = 'app-id';
  process.env.APP_SECURITY_KEY = 'test-key';
  assert.equal(isTrustedAppRequest(requestWith({})), false);
  assert.equal(isTrustedAppRequest(requestWith({
    'x-store1920-app-id': 'app-id',
    'x-store1920-app-key': 'wrong',
  })), false);
  assert.equal(isTrustedAppRequest(requestWith({
    'x-store1920-app-id': 'app-id',
    'x-store1920-app-key': 'test-key',
  })), true);
  delete process.env.APP_SECURITY_KEY;
});
