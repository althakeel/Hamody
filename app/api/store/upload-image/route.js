import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { uploadToS3 } from '@/lib/storage';

export const maxDuration = 300;

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function isVideoUpload(file) {
  const mime = String(file?.type || '').toLowerCase();
  if (mime.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(String(file?.name || ''));
}

async function maybeOptimizeBuffer(buffer, meta) {
  try {
    const { optimizeUploadBuffer } = await import('@/lib/optimizeUploadBuffer');
    return await optimizeUploadBuffer(buffer, meta);
  } catch (error) {
    console.warn('[upload-image] optimization skipped:', error?.message || error);
    return {
      buffer,
      contentType: meta.contentType,
      optimized: false,
    };
  }
}

function resolveUploadFolder(type = '') {
  if (type === 'logo' || type === 'navbar-logo' || type === 'offers-nav' || type === 'footer-payment') return 'brands';
  if (type === 'category') return 'categories';
  if (type === 'blog') return 'blogs';
  return 'products';
}

function logoFileMeta(name = '', contentType = '') {
  const fileName = String(name || '');
  const mime = String(contentType || '').toLowerCase();
  if (mime === 'image/gif' || /\.gif$/i.test(fileName)) {
    return { ext: 'gif', contentType: 'image/gif' };
  }
  if (mime.includes('webp') || /\.webp$/i.test(fileName)) {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  if (mime === 'image/jpeg' || mime === 'image/jpg' || /\.jpe?g$/i.test(fileName)) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  return { ext: 'png', contentType: 'image/png' };
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.replace('Bearer ', '');
    let userId = null;
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return Response.json({ error: 'Store not approved or not found' }, { status: 403 });
    }

    const formData = await request.formData();
    const image = formData.get('image');
    const type = String(formData.get('type') || '').trim();

    if (!image || typeof image === 'string') {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const video = isVideoUpload(image);

    if (video && buffer.length > MAX_VIDEO_BYTES) {
      return Response.json({ error: 'Video must be 50MB or smaller' }, { status: 413 });
    }

    let uploadBuffer = buffer;
    let uploadContentType = image.type || undefined;
    let uploadName = image.name || (video ? 'upload.mp4' : 'upload.jpg');

    if (!video) {
      const isLogoUpload = type === 'logo' || type === 'navbar-logo';
      const optimized = await maybeOptimizeBuffer(buffer, {
        contentType: image.type,
        fileName: image.name,
        forcePreserveAlpha: isLogoUpload,
        // Logos stay smaller and never flatten to JPEG (black corners).
        maxBytes: isLogoUpload ? 8 * 1024 * 1024 : 4 * 1024 * 1024,
        maxWidth: isLogoUpload ? 1200 : 2048,
        maxHeight: isLogoUpload ? 1200 : 2048,
      });
      uploadBuffer = optimized.buffer;
      uploadContentType = optimized.contentType || image.type || undefined;
      if (isLogoUpload && !uploadContentType) {
        uploadContentType = 'image/png';
      }
      if (optimized.optimized) {
        const ext = optimized.extension
          || (String(optimized.contentType || '').includes('png')
            ? 'png'
            : String(optimized.contentType || '').includes('webp')
              ? 'webp'
              : 'jpg');
        uploadName = String(image.name || 'upload').replace(/\.[^.]+$/, `.${ext}`);
      } else if (isLogoUpload) {
        const kept = logoFileMeta(image.name, uploadContentType || image.type);
        uploadName = String(image.name || 'logo').replace(/\.[^.]+$/, `.${kept.ext}`);
        uploadContentType = kept.contentType;
      } else {
        uploadName = image.name || 'upload.png';
      }
    }

    const fileName = type
      ? `${type}_${Date.now()}_${uploadName}`
      : `${video ? 'video' : 'desc'}_${Date.now()}_${uploadName}`;

    if (type === 'banner' && !video) {
      try {
        const { uploadBannerToImageKit } = await import('@/lib/bannerStorage');
        const response = await uploadBannerToImageKit({
          buffer: uploadBuffer,
          fileName,
          folder: 'stores/banners',
        });

        return Response.json({
          success: true,
          url: response.url,
        });
      } catch (imageKitError) {
        console.warn('ImageKit banner upload failed, falling back to S3:', imageKitError?.message || imageKitError);
      }
    }

    const result = await uploadToS3({
      buffer: uploadBuffer,
      fileName,
      folder: type === 'banner' ? 'uploads' : resolveUploadFolder(type),
      contentType: uploadContentType,
    });

    return Response.json({
      success: true,
      url: result.url,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('entity too large') || message.includes('413')) {
      return Response.json({
        error: 'Image is too large. Use a smaller file or let the app compress it before upload.',
      }, { status: 413 });
    }
    return Response.json({
      error: error.message || 'Failed to upload image',
    }, { status: 500 });
  }
}
