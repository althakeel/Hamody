import {
  hasShowcaseBannerImage,
  serializeShowcaseImageFields,
} from '@/lib/showcaseBannerImages';

export function normalizeCategorySliderSectionType(value) {
  return String(value || '').trim().toLowerCase() === 'banner' ? 'banner' : 'slider';
}

export function normalizeCategorySliderBanner(input = {}) {
  const source = input?.banner && typeof input.banner === 'object' ? input.banner : input;
  const images = serializeShowcaseImageFields(source);
  return {
    ...images,
    link: String(source?.link || '').trim(),
    alt: String(source?.alt || '').trim().slice(0, 160),
  };
}

export function serializeCategorySliderBanner(slider = {}) {
  const sectionType = normalizeCategorySliderSectionType(slider.sectionType);
  const banner = normalizeCategorySliderBanner(slider.banner || slider);
  return {
    sectionType,
    banner,
    hasBannerImage: hasShowcaseBannerImage(banner),
  };
}

export function validateCategorySliderBanner(banner = {}) {
  if (!hasShowcaseBannerImage(banner)) {
    return 'Upload at least one banner image (desktop, tablet, or mobile).';
  }
  return null;
}
