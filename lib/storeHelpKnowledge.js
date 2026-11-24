import { helpTextHasPhrase, listStoreHelpExportPages } from './storeHelpPages.js';

export const HAMODY_AUTHOR = 'Rohith Sagar M';

function normalizeKnowledgeText(question = '') {
  return String(question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getStoreWebsiteFacts() {
  return {
    brand: 'HAMODY',
    legalName: 'ALTHAKEEL GENERAL TRADING L.L.C',
    legalNameAr: 'الثقيل للتجارة العامة ش.ذ.م.م',
    about: 'HAMODY is a UAE online store for smart living at smarter prices. Public About Us is /about-us.',
    storefront: 'The public storefront is bilingual English and Arabic, with RTL for Arabic.',
    dashboard: 'The seller dashboard at /store is English and LTR only.',
    categoryBanners: 'Category banners are on /store/categories. Edit a category and upload English and Arabic images: desktop 1440×320, tablet 1024×320, mobile 768×280. The banner sits under the breadcrumb. The square category thumbnail stays beside the title. Uploading a banner does not replace the thumbnail. Save the category after upload.',
    navbar: 'Navbar logo, color, font, and extra buttons are on /store/menu-management → Look. Extra buttons sit next to LAST CHANCE (up to 3). Each button is a single link or a dropdown. A link or dropdown item can open an existing page, a brand, a category, a product, or a custom URL, with an English name and an Arabic name. Menu links controls the black category bar: auto parent categories or choose manually, drag to reorder, and hover subcategories. Click Save.',
    homepagePopup: 'The homepage popup is Customize → Homepage popup (/store/customize/home-popup). Turn Popup is showing on, pick the Live design, and Save. You can keep several templates. Tabs: Look (layout, images, colors), Blocks (drag gift, heading, offer, description, coupon code with copy, email signup, button), Text (English and Arabic, plus Translate to Arabic), When it shows (delay in seconds, pages, max width, hide for this visit, 1 hour, 2 hours, 1 day, or 7 days). The top counts opens, emails, coupon copies, and button clicks. It stays off until you save with it showing.',
    homepageBanners: 'Homepage sliders are on /store/storefront/carousel-slider. The wide homepage banner and Banner 2 are in Banner section - Home at /store/preferences. Publish after upload; adding an image does not go live until Publish.',
    coupons: 'Store coupons are on /store/coupons. The homepage popup can also show a coupon code with a copy button; that code is typed on the popup template, it is not created on the Coupons page.',
    orders: 'All orders are on /store/orders. Pickup jobs are on /store/todays-pickup. Sales totals are on /store/sales-report. Ask me for this month’s sales and I will use live numbers after the PIN.',
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
  if (/\b(founder|creator|developer|programmer)\b/.test(text) && /\b(hamody|hamody|this store|this website|this site|the store|the website)\b/.test(text)) {
    return true;
  }
  return false;
}

export function getStoreAuthorReply() {
  return {
    answer: `The author of HAMODY is ${HAMODY_AUTHOR}.`,
    links: [],
  };
}

export function isStoreOwnerQuestion(question = '') {
  const text = normalizeKnowledgeText(question);
  if (!text || isStoreAuthorQuestion(question)) return false;
  if (/\bowners?\b/.test(text)) return true;
  return /\b(who|whois)\b/.test(text) && /\b(owns|owned)\b/.test(text);
}

export function getStoreOwnerReply() {
  return {
    answer: 'The legal owner of this store is ALTHAKEEL GENERAL TRADING L.L.C. You can find more about the store on the public About Us page at /about-us.',
    links: [{ label: 'About Us', href: '/about-us' }],
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
    answer: `The public website has ${publicCount} main pages (shop, About Us, Blogs, Return Policy, and Business information). The seller dashboard has ${dashboardCount} pages I can open — orders, products, banners, shipping, customers, and reports.`,
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
      'what is hamody',
      'what is hamody',
      'about hamody',
      'about hamody',
      'about us',
      'who we are',
      'what is this store',
      'what is this website',
      'tell me about hamody',
      'tell me about hamody',
      'tell me about this store',
    ],
    answer: 'HAMODY is a UAE online store for smart living at smarter prices. The public About Us page explains the brand.',
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
    answer: 'The legal owner is ALTHAKEEL GENERAL TRADING L.L.C (trade license 641210), registered in Dubai, with fulfilment in Sharjah.',
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
      'categories button',
      'categories text',
      'change categories',
      'rename categories',
      'new arrivals',
    ],
    answer: 'Navbar logo, color, and Same font are on Menu Management → Look. Extra buttons next to LAST CHANCE are there too, up to 3. Choose Single link or Dropdown. Each link can be an existing page, brand, category, product, or a custom URL, with English and Arabic names. Click Save.',
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
      'hover dropdown',
      'subcategories',
      'submenu',
    ],
    answer: 'The black category bar is on Menu Management → Menu links. Use Show category bar to hide the whole bar. Under Category bar links, choose Auto parent categories or Choose manually. In Choose manually, drag a row to reorder the bar, then add subcategories under each name. Those subs show in the hover menu on the storefront. You can also slide the bar and pick its background color.',
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
    answer: 'Homepage sliders are in Carousel Settings. The wide homepage banner and Banner 2 are in Banner section - Home. Uploads stay draft until you click Publish.',
    links: [
      { label: 'Carousel Settings', href: '/store/storefront/carousel-slider' },
      { label: 'Banner section - Home', href: '/store/preferences' },
    ],
  },
  {
    id: 'category-banners',
    keywords: [
      'category banner',
      'category banners',
      'desktop banner',
      'tablet banner',
    ],
    answer: 'Open Categories, edit the category, and upload English and Arabic banners: desktop 1440×320, tablet 1024×320, and mobile 768×280. The banner shows under the breadcrumb. The square thumbnail stays beside the title and is not replaced by the banner. Save the category.',
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
    answer: 'Cards are not stored on Hamody. Checkout uses hosted gateways with 3DS. Refund dual-control and logs are explained on Payment Security.',
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
    answer: 'I can explain how this dashboard works: homepage popup, navbar buttons, category banners, coupons, shipping limits, orders, and pickups. I can also look up sales, an order number, a product, or customers after the PIN. I am read-only and cannot change settings.',
    links: [{ label: 'Sales Report', href: '/store/sales-report' }],
  },
  {
    id: 'homepage-popup',
    keywords: [
      'homepage popup',
      'welcome popup',
      'home popup',
      'popup template',
      'email popup',
      'discount popup',
      'coupon popup',
      'popup on home',
    ],
    answer: 'Open Customize → Homepage popup. Turn on Popup is showing, choose the Live design, then Save. Look sets the layout and colors. Blocks lets you drag the coupon (with a copy button) and the email signup on or off. Text has English and Arabic, and Translate to Arabic fills the Arabic boxes. When it shows sets the wait in seconds, which pages open it, the max width, and how long it stays hidden (every visit, this visit, 1 hour, 2 hours, 1 day, or 7 days). The top row counts opens, emails, copies, and clicks.',
    links: [{ label: 'Homepage popup', href: '/store/customize/home-popup' }],
  },
  {
    id: 'navbar-dropdown',
    keywords: [
      'dropdown button',
      'navbar dropdown',
      'extra button',
      'last chance button',
      'custom url navbar',
      'add navbar link',
      'brand in navbar',
    ],
    answer: 'On Menu Management → Look, use Buttons next to LAST CHANCE. Add a button, name it in English and Arabic, then choose Single link or Dropdown. A dropdown item needs its own English name, Arabic name, and a link: existing page, brand, category, product, or a custom URL you type. Save the menu. On the store, the dropdown opens when the customer hovers the button.',
    links: [{ label: 'Menu Management', href: '/store/menu-management' }],
  },
  {
    id: 'coupons',
    keywords: [
      'create coupon',
      'add coupon',
      'discount code',
      'promo code',
      'coupon code',
    ],
    answer: 'Create checkout coupons on Coupons. A coupon shown inside the homepage popup is different: type that code on Customize → Homepage popup, turn on the Coupon code block, and customers can copy it. That popup code is not created on the Coupons page unless you also add it there.',
    links: [
      { label: 'Coupons', href: '/store/coupons' },
      { label: 'Homepage popup', href: '/store/customize/home-popup' },
    ],
  },
  {
    id: 'email-marketing',
    keywords: [
      'email campaign',
      'send email',
      'newsletter campaign',
      'promotional email',
      'scheduled email',
    ],
    answer: 'Campaign emails are in Email Marketing. Send now runs immediately. A scheduled campaign waits for the minute it is due and sends in batches. If a large send is cut off, the rest stay unsent until the job runs again. Popup email signups are saved as welcome leads, separate from a campaign.',
    links: [{ label: 'Email Marketing', href: '/store/email-marketing' }],
  },
  {
    id: 'inventory-help',
    keywords: [
      'update stock',
      'google sheet stock',
      'bulk stock',
      'change sku stock',
      'inventory sheet',
    ],
    answer: 'Stock and SKUs are on Inventory. Sync writes the Google Sheet. Apply from Google Sheet or Excel updates stock, supplier, and brand only. SKU and product name are not changed. A supplier name that does not exist yet is created.',
    links: [{ label: 'Inventory', href: '/store/inventory' }],
  },
  {
    id: 'offers-delete',
    keywords: [
      'delete offer',
      'personalized offer',
      'promotional offer',
      'remove offer',
    ],
    answer: 'Promotional offers are on Promotional Offers. Deleting one asks in an on-page dialog, not a browser alert. Confirm Delete offer to remove it.',
    links: [{ label: 'Promotional Offers', href: '/store/personalized-offers' }],
  },
];

export function matchStoreHelpKnowledge(question = '') {
  if (isStoreAuthorQuestion(question)) {
    return getStoreAuthorReply();
  }

  if (isStoreOwnerQuestion(question)) {
    return getStoreOwnerReply();
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
    const matched = item.keywords.filter((keyword) => helpTextHasPhrase(text, keyword));
    const score = matched.reduce((sum, keyword) => sum + keyword.length, 0);
    const specificity = matched.reduce((max, keyword) => Math.max(max, keyword.length), 0);
    const better = !best
      || specificity > best.specificity
      || (specificity === best.specificity && score > best.score);
    if (score > 0 && better) best = { ...item, score, specificity };
  }

  if (!best || best.score < 8) return null;
  return {
    answer: best.answer,
    links: best.links || [],
  };
}
