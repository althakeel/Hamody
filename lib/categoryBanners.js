import { readableUploadUrl } from '@/lib/readableUploadUrl';

function firstUrl(...values) {
  for (const value of values) {
    const trimmed = readableUploadUrl(String(value || '').trim());
    if (trimmed) return trimmed;
  }
  return '';
}

export function getCategoryBannerUrls(category = {}, { isArabic = false } = {}) {
  const bannerEn = firstUrl(category.bannerEn);
  const bannerAr = firstUrl(category.bannerAr);
  const bannerTabletEn = firstUrl(category.bannerTabletEn);
  const bannerTabletAr = firstUrl(category.bannerTabletAr);
  const bannerMobileEn = firstUrl(category.bannerMobileEn);
  const bannerMobileAr = firstUrl(category.bannerMobileAr);

  const desktop = isArabic
    ? firstUrl(bannerAr, bannerEn, bannerTabletAr, bannerTabletEn, bannerMobileAr, bannerMobileEn)
    : firstUrl(bannerEn, bannerAr, bannerTabletEn, bannerTabletAr, bannerMobileEn, bannerMobileAr);

  const tablet = isArabic
    ? firstUrl(bannerTabletAr, bannerTabletEn, bannerAr, bannerEn, bannerMobileAr, bannerMobileEn)
    : firstUrl(bannerTabletEn, bannerTabletAr, bannerEn, bannerAr, bannerMobileEn, bannerMobileAr);

  const mobile = isArabic
    ? firstUrl(bannerMobileAr, bannerMobileEn, bannerTabletAr, bannerTabletEn, bannerAr, bannerEn)
    : firstUrl(bannerMobileEn, bannerMobileAr, bannerTabletEn, bannerTabletAr, bannerEn, bannerAr);

  return {
    desktop,
    tablet,
    mobile,
    hasBanner: Boolean(desktop || tablet || mobile),
  };
}
