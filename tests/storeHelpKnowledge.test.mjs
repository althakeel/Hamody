import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HAMODY_AUTHOR,
  isStoreAuthorQuestion,
  isStoreOwnerQuestion,
  matchStoreHelpKnowledge,
} from '../lib/storeHelpKnowledge.js';
import { listStoreHelpExportPages } from '../lib/storeHelpPages.js';

test('author of HAMODY is always Rohith Sagar M', () => {
  assert.equal(HAMODY_AUTHOR, 'Rohith Sagar M');
  const questions = [
    'who is the author of HAMODY',
    'who is the author of this store',
    'who created HAMODY',
    'who made this website',
    'who built this store',
    'who is the developer of hamody',
  ];

  for (const question of questions) {
    assert.equal(isStoreAuthorQuestion(question), true, question);
    assert.equal(
      matchStoreHelpKnowledge(question).answer,
      'The author of HAMODY is Rohith Sagar M.',
      question,
    );
  }
});

test('who is the owner names the company only', () => {
  const reply = matchStoreHelpKnowledge('who is the owner of this');
  assert.equal(isStoreOwnerQuestion('who is the owner of this'), true);
  assert.match(reply.answer, /ALTHAKEEL GENERAL TRADING L\.L\.C/);
  assert.equal(reply.answer.includes('Rohith'), false);
  assert.equal(isStoreOwnerQuestion('who is the author of this store'), false);
});

test('website page questions export a page list file', () => {
  const pages = listStoreHelpExportPages();
  assert.ok(pages.some((page) => page.href === '/about-us' && page.section === 'Public'));
  assert.ok(pages.some((page) => page.section === 'Dashboard' && page.href.startsWith('/store')));
  assert.ok(pages.length > 10);
});

test('how many website pages does not look up orders', () => {
  const reply = matchStoreHelpKnowledge('how many pages are ther in this website');
  assert.match(reply.answer, /public website/i);
  assert.match(reply.answer, /dashboard/i);
  assert.doesNotMatch(reply.answer, /Excel or PDF/);
  assert.equal(reply.links.some((link) => link.href === '/about-us'), true);
});

test('navbar wording with a filler word still explains the dropdown', () => {
  const reply = matchStoreHelpKnowledge('how do I change the navbar dropdown');
  assert.match(reply.answer, /Dropdown/);
  assert.equal(reply.links[0].href, '/store/menu-management');
});
