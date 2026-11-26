'use client';

import ProductCard from '@/components/ProductCard';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import {
  HOME_SECTION_CAROUSEL_INNER_CLASS,
  HOME_SECTION_CLASS,
  HOME_SECTION_HEADING_CLASS,
  HOME_SECTION_HEADER_CLASS,
} from '@/lib/storefrontCarousel';
import { clampFeaturedColumns } from '@/lib/featuredProductLimit';

export default function BrandsBannerProducts({
  products = [],
  title = '',
  titleAr = '',
  columns = 6,
}) {
  const { isArabic } = useStorefrontI18n();
  const heading = isArabic && String(titleAr || '').trim() ? titleAr : title;
  const columnCount = clampFeaturedColumns(columns, 6);
  const visible = Array.isArray(products) ? products : [];
  const filledColumns = Math.min(columnCount, Math.max(1, visible.length || columnCount));
  if (!visible.length) return null;

  return (
    <section className={HOME_SECTION_CLASS}>
      <div className={HOME_SECTION_CAROUSEL_INNER_CLASS}>
        {String(heading || '').trim() ? (
          <div className={HOME_SECTION_HEADER_CLASS}>
            <h2 className={HOME_SECTION_HEADING_CLASS}>{heading}</h2>
          </div>
        ) : null}
        <div
          className="brands-banner-products-grid grid items-stretch gap-3"
          style={{ '--desktop-cols': String(filledColumns) }}
        >
          {visible.map((product, index) => (
            <ProductCard
              key={product._id || product.id || index}
              product={product}
              priorityImages={index < filledColumns}
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        .brands-banner-products-grid {
          grid-template-columns: repeat(${Math.min(2, filledColumns)}, minmax(0, 1fr));
        }
        @media (min-width: 640px) {
          .brands-banner-products-grid {
            grid-template-columns: repeat(${Math.min(3, filledColumns)}, minmax(0, 1fr));
          }
        }
        @media (min-width: 1024px) {
          .brands-banner-products-grid {
            grid-template-columns: repeat(${Math.min(4, filledColumns)}, minmax(0, 1fr));
          }
        }
        @media (min-width: 1280px) {
          .brands-banner-products-grid {
            grid-template-columns: repeat(var(--desktop-cols), minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}
