import { NextResponse } from 'next/server';
import path from 'node:path';

async function loadSharp() {
  const nodeModule = await import('node:module');
  const makeRequire = nodeModule.createRequire || nodeModule.default?.createRequire;
  const req = makeRequire(path.join(process.cwd(), 'package.json'));
  const nested = path.join(process.cwd(), 'node_modules', 'next', 'node_modules', 'sharp');
  try {
    return req(nested);
  } catch {
    return req('sharp');
  }
}

const ALLOWED_HOST = 'store1920-images.s3.ap-south-1.amazonaws.com';
const ALLOWED_WIDTHS = new Set([256, 384, 512]);
const MAX_BYTES = 12 * 1024 * 1024;
const CACHE_MAX = 300;
const cache = new Map();
const inflight = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function cacheSet(key, value) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

function allowedSource(value) {
  try {
    const parsed = new URL(String(value || ''));
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname !== ALLOWED_HOST) return null;
    if (!parsed.pathname.startsWith('/products/') && !parsed.pathname.startsWith('/categories/')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function imageResponse(bytes) {
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(bytes.byteLength),
    },
  });
}

async function renderCard(source, width) {
  const upstream = await fetch(source, {
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'image/*' },
  });
  if (!upstream.ok || upstream.status >= 300) return null;
  const type = String(upstream.headers.get('content-type') || '');
  if (!type.startsWith('image/')) return null;
  const length = Number(upstream.headers.get('content-length') || 0);
  if (length > MAX_BYTES) return null;
  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.length > MAX_BYTES) return null;

  const sharp = await loadSharp();
  const output = await sharp(bytes, { failOn: 'none', animated: false })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 62 })
    .toBuffer();
  return new Uint8Array(output);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const source = allowedSource(searchParams.get('src'));
  const width = ALLOWED_WIDTHS.has(Number(searchParams.get('w')))
    ? Number(searchParams.get('w'))
    : 384;
  if (!source) {
    return NextResponse.json({ error: 'Unsupported image' }, { status: 400 });
  }

  const cacheKey = `${width}|${source}`;
  const cached = cacheGet(cacheKey);
  if (cached) return imageResponse(cached);

  let pending = inflight.get(cacheKey);
  if (!pending) {
    pending = renderCard(source, width).finally(() => {
      inflight.delete(cacheKey);
    });
    inflight.set(cacheKey, pending);
  }

  try {
    const output = await pending;
    if (!output) return NextResponse.redirect(source, 302);
    cacheSet(cacheKey, output);
    return imageResponse(output);
  } catch (error) {
    console.error('[api/img]', error);
    return NextResponse.redirect(source, 302);
  }
}
