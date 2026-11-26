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

export async function GET(_request, { params }) {
  try {
    const { key: parts } = await params;
    const key = (Array.isArray(parts) ? parts : []).map((part) => decodeURIComponent(part)).join('/');
    const file = await loadMedia(key);
    const isNavbarLogo = key.startsWith('brands/navbar-logo');
    const bytes = isNavbarLogo ? await navbarLogoBytes(file.bytes) : file.bytes;
    const contentType = isNavbarLogo ? 'image/png' : (file.contentType || 'application/octet-stream');
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
