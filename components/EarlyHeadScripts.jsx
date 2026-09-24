'use client';

import { useEffect, useLayoutEffect } from 'react';
import { META_PIXEL_ID, getMetaPurchaseGuardInlineScript } from '@/lib/metaPixelConfig';
import { startStripExtensionHydrationAttrs } from '@/lib/stripExtensionHydrationAttrs';

/**
 * Runs early client work without rendering React <script> children.
 * Avoids React 19 "Encountered a script tag while rendering" errors.
 */
export default function EarlyHeadScripts() {
  useLayoutEffect(() => {
    startStripExtensionHydrationAttrs();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const ensureScript = (id, source) => {
      if (document.getElementById(id)) return;
      const el = document.createElement('script');
      el.id = id;
      el.text = source;
      document.head.appendChild(el);
    };

    ensureScript(
      'meta-purchase-guard',
      getMetaPurchaseGuardInlineScript(META_PIXEL_ID),
    );
  }, []);

  return null;
}
