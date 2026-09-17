'use client';

import Link from 'next/link';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

export default function ImageSearchDisclaimer({ className = '' }) {
  const { t } = useStorefrontI18n();

  return (
    <p className={`text-[11px] leading-relaxed text-slate-400 ${className}`.trim()}>
      {t('searchResults.imageDisclaimerBefore')}
      <Link href="/terms-and-conditions" className="underline underline-offset-2 hover:text-slate-600">
        {t('searchResults.imageDisclaimerTerms')}
      </Link>
      {t('searchResults.imageDisclaimerMid')}
      <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-slate-600">
        {t('searchResults.imageDisclaimerPrivacy')}
      </Link>
      {t('searchResults.imageDisclaimerAfter')}
    </p>
  );
}
