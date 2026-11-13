'use client';

import { useLayoutEffect } from 'react';
import { installDomReconcileGuard } from '@/lib/domReconcileError';

/**
 * Forces English LTR for /store and locks the shell to the viewport
 * so only the main content pane scrolls (not the whole document).
 *
 * Do not mutate html/body overflow or restore dir on unmount — that races
 * React and throws removeChild/insertBefore.
 */
export default function StoreLanguageScope({ children }) {
  useLayoutEffect(() => {
    installDomReconcileGuard();
    const root = document.documentElement;
    root.setAttribute('lang', 'en');
    root.setAttribute('dir', 'ltr');
  }, []);

  return (
    <div lang="en" dir="ltr" data-store-language-scope className="h-dvh max-h-dvh overflow-hidden bg-slate-50">
      {children}
    </div>
  );
}
