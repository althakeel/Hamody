import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductImageBadge,
  getNewTagLabel,
  isProductWithinNewWindow,
  normalizeNewTagSettings,
  oppositeBadgePosition,
  shouldShowNewProductTag,
} from '../lib/newProductTag.js';

test('clamps display days and keeps a custom New label', () => {
  const settings = normalizeNewTagSettings({
    label: 'Just in',
    displayDays: 400,
  });
  assert.equal(settings.label, 'Just in');
  assert.equal(settings.displayDays, 365);
  assert.equal(settings.badges[0].label, 'Just in');
});

test('migrates a single legacy badge and defaults it to the left', () => {
  const settings = normalizeNewTagSettings({
    label: 'New',
    labelAr: 'جديد',
  });
  assert.equal(settings.badges.length, 1);
  assert.equal(settings.badges[0].position, 'left');
});

test('keeps a second badge on the opposite side', () => {
  const settings = normalizeNewTagSettings({
    badges: [
      { label: 'New', position: 'left' },
      { label: 'Hot', position: 'left' },
    ],
  });
  assert.equal(settings.badges.length, 2);
  assert.equal(settings.badges[0].position, 'left');
  assert.equal(settings.badges[1].position, 'right');
});

test('adds a second badge on the free side', () => {
  const first = normalizeNewTagSettings({}).badges;
  const second = createProductImageBadge({ label: 'Sale' }, first);
  assert.equal(second.position, oppositeBadgePosition(first[0].position));
  assert.equal(second.label, 'Sale');
});

test('hides the badge after the configured number of days', () => {
  const now = Date.parse('2026-09-11T00:00:00.000Z');
  const settings = { enabled: true, displayDays: 7, showOnImageOverlay: true };
  const fresh = { createdAt: '2026-09-08T00:00:00.000Z' };
  const expired = { createdAt: '2026-08-01T00:00:00.000Z' };

  assert.equal(isProductWithinNewWindow(fresh, settings, now), true);
  assert.equal(isProductWithinNewWindow(expired, settings, now), false);
  assert.equal(shouldShowNewProductTag(expired, settings, now), false);
});

test('shows a fresh product anywhere when the New badge is enabled', () => {
  const now = Date.parse('2026-09-11T00:00:00.000Z');
  const fresh = { createdAt: '2026-09-08T00:00:00.000Z' };

  assert.equal(shouldShowNewProductTag(fresh, { enabled: true, displayDays: 14 }, now), true);
  assert.equal(shouldShowNewProductTag(fresh, { enabled: false, displayDays: 14 }, now), false);
});

test('uses the Arabic label on the Arabic storefront', () => {
  assert.equal(getNewTagLabel({ label: 'New', labelAr: 'جديد' }, 'ar'), 'جديد');
});

test('keeps distinct placements and fills extra badge options', () => {
  const settings = normalizeNewTagSettings({
    badges: [
      { label: 'New', placement: 'bottom-left', size: 'large', shape: 'tag', shadow: 'strong' },
      { label: 'Hot', placement: 'top-center', size: 'small', opacity: 80, letterSpacing: 'wide' },
      { label: 'Sale', placement: 'top-center', offset: 'loose' },
    ],
  });
  assert.equal(settings.badges.length, 3);
  assert.equal(settings.badges[0].placement, 'bottom-left');
  assert.equal(settings.badges[1].placement, 'top-center');
  assert.equal(settings.badges[2].placement, 'bottom-right');
  assert.equal(settings.badges[0].size, 'large');
  assert.equal(settings.badges[0].shape, 'tag');
  assert.equal(settings.badges[0].shadow, 'strong');
  assert.equal(settings.badges[1].opacity, 80);
  assert.equal(settings.badges[1].letterSpacing, 'wide');
  assert.equal(settings.badges[2].offset, 'loose');
});

test('adds a third badge on a free corner', () => {
  const first = normalizeNewTagSettings({
    badges: [
      { label: 'New', placement: 'top-left' },
      { label: 'Hot', placement: 'top-right' },
    ],
  }).badges;
  const third = createProductImageBadge({ label: 'Sale' }, first);
  assert.equal(third.placement, 'top-center');
  assert.equal(third.label, 'Sale');
});

test('shows a badge only when its condition matches the product', () => {
  const now = Date.parse('2026-09-11T00:00:00.000Z');
  const oldProduct = {
    createdAt: '2026-01-01T00:00:00.000Z',
    price: 80,
    AED: 100,
    inStock: true,
    stockQuantity: 12,
  };
  const saleSettings = {
    enabled: true,
    displayDays: 7,
    badges: [{ label: 'Sale', condition: 'on-sale' }],
  };
  const alwaysSettings = {
    enabled: true,
    displayDays: 7,
    badges: [{ label: 'Store', condition: 'always' }],
  };

  assert.equal(shouldShowNewProductTag(oldProduct, saleSettings, now), true);
  assert.equal(shouldShowNewProductTag({ ...oldProduct, price: 100 }, saleSettings, now), false);
  assert.equal(shouldShowNewProductTag(oldProduct, alwaysSettings, now), true);
  assert.equal(normalizeNewTagSettings({}).badges[0].condition, 'new');
});

test('keeps a transparent background and custom border width', () => {
  const settings = normalizeNewTagSettings({
    badges: [{
      label: 'Sale',
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 6,
    }],
  });
  assert.equal(settings.badges[0].backgroundColor, 'transparent');
  assert.equal(settings.badges[0].borderColor, 'transparent');
  assert.equal(settings.badges[0].borderWidth, 6);
});
