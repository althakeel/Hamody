import { listStoreHelpExportPages } from './storeHelpPages.js';

export const STORE1920_AUTHOR = 'Rohith Sagar M';

function normalizeKnowledgeText(question = '') {
  return String(question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getStoreWebsiteFacts() {
  return {
    author: STORE1920_AUTHOR,
    brand: 'Store1920',
    legalName: 'ALTHAKEEL GENERAL TRADING L.L.C',
    legalNameAr: 'الثقيل للتجارة العامة ش.ذ.م.م',
    about: 'Store1920 is a UAE online store for smart living at smarter prices. Public About Us is /about-us.',
    storefront: 'The public storefront is bilingual English and Arabic, with RTL for Arabic.',
    dashboard: 'The seller dashboard at /store is English and LTR only.',
    categoryBanners: 'Category banners are uploaded on /store/categories. Each category can have desktop, tablet, and mobile banners in English and Arabic. Banners show under the breadcrumb; the category thumbnail hides when a banner is set.',
    navbar: 'Navbar look, logo, color, extra buttons, and “Same font for all navbar text” are on /store/menu-management under Look. Menu links and Use parent categories are on the Menu links tab. The category bar can slide and has its own background color.',
    homepageBanners: 'Homepage sliders are on /store/storefront/carousel-slider. Large showcase, full-width, and lower full-width banners are on /store/customize/showcase-banners or Banner section - Home in Preferences. Publish after upload; adding an image does not go live until Publish.',
    returns: 'The public return policy is /return-policy. Eligible unused items can be returned within 7 days. Free return shipping is only for wrong, damaged, defective, or not-as-described items.',
    payments: 'Checkout can use COD, card, Tabby, and Tamara. Payment limits and hiding Tabby, Tamara, or Card are set on /store/shipping.',
    shipping: 'Shipping settings and max payment amounts are on /store/shipping.',
    blogs: 'Public blogs are /blogs. Sellers write blogs on /store/blogs with a rich editor and S3 images.',
    spinWheel: 'The storefront spin wheel campaign is edited on /store/spin-wheel.',
    paymentSecurity: 'Payment security, 3DS, and refund dual-control notes are on /store/payment-security. Cards are not stored on the site.',
    contact: 'Customer support details are on the public About Us and business information pages.',
  };
}

export function isStoreAuthorQuestion(question = '') {
  const text = normalizeKnowledgeText(question);
  if (!text) return false;
  if (/\bauthor\b/.test(text)) return true;
  if (/\b(who|whois)\b/.test(text) && /\b(made|created|built|developed|coded|wrote|founder|creator|developer)\b/.test(text)) {
    return true;
  }
  if (/\b(founder|creator|developer|programmer)\b/.test(text) && /\b(store1920|this store|this website|this site|the store|the website)\b/.test(text)) {
    return true;
  }
  return false;
}

export function getStoreAuthorReply() {
  return {
    answer: `The author of Store1920 is ${STORE1920_AUTHOR}.`,
    links: [],
  };
}

export function isWebsitePageCountQuestion(question = '') {
  const text = normalizeKnowledgeText(question);
  if (!text) return false;
  if (/\b(sales|revenue|order|orders|customer|product|sku|delivered)\b/.test(text)) return false;
  return /\b(how many|number of|count)\b/.test(text) && /\bpages?\b/.test(text);
}

export function getWebsitePagesReply() {
  const pages = listStoreHelpExportPages();
  const publicCount = pages.filter((page) => page.section === 'Public').length;
  const dashboardCount = pages.filter((page) => page.section === 'Dashboard').length;
  return {
    answer: `The public website has ${publicCount} main pages (shop, About Us, Blogs, Return Policy, and Business information). The seller dashboard has ${dashboardCount} pages I can open — orders, products, banners, shipping, customers, and reports. Use Excel or PDF below to download the full page list.`,
    links: [
      { label: 'About Us', href: '/about-us' },
      { label: 'Blogs', href: '/blogs' },
      { label: 'Return Policy', href: '/return-policy' },
    ],
  };
}

const STORE_HELP_KNOWLEDGE = [
  {
    id: 'about',
    keywords: [
      'what is store1920',
      'about store1920',
      'about us',
      'who we are',
      'what is this store',
      'what is this website',
      'tell me about store1920',
      'tell me about this store',
    ],
    answer: `Store1920 is a UAE online store for smart living at smarter prices. The public About Us page explains the brand. The author of Store1920 is ${STORE1920_AUTHOR}.`,
    links: [{ label: 'About Us', href: '/about-us' }],
  },
  {
    id: 'legal',
    keywords: [
      'legal name',
      'trade license',
      'althakeel',
      'who owns the company',
      'company name',
      'business information',
    ],
    answer: 'The legal owner is ALTHAKEEL GENERAL TRADING L.L.C (trade license 641210), registered in Dubai, with fulfilment in Sharjah. The author of Store1920 is Rohith Sagar M.',
    links: [{ label: 'Business information', href: '/business-information' }],
  },
  {
    id: 'returns',
    keywords: [
      'return policy',
      'refund policy',
      'how returns work',
      'return window',
    ],
    answer: 'The public return policy is on Return Policy. Eligible unused items can be returned within 7 days. Free return shipping is only for wrong, damaged, defective, or not-as-described items. Store return requests are on Returns & Replacements.',
    links: [
      { label: 'Return Policy', href: '/return-policy' },
      { label: 'Returns & Replacements', href: '/store/return-requests' },
    ],
  },
  {
    id: 'languages',
    keywords: [
      'arabic dashboard',
      'dashboard language',
      'storefront language',
      'english only',
      'rtl dashboard',
    ],
    answer: 'The public storefront is English and Arabic. The seller dashboard under /store stays English and left-to-right. Arabic fields are for storefront content only.',
    links: [{ label: 'Store settings', href: '/store/settings' }],
  },
  {
    id: 'navbar-look',
    keywords: [
      'navbar color',
      'navbar font',
      'same font',
      'change navbar',
      'header color',
      'logo size',
      'under 99 font',
    ],
    answer: 'Navbar logo, color, extra buttons, and Same font for all navbar text are on Menu Management → Look. Turn on Same font to override per-item fonts, then click Save.',
    links: [{ label: 'Menu Management', href: '/store/menu-management' }],
  },
  {
    id: 'navbar-menu',
    keywords: [
      'parent categories',
      'category bar',
      'menu links',
      'navbar slider',
      'category bar color',
      'use parent categories',
    ],
    answer: 'The black category bar is on Menu Management → Menu links. Use parent categories builds it from top-level categories. You can slide the bar, pick its background color, and hide chips. Click Save after color or chip changes.',
    links: [{ label: 'Menu Management', href: '/store/menu-management' }],
  },
  {
    id: 'homepage-banners',
    keywords: [
      'full width banner',
      'homepage banner',
      'main banner',
      'showcase banner',
      'lower full width',
      'publish banner',
    ],
    answer: 'Homepage sliders are in Carousel Settings. Full-width and showcase banners are in Showcase banners / Banner section - Home. Uploads stay draft until you click Publish.',
    links: [
      { label: 'Carousel Settings', href: '/store/storefront/carousel-slider' },
      { label: 'Showcase banners', href: '/store/customize/showcase-banners' },
    ],
  },
  {
    id: 'category-banners',
    keywords: [
      'category banner',
      'category banners',
      'desktop banner',
      'tablet banner',
      'mobile banner',
    ],
    answer: 'Category banners are on Categories. Edit a category and upload English and Arabic images for desktop 1440×320, tablet 1024×320, and mobile 768×280. A set banner hides the category thumbnail.',
    links: [{ label: 'Categories', href: '/store/categories' }],
  },
  {
    id: 'shipping-payments',
    keywords: [
      'cod limit',
      'max payment',
      'hide tabby',
      'hide tamara',
      'checkout limit',
      'payment method limit',
    ],
    answer: 'Shipping zones and max amounts for COD, Card, Tabby, and Tamara are on Shipping. Methods over the limit are hidden at checkout.',
    links: [{ label: 'Shipping', href: '/store/shipping' }],
  },
  {
    id: 'pickups',
    keywords: [
      'pickup list',
      'todays pickup',
      'waiting pickup',
      'pickup excel',
    ],
    answer: 'Pickup jobs, overdue pickups, and pickup Excel export are on the Pickup list.',
    links: [{ label: 'Pickup list', href: '/store/todays-pickup' }],
  },
  {
    id: 'blogs',
    keywords: [
      'write a blog',
      'add blog',
      'blog page',
      'store blogs',
    ],
    answer: 'Write store blogs on Blogs. The public list is /blogs. The editor supports headings, fonts, and S3 images you can drag to reorder.',
    links: [{ label: 'Blogs', href: '/store/blogs' }],
  },
  {
    id: 'spin',
    keywords: [
      'spin wheel',
      'spin the wheel',
      'lucky wheel',
    ],
    answer: 'The storefront spin-wheel campaign, prizes, and eligibility are on Spin Wheel.',
    links: [{ label: 'Spin Wheel', href: '/store/spin-wheel' }],
  },
  {
    id: 'payment-security',
    keywords: [
      'payment security',
      'store cards',
      '3ds',
      'pci',
    ],
    answer: 'Cards are not stored on Store1920. Checkout uses hosted gateways with 3DS. Refund dual-control and logs are explained on Payment Security.',
    links: [{ label: 'Payment Security', href: '/store/payment-security' }],
  },
  {
    id: 'help-scope',
    keywords: [
      'what can you do',
      'what can you check',
      'how do you help',
      'what do you know',
    ],
    answer: 'I can explain this website, point you to a dashboard page, look up sales, an order number, a product, or pickups. I am read-only and cannot change settings.',
    links: [{ label: 'Sales Report', href: '/store/sales-report' }],
  },
];

export function matchStoreHelpKnowledge(question = '') {
  if (isStoreAuthorQuestion(question)) {
    return getStoreAuthorReply();
  }

  if (isWebsitePageCountQuestion(question)) {
    return getWebsitePagesReply();
  }

  const text = normalizeKnowledgeText(question);
  if (/\bhow many\b|\bhow much\b|\bunits sold\b|\brevenue\b|\bdelivered\b/.test(text)) {
    return null;
  }
  if (/\b(download|excel|pdf|export)\b/.test(text) && /\b(sale|order|customer|revenue|deliver|detail)\b/.test(text)) {
    return null;
  }
  if (/\b(?:named|called)\s+[a-z]{3,}/.test(text) && /\b(?:customer|customers|buyer|buyers|guest|guests)\b/.test(text)) {
    return null;
  }
  if (!text) return null;

  let best = null;
  for (const item of STORE_HELP_KNOWLEDGE) {
    const score = item.keywords.reduce((sum, keyword) => (
      text.includes(keyword) ? sum + keyword.length : sum
    ), 0);
    if (score > (best?.score || 0)) {
      best = { ...item, score };
    }
  }

  if (!best || best.score < 8) return null;
  return {
    answer: best.answer,
    links: best.links || [],
  };
}
