import Link from 'next/link';

export const metadata = {
  title: 'Page not found',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
};

const TOP_CATEGORIES = [
  { name: 'Electronics', href: '/category/electronics' },
  { name: 'Home & Living', href: '/category/home-living' },
  { name: 'Beauty & Personal Care', href: '/category/beauty-personal-care' },
  { name: 'Fashion & Accessories', href: '/category/fashion-accessories' },
  { name: 'Pets & Pet Supplies', href: '/category/pets-pet-supplies' },
  { name: 'Bags & Luggage', href: '/category/bags-luggage' },
  { name: 'Sports & Fitness', href: '/category/sports-fitness' },
  { name: 'Baby, Kids & Maternity', href: '/category/baby-kids-maternity' },
];

export default function NotFound() {
  return (
    <main className="w-full flex-1 bg-white text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-sm font-semibold tracking-[0.18em] text-slate-500">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">This page does not exist</h1>
        <p className="mt-3 max-w-xl text-base text-slate-600">The link is out of date or mistyped. Search the store, or browse a category.</p>

        <form action="/shop" method="get" className="mt-8 flex w-full max-w-xl gap-2">
          <label className="sr-only" htmlFor="not-found-search">Search products</label>
          <input
            id="not-found-search"
            name="search"
            type="search"
            required
            placeholder="Search products"
            className="h-12 min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900"
          />
          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>

        <Link href="/" className="mt-5 inline-flex w-fit text-sm font-semibold text-slate-900 underline underline-offset-4">
          Back to homepage
        </Link>

        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Popular categories</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {TOP_CATEGORIES.map((category) => (
              <li key={category.href}>
                <Link
                  href={category.href}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-900"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
