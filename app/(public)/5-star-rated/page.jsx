'use client';

import { StarIcon } from 'lucide-react';
import BackendFilteredCatalog from '@/components/BackendFilteredCatalog';

const PRESET = { minRating: 4 };
const INITIAL_FILTERS = {
  categories: [],
  priceRange: { min: 0, max: 100000 },
  rating: 4,
  inStock: false,
  sortBy: 'rating',
};

export default function FiveStarRated() {
  return (
    <BackendFilteredCatalog
      title="4+ Star Rated Products"
      subtitle="Showing products rated 4 stars and above"
      emptyText="No products rated 4+ match your filters."
      preset={PRESET}
      initialFilters={INITIAL_FILTERS}
      headerExtra={(
        <div className="mb-3 flex">
          {[...Array(5)].map((_, index) => (
            <StarIcon key={index} size={32} fill="#FFA500" className="text-orange-500" />
          ))}
        </div>
      )}
    />
  );
}
