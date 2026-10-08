const CHANNEL_NAME = 'store1920-nav-menu';

export function notifyStorefrontMenuUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('navMenuUpdated'));
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: 'navMenuUpdated' });
    channel.close();
  } catch {
    // BroadcastChannel is unavailable in this browser.
  }
}

export function subscribeStorefrontMenuUpdated(handler) {
  if (typeof window === 'undefined') return () => {};

  const onWindow = () => handler();
  window.addEventListener('navMenuUpdated', onWindow);

  let channel = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => handler();
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener('navMenuUpdated', onWindow);
    channel?.close();
  };
}
