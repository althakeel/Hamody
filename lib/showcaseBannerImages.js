export const SHOWCASE_IMAGE_FIELD_KEYS = [
  'image',
  'wideImage',
  'tabletImage',
  'mobileImage',
  'imageAr',
  'wideImageAr',
  'tabletImageAr',
  'mobileImageAr',
]

export function firstShowcaseImageUrl(...values) {
  for (const value of values) {
    const trimmed = String(value || '').trim()
    if (trimmed) return trimmed
  }
  return ''
}

export function serializeShowcaseImageFields(item = {}) {
  return {
    image: firstShowcaseImageUrl(item.image),
    wideImage: firstShowcaseImageUrl(item.wideImage),
    tabletImage: firstShowcaseImageUrl(item.tabletImage),
    mobileImage: firstShowcaseImageUrl(item.mobileImage),
    imageAr: firstShowcaseImageUrl(item.imageAr),
    wideImageAr: firstShowcaseImageUrl(item.wideImageAr),
    tabletImageAr: firstShowcaseImageUrl(item.tabletImageAr),
    mobileImageAr: firstShowcaseImageUrl(item.mobileImageAr),
  }
}

export function hasShowcaseBannerImage(item = {}) {
  const fields = serializeShowcaseImageFields(item)
  return SHOWCASE_IMAGE_FIELD_KEYS.some((key) => fields[key])
}

export function pickShowcaseBannerSources(item = {}, isArabic = false) {
  const fields = serializeShowcaseImageFields(item)
  const desktop = firstShowcaseImageUrl(
    isArabic ? fields.imageAr : fields.image,
    fields.image,
    fields.imageAr,
  )
  const wide = firstShowcaseImageUrl(
    isArabic ? fields.wideImageAr : fields.wideImage,
    fields.wideImage,
    fields.wideImageAr,
  )
  const tablet = firstShowcaseImageUrl(
    isArabic ? fields.tabletImageAr : fields.tabletImage,
    fields.tabletImage,
    fields.tabletImageAr,
    desktop,
  )
  const mobile = firstShowcaseImageUrl(
    isArabic ? fields.mobileImageAr : fields.mobileImage,
    fields.mobileImage,
    fields.mobileImageAr,
    tablet,
  )

  return { desktop, wide, tablet, mobile }
}
