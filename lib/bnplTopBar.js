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
};

export const BNPL_PARTNER_DEFS = [
  {
    key: 'tamara',
    name: 'Tamara',
    nameAr: 'تمارا',
    logoUrl: '/payments/tamara.png',
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
  const partners = enabledPartners.length ? enabledPartners : BNPL_PARTNER_DEFS.filter((partner) => partner.key === 'tamara');

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
        logoUrl: partner.logoUrl,
        payments,
        desktopText: custom || defaults.desktop,
        mobileText: custom || defaults.mobile,
      };
    });
}
