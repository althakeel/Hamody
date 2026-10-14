'use client';

import BackendFilteredCatalog from '@/components/BackendFilteredCatalog';

const PRESET = { maxPrice: 149 };
const INITIAL_FILTERS = {
  categories: [],
  priceRange: { min: 0, max: 149 },
  rating: 0,
  inStock: false,
  sortBy: 'newest',
};

export default function Under149Page() {
  return (
    <BackendFilteredCatalog
      title="Under AED149"
      subtitle="Affordable finds priced at AED149 or less"
      emptyText="No products under 149 match your filters."
      preset={PRESET}
      initialFilters={INITIAL_FILTERS}
    />
  );
}
