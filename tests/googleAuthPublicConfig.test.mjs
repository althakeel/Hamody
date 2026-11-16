import test from 'node:test';
import assert from 'node:assert/strict';
import { getGoogleAuthPublicConfig } from '../lib/googleAuthPublicConfig.js';

test('google auth config is public client fields only', () => {
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'public-key';
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'store.firebaseapp.com';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'hamody';
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'store.appspot.com';
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123';
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123:web:abc';
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = '123-web.apps.googleusercontent.com';

  const config = getGoogleAuthPublicConfig();
  assert.equal(config.configured, true);
  assert.equal(config.googleWebClientId, '123-web.apps.googleusercontent.com');
  assert.equal(config.firebase.projectId, 'hamody');
  assert.equal(JSON.stringify(config).includes('private_key'), false);
  assert.equal(JSON.stringify(config).includes('APP_SECURITY_KEY'), false);
});
