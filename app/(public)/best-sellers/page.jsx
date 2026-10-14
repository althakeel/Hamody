'use client';

import BackendFilteredCatalog from '@/components/BackendFilteredCatalog';

const PRESET = { badge: 'Best Seller' };

export default function BestSellersPage() {
  return (
    <BackendFilteredCatalog
      title="Best Sellers"
      subtitle="Top-performing products loved by customers"
      emptyText="No best sellers match your filters."
      preset={PRESET}
    />
  );
}
