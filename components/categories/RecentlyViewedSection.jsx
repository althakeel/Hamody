'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import ProductCard from '@/components/ProductCard';
import { useAuth } from '@/lib/useAuth';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { fetchProductsByIdsInOrder, isRenderableProduct } from '@/lib/recommendedProductCatalog';
import { PRODUCT_CARD_GRID_CLASS_5 } from '@/lib/storefrontCarousel';

const DISPLAY_LIMIT = 10;

function readLocalViewedIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => String(id || '').trim()).filter(Boolean).slice(0, 20);
  } catch {
    return [];
  }
}

export default function RecentlyViewedSection() {
  const { user, loading, getToken } = useAuth();
  const { t } = useStorefrontI18n();
  const [products, setProducts] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return undefined;
    let cancelled = false;

    const load = async () => {
      if (user) {
        try {
          const token = await getToken();
          if (token) {
            const response = await axios.get('/api/browse-history', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const viewed = (Array.isArray(response.data?.history) ? response.data.history : [])
              .map((entry) => entry?.product)
              .filter(isRenderableProduct)
              .slice(0, DISPLAY_LIMIT);
            if (!cancelled && viewed.length > 0) {
              setProducts(viewed);
              setReady(true);
              return;
            }
          }
        } catch {
          // Guest history in this browser is the fallback.
        }
      }

      const ids = readLocalViewedIds();
      if (ids.length === 0) {
        if (!cancelled) {
          setProducts([]);
          setReady(true);
        }
        return;
      }

      try {
        const loaded = await fetchProductsByIdsInOrder(ids);
        if (!cancelled) {
          setProducts(loaded.slice(0, DISPLAY_LIMIT));
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setReady(true);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, loading, getToken]);

  if (!ready || products.length === 0) return null;

  return (
    <section className="border-t border-[#E2E7E8] bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#05090D] sm:text-3xl">
              {t('categories.recentlyViewed')}
            </h2>
            <p className="mt-1 text-sm text-[#5E6870]">{t('categories.recentlyViewedSubtitle')}</p>
          </div>
          <Link
            href="/recently-viewed"
            className="inline-flex shrink-0 items-center rounded-full bg-[#C8F404] px-4 py-1.5 text-sm font-semibold text-[#05090D] transition hover:bg-[#ADD300]"
          >
            {t('categories.viewAll')}
          </Link>
        </div>
        <div className={PRODUCT_CARD_GRID_CLASS_5}>
          {products.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
