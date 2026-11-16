import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHelpAdminUnlockToken,
  HELP_ADMIN_PIN_PROMPT,
  isHelpAdminPin,
  isValidHelpAdminUnlockToken,
  pinGateHelpQuestion,
  resolveHelpQuestionAndPin,
  wantsSuperAdminHelpDetails,
} from '../lib/storeHelpAgentPin.js';

test('sales and customer questions need the super-admin PIN', () => {
  assert.equal(wantsSuperAdminHelpDetails('How many sales did I get this month?'), true);
  assert.equal(wantsSuperAdminHelpDetails('this motnth revenue how many delivered'), true);
  assert.equal(wantsSuperAdminHelpDetails('this month delivered download'), true);
  assert.equal(wantsSuperAdminHelpDetails('any one name rohith as customer we have'), true);
  assert.equal(wantsSuperAdminHelpDetails('i need to downaldo the customer names in excel'), true);
  assert.equal(wantsSuperAdminHelpDetails('how many pages are ther in this website'), false);
  assert.equal(wantsSuperAdminHelpDetails('Where do I add category banners?'), false);
  assert.equal(wantsSuperAdminHelpDetails('Who is the author of HAMODY?'), false);
});

test('PIN unlocks a pending sales question', () => {
  const resolved = resolveHelpQuestionAndPin({
    question: '743362',
    pendingQuestion: 'How many sales did I get this month?',
  });
  assert.equal(resolved.question, 'How many sales did I get this month?');
  assert.equal(isHelpAdminPin(resolved.pin), true);

  const gated = pinGateHelpQuestion({ cookies: { get: () => undefined } }, {
    question: '743362',
    pendingQuestion: 'How many sales did I get this month?',
  });
  assert.equal(gated.needsPin, false);
  assert.equal(gated.question, 'How many sales did I get this month?');
  assert.ok(gated.unlockToken);
  assert.equal(isValidHelpAdminUnlockToken(gated.unlockToken), true);
});

test('wrong PIN keeps sales locked', () => {
  const gated = pinGateHelpQuestion({ cookies: { get: () => undefined } }, {
    question: '000000',
    pendingQuestion: 'How many sales did I get this month?',
  });
  assert.equal(gated.needsPin, true);
  assert.equal(gated.pinWrong, true);
  assert.equal(HELP_ADMIN_PIN_PROMPT.includes('PIN'), true);
});

test('unlock token stays valid after PIN', () => {
  const token = createHelpAdminUnlockToken();
  const gated = pinGateHelpQuestion({
    cookies: { get: () => ({ value: token }) },
  }, { question: 'How many sales did I get this month?' });
  assert.equal(gated.needsPin, false);
});
