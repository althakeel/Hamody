'use client';

import ProductBadgesSettings from '@/components/store/ProductBadgesSettings';

export default function StoreProductBadgesPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Product Badges</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose when each badge shows, then style it. Conditions include new products, on sale, stock, fast delivery, and always.
        </p>
      </div>
      <ProductBadgesSettings />
    </div>
  );
}
