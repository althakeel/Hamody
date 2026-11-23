import imagekit, { ensureImageKit } from '@/configs/imageKit';

export function ensureBannerStorage() {
  return ensureImageKit();
}

function imageKitPublicUrl(filePath = '') {
  const endpoint = String(
    process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
  ).replace(/\/+$/, '');
  const path = String(filePath || '').replace(/^\/+/, '');
  if (!endpoint || !path) return '';
  return `${endpoint}/${path}`;
}

export async function uploadBannerToImageKit({
  buffer,
  fileName,
  folder = '/store/showcase-banners',
  contentType,
}) {
  ensureImageKit();
  const folderPath = `/${String(folder || 'store/showcase-banners').replace(/^\/+|\/+$/g, '')}`;

  const response = await imagekit.upload({
    file: buffer,
    fileName,
    folder: folderPath,
    contentType,
  });

  return {
    url: response?.url || response?.thumbnailUrl || imageKitPublicUrl(response?.filePath),
    filePath: response?.filePath,
    fileId: response?.fileId,
  };
}

export function buildBannerImageUrl(options = {}) {
  return imagekit.url(options);
}
