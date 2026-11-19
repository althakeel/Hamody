import Link from 'next/link'

const PROMOS = [
  {
    src: '/banners/home-ad-equip-adventure.jpg',
    alt: 'Equip your adventure. Canopy tent, foldable chair, portable lamp, cooler box, and foldable table.',
    href: '/category/camping-furniture',
  },
  {
    src: '/banners/home-ad-tent.jpg',
    alt: 'Tent for camping and outdoors. Durable, comfortable, automatic pop-up.',
    href: '/category/camping-tent',
  },
  {
    src: '/banners/home-ad-camping-finds.jpg',
    alt: 'Camping finds for your next trip. Twelve gear picks.',
    href: '/category/camping',
  },
  {
    src: '/banners/home-ad-cook-anywhere.jpg',
    alt: 'Cook anytime, anywhere. Portable power for camping, hiking, and outdoor cooking.',
    href: '/category/camping-kitchen',
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
        width={819}
        height={1024}
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
