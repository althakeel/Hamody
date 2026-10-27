function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 500) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return '';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
}

export function defaultAppIcon() {
  return { url: '' };
}

export function normalizeAppIcon(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return { url: cleanUrl(source.url) };
}

export function toPublicAppIcon(input = {}) {
  const icon = normalizeAppIcon(input);
  return icon.url ? { url: icon.url } : {};
}
