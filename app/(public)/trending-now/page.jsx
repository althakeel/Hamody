'use client';

import BackendFilteredCatalog from '@/components/BackendFilteredCatalog';

const PRESET = { badge: 'Hot Deal' };

export default function TrendingNowPage() {
  return (
    <BackendFilteredCatalog
      title="Trending Now"
      subtitle="Hot Deal products trending right now"
      emptyText="No trending products match your filters."
      preset={PRESET}
    />
  );
}
