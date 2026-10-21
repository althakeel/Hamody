export const BOTTOM_ICON_SLOTS = [
  { id: 'home', label: 'Home' },
  { id: 'shop', label: 'Shop' },
  { id: 'cart', label: 'Cart' },
  { id: 'account', label: 'Account' },
];

function cleanIconUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 500) return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return '';
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
}

function normalizeSlot(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    iconUrl: cleanIconUrl(source.iconUrl),
    activeIconUrl: cleanIconUrl(source.activeIconUrl),
  };
}

export function normalizeBottomIcons(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const items = {};
  BOTTOM_ICON_SLOTS.forEach((slot) => {
    items[slot.id] = normalizeSlot(source[slot.id]);
  });
  return items;
}

/** Public payload. Empty slots are omitted so the app keeps its built-in icon. */
export function toPublicBottomIcons(input = {}) {
  const items = normalizeBottomIcons(input);
  const published = {};
  BOTTOM_ICON_SLOTS.forEach((slot) => {
    const row = items[slot.id];
    if (!row.iconUrl && !row.activeIconUrl) return;
    published[slot.id] = {};
    if (row.iconUrl) published[slot.id].iconUrl = row.iconUrl;
    if (row.activeIconUrl) published[slot.id].activeIconUrl = row.activeIconUrl;
  });
  return published;
}
