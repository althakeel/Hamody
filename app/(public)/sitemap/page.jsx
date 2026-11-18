import Link from 'next/link';
import { getHtmlSitemapData } from '@/lib/htmlSitemapData';
import SitemapProductsSection from '@/components/SitemapProductsSection';
import { HAMODY_BRAND_NAME } from '@/lib/brandLogo';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sitemap | Hamody',
  description:
    'Find the main pages, collections, products, help, and policies on hamody.com.',
};

const NAV_LABELS = {
  shop: 'Shop',
  categories: 'Collections',
  brands: 'Brands',
  products: 'Products',
  account: 'Cart',
  help: 'Help',
  policies: 'Policies',
  about: 'About',
};

function SectionBlock({ section }) {
  const links = Array.isArray(section.links) ? section.links : [];

  return (
    <section id={`sitemap-${section.id}`} className="scroll-mt-28">
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-[#E2E7E8] pb-2">
        <h2 className="text-lg font-semibold tracking-tight text-[#05090D]">{section.title}</h2>
        {links.length > 0 ? (
          <p className="shrink-0 text-xs text-[#5E6870]">
            {links.length.toLocaleString()} {links.length === 1 ? 'page' : 'pages'}
          </p>
        ) : null}
      </div>

      {links.length === 0 ? (
        <p className="text-sm leading-6 text-[#5E6870]">{section.emptyMessage || 'Nothing listed yet.'}</p>
      ) : (
        <ul className={links.some((link) => Number(link.depth) > 0)
          ? 'space-y-1'
          : 'grid max-w-4xl grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3'}>
          {links.map((link) => {
            const depth = Number(link.depth) || 0;
            return (
              <li
                key={`${section.id}-${link.path}`}
                className="min-w-0"
                style={depth > 0 ? { paddingInlineStart: `${Math.min(depth, 3) * 1}rem` } : undefined}
              >
                <Link
                  href={link.path || '#'}
                  className="inline-block py-1 text-sm leading-5 text-[#05090D] transition hover:text-[#05090D]"
                  title={link.description || link.text}
                >
                  {depth > 0 ? <span className="me-1.5 text-[#C8F404]">–</span> : null}
                  {link.text}
                </Link>
                {link.description ? (
                  <p className="pb-1 text-xs leading-5 text-[#5E6870]">{link.description}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default async function SitemapPage() {
  let sections = [];
  let products = { initialLinks: [], total: 0, page: 1, limit: 50, hasMore: false };
  let stats = { categories: 0, brands: 0, products: 0, blogs: 0 };

  try {
    const data = await getHtmlSitemapData();
    sections = data.sections || [];
    products = data.products || products;
    stats = data.stats || stats;
  } catch (error) {
    console.error('[sitemap page]', error);
  }

  const beforeProducts = sections.filter((section) => (
    section.id === 'shop' || section.id === 'categories' || section.id === 'brands'
  ));
  const afterProducts = sections.filter((section) => (
    section.id !== 'shop' && section.id !== 'categories' && section.id !== 'brands'
  ));

  const navItems = [
    ...beforeProducts.map((section) => ({ id: section.id, label: NAV_LABELS[section.id] || section.title })),
    { id: 'products', label: 'Products' },
    ...afterProducts.map((section) => ({ id: section.id, label: NAV_LABELS[section.id] || section.title })),
  ];

  return (
    <div className="min-h-screen bg-white text-[#05090D]">
      <header className="relative overflow-hidden bg-[#05090D] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 20%, rgba(200,244,4,0.22), transparent 42%), radial-gradient(circle at 88% 10%, rgba(255,255,255,0.08), transparent 35%), linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative mx-auto max-w-[1280px] px-4 py-14 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C8F404]">
            {HAMODY_BRAND_NAME}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            Site map
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[#C8F404] md:text-lg">
            Follow the same path as the store: shop, collections, products, cart, then help and policies.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {[
              { label: 'Collections', value: stats.categories },
              { label: 'Brands', value: stats.brands },
              { label: 'Products', value: stats.products },
              { label: 'Posts', value: stats.blogs },
            ].filter((item) => item.label !== 'Posts' || Number(item.value) > 0).map((item) => (
              <div
                key={item.label}
                className="rounded-full border border-[#E2E7E8]/40 bg-white/10 px-4 py-2 text-sm text-[#C8F404] backdrop-blur-sm"
              >
                <span className="font-semibold text-white">{Number(item.value || 0).toLocaleString()}</span>
                <span className="ms-2 text-[#C8F404]">{item.label}</span>
              </div>
            ))}
          </div>

        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E6870]">Jump to</p>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#sitemap-${item.id}`}
                className="shrink-0 rounded-full border border-[#E2E7E8] bg-white px-3 py-1.5 text-sm text-[#05090D] transition hover:border-[#05090D] hover:text-[#05090D] lg:rounded-lg lg:border-transparent lg:bg-transparent lg:px-2 lg:py-1.5 lg:hover:bg-[#F8FAFA]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-10">
          {beforeProducts.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}

          <SitemapProductsSection
            initialLinks={products.initialLinks}
            total={products.total}
            initialPage={products.page}
            pageSize={products.limit}
            initialHasMore={products.hasMore}
          />

          {afterProducts.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}

          <section className="border-t border-[#E2E7E8] pt-10">
            <h3 className="text-xl font-semibold text-[#05090D]">Can&apos;t find a page?</h3>
            <p className="mt-2 max-w-xl text-[#5E6870]">
              Support can help you find a product, an order, or a policy.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/support"
                className="rounded-lg bg-[#C8F404] px-5 py-2.5 text-sm font-semibold text-[#05090D] transition hover:bg-[#ADD300]"
              >
                Contact support
              </Link>
              <Link
                href="/help"
                className="rounded-lg border border-[#05090D] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#05090D] transition hover:bg-[#C8F404] hover:text-[#05090D]"
              >
                Help center
              </Link>
              <Link
                href="/"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-[#5E6870] transition hover:text-[#05090D]"
              >
                ← Home
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
