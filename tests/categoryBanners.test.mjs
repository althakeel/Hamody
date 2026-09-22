import test from 'node:test';
import assert from 'node:assert/strict';
import { getCategoryBannerUrls } from '../lib/categoryBanners.js';

test('prefers language-specific desktop, tablet, and mobile banners', () => {
  const banners = getCategoryBannerUrls({
    bannerEn: 'en-desktop.jpg',
    bannerAr: 'ar-desktop.jpg',
    bannerTabletEn: 'en-tablet.jpg',
    bannerTabletAr: 'ar-tablet.jpg',
    bannerMobileEn: 'en-mobile.jpg',
    bannerMobileAr: 'ar-mobile.jpg',
  }, { isArabic: true });

  assert.equal(banners.desktop, 'ar-desktop.jpg');
  assert.equal(banners.tablet, 'ar-tablet.jpg');
  assert.equal(banners.mobile, 'ar-mobile.jpg');
  assert.equal(banners.hasBanner, true);
});

test('falls back to English when Arabic banners are missing', () => {
  const banners = getCategoryBannerUrls({
    bannerEn: 'en-desktop.jpg',
    bannerTabletEn: 'en-tablet.jpg',
    bannerMobileEn: 'en-mobile.jpg',
  }, { isArabic: true });

  assert.equal(banners.desktop, 'en-desktop.jpg');
  assert.equal(banners.tablet, 'en-tablet.jpg');
  assert.equal(banners.mobile, 'en-mobile.jpg');
  assert.equal(banners.hasBanner, true);
});

test('tablet falls back to desktop, then mobile', () => {
  const banners = getCategoryBannerUrls({
    bannerEn: 'en-desktop.jpg',
    bannerMobileEn: 'en-mobile.jpg',
  }, { isArabic: false });

  assert.equal(banners.desktop, 'en-desktop.jpg');
  assert.equal(banners.tablet, 'en-desktop.jpg');
  assert.equal(banners.mobile, 'en-mobile.jpg');
  assert.equal(banners.hasBanner, true);
});

test('returns no banner when every field is empty', () => {
  const banners = getCategoryBannerUrls({}, { isArabic: false });
  assert.equal(banners.hasBanner, false);
  assert.equal(banners.desktop, '');
  assert.equal(banners.tablet, '');
  assert.equal(banners.mobile, '');
});
