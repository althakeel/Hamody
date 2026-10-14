'use client';

import BackendFilteredCatalog from '@/components/BackendFilteredCatalog';

const PRESET = { maxPrice: 499 };
const INITIAL_FILTERS = {
  categories: [],
  priceRange: { min: 0, max: 499 },
  rating: 0,
  inStock: false,
  sortBy: 'newest',
};

export default function Under499Page() {
  return (
    <BackendFilteredCatalog
      title="Under AED499"
      subtitle="Great finds priced at AED499 or less"
      emptyText="No products under 499 match your filters."
      preset={PRESET}
      initialFilters={INITIAL_FILTERS}
    />
  );
}
