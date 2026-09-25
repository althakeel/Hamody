export const DEFAULT_BNPL_TOP_BAR = {
  enabled: true,
  tamaraEnabled: true,
  tabbyEnabled: false,
  tamaraPayments: 4,
  tabbyPayments: 4,
  tamaraText: '',
  tamaraTextAr: '',
  tabbyText: '',
  tabbyTextAr: '',
  fontSize: 14,
  minHeight: 40,
  tamaraLogoUrl: '',
  tabbyLogoUrl: '',
  customItems: [],
};

export const BNPL_PARTNER_DEFS = [
  {
    key: 'tamara',
    name: 'Tamara',
    nameAr: 'تمارا',
    logoUrl: '/payments/tamara.png',
    logoKey: 'tamaraLogoUrl',
    enabledKey: 'tamaraEnabled',
    paymentsKey: 'tamaraPayments',
    textKey: 'tamaraText',
    textArKey: 'tamaraTextAr',
  },
  {
    key: 'tabby',
    name: 'Tabby',
    nameAr: 'تابي',
    logoUrl: '/payments/tabby.png',
    logoKey: 'tabbyLogoUrl',
    enabledKey: 'tabbyEnabled',
    paymentsKey: 'tabbyPayments',
    textKey: 'tabbyText',
    textArKey: 'tabbyTextAr',
  },
];

const clampPayments = (value, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(12, Math.max(2, Math.round(number)));
};

const clampInt = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

function normalizeCustomTopBarItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 8).map((item, index) => ({
    id: String(item?.id || `topbar-item-${index + 1}`).trim(),
    enabled: item?.enabled !== false,
    name: String(item?.name || `Item ${index + 1}`).trim().slice(0, 40),
    imageUrl: String(item?.imageUrl || '').trim(),
    text: String(item?.text || '').trim().slice(0, 160),
    textAr: String(item?.textAr || '').trim().slice(0, 160),
  }));
}

export function normalizeBnplTopBar(value, fallback = DEFAULT_BNPL_TOP_BAR) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback.enabled,
    tamaraEnabled: typeof source.tamaraEnabled === 'boolean' ? source.tamaraEnabled : fallback.tamaraEnabled,
    tabbyEnabled: typeof source.tabbyEnabled === 'boolean' ? source.tabbyEnabled : fallback.tabbyEnabled,
    tamaraPayments: clampPayments(source.tamaraPayments, fallback.tamaraPayments),
    tabbyPayments: clampPayments(source.tabbyPayments, fallback.tabbyPayments),
    tamaraText: String(source.tamaraText ?? fallback.tamaraText ?? '').trim(),
    tamaraTextAr: String(source.tamaraTextAr ?? fallback.tamaraTextAr ?? '').trim(),
    tabbyText: String(source.tabbyText ?? fallback.tabbyText ?? '').trim(),
    tabbyTextAr: String(source.tabbyTextAr ?? fallback.tabbyTextAr ?? '').trim(),
    fontSize: clampInt(source.fontSize, 10, 24, fallback.fontSize ?? 14),
    minHeight: clampInt(source.minHeight, 28, 72, fallback.minHeight ?? 40),
    tamaraLogoUrl: String(source.tamaraLogoUrl ?? fallback.tamaraLogoUrl ?? '').trim(),
    tabbyLogoUrl: String(source.tabbyLogoUrl ?? fallback.tabbyLogoUrl ?? '').trim(),
    customItems: normalizeCustomTopBarItems(source.customItems ?? fallback.customItems),
  };
}

export function resolveBnplTopBarMetrics(settings) {
  const config = normalizeBnplTopBar(settings);
  return {
    fontSize: config.fontSize,
    minHeight: config.minHeight,
    logoHeight: Math.max(18, Math.round(config.fontSize + 6)),
  };
}

export function getDefaultBnplBannerText({ name, nameAr, payments }, language = 'en') {
  const count = clampPayments(payments, 4);
  if (language === 'ar') {
    return {
      desktop: `قسّم مشترياتك إلى ${count} دفعات مع ${nameAr || name}`,
      mobile: `ادفع على ${count} دفعات مع ${nameAr || name}`,
    };
  }
  return {
    desktop: `Split your purchase into ${count} payments with ${name}`,
    mobile: `Pay in ${count} with ${name}`,
  };
}

export function resolveBnplPartners(settings, language = 'en') {
  const config = normalizeBnplTopBar(settings);
  if (!config.enabled) return [];

  const enabledPartners = BNPL_PARTNER_DEFS.filter((partner) => config[partner.enabledKey]);
  const hasCustom = config.customItems.some((item) => item.enabled);
  const partners = enabledPartners.length
    ? enabledPartners
    : (hasCustom ? [] : BNPL_PARTNER_DEFS.filter((partner) => partner.key === 'tamara'));

  return partners
    .map((partner) => {
      const payments = config[partner.paymentsKey];
      const defaults = getDefaultBnplBannerText({
        name: partner.name,
        nameAr: partner.nameAr,
        payments,
      }, language);
      const custom = language === 'ar'
        ? String(config[partner.textArKey] || '').trim()
        : String(config[partner.textKey] || '').trim();
      return {
        key: partner.key,
        name: partner.name,
        nameAr: partner.nameAr,
        logoUrl: String(config[partner.logoKey] || '').trim() || partner.logoUrl,
        payments,
        desktopText: custom || defaults.desktop,
        mobileText: custom || defaults.mobile,
      };
    })
    .concat(
      config.customItems
        .filter((item) => item.enabled && (item.imageUrl || item.text || item.textAr || item.name))
        .map((item) => {
          const text = language === 'ar' ? (item.textAr || item.text) : (item.text || item.textAr);
          return {
            key: item.id,
            name: item.name || 'Item',
            nameAr: item.name || 'Item',
            logoUrl: item.imageUrl,
            payments: 4,
            desktopText: text || item.name,
            mobileText: text || item.name,
          };
        }),
    );
}
