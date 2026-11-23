import axios from 'axios';

/**
 * Store the banner file unchanged.
 * Direct browser uploads to ImageKit are rejected with an invalid signature,
 * so the file goes through the app server, which uploads with the private key.
 */
export async function uploadShowcaseBannerOriginal(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploadContext', 'showcase-banner');
  let response;
  try {
    response = await axios.post('/api/upload', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 0,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  } catch (error) {
    const data = error?.response?.data;
    const serverMessage = typeof data === 'string'
      ? data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : (data?.error || data?.message || '');
    const message = /request body exceeded|entity too large|413/i.test(String(serverMessage))
      ? 'This image is too large to upload. Use a JPG, PNG, or WebP under 20 MB.'
      : (serverMessage || error?.message || 'Upload failed');
    throw new Error(message);
  }
  const url = response.data?.url;
  if (!url) {
    throw new Error(response.data?.error || 'Upload failed');
  }
  return url;
}
