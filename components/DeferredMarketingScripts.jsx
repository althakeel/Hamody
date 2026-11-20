'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { loadHamodyGa4 } from '@/lib/gtm';
import { isGtmInternalPath } from '@/lib/gtmEvents';
import { META_PIXEL_ID, getMetaPixelBootstrapScript } from '@/lib/metaPixelConfig';
import { TIKTOK_PIXEL_ID, getTikTokPixelBootstrapScript } from '@/lib/tiktokPixelConfig';

const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

function shouldSkipMarketing(pathname) {
  if (!pathname) return true;
  return (
    pathname.startsWith('/store')
    || pathname.startsWith('/admin')
    || pathname.startsWith('/dashboard')
    || isGtmInternalPath(pathname)
  );
}

function injectInlineScript(id, source) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.text = source;
  document.head.appendChild(script);
}

function loadGtm() {
  loadHamodyGa4();
}

function loadMarketingPixels() {
  if (typeof window === 'undefined') return;
  if (window.__HAMODYMarketingLoaded) return;
  window.__HAMODYMarketingLoaded = true;

  loadGtm();
  injectInlineScript('meta-pixel-deferred', getMetaPixelBootstrapScript(META_PIXEL_ID));
  injectInlineScript('tiktok-pixel-deferred', getTikTokPixelBootstrapScript(TIKTOK_PIXEL_ID));
}

/**
 * Loads GTM / Meta / TikTok after first interaction or idle time so they
 * do not compete with LCP / TBT on the initial homepage paint.
 */
export default function DeferredMarketingScripts() {
  const pathname = usePathname();

  useEffect(() => {
    if (shouldSkipMarketing(pathname)) return undefined;

    let loaded = false;
    let idleId = null;
    let timerId = null;

    const trigger = () => {
      if (loaded) return;
      loaded = true;
      cleanup();
      loadMarketingPixels();
    };

    const cleanup = () => {
      INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, trigger, { capture: true });
      });
      if (idleId != null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timerId != null) window.clearTimeout(timerId);
    };

    INTERACTION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, trigger, { once: true, passive: true, capture: true });
    });

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(trigger, { timeout: 4500 });
    } else {
      timerId = window.setTimeout(trigger, 3500);
    }

    return cleanup;
  }, [pathname]);

  return null;
}
