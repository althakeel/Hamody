import { getAuth } from '@/lib/firebase-admin';
import { uploadBannerToImageKit } from '@/lib/bannerStorage';
import { uploadToS3 } from '@/lib/storage';
import { optimizeUploadBuffer } from '@/lib/optimizeUploadBuffer';

export const maxDuration = 300;

function showcaseUploadName(name = '') {
  const base = String(name || 'banner.jpg').split(/[/\\]/).pop() || 'banner.jpg';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_') || 'banner.jpg';
  const dot = cleaned.lastIndexOf('.');
  const ext = dot > 0 ? cleaned.slice(dot).toLowerCase() : '.jpg';
  const stem = (dot > 0 ? cleaned.slice(0, dot) : cleaned).slice(0, 40) || 'banner';
  return `showcase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${stem}${ext}`;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.uid || decoded.user_id || decoded.sub || null;

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const uploadContext = String(formData.get('uploadContext') || '').trim().toLowerCase();
    const isShowcaseBannerUpload = uploadContext === 'showcase-banner';
    const files = [...formData.getAll('files'), ...formData.getAll('file')].filter(Boolean);

    if (!files || files.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedUrls = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const optimized = isShowcaseBannerUpload
        ? { buffer, contentType: file.type, optimized: false }
        : await optimizeUploadBuffer(buffer, {
          contentType: file.type,
          fileName: file.name,
        });
      const uploadBuffer = optimized.buffer;
      const filePrefix = isShowcaseBannerUpload ? 'showcase' : 'upload';
      const optimizedExt = optimized.extension
        || (String(optimized.contentType || '').includes('png')
          ? 'png'
          : String(optimized.contentType || '').includes('webp')
            ? 'webp'
            : 'jpg');
      const uploadName = optimized.optimized && String(file.name || '').match(/\.(jpe?g|png|webp|avif|heic|heif|tiff?|bmp)$/i)
        ? String(file.name || 'upload').replace(/\.[^.]+$/, `.${optimizedExt}`)
        : file.name;
      const fileName = isShowcaseBannerUpload
        ? showcaseUploadName(file.name)
        : `${filePrefix}_${Date.now()}_${Math.random().toString(36).substring(7)}_${uploadName}`;

      if (isShowcaseBannerUpload) {
        let bannerUrl = '';
        try {
          const response = await uploadBannerToImageKit({
            buffer: uploadBuffer,
            fileName,
            folder: '/store/showcase-banners',
            contentType: file.type || optimized.contentType || undefined,
          });
          bannerUrl = String(response?.url || '').trim();
        } catch (imageKitError) {
          console.warn('[upload] ImageKit banner upload failed, using S3:', imageKitError?.message || imageKitError);
        }

        if (!bannerUrl) {
          const result = await uploadToS3({
            buffer: uploadBuffer,
            fileName,
            folder: 'uploads',
            contentType: file.type || optimized.contentType || undefined,
          });
          bannerUrl = result.url;
        }

        if (!bannerUrl) {
          throw new Error('Upload finished without an image URL');
        }
        uploadedUrls.push(bannerUrl);
        continue;
      }

      const result = await uploadToS3({
        buffer: uploadBuffer,
        fileName,
        folder: 'uploads',
        contentType: optimized.contentType || file.type || undefined,
      });
      uploadedUrls.push(result.url);
    }

    return Response.json({
      success: true,
      url: uploadedUrls[0] || null,
      urls: uploadedUrls,
    });
  } catch (error) {
    console.error('File upload error:', error);
    const message = String(error?.message || '');
    const tooLarge = /entity too large|request body exceeded|413/i.test(message);
    return Response.json({
      error: tooLarge
        ? 'This image is too large to upload. Use a JPG, PNG, or WebP under 20 MB.'
        : (message || 'Failed to upload files'),
    }, { status: tooLarge ? 413 : 500 });
  }
}
