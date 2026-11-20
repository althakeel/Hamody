import Link from 'next/link'
import { normalizeFrontPromoCards } from '@/lib/frontPromoCards'

function PromoCard({ promo }) {
  return (
    <Link
      href={promo.link}
      className="block w-[calc((100%-0.5rem)/2)] shrink-0 snap-start overflow-hidden rounded-xl bg-neutral-100 md:w-auto"
    >
      <img
        src={promo.image}
        alt={promo.alt}
        width={promo.width}
        height={promo.height}
        className="hm-promo-zoom h-auto w-full"
        draggable={false}
      />
    </Link>
  )
}

export default function HomePromoRow({ cards }) {
  const promos = normalizeFrontPromoCards(cards)
  return (
    <section aria-label="Camping offers" className="mx-auto w-full max-w-[1400px] !mt-3 px-3 md:!mt-14 md:px-6">
      <div className="hm-promo-row flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] md:grid md:grid-cols-4 md:gap-3 md:overflow-visible [&::-webkit-scrollbar]:hidden">
        {promos.map((promo, index) => (
          <PromoCard key={`${promo.image}-${index}`} promo={promo} />
        ))}
      </div>
    </section>
  )
}
