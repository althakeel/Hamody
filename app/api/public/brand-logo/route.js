import { NextResponse } from 'next/server';
import { isReadableUploadKey } from '@/lib/storage';

const ALLOWED_HOSTS = new Set([
  'store1920-images.s3.ap-south-1.amazonaws.com',
  'hamody-uploads.s3.ap-south-1.amazonaws.com',
  'hamody-uploads.s3.amazonaws.com',
]);

export async function GET(request) {
  const src = String(new URL(request.url).searchParams.get('src') || '').trim();
  let parsed;
  try {
    parsed = new URL(src);
  } catch {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'Unsupported image host' }, { status: 400 });
  }
  const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (!isReadableUploadKey(key)) {
    return NextResponse.json({ error: 'Unsupported image' }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
  const bytes = Buffer.from(await upstream.arrayBuffer());
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
