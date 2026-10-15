import {
  STORE1920_CUSTOMER_SUPPORT_PHONE,
  STORE1920_SUPPORT_EMAIL,
  formatCustomerSupportPhoneDisplay,
  digitsOnlyPhone,
} from '@/lib/storeContact';
import {
  STORE1920_LEGAL_NAME,
  STORE1920_LEGAL_NAME_AR,
  STORE1920_TRADE_LICENSE_NO,
  STORE1920_SOCIAL_LINKS,
  getRegisteredOfficeLines,
  getFulfilmentAddressLines,
} from '@/lib/businessIdentity';

export const FOOTER_PAYMENT_METHOD_IDS = ['visa', 'mastercard', 'tabby', 'tamara', 'cod'];

export const DEFAULT_PAYMENT_MARKS = [
  { id: 'visa', label: 'Visa', image: '/payments/visa.png' },
  { id: 'mastercard', label: 'Mastercard', image: '/payments/mastercard.png' },
  { id: 'tabby', label: 'Tabby', image: '/payments/tabby.png' },
  { id: 'tamara', label: 'Tamara', image: '/payments/tamara.png' },
  { id: 'cod', label: 'Cash on delivery', image: '/payments/cod.png' },
];

export const FOOTER_SOCIAL_IDS = ['facebook', 'instagram', 'tiktok', 'snapchat', 'pinterest'];

const DEFAULT_DESCRIPTION = 'Store1920 is a UAE online retailer offering electronics, home, and lifestyle essentials at competitive prices with fast delivery on eligible items.';
const DEFAULT_DESCRIPTION_AR = 'Store1920 متجر تجزئة إلكتروني في الإمارات يقدّم الإلكترونيات ومستلزمات المنزل ونمط الحياة بأسعار تنافسية مع توصيل سريع للمنتجات المؤهلة.';
const DEFAULT_COPYRIGHT = `Store1920 is owned and operated by ${STORE1920_LEGAL_NAME}, UAE Trade Licence No. ${STORE1920_TRADE_LICENSE_NO}. © {year} ${STORE1920_LEGAL_NAME}. All rights reserved.`;
const DEFAULT_COPYRIGHT_AR = `Store1920 مملوك ويُدار من قبل ${STORE1920_LEGAL_NAME}، رخصة تجارية إماراتية رقم ${STORE1920_TRADE_LICENSE_NO}. © {year} ${STORE1920_LEGAL_NAME}. جميع الحقوق محفوظة.`;

function link(label, labelAr, href, requiresAuth = false) {
  return { label, labelAr, href, enabled: true, requiresAuth };
}

function column(title, titleAr, links) {
  return { title, titleAr, enabled: true, links };
}

export const DEFAULT_FOOTER = {
  description: DEFAULT_DESCRIPTION,
  descriptionAr: DEFAULT_DESCRIPTION_AR,
  operatedBy: 'Operated by {legalName}',
  operatedByAr: 'تُشغَّل بواسطة {legalName}',
  legalName: STORE1920_LEGAL_NAME,
  legalNameAr: STORE1920_LEGAL_NAME_AR,
  phone: STORE1920_CUSTOMER_SUPPORT_PHONE,
  email: STORE1920_SUPPORT_EMAIL,
  registeredOfficeLabel: 'Registered office',
  registeredOfficeLabelAr: 'المكتب المسجّل',
  registeredOffice: getRegisteredOfficeLines().join('\n'),
  registeredOfficeAr: '',
  fulfilmentLabel: 'Fulfilment and returns',
  fulfilmentLabelAr: 'التجهيز والإرجاع',
  fulfilmentAddress: getFulfilmentAddressLines().join('\n'),
  fulfilmentAddressAr: '',
  copyright: DEFAULT_COPYRIGHT,
  copyrightAr: DEFAULT_COPYRIGHT_AR,
  paymentMethods: DEFAULT_PAYMENT_MARKS.map((item) => ({ ...item, enabled: true })),
  socialLinks: FOOTER_SOCIAL_IDS.map((id) => ({
    id,
    url: STORE1920_SOCIAL_LINKS[id] || '',
    enabled: id !== 'pinterest',
  })),
  columns: [
    column('SHOP', 'تسوق', [
      link('All Products', 'كل المنتجات', '/shop'),
      link("Today's Deals", 'عروض اليوم', '/offers'),
      link('New Arrivals', 'وصل حديثًا', '/new-arrivals'),
    ]),
    column('CUSTOMER CARE', 'خدمة العملاء', [
      link('Track Order', 'تتبع الطلب', '/track-order'),
      link('My Orders', 'طلباتي', '/dashboard/orders', true),
      link('My Wishlist', 'مفضلتي', '/wishlist'),
      link('FAQ', 'الأسئلة الشائعة', '/faq'),
      link('Support', 'الدعم', '/support'),
      link('Contact Us', 'اتصل بنا', '/contact-us'),
    ]),
    column('LEGAL & INFO', 'القانونية والمعلومات', [
      link('Terms & Conditions', 'الشروط والأحكام', '/terms-and-conditions'),
      link('Terms of Sale', 'شروط البيع', '/terms-of-sale'),
      link('Shipping Policy', 'سياسة الشحن', '/shipping-policy'),
      link('Privacy Policy', 'سياسة الخصوصية', '/privacy-policy'),
      link('Return, Refund & Cancellation Policy', 'سياسة الإرجاع والاسترداد والإلغاء', '/return-policy'),
      link('Warranty Policy', 'سياسة الضمان', '/warranty-policy'),
      link('Sitemap', 'خريطة الموقع', '/sitemap'),
    ]),
    column('ABOUT STORE1920', 'عن STORE1920', [
      link('About Us', 'من نحن', '/about-us'),
      link('Blog', 'المدونة', '/blogs'),
      link('Business Information', 'معلومات الأعمال', '/business-information'),
      link('Careers', 'الوظائف', '/careers'),
    ]),
  ],
};

function clip(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeHref(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/') || /^https?:\/\//i.test(raw)) return raw.slice(0, 300);
  return `/${raw.replace(/^\/+/, '')}`.slice(0, 300);
}

function normalizeLink(linkItem = {}, fallback = null) {
  const source = linkItem && typeof linkItem === 'object' ? linkItem : {};
  const base = fallback || { label: '', labelAr: '', href: '', enabled: true, requiresAuth: false };
  return {
    label: clip(source.label ?? base.label, 80),
    labelAr: clip(source.labelAr ?? base.labelAr, 80),
    href: normalizeHref(source.href ?? base.href),
    enabled: typeof source.enabled === 'boolean' ? source.enabled : base.enabled !== false,
    requiresAuth: typeof source.requiresAuth === 'boolean' ? source.requiresAuth : base.requiresAuth === true,
  };
}

function normalizeColumn(columnItem = {}, fallback = null) {
  const source = columnItem && typeof columnItem === 'object' ? columnItem : {};
  const base = fallback || { title: '', titleAr: '', enabled: true, links: [] };
  const rawLinks = Array.isArray(source.links) ? source.links : base.links;
  const links = rawLinks
    .slice(0, 12)
    .map((item, index) => normalizeLink(item, base.links?.[index]))
    .filter((item) => item.label && item.href);
  return {
    title: clip(source.title ?? base.title, 60),
    titleAr: clip(source.titleAr ?? base.titleAr, 60),
    enabled: source.enabled !== false,
    links,
  };
}

export function normalizeFooter(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const defaults = DEFAULT_FOOTER;
  const socialSource = Array.isArray(source.socialLinks) ? source.socialLinks : defaults.socialLinks;
  const socialById = new Map(socialSource.map((item) => [String(item?.id || ''), item]));
  const columnsSource = Array.isArray(source.columns) && source.columns.length
    ? source.columns
    : defaults.columns;

  return {
    description: clip(source.description ?? defaults.description, 600) || defaults.description,
    descriptionAr: clip(source.descriptionAr ?? defaults.descriptionAr, 600),
    operatedBy: clip(source.operatedBy ?? defaults.operatedBy, 160) || defaults.operatedBy,
    operatedByAr: clip(source.operatedByAr ?? defaults.operatedByAr, 160),
    legalName: clip(source.legalName ?? defaults.legalName, 160) || defaults.legalName,
    legalNameAr: clip(source.legalNameAr ?? defaults.legalNameAr, 160),
    phone: digitsOnlyPhone(source.phone ?? defaults.phone) || defaults.phone,
    email: clip(source.email ?? defaults.email, 160) || defaults.email,
    registeredOfficeLabel: clip(source.registeredOfficeLabel ?? defaults.registeredOfficeLabel, 80) || defaults.registeredOfficeLabel,
    registeredOfficeLabelAr: clip(source.registeredOfficeLabelAr ?? defaults.registeredOfficeLabelAr, 80),
    registeredOffice: clip(source.registeredOffice ?? defaults.registeredOffice, 400),
    registeredOfficeAr: clip(source.registeredOfficeAr ?? defaults.registeredOfficeAr, 400),
    fulfilmentLabel: clip(source.fulfilmentLabel ?? defaults.fulfilmentLabel, 80) || defaults.fulfilmentLabel,
    fulfilmentLabelAr: clip(source.fulfilmentLabelAr ?? defaults.fulfilmentLabelAr, 80),
    fulfilmentAddress: clip(source.fulfilmentAddress ?? defaults.fulfilmentAddress, 400),
    fulfilmentAddressAr: clip(source.fulfilmentAddressAr ?? defaults.fulfilmentAddressAr, 400),
    copyright: clip(source.copyright ?? defaults.copyright, 500) || defaults.copyright,
    copyrightAr: clip(source.copyrightAr ?? defaults.copyrightAr, 500),
    paymentMethods: normalizePaymentMethods(source.paymentMethods),
    socialLinks: FOOTER_SOCIAL_IDS.map((id) => {
      const saved = socialById.get(id);
      const fallback = defaults.socialLinks.find((item) => item.id === id);
      return {
        id,
        url: clip(saved?.url ?? fallback?.url ?? '', 300),
        enabled: saved ? saved.enabled !== false : Boolean(fallback?.enabled),
      };
    }),
    columns: columnsSource
      .slice(0, 6)
      .map((item, index) => normalizeColumn(item, defaults.columns[index]))
      .filter((item) => item.title && item.links.length),
  };
}

function normalizePaymentMethods(sourceList) {
  const saved = Array.isArray(sourceList) ? sourceList : [];
  const byId = new Map(saved.map((item) => [String(item?.id || '').trim(), item]));
  const defaults = DEFAULT_PAYMENT_MARKS.map((item) => {
    const savedItem = byId.get(item.id);
    return {
      id: item.id,
      label: clip(savedItem?.label || item.label, 40) || item.label,
      image: clip(savedItem?.image || item.image, 500) || item.image,
      enabled: savedItem ? savedItem.enabled !== false : true,
    };
  });
  const extras = saved
    .filter((item) => item?.id && !FOOTER_PAYMENT_METHOD_IDS.includes(String(item.id)))
    .slice(0, 12)
    .map((item) => ({
      id: clip(item.id, 40),
      label: clip(item.label, 40) || 'Payment',
      image: clip(item.image, 500),
      enabled: item.enabled !== false,
    }))
    .filter((item) => item.id && item.image && item.label);
  return [...defaults, ...extras];
}

export function footerLines(value = '') {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function applyFooterTokens(template = '', { year, legalName } = {}) {
  return String(template || '')
    .replaceAll('{year}', String(year || new Date().getFullYear()))
    .replaceAll('{legalName}', String(legalName || ''));
}

export function footerPhoneHref(phone = '') {
  const digits = digitsOnlyPhone(phone);
  return digits ? `tel:${digits}` : '';
}

export function footerPhoneLabel(phone = '') {
  return formatCustomerSupportPhoneDisplay(phone);
}
