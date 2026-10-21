export function normalizeAppPush(input = {}) {
  const title = String(input.title || '').trim().slice(0, 80);
  const body = String(input.body || '').trim().slice(0, 240);
  const imageUrl = String(input.imageUrl || '').trim();
  const buttonText = String(input.buttonText || '').trim().slice(0, 24);
  const path = String(input.path || '').trim().slice(0, 300);
  const audience = input.audience === 'android' || input.audience === 'ios' ? input.audience : 'all';

  if (!title) return { error: 'Add a title' };
  if (!body) return { error: 'Add a message' };
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) return { error: 'Use an uploaded image' };
  if (buttonText && !path) return { error: 'Choose where the button opens' };
  if (path && !path.startsWith('/') && !/^https:\/\//i.test(path)) {
    return { error: 'The path must start with / or https' };
  }

  return {
    title,
    body,
    imageUrl,
    buttonText,
    path: path || '/',
    audience,
  };
}
