import { slugifyCategory, toPublicCategoryPath } from '@/lib/categorySlug';

export const BOTTOM_NAV_ACCOUNT_OPTIONS = [
  { value: '/dashboard/profile', label: 'Account' },
  { value: '/dashboard/orders', label: 'Orders' },
  { value: '/dashboard/wishlist', label: 'Wishlist' },
  { value: '/dashboard/addresses', label: 'Addresses' },
  { value: '/dashboard/settings', label: 'Settings' },
  { value: '/dashboard/security', label: 'Security' },
  { value: '/dashboard/tickets', label: 'Support tickets' },
];

export const BOTTOM_NAV_PAGE_OPTIONS = [
  { value: '/', label: 'Home' },
  { value: '/shop', label: 'Shop' },
  { value: '/categories', label: 'Categories' },
  { value: '/cart', label: 'Cart' },
  { value: '/new-arrivals', label: 'New arrivals' },
  { value: '/best-sellers', label: 'Best sellers' },
  { value: '/offers', label: 'Offers' },
  { value: '/about-us', label: 'About us' },
  { value: '/contact-us', label: 'Contact us' },
  { value: '/faq', label: 'FAQ' },
  { value: '/support', label: 'Support' },
  { value: '/help', label: 'Help' },
  { value: '/privacy-policy', label: 'Privacy policy' },
  { value: '/terms-and-conditions', label: 'Terms and conditions' },
  { value: '/shipping-policy', label: 'Shipping policy' },
  { value: '/return-policy', label: 'Return policy' },
  { value: '/cookie-policy', label: 'Cookie policy' },
  { value: '/warranty-policy', label: 'Warranty policy' },
];

export const BOTTOM_NAV_LINK_TYPES = [
  { value: 'page', label: 'Page' },
  { value: 'account', label: 'Account' },
  { value: 'category', label: 'Category' },
  { value: 'brand', label: 'Brand' },
  { value: 'product', label: 'Product' },
  { value: 'landing', label: 'Landing page' },
  { value: 'custom', label: 'Custom URL' },
];

const PAGE_PATHS = new Set(BOTTOM_NAV_PAGE_OPTIONS.map((page) => page.value));
const ACCOUNT_PATHS = new Set(BOTTOM_NAV_ACCOUNT_OPTIONS.map((page) => page.value));

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
}

export function readBottomNavLinkChoice(link = '') {
  const normalized = String(link || '').trim();
  if (normalized.startsWith('/pages/')) {
    return { type: 'landing', value: normalized };
  }
  if (normalized.startsWith('/c/')) {
    return { type: 'landing', value: safeDecode(normalized.replace(/^\/c\//, '').split('/')[0]) };
  }
  if (normalized.startsWith('/brand/')) {
    return { type: 'brand', value: safeDecode(normalized.replace(/^\/brand\//, '').split('/')[0]) };
  }
  if (normalized.startsWith('/category/')) {
    return { type: 'category', value: normalized.replace(/^\/category\//, '').replace(/\/$/, '') };
  }
  if (normalized.startsWith('/product/')) {
    return { type: 'product', value: safeDecode(normalized.replace(/^\/product\//, '').split('/')[0]) };
  }
  if (normalized.startsWith('/products/')) {
    return { type: 'product', value: safeDecode(normalized.replace(/^\/products\//, '').split('/')[0]) };
  }
  if (ACCOUNT_PATHS.has(normalized)) {
    return { type: 'account', value: normalized };
  }
  if (PAGE_PATHS.has(normalized)) {
    return { type: 'page', value: normalized };
  }
  return { type: 'custom', value: normalized };
}

export function createBottomNavLink(type, rawValue = '') {
  const value = String(rawValue || '').trim();
  if (type === 'page' || type === 'account') {
    if (!value) return type === 'account' ? '/dashboard/profile' : '/offers';
    return value.startsWith('/') ? value : `/${value}`;
  }
  if (type === 'category') {
    return value ? toPublicCategoryPath(value) : '/offers';
  }
  if (type === 'brand') {
    const slug = slugifyCategory(value);
    return slug ? `/brand/${slug}` : '/offers';
  }
  if (type === 'product') {
    return value ? `/product/${encodeURIComponent(value)}` : '/offers';
  }
  if (type === 'landing') {
    const path = String(value || '').trim();
    if (path.startsWith('/pages/')) return path;
    const slug = path.replace(/^\/c\//, '').replace(/^\//, '');
    return slug ? `/c/${slug}` : '/offers';
  }
  return value || '/offers';
}
