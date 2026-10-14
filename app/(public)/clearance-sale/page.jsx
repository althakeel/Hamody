'use client';

import BackendFilteredCatalog from '@/components/BackendFilteredCatalog';

const PRESET = { tag: 'clearance' };

export default function ClearanceSalePage() {
  return (
    <BackendFilteredCatalog
      title="Clearance Sale"
      subtitle="Last-chance deals on clearance items"
      emptyText="No clearance products match your filters."
      preset={PRESET}
    />
  );
}
