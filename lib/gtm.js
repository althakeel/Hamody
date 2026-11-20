/**
 * Hamody GA4 only. Do not load GTM-5W3VLWS6 or G-NQ4S0938P7:
 * that container was the Store1920 tag.
 */
export const GA4_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  || 'G-GMB4DVVN0D';

const LEGACY_GTM_IDS = ['GTM-5W3VLWS6', 'GTM-NB8H4RK9', 'GTM-NQ4S0938P'];

export function resolveGtmId() {
  return '';
}

export function loadHamodyGa4() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const id = String(GA4_MEASUREMENT_ID || '').trim();
  if (!id || window.__HAMODYGa4Loaded) return;
  window.__HAMODYGa4Loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: false });
  if (!document.querySelector(`script[src*="gtag/js?id=${id}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }
}

export function getGtmHeadScript() {
  const id = String(GA4_MEASUREMENT_ID).replace(/'/g, "\\'");
  return `window.dataLayer=window.dataLayer||[];
window.gtag=window.gtag||function(){dataLayer.push(arguments);};
gtag('js', new Date());
gtag('config','${id}',{send_page_view:false});`;
}

export function getGtmNoscriptSrc() {
  return '';
}

export function isLegacyGtmId(id = '') {
  return LEGACY_GTM_IDS.includes(String(id || '').trim());
}
