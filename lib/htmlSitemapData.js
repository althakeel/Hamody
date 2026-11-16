import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import Blog from '@/models/Blog';
import { getAllActiveCategories, getPublishedCategoryProductCounts } from '@/lib/categoryPageData';
import { categoryProductCount } from '@/lib/categoryProductStats';
import { buildCategoryUrl } from '@/lib/categorySlug';
import { getProductPath } from '@/lib/productUrl';
import { STOREFRONT_PUBLISHED_FILTER } from '@/lib/productVisibility';
import { resolveProductSlugRedirect } from '@/lib/productRedirects';
import { buildBrandSitemapEntries, isPublicSitemapBlog } from '@/lib/sitemapData';
import { decodeHtmlEntities } from '@/lib/displayText';
import { isStorefrontWalletEnabled } from '@/lib/storefrontWallet';

/** First page size for HTML sitemap products (more load on scroll). */
export const HTML_SITEMAP_PRODUCT_PAGE_SIZE = 50;

/** @deprecated Prefer paginated HTML_SITEMAP_PRODUCT_PAGE_SIZE */
export const HTML_SITEMAP_PRODUCT_LIMIT = HTML_SITEMAP_PRODUCT_PAGE_SIZE;

const HIDDEN_SITEMAP_SLUGS = new Set(['home-living']);

function isHiddenSitemapCategory(allCategories, category) {
  let current = category;
  const seen = new Set();
  while (current) {
    const id = String(current._id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    if (HIDDEN_SITEMAP_SLUGS.has(String(current.slug || '').trim().toLowerCase())) return true;
    const parentId = String(current.parentId || '');
    current = parentId
      ? allCategories.find((item) => String(item._id) === parentId)
      : null;
  }
  return false;
}

function buildCategoryChain(allCategories, category) {
  const chain = [];
  let current = category;
  while (current) {
    if (!String(current.slug || '').trim()) return null;
    chain.unshift(current);
    const parentId = String(current.parentId || '');
    current = parentId
      ? allCategories.find((item) => String(item._id) === parentId)
      : null;
  }
  return chain;
}

export async function getHtmlSitemapBrandLinks() {
  const entries = await buildBrandSitemapEntries();
  return entries.map((entry) => {
    const path = String(entry.url || '').replace(/^https?:\/\/[^/]+/i, '') || '/brand';
    const slug = path.split('/').filter(Boolean).pop() || 'Brand';
    return {
      text: String(entry.name || '').trim() || slug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      path,
    };
  });
}

export async function getHtmlSitemapCategoryLinks() {
  const [allCategories, counts] = await Promise.all([
    getAllActiveCategories(),
    getPublishedCategoryProductCounts(),
  ]);
  const links = [];
  const seen = new Set();
  const ids = new Set(allCategories.map((category) => String(category._id)));
  const byParent = new Map();

  const compareCategories = (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    || String(a.name || '').localeCompare(String(b.name || ''));

  for (const category of allCategories) {
    const parentId = String(category.parentId || '');
    const key = parentId && ids.has(parentId) ? parentId : '';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(category);
  }
  for (const list of byParent.values()) list.sort(compareCategories);

  const pushCategory = (category) => {
    if (isHiddenSitemapCategory(allCategories, category)) return;
    if (categoryProductCount(counts, category._id) > 0) {
      const chain = buildCategoryChain(allCategories, category);
      const path = chain?.length ? buildCategoryUrl(chain) : '';
      if (path && path !== '/shop' && !seen.has(path)) {
        seen.add(path);
        links.push({
          text: decodeHtmlEntities(category.name || category.slug || 'Category'),
          path,
          depth: Math.max(0, (category.level || chain.length) - 1),
        });
      }
    }
    for (const child of byParent.get(String(category._id)) || []) pushCategory(child);
  };

  for (const category of byParent.get('') || []) pushCategory(category);

  return links;
}

export async function getHtmlSitemapBlogLinks() {
  await connectDB();
  const now = new Date();
  const blogs = await Blog.find({
    status: 'published',
    slug: { $exists: true, $nin: ['', null] },
    $or: [{ publishedAt: { $lte: now } }, { publishedAt: null }],
  })
    .select('title slug excerpt contentHtml publishedAt updatedAt')
    .sort({ publishedAt: -1, updatedAt: -1 })
    .lean();

  const seen = new Set();
  return blogs
    .map((blog) => {
      const slug = String(blog.slug || '').trim();
      if (!slug || seen.has(slug) || !isPublicSitemapBlog(blog)) return null;
      seen.add(slug);
      return {
        text: decodeHtmlEntities(blog.title || slug),
        path: `/blogs/${slug}`,
      };
    })
    .filter(Boolean);
}

export async function getHtmlSitemapStoreLinks() {
  return [];
}

export async function getHtmlSitemapProductLinks({
  page = 1,
  limit = HTML_SITEMAP_PRODUCT_PAGE_SIZE,
} = {}) {
  await connectDB();
  const filter = {
    ...STOREFRONT_PUBLISHED_FILTER,
    slug: { $exists: true, $nin: ['', null] },
  };

  const safeLimit = Math.min(100, Math.max(1, Number(limit) || HTML_SITEMAP_PRODUCT_PAGE_SIZE));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .select('name slug useProductsPath updatedAt')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
  ]);

  const seen = new Set();
  const links = products
    .map((product) => {
      const slug = String(product.slug || '').trim();
      if (!slug || resolveProductSlugRedirect(slug)) return null;
      const path = getProductPath(product);
      if (!path || path === '/shop' || seen.has(path)) return null;
      seen.add(path);
      return {
        text: decodeHtmlEntities(product.name || slug),
        path,
      };
    })
    .filter(Boolean);

  const loadedThrough = skip + links.length;
  const hasMore = loadedThrough < total;

  return {
    links,
    total,
    shown: links.length,
    page: safePage,
    limit: safeLimit,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
  };
}

function accountLinks() {
  const links = [
    { text: 'Shopping Cart', path: '/cart' },
    { text: 'My Wishlist', path: '/wishlist' },
    { text: 'Track Order', path: '/track-order' },
    { text: 'My Orders', path: '/dashboard/orders' },
    { text: 'Sign In', path: '/sign-in' },
    { text: 'Sign Up', path: '/sign-up' },
    { text: 'My Profile', path: '/dashboard/profile' },
  ];
  if (isStorefrontWalletEnabled()) {
    links.push({ text: 'My Wallet', path: '/wallet' });
  }
  return links;
}

/**
 * Full HTML sitemap payload from live MongoDB (same sources as XML sitemaps).
 */
export async function getHtmlSitemapData() {
  const emptyProducts = {
    links: [],
    total: 0,
    shown: 0,
    page: 1,
    limit: HTML_SITEMAP_PRODUCT_PAGE_SIZE,
    hasMore: false,
    nextPage: null,
  };

  let categoryLinks = [];
  let brandLinks = [];
  let blogLinks = [];
  let productData = emptyProducts;

  try {
    [categoryLinks, brandLinks, blogLinks, productData] = await Promise.all([
      getHtmlSitemapCategoryLinks().catch(() => []),
      getHtmlSitemapBrandLinks().catch(() => []),
      getHtmlSitemapBlogLinks().catch(() => []),
      getHtmlSitemapProductLinks({ page: 1, limit: HTML_SITEMAP_PRODUCT_PAGE_SIZE }).catch(() => emptyProducts),
    ]);
  } catch {
    categoryLinks = [];
    brandLinks = [];
    blogLinks = [];
    productData = emptyProducts;
  }

  const seenPaths = new Set();
  const uniqueLinks = (links = []) => links.filter((link) => {
    const path = String(link?.path || '').trim();
    if (!path || seenPaths.has(path)) return false;
    seenPaths.add(path);
    return true;
  });

  const sections = [
    {
      id: 'shop',
      title: 'Shop',
      links: uniqueLinks([
        { text: 'Home', path: '/' },
        { text: 'All Products', path: '/shop' },
        { text: 'Collections', path: '/categories' },
        { text: "Today's Deals", path: '/offers' },
        { text: 'New Arrivals', path: '/new-arrivals' },
        { text: 'Contact Us', path: '/contact-us' },
      ]),
    },
    {
      id: 'categories',
      title: 'Collections',
      links: uniqueLinks(categoryLinks),
      emptyMessage: 'No active categories yet.',
    },
    {
      id: 'brands',
      title: 'Brands',
      links: uniqueLinks(brandLinks),
      emptyMessage: 'No brand pages yet.',
    },
    {
      id: 'account',
      title: 'Cart & account',
      links: uniqueLinks(accountLinks()),
    },
    {
      id: 'help',
      title: 'Help',
      links: uniqueLinks([
        { text: 'FAQ', path: '/faq' },
        { text: 'Support', path: '/support' },
        { text: 'Help Center', path: '/help' },
        { text: 'Return request', path: '/return-request' },
      ]),
    },
    {
      id: 'policies',
      title: 'Policies',
      links: uniqueLinks([
        { text: 'Terms & Conditions', path: '/terms-and-conditions' },
        { text: 'Terms of Sale', path: '/terms-of-sale' },
        { text: 'Shipping Policy', path: '/shipping-policy' },
        { text: 'Privacy Policy', path: '/privacy-policy' },
        { text: 'Cookie Policy', path: '/cookie-policy' },
        { text: 'Return, Refund & Cancellation Policy', path: '/return-policy' },
        { text: 'Warranty Policy', path: '/warranty-policy' },
        { text: 'Sitemap', path: '/sitemap' },
      ]),
    },
    {
      id: 'about',
      title: 'About',
      links: uniqueLinks([
        { text: 'About Us', path: '/about-us' },
        { text: 'Blog', path: '/blogs' },
        ...blogLinks,
        { text: 'Business Information', path: '/business-information' },
        { text: 'Careers', path: '/careers' },
        { text: 'Payment & Pricing', path: '/payment-and-pricing' },
      ]),
    },
  ];

  return {
    sections,
    products: {
      initialLinks: productData.links,
      total: productData.total,
      page: productData.page,
      limit: productData.limit,
      hasMore: productData.hasMore,
      nextPage: productData.nextPage,
    },
    stats: {
      categories: categoryLinks.filter((link) => !Number(link.depth)).length,
      brands: brandLinks.length,
      products: productData.total,
      productsShown: productData.shown,
      blogs: blogLinks.length,
    },
  };
}
