'use client';

import ProductCard from '@/components/ProductCard';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import {
  HOME_SECTION_CAROUSEL_INNER_CLASS,
  HOME_SECTION_CLASS,
  HOME_SECTION_HEADING_CLASS,
  HOME_SECTION_HEADER_CLASS,
  PRODUCT_CARD_GRID_CLASS,
} from '@/lib/storefrontCarousel';

export default function BrandsBannerProducts({
  products = [],
  title = '',
  titleAr = '',
}) {
  const { isArabic } = useStorefrontI18n();
  const heading = isArabic && String(titleAr || '').trim() ? titleAr : title;
  const visible = Array.isArray(products) ? products.slice(0, 18) : [];
  if (!visible.length) return null;

  return (
    <section className={HOME_SECTION_CLASS}>
      <div className={HOME_SECTION_CAROUSEL_INNER_CLASS}>
        {String(heading || '').trim() ? (
          <div className={HOME_SECTION_HEADER_CLASS}>
            <h2 className={HOME_SECTION_HEADING_CLASS}>{heading}</h2>
          </div>
        ) : null}
        <div className={PRODUCT_CARD_GRID_CLASS}>
          {visible.map((product, index) => (
            <ProductCard
              key={product._id || product.id || index}
              product={product}
              priorityImages={index < 6}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
