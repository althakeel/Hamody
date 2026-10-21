const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

export function loaderMediaTypeFromFile(file) {
  const mime = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();
  if (mime.startsWith('video/') || VIDEO_EXT.test(name)) return 'video';
  if (mime === 'image/gif' || name.endsWith('.gif')) return 'gif';
  return 'image';
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanHex(value, fallback) {
  const raw = String(value || '').trim();
  const match = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return fallback;
  if (match[1].length === 3) {
    const [r, g, b] = match[1];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return `#${match[1].toLowerCase()}`;
}

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 500) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return '';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
}

function mediaTypeFromUrl(url = '', hinted = '') {
  const value = String(url || '').trim().toLowerCase().split('?')[0];
  if (VIDEO_EXT.test(value)) return 'video';
  if (value.endsWith('.gif')) return 'gif';
  if (!value && (hinted === 'video' || hinted === 'gif')) return hinted;
  return 'image';
}

export function defaultAppLoader() {
  return {
    enabled: true,
    mediaType: 'image',
    url: '',
    backgroundColor: '#ffffff',
    fit: 'cover',
    durationSeconds: 2,
  };
}

export function normalizeAppLoader(input = {}) {
  const base = defaultAppLoader();
  const source = input && typeof input === 'object' ? input : {};
  const url = cleanUrl(source.url);
  const mediaType = url ? mediaTypeFromUrl(url, source.mediaType) : (
    source.mediaType === 'video' || source.mediaType === 'gif' ? source.mediaType : 'image'
  );
  return {
    enabled: source.enabled !== false,
    mediaType,
    url,
    backgroundColor: cleanHex(source.backgroundColor, base.backgroundColor),
    fit: source.fit === 'contain' ? 'contain' : 'cover',
    durationSeconds: mediaType === 'video'
      ? 0
      : clampInt(source.durationSeconds, 1, 20, base.durationSeconds),
  };
}

export function toPublicAppLoader(input = {}) {
  const loader = normalizeAppLoader(input);
  if (!loader.enabled || !loader.url) {
    return {
      enabled: false,
      mediaType: 'image',
      url: '',
      backgroundColor: loader.backgroundColor,
      fit: loader.fit,
      durationSeconds: 0,
    };
  }
  return {
    enabled: true,
    mediaType: loader.mediaType,
    url: loader.url,
    backgroundColor: loader.backgroundColor,
    fit: loader.fit,
    durationSeconds: loader.durationSeconds,
  };
}
