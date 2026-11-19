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
  const response = await axios.post('/api/upload', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 0,
  });
  const url = response.data?.url;
  if (!url) {
    throw new Error(response.data?.error || 'Upload failed');
  }
  return url;
}
