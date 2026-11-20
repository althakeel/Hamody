import Link from 'next/link'

const PROMOS = [
  {
    src: '/banners/home-ad-equip-adventure-v2.jpg',
    alt: 'Prepare your adventure. Foldable canopy, chair, lamp, cooler box, and table.',
    href: '/category/camping-furniture',
    width: 837,
    height: 1024,
  },
  {
    src: '/banners/home-ad-tent-v2.jpg',
    alt: 'Camping tent for outdoor trips. Durable, comfortable, and automatic pop-up.',
    href: '/category/camping-tent',
    width: 818,
    height: 1024,
  },
  {
    src: '/banners/home-ad-chair.jpg',
    alt: 'Luxury portable camping chair. Lightweight, comfortable, and easy to carry.',
    href: '/category/camping-furniture',
    width: 818,
    height: 1024,
  },
  {
    src: '/banners/home-ad-cook-anywhere-ar.jpg',
    alt: 'Cook anytime, anywhere. Portable stove for camping, hiking, and outdoor cooking.',
    href: '/category/camping-kitchen',
    width: 813,
    height: 1024,
  },
]

function PromoCard({ promo }) {
  return (
    <Link
      href={promo.href}
      className="block overflow-hidden rounded-xl bg-neutral-100"
    >
      <img
        src={promo.src}
        alt={promo.alt}
        width={promo.width}
        height={promo.height}
        className="hm-promo-zoom h-auto w-full"
        draggable={false}
      />
    </Link>
  )
}

export default function HomePromoRow() {
  return (
    <section aria-label="Camping offers" className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
      <div className="hm-promo-row grid grid-cols-2 gap-3 md:grid-cols-4">
        {PROMOS.map((promo) => (
          <PromoCard key={promo.src} promo={promo} />
        ))}
      </div>
    </section>
  )
}
