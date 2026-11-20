'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { loadHamodyGa4 } from '@/lib/gtm';
import { isGtmInternalPath } from '@/lib/gtmEvents';

function loadStorefrontGtm() {
  loadHamodyGa4();
}

export default function GtmBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || isGtmInternalPath(pathname)) return;
    loadStorefrontGtm();
  }, [pathname]);

  return null;
}
