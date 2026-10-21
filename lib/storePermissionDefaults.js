const PERMISSION_IDS = [
    'dashboard',
    'categories',
    'brands',
    'suppliers',
    'addProduct',
    'manageProduct',
    'productCost',
    'changePricing',
    'bulkEditProducts',
    'inventory',
    'databaseImport',
    'customize',
    'productBadges',
    'mobileFeatures',
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
    'blogs',
    'menuManagement',
    'media',
    'orders',
    'notifyList',
    'todaysPickup',
    'ordersByProduct',
    'trash',
    'customers',
    'customerTracking',
    'marketingAnalytics',
    'searchHistory',
    'imageSearch',
    'heatmap',
    'cohortTracking',
    'churnScores',
    'rfmScores',
    'behavioralTriggers',
    'marketingStack',
    'abandonedCheckout',
    'shipping',
    'paymentSecurity',
    'returnRequests',
    'balance',
    'salesReport',
    'exports',
    'promotionalOffers',
    'coupons',
    'giveaways',
    'spinWheel',
    'promotionalEmails',
    'adsTracking',
    'marketingExpenses',
    'reviews',
    'supportTickets',
    'contactMessages',
    'productNotifications',
    'manageUsers',
    'viewActivityHistory',
    'customerPickup',
    'settings',
];

const OPT_IN_PERMISSIONS = new Set(['changePricing', 'bulkEditProducts', 'viewActivityHistory', 'customerPickup']);

export function getDefaultPermissions() {
    return Object.fromEntries(
        PERMISSION_IDS.map((id) => [id, !OPT_IN_PERMISSIONS.has(id)]),
    );
}

export function buildDeniedPermissions() {
    return Object.fromEntries(PERMISSION_IDS.map((id) => [id, false]));
}

export function countEnabledPermissions(permissions = {}) {
    return PERMISSION_IDS.filter((id) => permissions[id] !== false).length;
}

export { PERMISSION_IDS };
