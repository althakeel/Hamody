'use client'

import React, { useEffect, useState } from 'react'
import { Home, User, Store, Percent } from 'lucide-react'

function NavbarCartIcon({ size = 18, color, className = '' }) {
  const dimension = typeof size === 'number' ? `${size}px` : size
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        width: dimension,
        height: dimension,
        display: 'inline-block',
        backgroundColor: color || 'currentColor',
        WebkitMask: 'url(/icons/navbar-cart.png) center / contain no-repeat',
        mask: 'url(/icons/navbar-cart.png) center / contain no-repeat',
      }}
    />
  )
}
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSelector } from 'react-redux'
import { useAuth } from '@/lib/useAuth'
import { isProductDetailPath } from '@/lib/productUrl'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'
import {
  DEFAULT_OFFERS_NAV_LABEL,
  DEFAULT_OFFERS_NAV_LABEL_AR,
  normalizeNavGifUrl,
  readBottomNavSettings,
  splitOffersNavLabel,
} from '@/lib/offersPageSettings'

const DEFAULT_BRAND_COLOR = '#05090D'
const INACTIVE_NAV_COLOR = '#5E6870'
const LIME = '#C8F404'
const NAVBAR_APPEARANCE_CACHE_KEY = 'navbarAppearanceCache'
const OFFERS_HREF = '/offers'
const SHOP_HREF = '/shop'
function readCachedBrandColor() {
  if (typeof window === 'undefined') return DEFAULT_BRAND_COLOR
  try {
    const raw = window.localStorage.getItem(NAVBAR_APPEARANCE_CACHE_KEY)
    if (!raw) return DEFAULT_BRAND_COLOR
    const parsed = JSON.parse(raw)
    const color = String(parsed?.backgroundColor || '').trim()
    return color || DEFAULT_BRAND_COLOR
  } catch {
    return DEFAULT_BRAND_COLOR
  }
}

function useBrandColor() {
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR)

  useEffect(() => {
    setBrandColor(readCachedBrandColor())

    let cancelled = false
    import('@/lib/storefrontPublicFetch')
      .then(({ fetchNavbarMenu }) => fetchNavbarMenu())
      .then((data) => {
        if (cancelled) return
        const next = String(data?.backgroundColor || '').trim()
        if (next) setBrandColor(next)
      })
      .catch(() => {})

    const handleUpdate = (event) => {
      const next = event?.detail?.backgroundColor
      if (typeof next === 'string' && next.trim()) {
        setBrandColor(next.trim())
        return
      }
      setBrandColor(readCachedBrandColor())
    }

    window.addEventListener('navbarAppearanceUpdated', handleUpdate)
    return () => {
      cancelled = true
      window.removeEventListener('navbarAppearanceUpdated', handleUpdate)
    }
  }, [])

  return brandColor
}

function RegularNavItem({ item, pathname, brandColor, hydrated }) {
  const Icon = item.icon
  const isActive = item.match(pathname)
  const activeColor = brandColor || DEFAULT_BRAND_COLOR
  const iconColor = isActive ? activeColor : INACTIVE_NAV_COLOR

  return (
    <Link
      href={item.href}
      className="group flex min-w-0 flex-1 items-end justify-center px-0.5 pb-0.5"
      aria-current={isActive ? 'page' : undefined}
    >
      <span
        className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 transition-all duration-200 active:scale-95 ${
          isActive ? '' : 'group-hover:opacity-80'
        }`}
      >
        <span
          className="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200"
          style={{ backgroundColor: isActive ? LIME : 'transparent' }}
        >
          <Icon
            size={18}
            strokeWidth={isActive ? 2.4 : 1.8}
            color={isActive ? DEFAULT_BRAND_COLOR : iconColor}
            className="transition-colors duration-200"
          />
          {hydrated && item.badge > 0 && (
            <span
              className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none text-[#05090D]"
              style={{ backgroundColor: '#C8F404' }}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </span>
        <span
          className={`max-w-[64px] truncate text-[10px] leading-none tracking-tight transition-colors duration-200 ${
            isActive ? 'font-semibold' : 'font-medium'
          }`}
          style={{ color: isActive ? DEFAULT_BRAND_COLOR : iconColor }}
        >
          {item.label}
        </span>
      </span>
    </Link>
  )
}

function bottomNavPathMatches(pathname, href) {
  if (!href.startsWith('/')) return false
  const path = href.split('?')[0].split('#')[0] || '/'
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(`${path}/`)
}

function CenterTodayDealsItem({
  pathname,
  line1,
  line2,
  gifUrl = '',
  settings,
}) {
  const resolvedHref = settings?.href || OFFERS_HREF
  const isExternal = /^https?:\/\//i.test(resolvedHref)
  const isActive = !isExternal && bottomNavPathMatches(pathname, resolvedHref)
  const showImage = settings?.mode === 'image' && Boolean(String(settings?.imageUrl || '').trim())
  const showCircleText = settings?.mode === 'text' && Boolean(String(settings?.circleText || '').trim())
  const hasGif = !showImage && !showCircleText && Boolean(String(gifUrl || '').trim())
  const labelColor = isActive ? DEFAULT_BRAND_COLOR : INACTIVE_NAV_COLOR
  const className = 'group relative flex min-w-0 flex-1 flex-col items-center justify-end pb-0.5'
  const circle = (
    <>
      <span
        className={`relative -mt-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full ring-[3px] ring-white active:scale-95 ${settings.animationClass || ''}`}
        style={{
          background: showImage ? '#ffffff' : LIME,
          boxShadow: '0 6px 16px rgba(5, 9, 13, 0.12)',
        }}
      >
        {showImage ? (
          <img src={settings.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : showCircleText ? (
          <span className="max-w-[36px] truncate px-1 text-center text-[11px] font-extrabold leading-none text-[#05090D]">
            {settings.circleText}
          </span>
        ) : hasGif ? (
          <img src={gifUrl} alt="" className="h-7 w-7 object-contain" />
        ) : (
          <Percent size={20} color={DEFAULT_BRAND_COLOR} strokeWidth={2.6} />
        )}
      </span>
      {line1 ? (
      <span className="mt-1 flex flex-col items-center leading-none">
        <span
          className={`text-[10px] leading-tight transition-colors duration-200 ${
            isActive ? 'font-semibold' : 'font-medium'
          }`}
          style={{ color: labelColor }}
        >
          {line1}
        </span>
        {line2 ? (
          <span
            className={`text-[10px] leading-tight transition-colors duration-200 ${
              isActive ? 'font-semibold' : 'font-medium'
            }`}
            style={{ color: labelColor }}
          >
            {line2}
          </span>
        ) : null}
      </span>
      ) : null}
    </>
  )

  if (isExternal) {
    return (
      <a
        href={resolvedHref}
        className={className}
        aria-label={`${line1} ${line2}`}
      >
        {circle}
      </a>
    )
  }

  return (
    <Link
      href={resolvedHref}
      className={className}
      aria-label={`${line1} ${line2}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {circle}
    </Link>
  )
}

export default function MobileBottomNav() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  const pathname = usePathname()
  const cartCount = useSelector((state) => {
    const items = state.cart.cartItems || {}
    return Object.values(items).reduce((sum, entry) => {
      const qty = typeof entry === 'number' ? entry : Number(entry?.quantity) || 0
      return sum + (qty > 0 ? qty : 0)
    }, 0)
  })
  const { user } = useAuth()
  const { t, language } = useStorefrontI18n()
  const brandColor = useBrandColor()
  const [, setDealsNavLabels] = useState({
    en: DEFAULT_OFFERS_NAV_LABEL,
    ar: DEFAULT_OFFERS_NAV_LABEL_AR,
  })
  const [dealsNavGifUrl, setDealsNavGifUrl] = useState('')
  const [bottomNav, setBottomNav] = useState(() => readBottomNavSettings({}))
  const [bottomNavReady, setBottomNavReady] = useState(false)
  const isSignedIn = !!user
  const isArabic = language === 'ar'
  const belowLabel = isArabic
    ? (bottomNav.belowTextAr || bottomNav.belowText)
    : bottomNav.belowText
  const dealsNavParts = belowLabel
    ? splitOffersNavLabel(belowLabel)
    : { top: '', bottom: '' }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('offersNavLabelCache')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.en || parsed?.ar) {
          setDealsNavLabels({
            en: String(parsed.en || DEFAULT_OFFERS_NAV_LABEL).trim() || DEFAULT_OFFERS_NAV_LABEL,
            ar: String(parsed.ar || DEFAULT_OFFERS_NAV_LABEL_AR).trim() || DEFAULT_OFFERS_NAV_LABEL_AR,
          })
        }
        if (parsed?.gif !== undefined || parsed?.navGifUrl !== undefined) {
          setDealsNavGifUrl(normalizeNavGifUrl(parsed.gif || parsed.navGifUrl))
        }
        if (parsed?.bottomNav) {
          setBottomNav(readBottomNavSettings(parsed))
          setBottomNavReady(true)
        }
      }
    } catch {
      // Ignore storage read failures.
    }

    const applyOffersNav = (offersPage = {}) => {
      const nextLabels = {
        en: String(offersPage.navLabel || DEFAULT_OFFERS_NAV_LABEL).trim() || DEFAULT_OFFERS_NAV_LABEL,
        ar: String(offersPage.navLabelAr || DEFAULT_OFFERS_NAV_LABEL_AR).trim() || DEFAULT_OFFERS_NAV_LABEL_AR,
      }
      const nextGif = normalizeNavGifUrl(offersPage.navGifUrl || offersPage.gif)
      const nextBottomNav = readBottomNavSettings(offersPage)
      setDealsNavLabels(nextLabels)
      setDealsNavGifUrl(nextGif)
      setBottomNav(nextBottomNav)
      try {
        window.localStorage.setItem('offersNavLabelCache', JSON.stringify({
          ...nextLabels,
          gif: nextGif,
          bottomNav: nextBottomNav,
        }))
      } catch {
        // Ignore storage write failures.
      }
    }

    let cancelled = false
    import('@/lib/storefrontPublicFetch')
      .then(({ fetchAppearanceSectionsPublic }) => fetchAppearanceSectionsPublic())
      .then((data) => {
        if (cancelled || !data?.offersPage) return
        applyOffersNav(data.offersPage)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBottomNavReady(true)
      })

    const handleOffersNavLabelUpdate = (event) => {
      const detail = event?.detail || {}
      if (detail.en || detail.ar) {
        setDealsNavLabels({
          en: String(detail.en || DEFAULT_OFFERS_NAV_LABEL).trim() || DEFAULT_OFFERS_NAV_LABEL,
          ar: String(detail.ar || DEFAULT_OFFERS_NAV_LABEL_AR).trim() || DEFAULT_OFFERS_NAV_LABEL_AR,
        })
      }
      if (detail.gif !== undefined || detail.navGifUrl !== undefined) {
        setDealsNavGifUrl(normalizeNavGifUrl(detail.gif || detail.navGifUrl))
      }
      if (detail.bottomNav) {
        setBottomNav(readBottomNavSettings(detail))
      }
    }
    window.addEventListener('offersNavLabelUpdated', handleOffersNavLabelUpdate)

    return () => {
      cancelled = true
      window.removeEventListener('offersNavLabelUpdated', handleOffersNavLabelUpdate)
    }
  }, [])

  if (isProductDetailPath(pathname)) {
    return null
  }

  const accountHref = isSignedIn ? '/dashboard/orders' : '/sign-in'

  const leftItems = [
    { href: '/', icon: Home, label: t('common.home'), match: (path) => path === '/' },
    {
      href: SHOP_HREF,
      icon: Store,
      label: t('navbar.shopOptions'),
      match: (path) => path === SHOP_HREF || path.startsWith('/shop'),
    },
  ]

  const rightItems = [
    { href: '/cart', icon: NavbarCartIcon, label: t('navbar.cart'), badge: cartCount, match: (path) => path === '/cart' },
    {
      href: accountHref,
      icon: User,
      label: t('navbar.account'),
      match: (path) => path === accountHref || path.startsWith('/dashboard/') || path === '/sign-in',
    },
  ]

  return (
    <nav
      aria-label="Mobile navigation"
      dir={isArabic ? 'rtl' : 'ltr'}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E2E7E8] bg-white lg:hidden"
      style={{
        paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div className="mx-auto flex h-[58px] max-w-lg items-stretch justify-around px-0.5">
        {leftItems.map((item) => (
          <RegularNavItem
            key={item.href}
            item={item}
            pathname={pathname}
            brandColor={brandColor}
            hydrated={hydrated}
          />
        ))}

        {bottomNavReady ? (
          <CenterTodayDealsItem
            pathname={pathname}
            line1={dealsNavParts.top}
            line2={dealsNavParts.bottom}
            gifUrl={dealsNavGifUrl}
            settings={bottomNav}
          />
        ) : (
          <span className="relative flex min-w-0 flex-1 flex-col items-center justify-end pb-0.5" aria-hidden="true">
            <span className="-mt-3 h-11 w-11 animate-pulse rounded-full bg-[#EFFCC4] ring-[3px] ring-white" />
            <span className="mt-1 h-2 w-8 animate-pulse rounded bg-slate-200" />
          </span>
        )}

        {rightItems.map((item) => (
          <RegularNavItem
            key={item.href}
            item={item}
            pathname={pathname}
            brandColor={brandColor}
            hydrated={hydrated}
          />
        ))}
      </div>
    </nav>
  )
}
