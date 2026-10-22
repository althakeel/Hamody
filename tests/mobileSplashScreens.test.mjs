import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSplashScreens, toPublicSplashScreens } from '../lib/mobileSplashScreens.js';

test('splash defaults to after the app was closed for 3 hours', () => {
  const normalized = normalizeSplashScreens({});
  assert.equal(normalized.displayMode, 'afterClosed');
  assert.equal(normalized.closedHours, 3);
  const payload = toPublicSplashScreens({
    screens: [{ url: 'https://cdn.example/a.jpg', durationSeconds: 3 }],
  });
  assert.equal(payload.displayMode, 'afterClosed');
  assert.equal(payload.closedHours, 3);
  assert.equal(payload.screens.length, 1);
});

test('splash keeps every-open and install-only modes', () => {
  assert.equal(normalizeSplashScreens({ displayMode: 'everyOpen' }).displayMode, 'everyOpen');
  assert.equal(normalizeSplashScreens({ displayMode: 'installOnly' }).displayMode, 'installOnly');
  assert.equal(normalizeSplashScreens({ displayMode: 'other' }).displayMode, 'afterClosed');
});

test('a turned-off splash does not send the play rule', () => {
  const payload = toPublicSplashScreens({ enabled: false, displayMode: 'everyOpen', screens: [{ url: 'https://cdn.example/a.jpg' }] });
  assert.deepEqual(payload, { enabled: false, screens: [] });
});
