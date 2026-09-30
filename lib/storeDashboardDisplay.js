export const DASHBOARD_SCALES = [80, 90, 100, 110];

export function normalizeDashboardTheme(value) {
  return value === 'dark' ? 'dark' : 'light';
}

export function normalizeDashboardScale(value) {
  const scale = Number(value);
  return DASHBOARD_SCALES.includes(scale) ? scale : 100;
}

const LAST_DISPLAY_KEY = 'store1920.dashboardDisplay.last';

export function dashboardDisplayStorageKey(uid = '') {
  return `store1920.dashboardDisplay.${String(uid || 'account')}`;
}

function parseStoredDisplay(raw) {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return {
    theme: normalizeDashboardTheme(parsed?.theme),
    scale: normalizeDashboardScale(parsed?.scale),
  };
}

export function readStoredDashboardDisplay(uid = '') {
  if (typeof window === 'undefined') return null;
  try {
    return parseStoredDisplay(window.localStorage.getItem(dashboardDisplayStorageKey(uid)));
  } catch {
    return null;
  }
}

export function readLastDashboardDisplay() {
  if (typeof window === 'undefined') return null;
  try {
    return parseStoredDisplay(window.localStorage.getItem(LAST_DISPLAY_KEY));
  } catch {
    return null;
  }
}

export function applyStoreDashboardDisplay({ theme, scale } = {}) {
  if (typeof document === 'undefined') return;
  const root = document.querySelector('[data-store-language-scope]');
  if (!root) return;
  const nextTheme = normalizeDashboardTheme(theme);
  const nextScale = normalizeDashboardScale(scale);
  root.dataset.storeTheme = nextTheme;
  const factor = nextScale / 100;
  root.style.zoom = String(factor);
  if (nextScale === 100) {
    root.style.height = '';
    root.style.maxHeight = '';
  } else {
    root.style.height = `calc(100dvh / ${factor})`;
    root.style.maxHeight = `calc(100dvh / ${factor})`;
  }
}

export function publishStoreDashboardDisplay(uid, prefs) {
  const next = {
    theme: normalizeDashboardTheme(prefs?.theme),
    scale: normalizeDashboardScale(prefs?.scale),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(dashboardDisplayStorageKey(uid), JSON.stringify(next));
      window.localStorage.setItem(LAST_DISPLAY_KEY, JSON.stringify(next));
    } catch {
      // The live dashboard still updates if storage is blocked.
    }
    applyStoreDashboardDisplay(next);
    window.dispatchEvent(new CustomEvent('store-dashboard-display', { detail: next }));
  }
  return next;
}
