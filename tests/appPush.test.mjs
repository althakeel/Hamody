import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppPush } from '../lib/appPush.js';

test('push notification keeps image, button, and path', () => {
  const message = normalizeAppPush({
    title: 'Weekend offer',
    body: 'Open the app for the deal',
    imageUrl: 'https://cdn.example.com/banner.jpg',
    buttonText: 'Shop now',
    path: '/shop',
    audience: 'android',
  });
  assert.equal(message.title, 'Weekend offer');
  assert.equal(message.imageUrl, 'https://cdn.example.com/banner.jpg');
  assert.equal(message.buttonText, 'Shop now');
  assert.equal(message.path, '/shop');
  assert.equal(message.audience, 'android');
});

test('a button needs a path', () => {
  const message = normalizeAppPush({ title: 'Hi', body: 'There', buttonText: 'Open', path: '' });
  assert.equal(message.error, 'Choose where the button opens');
});
