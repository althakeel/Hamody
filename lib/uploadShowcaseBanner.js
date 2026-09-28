import axios from 'axios';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

function publicKey() {
  return String(process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '').trim();
}

/**
 * Store the banner file unchanged. The browser uploads to ImageKit so a large
 * original does not sit on the app server until the gateway returns 504.
 */
export async function uploadShowcaseBannerOriginal(file, token) {
  const key = publicKey();
  if (key) {
    const { data: auth } = await axios.get('/api/imagekit-auth');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name || `showcase-${Date.now()}`);
    formData.append('folder', 'store/showcase-banners');
    formData.append('publicKey', key);
    formData.append('signature', auth.signature);
    formData.append('expire', String(auth.expire));
    formData.append('token', auth.token);
    formData.append('useUniqueFileName', 'true');

    const { data } = await axios.post(IMAGEKIT_UPLOAD_URL, formData, {
      timeout: 0,
    });
    if (data?.url) return data.url;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploadContext', 'showcase-banner');
  const response = await axios.post('/api/upload', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 0,
  });
  return response.data.url;
}
