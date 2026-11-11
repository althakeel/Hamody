'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { hasShowcaseBannerImage, pickShowcaseBannerSources } from '@/lib/showcaseBannerImages';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

const DESKTOP_HEIGHT = 220;
const MOBILE_HEIGHT = 120;

export default function CategorySliderBanner({ section }) {
  const router = useRouter();
  const { isArabic } = useStorefrontI18n();
  const banner = section?.banner || {};
  if (!hasShowcaseBannerImage(banner)) return null;

  const sources = pickShowcaseBannerSources(banner, isArabic);
  if (!sources.desktop && !sources.tablet && !sources.mobile) return null;

  const alt = String(banner.alt || section?.title || 'Banner').trim() || 'Banner';
  const link = String(banner.link || '').trim();

  const handleClick = () => {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) {
      window.location.href = link;
      return;
    }
    router.push(link);
  };

  // No HOME_SECTION wrapper — Section4 already provides the shared grid width/padding.
  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={!link}
        className={`category-slider-banner relative w-full overflow-hidden rounded-2xl ${link ? 'cursor-pointer' : 'cursor-default'}`}
        style={{
          '--csb-mobile-height': `${MOBILE_HEIGHT}px`,
          '--csb-desktop-height': `${DESKTOP_HEIGHT}px`,
        }}
        aria-label={link ? alt : undefined}
      >
        {sources.mobile ? (
          <Image
            src={sources.mobile}
            alt={alt}
            fill
            sizes="100vw"
            className="object-cover object-center md:hidden"
            priority={false}
          />
        ) : null}
        {sources.tablet ? (
          <Image
            src={sources.tablet}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 1100px"
            className="hidden object-cover object-center md:block lg:hidden"
            priority={false}
          />
        ) : null}
        {sources.desktop ? (
          <Image
            src={sources.desktop}
            alt={alt}
            fill
            sizes="(max-width: 1400px) 100vw, 1400px"
            className="hidden object-cover object-center lg:block"
            priority={false}
          />
        ) : null}
      </button>
      <style jsx>{`
        .category-slider-banner {
          height: var(--csb-mobile-height);
        }
        @media (min-width: 640px) {
          .category-slider-banner {
            height: var(--csb-desktop-height);
          }
        }
      `}</style>
    </div>
  );
}
