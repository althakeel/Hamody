import { NextResponse } from 'next/server';
import { readUploadObject } from '@/lib/storage';

const MEDIA_CACHE_MAX = 400;
const mediaCache = new Map();
const mediaInflight = new Map();

function rememberMedia(key, file) {
  if (mediaCache.has(key)) mediaCache.delete(key);
  mediaCache.set(key, file);
  while (mediaCache.size > MEDIA_CACHE_MAX) {
    const oldest = mediaCache.keys().next().value;
    mediaCache.delete(oldest);
  }
  return file;
}

function loadMedia(key) {
  const cached = mediaCache.get(key);
  if (cached) {
    mediaCache.delete(key);
    mediaCache.set(key, cached);
    return Promise.resolve(cached);
  }
  const pending = mediaInflight.get(key);
  if (pending) return pending;
  const job = readUploadObject(key)
    .then((file) => rememberMedia(key, file))
    .finally(() => {
      mediaInflight.delete(key);
    });
  mediaInflight.set(key, job);
  return job;
}

async function navbarLogoBytes(bytes) {
  const sharp = (await import('sharp')).default;
  const meta = await sharp(bytes, { failOn: 'none' }).metadata();
  if (!meta.height || meta.height <= 240) return bytes;
  // Pre-size for a 52px navbar slot at 4x so the browser is not shrinking a huge file into gray strokes.
  return sharp(bytes, { failOn: 'none' })
    .resize({ height: 208, withoutEnlargement: true, kernel: 'lanczos3', fit: 'inside' })
    .sharpen({ sigma: 0.8 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const BRAND_LOGO_HEIGHT = 256;
const logoCache = new Map();

async function brandLogoBytes(key, bytes) {
  const cacheKey = `${key}:v2`;
  const cached = logoCache.get(cacheKey);
  if (cached) return cached;
  const sharp = (await import('sharp')).default;
  const base = sharp(bytes, { failOn: 'none' }).rotate().flatten({ background: '#ffffff' });
  let trimmed = bytes;
  try {
    trimmed = await base.clone().trim({ background: '#ffffff', threshold: 18 }).toBuffer();
  } catch {
    trimmed = await base.toBuffer();
  }
  const output = await sharp(trimmed, { failOn: 'none' })
    .resize({
      height: BRAND_LOGO_HEIGHT,
      width: 640,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    })
    .sharpen({ sigma: 0.5 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  logoCache.set(cacheKey, output);
  return output;
}

export async function GET(request, { params }) {
  try {
    const { key: parts } = await params;
    const key = (Array.isArray(parts) ? parts : []).map((part) => decodeURIComponent(part)).join('/');
    const file = await loadMedia(key);
    const logo = new URL(request.url).searchParams.get('logo') === '2';
    const isNavbarLogo = key.startsWith('brands/navbar-logo');
    const bytes = isNavbarLogo
      ? await navbarLogoBytes(file.bytes)
      : logo
        ? await brandLogoBytes(key, file.bytes)
        : file.bytes;
    const contentType = isNavbarLogo || logo ? 'image/png' : (file.contentType || 'application/octet-stream');
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(bytes.length),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
