'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { GTM_ID } from '@/lib/gtm';
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
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.__HANODYGtmLoaded = window.__HANODYGtmLoaded || {};
  if (window.__HANODYGtmLoaded[GTM_ID]) return;
  if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`)) {
    window.__HANODYGtmLoaded[GTM_ID] = true;
    return;
  }

  window.__HANODYGtmLoaded[GTM_ID] = true;
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);
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
