import {
    getDefaultPermissions,
    buildDeniedPermissions,
} from '@/lib/storePermissionDefaults';

export { getDefaultPermissions, buildDeniedPermissions };

export const SIDEBAR_ACCESS_COMPONENTS = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '/store' },
    { id: 'categories', label: 'Categories', icon: '📂', href: '/store/categories' },
    { id: 'brands', label: 'Brands', icon: '🔖', href: '/store/brands' },
    { id: 'suppliers', label: 'Suppliers', icon: '🏭', href: '/store/suppliers' },
    { id: 'addProduct', label: 'Add Product', icon: '➕', href: '/store/add-product' },
    { id: 'manageProduct', label: 'Manage Product', icon: '🧾', href: '/store/manage-product' },
    { id: 'productCost', label: 'Product Cost', icon: '💵', href: '/store/product-cost' },
    {
        id: 'changePricing',
        label: 'Change product prices',
        icon: '💲',
        href: '',
        action: true,
        description: 'Allow this member to edit sale price, regular price, and pack prices',
    },
    {
        id: 'bulkEditProducts',
        label: 'Bulk edit products',
        icon: '📝',
        href: '',
        action: true,
        description: 'Allow this member to bulk edit products from Manage Product, including by SKU list',
    },
    { id: 'inventory', label: 'Inventory', icon: '🏬', href: '/store/inventory' },
    { id: 'databaseImport', label: 'Database Import', icon: '🗄️', href: '/store/settings/database-import' },
    { id: 'customize', label: 'Customize', icon: '🎨', href: '/store/customize' },
    { id: 'productBadges', label: 'Product Badges', icon: '🏷️', href: '/store/badges' },
    { id: 'timeBadges', label: 'Time Badge', icon: '⏱️', href: '/store/time-badges' },
    { id: 'mobileFeatures', label: 'Mobile', icon: '📱', href: '/store/mobile-features' },
    { id: 'mobileNavbar', label: 'Navbar', icon: '📱', href: '/store/mobile-features/navbar' },
    { id: 'mobileHeader', label: 'App header', icon: '📱', href: '/store/mobile-features/header' },
    { id: 'mobileFooter', label: 'Footer', icon: '📱', href: '/store/mobile-features/footer' },
    { id: 'mobileLoader', label: 'Loader', icon: '📱', href: '/store/mobile-features/loader' },
    { id: 'mobileSplash', label: 'Splash screens', icon: '📱', href: '/store/mobile-features/splash-screens' },
    { id: 'mobileBanners', label: 'Banners', icon: '🖼️', href: '/store/mobile-features/banners' },
    { id: 'mobileOffers', label: 'Offers', icon: '⚡', href: '/store/mobile-features/offers' },
    { id: 'mobileShopBlocks', label: 'Shop blocks', icon: '▦', href: '/store/mobile-features/shop-blocks' },
    { id: 'mobileDealBar', label: 'Deal bar', icon: '🎁', href: '/store/mobile-features/deal-bar' },
    { id: 'mobileCouponBanner', label: 'Coupon banner', icon: '🏷️', href: '/store/mobile-features/coupon-banner' },
    { id: 'mobilePush', label: 'Push notification', icon: '🔔', href: '/store/mobile-features/push' },
    { id: 'blogs', label: 'Blogs', icon: '📝', href: '/store/blogs' },
    { id: 'menuManagement', label: 'Menu Management', icon: '📋', href: '/store/menu-management' },
    { id: 'media', label: 'Media', icon: '🖼️', href: '/store/media' },
    { id: 'orders', label: 'Orders', icon: '📦', href: '/store/orders' },
    { id: 'notifyList', label: 'Notify list', icon: '🔔', href: '/store/notify-list' },
    { id: 'todaysPickup', label: 'Pickup list', icon: '📅', href: '/store/todays-pickup' },
    { id: 'ordersByProduct', label: 'Orders by Product', icon: '📦', href: '/store/orders-by-product' },
    { id: 'trash', label: 'Trash', icon: '🗑️', href: '/store/trash' },
    { id: 'customers', label: 'Customers', icon: '👥', href: '/store/customers' },
    { id: 'customerTracking', label: 'Customer Tracking', icon: '📍', href: '/store/customer-tracking' },
    { id: 'marketingAnalytics', label: 'Marketing Analytics', icon: '📈', href: '/store/marketing-analytics' },
    { id: 'searchHistory', label: 'Search History', icon: '🔍', href: '/store/search-history' },
    { id: 'imageSearch', label: 'Image Search', icon: '🖼️', href: '/store/image-search' },
    { id: 'heatmap', label: 'Heatmap', icon: '🔥', href: '/store/heatmap' },
    { id: 'cohortTracking', label: 'Cohort Tracking', icon: '📊', href: '/store/cohorts' },
    { id: 'churnScores', label: 'Churn Scores', icon: '⚠️', href: '/store/churn-scores' },
    { id: 'rfmScores', label: 'RFM Scores', icon: '📐', href: '/store/rfm-scores' },
    { id: 'behavioralTriggers', label: 'Behavioral Triggers', icon: '⚡', href: '/store/behavioral-triggers' },
    { id: 'marketingStack', label: 'Marketing Stack', icon: '🧩', href: '/store/marketing-stack' },
    { id: 'abandonedCheckout', label: 'Abandoned Checkout', icon: '🛒', href: '/store/abandoned-checkout' },
    { id: 'shipping', label: 'Shipping', icon: '🚚', href: '/store/shipping' },
    { id: 'alerts', label: 'Alerts', icon: '⚠️', href: '/store/alerts' },
    { id: 'paymentSecurity', label: 'Payment Security', icon: '🔐', href: '/store/payment-security' },
    { id: 'returnRequests', label: 'Returns & Replacements', icon: '↩️', href: '/store/return-requests' },
    { id: 'balance', label: 'Balance', icon: '💰', href: '/store/balance' },
    { id: 'salesReport', label: 'Sales Report', icon: '📊', href: '/store/sales-report' },
    { id: 'exports', label: 'Exports', icon: '⬇️', href: '/store/exports' },
    { id: 'promotionalOffers', label: 'Promotional Offers', icon: '🎁', href: '/store/personalized-offers' },
    { id: 'coupons', label: 'Coupons', icon: '🏷️', href: '/store/coupons' },
    { id: 'giveaways', label: 'Giveaways', icon: '🎁', href: '/store/giveaways' },
    { id: 'spinWheel', label: 'Spin Wheel', icon: '🎡', href: '/store/spin-wheel' },
    { id: 'promotionalEmails', label: 'Email Marketing', icon: '📧', href: '/store/email-marketing' },
    { id: 'adsTracking', label: 'Ad Tracking', icon: '📈', href: '/store/ads-tracking' },
    { id: 'marketingExpenses', label: 'Marketing Expenses', icon: '📉', href: '/store/marketing-expenses' },
    { id: 'reviews', label: 'Reviews', icon: '⭐', href: '/store/reviews' },
    { id: 'supportTickets', label: 'Support Tickets', icon: '🎫', href: '/store/tickets' },
    { id: 'contactMessages', label: 'Contact Messages', icon: '✉️', href: '/store#contact-messages' },
    { id: 'productNotifications', label: 'Product Notifications', icon: '🔔', href: '/store/product-notifications' },
    { id: 'manageUsers', label: 'Staff & permissions', icon: '👤', href: '/store/settings?tab=team' },
    {
        id: 'viewActivityHistory',
        label: 'View settings history',
        icon: '🕒',
        href: '/store/settings/history',
        action: true,
        description: 'Allow this member to open Settings → History. Off by default. Only the admin email sees it unless you enable this.',
    },
    {
        id: 'customerPickup',
        label: 'Customer pickup setting',
        icon: '📍',
        href: '',
        action: true,
        description: 'Allow this member to turn store pickup on or off in Settings. Off by default. Only the super admin can change it unless you enable this.',
    },
    { id: 'settings', label: 'Settings', icon: '⚙️', href: '/store/settings' },
];

export const PERMISSION_GROUPS = [
    {
        id: 'store',
        label: 'Store & catalog',
        componentIds: ['dashboard', 'categories', 'brands', 'suppliers', 'addProduct', 'manageProduct', 'productCost', 'changePricing', 'bulkEditProducts', 'databaseImport', 'customize', 'productBadges', 'mobileFeatures', 'mobileNavbar', 'mobileHeader', 'mobileFooter', 'mobileLoader', 'mobileSplash', 'mobileBanners', 'mobileOffers', 'mobileShopBlocks', 'mobileDealBar', 'mobileCouponBanner', 'mobilePush', 'blogs', 'menuManagement', 'media', 'settings'],
    },
    {
        id: 'sales',
        label: 'Orders & customers',
        componentIds: ['orders', 'notifyList', 'todaysPickup', 'ordersByProduct', 'trash', 'customers', 'customerTracking', 'abandonedCheckout', 'shipping', 'alerts', 'paymentSecurity', 'returnRequests', 'balance', 'salesReport', 'exports'],
    },
    {
        id: 'marketing',
        label: 'Marketing',
        componentIds: ['promotionalOffers', 'coupons', 'giveaways', 'spinWheel', 'promotionalEmails', 'customerTracking', 'marketingAnalytics', 'searchHistory', 'imageSearch', 'heatmap', 'cohortTracking', 'churnScores', 'rfmScores', 'behavioralTriggers', 'marketingStack', 'adsTracking', 'marketingExpenses'],
    },
    {
        id: 'support',
        label: 'Support & reviews',
        componentIds: ['reviews', 'supportTickets', 'contactMessages', 'productNotifications'],
    },
    {
        id: 'warehouse',
        label: 'Warehouse',
        componentIds: ['inventory'],
    },
    {
        id: 'team',
        label: 'Team',
        componentIds: ['manageUsers', 'viewActivityHistory', 'customerPickup'],
    },
];

const componentMap = Object.fromEntries(
    SIDEBAR_ACCESS_COMPONENTS.map((component) => [component.id, component])
);

const MOBILE_SECTION_IDS = new Set([
    'mobileNavbar',
    'mobileHeader',
    'mobileFooter',
    'mobileLoader',
    'mobileSplash',
    'mobileBanners',
    'mobileOffers',
    'mobileShopBlocks',
    'mobileDealBar',
    'mobileCouponBanner',
    'mobilePush',
]);

export function isPermissionEnabled(permissions = {}, permissionId) {
    const component = componentMap[permissionId];
    if (component?.action) return permissions?.[permissionId] === true;
    if (permissions?.[permissionId] === false) return false;
    if (permissions?.[permissionId] === true) return true;
    if (MOBILE_SECTION_IDS.has(permissionId)) {
        return permissions?.mobileFeatures !== false;
    }
    return permissions?.[permissionId] !== false;
}

export function countEnabledPermissions(permissions = {}) {
    return SIDEBAR_ACCESS_COMPONENTS.filter((component) => isPermissionEnabled(permissions, component.id)).length;
}

export function getComponentById(id) {
    return componentMap[id] || null;
}

export function setAllPermissions(current = {}, enabled) {
    const next = { ...current };
    SIDEBAR_ACCESS_COMPONENTS.forEach((component) => {
        next[component.id] = enabled;
    });
    return next;
}

export function setGroupPermissions(current = {}, componentIds = [], enabled) {
    const next = { ...current };
    componentIds.forEach((id) => {
        next[id] = enabled;
    });
    return next;
}

function normalizePathname(pathname = '') {
    const raw = String(pathname || '').split('#')[0].split('?')[0].replace(/\/+$/, '');
    return raw || '/store';
}

/**
 * Customize hub cards link to routes that are not under `/store/customize/*`.
 * Without this map, members with only `customize` access get redirected away.
 */
const PATH_PERMISSION_ALIASES = [
    { permissionId: 'customize', prefixes: [
        '/store/customize',
        '/store/home-preferences',
        '/store/preferences',
        '/store/navbar-menu',
        '/store/menu-management',
        '/store/home-menu-categories',
        '/store/storefront',
        '/store/explore-interests',
        '/store/category-slider',
        '/store/featured-products',
        '/store/sitemap-settings',
    ]},
    { permissionId: 'mobileNavbar', prefixes: [
        '/store/mobile-features/app-icon',
    ]},
    { permissionId: 'mobileBanners', prefixes: [
        '/store/mobile-features/banners',
        '/store/mobile-features/small-banners',
        '/store/mobile-features/promo-cards',
        '/store/mobile-features/tile-banners',
        '/store/mobile-features/fourth-banners',
    ]},
    { permissionId: 'promotionalEmails', prefixes: [
        '/store/email-marketing',
        '/store/promotional-emails',
        '/store/email-templates',
    ]},
];

function getAliasedPermissionId(pathname = '') {
    const path = normalizePathname(pathname);
    for (const alias of PATH_PERMISSION_ALIASES) {
        for (const prefix of alias.prefixes) {
            const base = normalizePathname(prefix);
            if (path === base || path.startsWith(`${base}/`)) {
                return alias.permissionId;
            }
        }
    }
    return null;
}

export function getPermissionIdForHref(href = '') {
    const rawHref = String(href || '').trim();
    if (!rawHref) return null;

    const directComponent = SIDEBAR_ACCESS_COMPONENTS.find((component) => !component.action && component.href === rawHref);
    if (directComponent) return directComponent.id;

    const normalizedPath = normalizePathname(rawHref);
    const aliased = getAliasedPermissionId(normalizedPath);
    if (aliased) return aliased;

    const sortedComponents = [...SIDEBAR_ACCESS_COMPONENTS].sort(
        (a, b) => normalizePathname(b.href).length - normalizePathname(a.href).length
    );

    for (const component of sortedComponents) {
        if (component.action || !component.href) continue;
        const basePath = normalizePathname(component.href);
        if (normalizedPath === basePath) return component.id;
        if (basePath !== '/store' && normalizedPath.startsWith(`${basePath}/`)) {
            return component.id;
        }
    }

    return null;
}

export function canAccessDashboardArea(permissions = {}, permissionId, { isOwner = false } = {}) {
    if (isOwner) return true;
    if (!permissionId) return true;
    return isPermissionEnabled(permissions, permissionId);
}

export function canAccessPath(pathname, permissions = {}, { isOwner = false, canViewActivityHistory = false } = {}) {
    const path = normalizePathname(pathname);
    if (path === '/store/settings/history') {
        return Boolean(canViewActivityHistory);
    }
    if (path === '/store/landing-pages') {
        if (isOwner) return true;
        return permissions?.customize !== false || permissions?.promotionalEmails !== false;
    }
    if (isOwner) return true;
    if (path === '/store/settings' || path === '/store/settings/users') {
        return true;
    }
    const permissionId = getPermissionIdForHref(pathname);
    if (!permissionId) return false;
    return canAccessDashboardArea(permissions, permissionId, { isOwner });
}

export const canAccessStorePath = canAccessPath;

export function getFirstAllowedHref(permissions = {}, { isOwner = false } = {}) {
    if (isOwner) return '/store';

    for (const component of SIDEBAR_ACCESS_COMPONENTS) {
        if (component.action) continue;
        if (canAccessDashboardArea(permissions, component.id, { isOwner })) {
            return component.href.split('#')[0] || '/store';
        }
    }

    return null;
}

export function getPermissionLabel(permissionId) {
    return componentMap[permissionId]?.label || 'This page';
}
