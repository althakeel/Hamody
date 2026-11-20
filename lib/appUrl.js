export const DEFAULT_APP_URL = 'https://www.hamody.com';

function stripTrailingSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

const LEGACY_SITE_HOSTS = new Set([
  'store1920.com',
  'www.store1920.com',
  'store1920.store',
  'www.store1920.store',
]);

function isLegacySiteHost(hostname = '') {
  const host = String(hostname || '').toLowerCase();
  return LEGACY_SITE_HOSTS.has(host) || host.endsWith('.store1920.store');
}

/** Rewrite leftover store1920 hosts and prefer www for hamody.com. */
export function normalizePublicSiteUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return raw;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (isLegacySiteHost(host) || host === 'hamody.com') {
      parsed.protocol = 'https:';
      parsed.hostname = 'www.hamody.com';
    }
    return stripTrailingSlash(parsed.toString());
  } catch {
    return stripTrailingSlash(
      raw
        .replace(/https?:\/\/(www\.)?store1920\.(com|store)/gi, DEFAULT_APP_URL)
        .replace(/https?:\/\/hamody\.com(?=[:/?#]|$)/gi, DEFAULT_APP_URL),
    );
  }
}

function rewriteLegacyStoreDomain(url) {
  return normalizePublicSiteUrl(url);
}

export function normalizeCustomerUrl(url) {
  return rewriteLegacyStoreDomain(url);
}

export function getAppBaseUrl() {
  return rewriteLegacyStoreDomain(
    String(
      process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        DEFAULT_APP_URL
    )
  ) || DEFAULT_APP_URL;
}

/** Customer-facing storefront URL for SEO, emails, and deep links (never uses .store). */
export function getCustomerSiteUrl() {
  const explicit = rewriteLegacyStoreDomain(
    String(
      process.env.CUSTOMER_FACING_URL ||
        process.env.NEXT_PUBLIC_CUSTOMER_URL ||
        '',
    ).trim(),
  );
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return explicit;
  }

  const base = getAppBaseUrl();
  try {
    const { hostname } = new URL(base);
    if (isLegacySiteHost(hostname)) {
      return DEFAULT_APP_URL;
    }
  } catch {
    // fall through
  }

  return rewriteLegacyStoreDomain(base) || DEFAULT_APP_URL;
}

export function buildCustomerSitePath(pathname = '/') {
  const base = getCustomerSiteUrl();
  const path = String(pathname || '/').trim();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Replace leftover Store1920 website links. Leaves image hosts such as store1920-images alone. */
export function rewriteLegacySiteLinks(value = '') {
  return String(value || '').replace(
    /https?:\/\/(?:www\.)?store1920\.(?:com|store)(?=[/?#"'<\s]|$)/gi,
    DEFAULT_APP_URL,
  );
}
