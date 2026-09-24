import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNotifyContact } from '../lib/stockNotify.js';

test('accepts email or phone and rejects empty contact', () => {
  assert.equal(parseNotifyContact({}).error, 'Enter an email or phone number.');
  assert.deepEqual(parseNotifyContact({ email: 'Ada@Store.com' }), {
    email: 'ada@store.com',
    phone: '',
    contactKey: 'email:ada@store.com',
  });
  assert.deepEqual(parseNotifyContact({ phone: '0501234567', phoneCode: '+971' }), {
    email: '',
    phone: '+971501234567',
    contactKey: 'phone:+971501234567',
  });
});
