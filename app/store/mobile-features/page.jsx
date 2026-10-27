'use client'

import Link from 'next/link'
import { Bell, Clapperboard, Gift, Image as ImageIcon, LayoutGrid, Loader, PanelBottom, PanelTop, Shapes, Smartphone, Ticket, Zap } from 'lucide-react'

export default function MobileFeaturesPage() {
  return (
    <div className="-mx-3 -mt-3 min-h-full w-full max-w-full overflow-x-hidden bg-white pb-12 sm:-mx-4 sm:-mt-4 lg:-mx-5 lg:-mt-5">
      <div className="border-b border-slate-200 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <Smartphone size={14} />
          Mobile
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Mobile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Phone header, bottom bar, loader, splash screens, home banners, offers, shop blocks, the deal bar, and the coupon banner.
        </p>
      </div>

      <div className="grid gap-3 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Link
          href="/store/mobile-features/app-icon"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <ImageIcon size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">App icon</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Main app icon on the phone home screen. Not the header logo.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/navbar"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <PanelTop size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Navbar</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Header color or gradient, logo, and the moving line.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/footer"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <PanelBottom size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Footer</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Bottom bar icons and the page each icon opens.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/loader"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Loader size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Loader</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Photo, GIF, or video shown while the app opens.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/splash-screens"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Clapperboard size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Splash screens</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Opening screens. Upload a photo, GIF, or MP4, set the seconds, and choose the order.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/banners"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <ImageIcon size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Banners</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Banner 1, Banner 2, Banner 3, and Banner 4 in different places on the home screen.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/category-sliders"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Shapes size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Category sliders</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              At least three choices. A parent category shows its children. A manual choice sets the image, title, and path.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/offers"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Zap size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Offers</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Icon, title, view-all link, and products from a category, a brand, or a hand-picked list.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/shop-blocks"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <LayoutGrid size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Shop blocks</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              A 4-image grid with a title and background, beside a promo image that can slide.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/deal-bar"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Gift size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Deal bar</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Icon, background, and the Shop Deals button with its path.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/coupon-banner"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Ticket size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Coupon banner</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Pick an existing coupon, then edit the title, offer, and minimum order.
            </span>
          </span>
        </Link>
        <Link
          href="/store/mobile-features/push"
          className="flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300 hover:shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Bell size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Push notification</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Send a message to Android or iOS with an image, a button, and a path.
            </span>
          </span>
        </Link>
      </div>
    </div>
  )
}
