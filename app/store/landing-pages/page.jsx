'use client';

import EmailCampaignLandingPages from '@/components/store/EmailCampaignLandingPages';
import { useAuth } from '@/lib/useAuth';

export default function StoreLandingPagesPage() {
  const { getToken } = useAuth();

  return (
    <div className="w-full space-y-4" lang="en" dir="ltr">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Storefront</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Landing pages</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Create new pages with custom /pages links, responsive banners, and a styled product grid. Existing /c links keep working.
        </p>
      </div>
      <EmailCampaignLandingPages getToken={getToken} />
    </div>
  );
}
