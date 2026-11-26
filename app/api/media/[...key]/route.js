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

const BRAND_LOGO_PX = 320;
const logoCache = new Map();

async function brandLogoBytes(key, bytes) {
  const cached = logoCache.get(key);
  if (cached) return cached;
  const sharp = (await import('sharp')).default;
  // The row draws each mark at 80px. 320px is 4x, so retina screens are not scaling a huge file down.
  const output = await sharp(bytes, { failOn: 'none' })
    .rotate()
    .resize({
      width: BRAND_LOGO_PX,
      height: BRAND_LOGO_PX,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    })
    .sharpen({ sigma: 0.6 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  logoCache.set(key, output);
  return output;
}

export async function GET(request, { params }) {
  try {
    const { key: parts } = await params;
    const key = (Array.isArray(parts) ? parts : []).map((part) => decodeURIComponent(part)).join('/');
    const file = await loadMedia(key);
    const logo = new URL(request.url).searchParams.get('logo') === '1';
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
