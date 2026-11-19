const PRIVATE_UPLOAD_HOSTS = new Set([
  'hamody-uploads.s3.ap-south-1.amazonaws.com',
  'hamody-uploads.s3.amazonaws.com',
]);

function uploadKeyFromUrl(url = '') {
  try {
    const parsed = new URL(String(url || '').trim());
    if (!PRIVATE_UPLOAD_HOSTS.has(parsed.hostname)) return '';
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  } catch {
    return '';
  }
}

/** Browser-loadable path for uploads on the private hamody-uploads bucket. */
export function readableUploadUrl(url = '') {
  const raw = String(url || '').trim();
  if (!raw || raw.startsWith('/')) return raw;
  const key = uploadKeyFromUrl(raw);
  if (!key || key.includes('..')) return raw;
  if (!/^(brands|uploads|products|categories)\//.test(key)) return raw;
  if (!/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(key)) return raw;
  const path = `/api/media/${key.split('/').map((part) => encodeURIComponent(part)).join('/')}`;
  return key.startsWith('brands/navbar-logo') ? `${path}?v=2` : path;
}
