import test from 'node:test';
import assert from 'node:assert/strict';
import { readAppClientSource } from '../lib/appClientSource.js';

function requestWith(headers) {
  return {
    headers: {
      get(name) {
        return headers[String(name).toLowerCase()] || '';
      },
    },
  };
}

test('website checkout is not an app order', () => {
  const source = readAppClientSource(requestWith({ 'user-agent': 'Mozilla/5.0 (Linux; Android 14)' }));
  assert.equal(source.clientChannel, 'website');
  assert.equal(source.clientPlatform, 'web');
});

test('app headers record android or ios', () => {
  assert.deepEqual(
    readAppClientSource(requestWith({ 'x-store1920-client': 'app', 'x-store1920-platform': 'android' })),
    { clientChannel: 'app', clientPlatform: 'android' },
  );
  assert.deepEqual(
    readAppClientSource(requestWith({ 'x-store1920-client': 'flutter', 'x-store1920-platform': 'ios' })),
    { clientChannel: 'app', clientPlatform: 'ios' },
  );
});
