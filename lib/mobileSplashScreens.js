/** App launch splash screens. Photo, GIF, or video. Not shown on the website. */

export const MAX_SPLASH_SCREENS = 12;
export const SPLASH_DURATION_DEFAULT = 3;

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

export function splashMediaTypeFromFile(file) {
  const mime = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();
  if (mime.startsWith('video/') || VIDEO_EXT.test(name)) return 'video';
  if (mime === 'image/gif' || name.endsWith('.gif')) return 'gif';
  return 'image';
}

function mediaTypeFromUrl(url = '', hinted = '') {
  const value = String(url || '').trim().toLowerCase().split('?')[0];
  if (VIDEO_EXT.test(value)) return 'video';
  if (value.endsWith('.gif')) return 'gif';
  if (!value && (hinted === 'video' || hinted === 'gif')) return hinted;
  return 'image';
}

export function createEmptySplashScreen() {
  return {
    id: '',
    enabled: true,
    mediaType: 'image',
    url: '',
    durationSeconds: SPLASH_DURATION_DEFAULT,
  };
}

export function normalizeSplashScreens(input) {
  const source = input && typeof input === 'object' ? input : {};
  const raw = Array.isArray(source.screens) ? source.screens : [];
  const screens = raw.slice(0, MAX_SPLASH_SCREENS).map((item, index) => {
    const url = String(item?.url || '').trim();
    const mediaType = url ? mediaTypeFromUrl(url, item?.mediaType) : (
      item?.mediaType === 'video' || item?.mediaType === 'gif' ? item.mediaType : 'image'
    );
    let duration = Number(item?.durationSeconds);
    if (!Number.isFinite(duration)) duration = SPLASH_DURATION_DEFAULT;
    duration = Math.min(30, Math.max(mediaType === 'video' ? 0 : 1, Math.round(duration)));
    const id = String(item?.id || '').trim().slice(0, 80) || `splash-${index + 1}`;
    return {
      id,
      enabled: item?.enabled !== false,
      mediaType,
      url,
      durationSeconds: duration,
    };
  });

  let gapSeconds = Number(source.gapSeconds);
  if (!Number.isFinite(gapSeconds)) gapSeconds = 0;
  gapSeconds = Math.min(10, Math.max(0, Math.round(gapSeconds)));

  return {
    enabled: source.enabled !== false,
    gapSeconds,
    showCountdown: source.showCountdown !== false,
    screens,
  };
}

/** Public app payload. Empty list means the app skips the splash. */
export function toPublicSplashScreens(input) {
  const normalized = normalizeSplashScreens(input);
  if (!normalized.enabled) {
    return { enabled: false, screens: [] };
  }
  return {
    enabled: true,
    gapSeconds: normalized.gapSeconds,
    showCountdown: normalized.showCountdown,
    screens: normalized.screens
      .filter((screen) => screen.enabled && screen.url)
      .map((screen) => ({
        id: screen.id,
        mediaType: screen.mediaType,
        url: screen.url,
        durationSeconds: screen.durationSeconds,
      })),
  };
}
