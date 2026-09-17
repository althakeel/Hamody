import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getScrollToTopPositionClass,
  normalizeScrollToTop,
} from '../lib/scrollToTopSettings.js';

test('left and right use physical screen sides so RTL does not flip the button', () => {
  const left = getScrollToTopPositionClass('left');
  const right = getScrollToTopPositionClass('right');

  assert.match(left, /\bleft-4\b/);
  assert.doesNotMatch(left, /\bstart-/);
  assert.doesNotMatch(left, /\bright-/);

  assert.match(right, /\bright-4\b/);
  assert.doesNotMatch(right, /\bend-/);
  assert.doesNotMatch(right, /\bleft-/);
});

test('normalize keeps an explicit left position', () => {
  assert.equal(normalizeScrollToTop({ enabled: true, position: 'left' }).position, 'left');
});
