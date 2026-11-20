export const DEFAULT_FRONT_PROMO_CARDS = [
  {
    image: '/banners/home-ad-equip-adventure-v2.jpg',
    link: '/category/camping-furniture',
    alt: 'Prepare your adventure. Foldable canopy, chair, lamp, cooler box, and table.',
    width: 837,
    height: 1024,
  },
  {
    image: '/banners/home-ad-tent-v2.jpg',
    link: '/category/camping-tent',
    alt: 'Camping tent for outdoor trips. Durable, comfortable, and automatic pop-up.',
    width: 818,
    height: 1024,
  },
  {
    image: '/banners/home-ad-chair.jpg',
    link: '/category/camping-furniture',
    alt: 'Luxury portable camping chair. Lightweight, comfortable, and easy to carry.',
    width: 818,
    height: 1024,
  },
  {
    image: '/banners/home-ad-cook-anywhere-ar.jpg',
    link: '/category/camping-kitchen',
    alt: 'Cook anytime, anywhere. Portable stove for camping, hiking, and outdoor cooking.',
    width: 813,
    height: 1024,
  },
]

export function normalizeFrontPromoCards(items) {
  const source = Array.isArray(items) ? items : []
  return DEFAULT_FRONT_PROMO_CARDS.map((fallback, index) => {
    const item = source[index] && typeof source[index] === 'object' ? source[index] : {}
    const image = String(item.image || '').trim()
    const link = String(item.link || item.href || '').trim()
    const alt = String(item.alt || '').trim()
    const width = Number(item.width)
    const height = Number(item.height)
    return {
      image: image || fallback.image,
      link: link || fallback.link,
      alt: alt || fallback.alt,
      width: Number.isFinite(width) && width > 0 ? width : fallback.width,
      height: Number.isFinite(height) && height > 0 ? height : fallback.height,
    }
  })
}
