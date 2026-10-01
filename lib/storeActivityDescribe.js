const AREA_LABELS = [
  ['/api/store/product/bulk-update', 'products'],
  ['/api/store/admin-pin', 'products'],
  ['/api/store/product/resolve-skus', 'products'],
  ['/api/store/product-cost', 'product cost'],
  ['/api/store/product', 'products'],
  ['/api/store/categories', 'categories'],
  ['/api/store/brands', 'brands'],
  ['/api/store/suppliers', 'suppliers'],
  ['/api/store/appearance', 'appearance'],
  ['/api/store/featured-products', 'featured products'],
  ['/api/store/category-slider', 'category sliders'],
  ['/api/store/explore-interests', 'explore interests'],
  ['/api/store/navbar-menu', 'navbar'],
  ['/api/store/settings', 'settings'],
  ['/api/store/profile', 'profile'],
  ['/api/store/users', 'team access'],
  ['/api/store/shipping', 'shipping'],
  ['/api/store/coupons', 'coupons'],
  ['/api/store/orders', 'orders'],
  ['/api/store/reviews', 'reviews'],
  ['/api/store/inventory/google-sheet', 'inventory'],
  ['/api/store/inventory', 'inventory'],
  ['/api/store/blogs', 'blogs'],
  ['/api/store/media', 'media'],
  ['/api/store/giveaways', 'giveaways'],
  ['/api/store/spin', 'spin wheel'],
  ['/api/store/email-marketing', 'email marketing'],
  ['/api/store/promotional-emails', 'email marketing'],
  ['/api/store/personalized-offers', 'promotional offers'],
  ['/api/store/abandoned-checkout', 'abandoned checkout'],
  ['/api/store/return-requests', 'returns'],
  ['/api/store/tickets', 'support tickets'],
  ['/api/store/alerts', 'alerts'],
  ['/api/store/preferences', 'preferences'],
  ['/api/store/home-preferences', 'home preferences'],
  ['/api/store/menu-management', 'menu'],
  ['/api/store/mobile-features', 'mobile features'],
  ['/api/store/dashboard/insights', 'AI insights'],
];

const SKIP_ACTIVITY_PATHS = [
  '/api/store/activity-log',
  '/api/store/dashboard/insights',
  '/api/store/dashboard/live',
  '/api/store/orders/notifications',
  '/api/store/is-seller',
];

const SKIP_DETAIL_FIELDS = /^(pass|password|newpassword|confirmpassword|token|secret|authorization|cookie|apikey|html|description|descriptionar|content|images|externalimages|stats|body|file)$/i;

export function normalizeActivityPath(value = '') {
  try {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const url = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'https://store.local');
    return decodeURIComponent(url.pathname || '').replace(/\/+$/, '') || url.pathname;
  } catch {
    return String(value || '').split('?')[0].replace(/\/+$/, '');
  }
}

export function shouldSkipStoreActivityPath(path = '') {
  const normalized = normalizeActivityPath(path);
  return SKIP_ACTIVITY_PATHS.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function humanizeKey(key = '') {
  return String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function shortValue(value) {
  if (value === true) return 'on';
  if (value === false) return 'off';
  if (value == null) return '';
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (!keys.length) return 'updated';
    return keys.slice(0, 4).map(humanizeKey).join(', ');
  }
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function summarizeStoreActivityPayload(payload) {
  let data = payload;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return { summary: '', details: [] };
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { summary: '', details: [] };
  }

  const selectedCount = Array.isArray(data.productIds) ? data.productIds.filter(Boolean).length : 0;
  const skuCount = String(data.skus || data.skuList || '')
    .split(/[\n;,]+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  const itemName = String(
    data.name || data.nameEn || data.title || data.productName || data.sku || data.email
    || (selectedCount ? `${selectedCount} selected product${selectedCount === 1 ? '' : 's'}` : '')
    || (skuCount ? `${skuCount} SKU${skuCount === 1 ? '' : 's'}` : ''),
  ).trim();
  const details = [];

  for (const [key, value] of Object.entries(data)) {
    if (SKIP_DETAIL_FIELDS.test(key) || value === undefined) continue;
    const label = humanizeKey(key);
    const text = shortValue(value);
    if (!text) continue;
    details.push(`${label}: ${text}`);
    if (details.length >= 8) break;
  }

  const summary = [itemName && `Item: ${itemName}`, details.join(' · ')].filter(Boolean).join(' — ');
  return {
    summary: summary.slice(0, 800),
    details: details.slice(0, 8),
    itemName: itemName.slice(0, 120),
  };
}

function detailMap(details = []) {
  const map = {};
  (Array.isArray(details) ? details : []).forEach((line) => {
    const text = String(line || '').trim();
    const splitAt = text.indexOf(':');
    if (splitAt <= 0) return;
    map[text.slice(0, splitAt).trim().toLowerCase()] = text.slice(splitAt + 1).trim();
  });
  return map;
}

function firstNumber(value = '') {
  const match = String(value || '').match(/(\d+)/);
  return match ? match[1] : '';
}

function isRawId(value = '') {
  return /^[a-f0-9]{24}$/i.test(String(value || '').trim());
}

export function explainStoreActivity(row = {}, names = {}) {
  const path = normalizeActivityPath(row.path || '');
  const details = Array.isArray(row.metadata?.details)
    ? row.metadata.details
    : (Array.isArray(row.details) ? row.details : []);
  const map = detailMap(details);
  const item = String(row.metadata?.itemName || row.itemName || '').trim();
  const categoryId = map['primary category id'] || map['category id'] || '';
  const categoryName = names[categoryId] || '';

  if (path.includes('/orders/reconcile-payments')) {
    const hours = map.hours || '24';
    return {
      action: `Rechecked payments for the last ${hours} hours`,
      details: [`Looked back ${hours} hours for paid orders that still showed as unpaid`],
    };
  }

  if (path.includes('/users/reset-password')) {
    const email = map['account email'] || map.email || (item.includes('@') ? item : '');
    return {
      action: email ? `Reset password for ${email}` : 'Reset a user password',
      details: email
        ? [`Account: ${email}`, 'The person was signed out and emailed that the password changed']
        : ['The person was signed out and emailed that the password changed'],
    };
  }

  if (path.includes('/product/set-categories')) {
    const count = firstNumber(map['product ids']) || firstNumber(item);
    const target = categoryName || (categoryId ? 'the selected category' : 'a new category');
    return {
      action: count
        ? `Changed ${count} product${count === '1' ? '' : 's'} to ${target}`
        : `Changed products to ${target}`,
      details: categoryName ? [`New category: ${categoryName}`] : [],
    };
  }

  if (path.includes('/cache')) {
    const scope = String(map.scope || 'all').toLowerCase();
    const label = scope === 'storefront' ? 'storefront cache' : 'all website cache';
    return {
      action: `Cleared ${label}`,
      details: [`Scope: ${label}`],
    };
  }

  if (path.includes('/users/update-permissions')) {
    return {
      action: item ? `Changed dashboard access for ${item}` : 'Changed dashboard access',
      details: details.filter((line) => !/password|uid/i.test(line)).slice(0, 6),
    };
  }

  const specific = details
    .map((line) => {
      const text = String(line || '').trim();
      const splitAt = text.indexOf(':');
      if (splitAt <= 0) return text;
      const label = text.slice(0, splitAt).trim();
      const value = text.slice(splitAt + 1).trim();
      if (!value || /password|token|secret/i.test(label)) return '';
      if (isRawId(value)) {
        const named = names[value];
        return named ? `Set ${label.toLowerCase()} to ${named}` : '';
      }
      if (/items?$/i.test(value) && /id/i.test(label)) {
        return `${label}: ${value}`;
      }
      return `Set ${label.toLowerCase()} to ${value}`;
    })
    .filter(Boolean)
    .slice(0, 6);

  return {
    action: describeStoreActivity({
      method: row.method,
      path,
      pagePath: row.pagePath,
      itemName: item,
    }),
    details: specific,
  };
}

export function describeStoreActivity({ method = 'POST', path = '', pagePath = '', itemName = '' } = {}) {
  const verb = {
    post: 'Saved',
    put: 'Updated',
    patch: 'Updated',
    delete: 'Deleted',
  }[String(method || '').toLowerCase()] || 'Changed';

  const normalized = normalizeActivityPath(path);
  const area = AREA_LABELS.find(([prefix]) => normalized === prefix || normalized.startsWith(`${prefix}/`))?.[1]
    || String(normalized.split('/').filter(Boolean).slice(-1)[0] || 'dashboard').replace(/-/g, ' ');

  const page = normalizeActivityPath(pagePath).replace(/^\/store\/?/, '');
  const pageLabel = page ? page.replace(/-/g, ' ') : '';
  const item = String(itemName || '').trim();
  if (normalized === '/api/store/product-cost' || normalized.startsWith('/api/store/product-cost/')) {
    const costAction = String(method || '').toLowerCase() === 'post' ? 'Bulk updated product cost' : `${verb} product cost`;
    return item ? `${costAction}: ${item}` : costAction;
  }
  const base = pageLabel ? `${verb} ${area} from ${pageLabel}` : `${verb} ${area}`;
  return item && !base.includes(item) ? `${base}: ${item}` : base;
}
