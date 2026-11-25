import { isReadableUploadKey, readUploadObject } from '@/lib/storage';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function mediaKeyFromPath(pathname = '') {
  const path = String(pathname || '');
  const marker = '/api/media/';
  const index = path.indexOf(marker);
  if (index < 0) return '';
  return path
    .slice(index + marker.length)
    .split('?')[0]
    .split('/')
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join('/');
}

function uploadKeyFromImageUrl(imageUrl = '') {
  const raw = String(imageUrl || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/api/media/')) return mediaKeyFromPath(raw);

  try {
    const parsed = new URL(raw);
    const fromProxy = mediaKeyFromPath(parsed.pathname);
    if (fromProxy) return fromProxy;
    if (parsed.hostname.endsWith('.amazonaws.com')) {
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    }
  } catch {
    return '';
  }

  return '';
}

async function readStoredUpload(imageUrl) {
  const key = uploadKeyFromImageUrl(imageUrl);
  if (!isReadableUploadKey(key)) return null;
  const file = await readUploadObject(key);
  const mimeType = String(file.contentType || 'image/jpeg').split(';')[0].trim().toLowerCase();
  if (!mimeType.startsWith('image/')) {
    throw new Error('Product media must include an image for AI autofill');
  }
  if (file.bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('Product image is too large for AI autofill');
  }
  return {
    base64Image: file.bytes.toString('base64'),
    mimeType,
  };
}

function absoluteImageUrl(imageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw.startsWith('/')) return raw;
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${raw}`;
}

async function fetchRemoteImage(imageUrl) {
  const url = absoluteImageUrl(imageUrl);
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Product needs a valid image URL for AI autofill');
  }

  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; HamodyBot/1.0; +https://www.hamody.com)',
      Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5',
    },
  });
  if (!response.ok) {
    throw new Error(`Could not load product image (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Product image is too large for AI autofill');
  }

  const mimeType = String(response.headers.get('content-type') || 'image/jpeg')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!mimeType.startsWith('image/')) {
    throw new Error('Product media must include an image for AI autofill');
  }

  return {
    base64Image: buffer.toString('base64'),
    mimeType,
  };
}

export async function loadProductImageForAi(imageUrl) {
  try {
    const stored = await readStoredUpload(imageUrl);
    if (stored) return stored;
  } catch (error) {
    if (String(error?.message || '').includes('too large') || String(error?.message || '').includes('must include an image')) {
      throw error;
    }
  }

  return fetchRemoteImage(imageUrl);
}
