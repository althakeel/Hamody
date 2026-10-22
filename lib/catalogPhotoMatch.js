import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getImageUrlAt, isVideoSource, normalizeProductImages } from '@/lib/productMedia';

async function loadSharp() {
  const { default: sharp } = await import('sharp');
  return sharp;
}

const SAME_PHOTO_MAX = 12;
const SAME_PHOTO_GAP = 8;

export async function catalogPhotoFingerprint(input) {
  const sharp = await loadSharp();
  const data = await sharp(input, { failOn: 'none' })
    .rotate()
    .trim({ threshold: 18 })
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();
  const bits = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits.push(data[y * 9 + x] > data[y * 9 + x + 1] ? 1 : 0);
    }
  }
  return bits;
}

export function catalogPhotoDistance(left = [], right = []) {
  if (!left.length || left.length !== right.length) return 64;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance;
}

export function isSameCatalogPhoto(distance, nextDistance) {
  const best = Number(distance);
  if (!Number.isFinite(best) || best > SAME_PHOTO_MAX) return false;
  if (nextDistance == null || nextDistance === '') return best <= 8;
  const next = Number(nextDistance);
  if (!Number.isFinite(next)) return best <= 8;
  return next - best >= SAME_PHOTO_GAP;
}

function productImageUrls(product, { limit = 2, skip = 0 } = {}) {
  const images = normalizeProductImages(product?.images);
  const urls = [];
  for (let index = 0; index < images.length && urls.length < skip + limit; index += 1) {
    const url = getImageUrlAt(images, index, index === 0 ? product?.image : '');
    if (!url || isVideoSource(url) || !/^https?:\/\//i.test(url) || urls.includes(url)) continue;
    urls.push(url);
  }
  return urls.slice(skip, skip + limit);
}

let sharpUnavailable = false;

async function fingerprintBuffers(buffers) {
  if (!sharpUnavailable) {
    try {
      const bits = [];
      for (const buffer of buffers) bits.push(await catalogPhotoFingerprint(buffer));
      return bits;
    } catch (error) {
      sharpUnavailable = true;
      console.warn('[catalog-photo] image library unavailable:', error?.message || error);
    }
  }

  const dir = await mkdtemp(join(tmpdir(), 'catalog-photo-'));
  try {
    for (let index = 0; index < buffers.length; index += 1) {
      await writeFile(join(dir, `${String(index).padStart(4, '0')}.img`), buffers[index]);
    }
    const script = join(process.cwd(), 'scripts', 'catalog-photo-fingerprint.mjs');
    const stdout = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script, dir], { windowsHide: true });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('catalog photo helper timed out'));
      }, 25000);
      child.stdout.on('data', (chunk) => { out += chunk; });
      child.stderr.on('data', (chunk) => { err += chunk; });
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) reject(new Error(err || `catalog photo helper exit ${code}`));
        else resolve(out);
      });
    });
    const hashes = JSON.parse(stdout);
    return Array.isArray(hashes) ? hashes : [];
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function downloadProductImages(products, { limit = 1, skip = 0 } = {}) {
  return mapPool(products, 8, async (product) => {
    const buffers = [];
    for (const url of productImageUrls(product, { limit, skip })) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) continue;
        buffers.push(Buffer.from(await response.arrayBuffer()));
      } catch {
        // A missing catalog image should not hide the other photos.
      }
    }
    return { product, buffers };
  });
}

function scoreAgainstQuery(queryBits, downloaded, bitRows) {
  let cursor = 0;
  return downloaded.map((row) => {
    let best = 64;
    for (let index = 0; index < row.buffers.length; index += 1) {
      const distance = catalogPhotoDistance(queryBits, bitRows[cursor] || []);
      cursor += 1;
      if (distance < best) best = distance;
    }
    return { product: row.product, distance: best };
  }).sort((left, right) => left.distance - right.distance);
}

export async function rankProductsByCatalogPhoto(queryBuffer, products = [], {
  limit = 40,
  imageLimit = 2,
} = {}) {
  if (!queryBuffer?.length || !products.length) return [];

  const slice = products.slice(0, limit);
  const firstPass = await downloadProductImages(slice, { limit: 1 });
  let bits = [];
  try {
    bits = await fingerprintBuffers([
      queryBuffer,
      ...firstPass.flatMap((row) => row.buffers),
    ]);
  } catch (error) {
    console.warn('[catalog-photo] compare failed:', error?.message || error);
    return [];
  }
  if (!bits.length) return [];

  let ranked = scoreAgainstQuery(bits[0], firstPass, bits.slice(1))
    .filter((row) => row.distance < 64);
  const best = ranked[0]?.distance ?? 64;
  const next = ranked[1]?.distance ?? 64;
  if (imageLimit < 2 || (best <= 8 && next - best >= SAME_PHOTO_GAP)) return ranked;

  const retry = ranked.slice(0, 8).map((row) => row.product);
  const secondPass = await downloadProductImages(retry, { limit: 1, skip: 1 });
  const extraBuffers = secondPass.flatMap((row) => row.buffers);
  if (!extraBuffers.length) return ranked;

  let extraBits = [];
  try {
    extraBits = await fingerprintBuffers(extraBuffers);
  } catch {
    return ranked;
  }
  const secondScores = new Map(
    scoreAgainstQuery(bits[0], secondPass, extraBits).map((row) => [String(row.product?._id || ''), row.distance]),
  );
  ranked = ranked.map((row) => {
    const extra = secondScores.get(String(row.product?._id || ''));
    if (extra == null) return row;
    return { ...row, distance: Math.min(row.distance, extra) };
  }).sort((left, right) => left.distance - right.distance);

  return ranked;
}
