'use client';

import Image from 'next/image';
import { isRetiredStoreMediaUrl, PLACEHOLDER_IMAGE } from '@/lib/mediaUrls';

/**
 * Hosts we optimize through next/image. Marketplace CDNs (Noon, Amazon, Flipkart,
 * Shopify imports, etc.) use a plain <img> so a missing next.config host never crashes.
 *
 * S3 product host is intentionally NOT optimized here: when ap-south-1 is slow,
 * Next's image optimizer waits and returns 504, stalling the whole page. Browser
 * loads S3 (or ImageKit) directly with loading="lazy" instead.
 */
const OPTIMIZED_HOSTS = [
  'ik.imagekit.io',
  'www.hamody.com',
  'hamody.com',
  'placehold.co',
  'lh3.googleusercontent.com',
];

const DIRECT_IMG_HOSTS = [
  'hamody-images.s3.ap-south-1.amazonaws.com',
];

/** Resolve next/image StaticImport objects to a usable URL string. */
export function resolveImageSrc(src) {
  if (src == null || src === '') return '';
  if (typeof src === 'string') return src;
  if (typeof src === 'object') {
    if (typeof src.src === 'string') return src.src;
    if (src.default && typeof src.default.src === 'string') return src.default.src;
    if (typeof src.default === 'string') return src.default;
  }
  return '';
}

export function shouldBypassNextImageOptimizer(src) {
  // Local webpack/static imports must go through next/image — never stringify to "[object Object]".
  if (src && typeof src === 'object') return false;

  const value = String(src || '').trim();
  if (!value) return false;
  if (value.startsWith('/api/img')) return true;
  if (value.startsWith('/') || value.startsWith('data:') || value.startsWith('blob:')) {
    return false;
  }

  try {
    const { hostname, protocol } = new URL(value);
    if (protocol !== 'http:' && protocol !== 'https:') return true;
    if (hostname.toLowerCase() === 'db.hamody.com') return true;

    const direct = DIRECT_IMG_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
    if (direct || hostname.includes('.s3.') || hostname.endsWith('.amazonaws.com')) {
      return true;
    }

    const allowed = OPTIMIZED_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
    // Unknown marketplace / CDN hosts: skip next/image entirely.
    return !allowed;
  } catch {
    return true;
  }
}

/**
 * Drop-in next/image wrapper. Unknown external CDNs render as <img> so Next never
 * throws "hostname is not configured under images".
 */
export default function SafeNextImage({
  src,
  unoptimized,
  alt = '',
  fill = false,
  sizes,
  width,
  height,
  className,
  style,
  priority,
  quality,
  placeholder,
  blurDataURL,
  loader,
  ref,
  ...rest
}) {
  const resolvedSrc = resolveImageSrc(src);
  const imageSrc = isRetiredStoreMediaUrl(resolvedSrc) ? PLACEHOLDER_IMAGE : src;
  const bypass = typeof unoptimized === 'boolean'
    ? unoptimized
    : shouldBypassNextImageOptimizer(imageSrc);

  if (bypass) {
    const classFit = /\bobject-contain\b/.test(className || '')
      ? 'contain'
      : 'cover'
    const imgStyle = fill
      ? {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: classFit,
          ...style,
        }
      : style;

    const renderedSrc = resolveImageSrc(imageSrc) || (typeof imageSrc === 'string' ? imageSrc : '');

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        src={renderedSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        className={className}
        style={imgStyle}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...rest}
      />
    );
  }

  return (
    <Image
      ref={ref}
      src={imageSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      width={width}
      height={height}
      className={className}
      style={style}
      priority={priority}
      quality={quality}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      loader={loader}
      {...rest}
    />
  );
}
