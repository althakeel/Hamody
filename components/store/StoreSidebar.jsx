"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"

import { ChevronDown, HomeIcon, LayoutListIcon, SquarePenIcon, SquarePlusIcon, StarIcon, FolderIcon, TicketIcon, TruckIcon, RefreshCw, Users as UsersIcon, MessageSquare, Sparkles, BellIcon, MailIcon, Image as ImageIcon, ShoppingCart, Wallet, BarChart3, Target, Gift, Palette, CircleDashed, PackagePlus, Package, Activity, Layers, LineChart, Warehouse, MousePointerClick, ShieldAlert, Zap, Trash2, Smartphone, FileText, CalendarClock, MessageCircle, AlertTriangle, Download, Tag as TagIcon, Tags, ArrowUp, Search, Factory, CircleDollarSign, Pin, PanelLeftClose, PanelLeftOpen, Percent, PanelTop, PanelBottom, Loader, Clapperboard, LayoutGrid, Megaphone, ArrowRightLeft } from "lucide-react"

import StoreNavLink from "@/components/store/StoreNavLink"

import { canAccessDashboardArea, getPermissionIdForHref } from "@/lib/storeDashboardPermissions"
import { isAdminEmail } from "@/lib/adminEmails"
import { useAuth } from "@/lib/useAuth"
import { useStoreOrderNotifications } from "./StoreOrderNotificationProvider"



const VAULTSPAY_STATEMENT_URL = 'https://merchant.vaultspay.com/app/my-transactions';
const SIDEBAR_PIN_KEY = 'store1920.sellerSidebarPinned';
const SECTION_PINS_KEY = 'store1920.sellerSidebarSectionPins';

const StoreSidebar = ({ storeInfo, isOwner = false, isSuperAdmin = false, permissions = {}, canViewActivityHistory = false }) => {

    const pathname = usePathname()
    const { user } = useAuth()
    const showFullMenu = Boolean(isSuperAdmin) || isAdminEmail(user?.email) || isOwner
    const canSeeVaultsPayStatement = Boolean(isSuperAdmin) || isAdminEmail(user?.email) || permissions?.vaultsPayStatement === true
    const [pinned, setPinned] = useState(false)
    const [iconsOnly, setIconsOnly] = useState(false)
    const [pinnedSections, setPinnedSections] = useState([])
    const [pinReady, setPinReady] = useState(false)
    const [wide, setWide] = useState(true)
    const [openSection, setOpenSection] = useState("")
    const [iconTip, setIconTip] = useState(null)
    const expanded = !iconsOnly && (pinned || (showFullMenu && wide))
    const { unreadCount, canViewOrders, overduePickupCount } = useStoreOrderNotifications()



    const canAccessHref = (href) => {

        if (href === '/store/landing-pages') {
            return canAccessDashboardArea(permissions, 'customize', { isOwner })
                || canAccessDashboardArea(permissions, 'promotionalEmails', { isOwner });
        }

        const permissionId = getPermissionIdForHref(href);

        return canAccessDashboardArea(permissions, permissionId, { isOwner });

    };



    const sidebarLinks = [

        { name: 'Dashboard', href: '/store', icon: HomeIcon },

        { name: 'Categories', href: '/store/categories', icon: FolderIcon },

        { name: 'URL redirects', href: '/store/redirects', icon: ArrowRightLeft },

        { name: 'Brands', href: '/store/brands', icon: TagIcon },

        { name: 'Suppliers', href: '/store/suppliers', icon: Factory },

        { name: 'Add Product', href: '/store/add-product', icon: SquarePlusIcon },

        { name: 'Manage Product', href: '/store/manage-product', icon: SquarePenIcon },

        { name: 'Product Cost', href: '/store/product-cost', icon: CircleDollarSign },
        { name: 'App discount', href: '/store/app-discount', icon: Percent },

        { name: 'Product Badges', href: '/store/badges', icon: Tags },

        { name: 'Time Badge', href: '/store/time-badges', icon: CalendarClock },

        { name: 'Inventory', href: '/store/inventory', icon: Warehouse },

        { name: 'Database Import', href: '/store/settings/database-import', icon: RefreshCw },

        { name: 'Customize', href: '/store/customize', icon: Palette },

        { name: 'Menu Management', href: '/store/menu-management', icon: LayoutListIcon },

        { name: 'Mobile bottom button', href: '/store/customize/bottom-button', icon: Percent },
        { name: 'WhatsApp Widget', href: '/store/customize/whatsapp-widget', icon: MessageCircle },
        { name: 'Tawk live chat', href: '/store/customize/tawk', icon: MessageSquare },
        { name: 'Related product ad', href: '/store/customize/related-ad', icon: Megaphone },
        { name: 'Scroll to Top', href: '/store/customize/scroll-to-top', icon: ArrowUp },
        { name: 'Homepage popup', href: '/store/customize/home-popup', icon: Gift },

        { name: 'Mobile', href: '/store/mobile-features', icon: Smartphone },
        { name: 'Navbar', href: '/store/mobile-features/navbar', icon: PanelTop },
        { name: 'App icon', href: '/store/mobile-features/app-icon', icon: ImageIcon },
        { name: 'Footer', href: '/store/mobile-features/footer', icon: PanelBottom },
        { name: 'Loader', href: '/store/mobile-features/loader', icon: Loader },
        { name: 'Splash screens', href: '/store/mobile-features/splash-screens', icon: Clapperboard },
        { name: 'Banners', href: '/store/mobile-features/banners', icon: ImageIcon },
        { name: 'Offers', href: '/store/mobile-features/offers', icon: Zap },
        { name: 'Shop blocks', href: '/store/mobile-features/shop-blocks', icon: LayoutGrid },
        { name: 'Deal bar', href: '/store/mobile-features/deal-bar', icon: Gift },
        { name: 'Coupon banner', href: '/store/mobile-features/coupon-banner', icon: TicketIcon },
        { name: 'Push notification', href: '/store/mobile-features/push', icon: BellIcon },

        { name: 'Blogs', href: '/store/blogs', icon: FileText },

        { name: 'Landing pages', href: '/store/landing-pages', icon: Layers },

        { name: 'Promotional Offers', href: '/store/personalized-offers', icon: Gift },

        { name: 'Media', href: '/store/media', icon: ImageIcon },

        { name: 'Abandoned Checkout', href: '/store/abandoned-checkout', icon: ShoppingCart },

        { name: 'Coupons', href: '/store/coupons', icon: TicketIcon },

        { name: 'Giveaways', href: '/store/giveaways', icon: PackagePlus },

        { name: 'Spin Wheel', href: '/store/spin-wheel', icon: CircleDashed },

        { name: 'Shipping', href: '/store/shipping', icon: TruckIcon },

        { name: 'Alerts', href: '/store/alerts', icon: AlertTriangle },

        { name: 'Payment Security', href: '/store/payment-security', icon: ShieldAlert },

        { name: 'Customers', href: '/store/customers', icon: UsersIcon },

        { name: 'Customer Tracking', href: '/store/customer-tracking', icon: Activity },

        { name: 'Search History', href: '/store/search-history', icon: Search },

        { name: 'Marketing Analytics', href: '/store/marketing-analytics', icon: LineChart },

        { name: 'Heatmap', href: '/store/heatmap', icon: MousePointerClick },

        { name: 'Cohort Tracking', href: '/store/cohorts', icon: UsersIcon },

        { name: 'Churn Scores', href: '/store/churn-scores', icon: ShieldAlert },

        { name: 'RFM Scores', href: '/store/rfm-scores', icon: BarChart3 },

        { name: 'Behavioral Triggers', href: '/store/behavioral-triggers', icon: Zap },

        { name: 'Marketing Stack', href: '/store/marketing-stack', icon: Layers },

        { name: 'Orders', href: '/store/orders', icon: LayoutListIcon },

        { name: 'Notify list', href: '/store/notify-list', icon: BellIcon },

        { name: 'Pickup list', href: '/store/todays-pickup', icon: CalendarClock },

        { name: 'Orders by Product', href: '/store/orders-by-product', icon: Package },

        { name: 'Trash', href: '/store/trash', icon: Trash2 },

        { name: 'Sales Report', href: '/store/sales-report', icon: BarChart3 },

        { name: 'Exports', href: '/store/exports', icon: Download },

        { name: 'Marketing Expenses', href: '/store/marketing-expenses', icon: Target },

        { name: 'Returns & Replacements', href: '/store/return-requests', icon: RefreshCw },

        { name: 'Reviews', href: '/store/reviews', icon: StarIcon },

        { name: 'Support Tickets', href: '/store/tickets', icon: MessageSquare },

        { name: 'Contact Us Messages', href: '/store#contact-messages', icon: StarIcon },

        { name: 'Product Notifications', href: '/store/product-notifications', icon: BellIcon },

        { name: 'Email Marketing', href: '/store/email-marketing', icon: MailIcon },

        { name: 'Ad Tracking', href: '/store/ads-tracking', icon: BarChart3 },

    ]



    const sidebarSections = [

        {

            name: 'Core',

            links: [

                '/store',

                '/store/categories',

                '/store/brands',

                '/store/suppliers',

                '/store/add-product',

                '/store/manage-product',

                '/store/product-cost',

                '/store/app-discount',

                '/store/badges',

                '/store/time-badges',

                '/store/settings/database-import',

            ]

        },

        {

            name: 'Storefront',

            links: [

                '/store/customize',

                '/store/menu-management',

                '/store/customize/bottom-button',

                '/store/customize/whatsapp-widget',

                '/store/customize/tawk',

                '/store/customize/related-ad',

                '/store/customize/scroll-to-top',

                '/store/customize/home-popup',

                '/store/blogs',

                '/store/landing-pages',

                '/store/media',

            ]

        },

        {

            name: 'Mobile',

            links: [

                '/store/mobile-features',

                '/store/mobile-features/navbar',

                '/store/mobile-features/app-icon',

                '/store/mobile-features/footer',

                '/store/mobile-features/loader',

                '/store/mobile-features/splash-screens',

                '/store/mobile-features/banners',

                '/store/mobile-features/offers',

                '/store/mobile-features/shop-blocks',

                '/store/mobile-features/deal-bar',

                '/store/mobile-features/coupon-banner',

                '/store/mobile-features/push',

            ]

        },

        {

            name: 'Marketing',

            links: [

                '/store/personalized-offers',

                '/store/coupons',

                '/store/giveaways',

                '/store/spin-wheel',

                '/store/email-marketing',

                '/store/customer-tracking',

                '/store/search-history',

                '/store/marketing-analytics',

                '/store/heatmap',

                '/store/cohorts',

                '/store/churn-scores',

                '/store/rfm-scores',

                '/store/behavioral-triggers',

                '/store/marketing-stack',

                '/store/ads-tracking',

                '/store/marketing-expenses',

            ]

        },

        {

            name: 'Sales & Operations',

            links: [

                '/store/orders',

                '/store/notify-list',

                '/store/todays-pickup',

                '/store/orders-by-product',

                '/store/trash',

                '/store/abandoned-checkout',

                '/store/shipping',

                '/store/alerts',

                '/store/payment-security',

                '/store/return-requests',

                '/store/sales-report',

                '/store/exports',

            ]

        },

        {

            name: 'Warehouse',

            links: [

                '/store/inventory',

            ]

        },

        {

            name: 'Customers & Support',

            links: [

                '/store/customers',

                '/store/reviews',

                '/store/tickets',

                '/store/product-notifications',

                '/store#contact-messages',

            ]

        },

    ]



    const linkByHref = sidebarLinks.reduce((acc, link) => {

        acc[link.href] = link;

        return acc;

    }, {});



    const resolveActive = (href) => {

        if (href.includes('#')) {

            return pathname === href.split('#')[0];

        }

        if (href === '/store/email-marketing') {

            return pathname === '/store/email-marketing' || pathname === '/store/promotional-emails';

        }

        return pathname === href;

    }



    const getSectionIcon = (sectionName) => {

        switch (sectionName) {

            case 'Core':

                return HomeIcon;

            case 'Storefront':

                return Sparkles;

            case 'Mobile':

                return Smartphone;

            case 'Marketing':

                return Gift;

            case 'Sales & Operations':

                return LayoutListIcon;

            case 'Warehouse':

                return Warehouse;

            case 'Customers & Support':

                return UsersIcon;

            default:

                return LayoutListIcon;

        }

    }



    const getSectionTheme = (sectionName) => {

        switch (sectionName) {

            case 'Core':

                return {

                    headerText: 'text-sky-700',

                    headerIconBg: 'bg-sky-100',

                    headerIconText: 'text-sky-700',

                    activeLink: 'bg-[#7B2BFF] text-white font-semibold',

                    activeIconBg: 'bg-white/20',

                    activeIconText: 'text-white',

                    hoverLink: 'hover:bg-sky-50/60 hover:text-sky-700',

                    hoverIconBg: 'group-hover:bg-sky-100',

                    hoverIconText: 'group-hover:text-sky-700',

                    dot: 'bg-sky-600'

                }

            case 'Storefront':

                return {

                    headerText: 'text-emerald-700',

                    headerIconBg: 'bg-emerald-100',

                    headerIconText: 'text-emerald-700',

                    activeLink: 'bg-[#7B2BFF] text-white font-semibold',

                    activeIconBg: 'bg-white/20',

                    activeIconText: 'text-white',

                    hoverLink: 'hover:bg-emerald-50/60 hover:text-emerald-700',

                    hoverIconBg: 'group-hover:bg-emerald-100',

                    hoverIconText: 'group-hover:text-emerald-700',

                    dot: 'bg-emerald-600'

                }

            case 'Mobile':

                return {

                    headerText: 'text-sky-700',

                    headerIconBg: 'bg-sky-100',

                    headerIconText: 'text-sky-700',

                    activeLink: 'bg-[#7B2BFF] text-white font-semibold',

                    activeIconBg: 'bg-white/20',

                    activeIconText: 'text-white',

                    hoverLink: 'hover:bg-sky-50/60 hover:text-sky-700',

                    hoverIconBg: 'group-hover:bg-sky-100',

                    hoverIconText: 'group-hover:text-sky-700',

                    dot: 'bg-sky-600'

                }

            case 'Marketing':

                return {

                    headerText: 'text-violet-700',

                    headerIconBg: 'bg-violet-100',

                    headerIconText: 'text-violet-700',

                    activeLink: 'bg-[#7B2BFF] text-white font-semibold',

                    activeIconBg: 'bg-white/20',

                    activeIconText: 'text-white',

                    hoverLink: 'hover:bg-violet-50/60 hover:text-violet-700',

                    hoverIconBg: 'group-hover:bg-violet-100',

                    hoverIconText: 'group-hover:text-violet-700',

                    dot: 'bg-violet-600'

                }

            case 'Sales & Operations':

                return {

                    headerText: 'text-amber-700',

                    headerIconBg: 'bg-amber-100',

                    headerIconText: 'text-amber-700',

                    activeLink: 'bg-[#7B2BFF] text-white font-semibold',

                    activeIconBg: 'bg-white/20',

                    activeIconText: 'text-white',

                    hoverLink: 'hover:bg-amber-50/60 hover:text-amber-700',

                    hoverIconBg: 'group-hover:bg-amber-100',

                    hoverIconText: 'group-hover:text-amber-700',

                    dot: 'bg-amber-600'

                }

            case 'Warehouse':

                return {

                    headerText: 'text-indigo-700',

                    headerIconBg: 'bg-indigo-100',

                    headerIconText: 'text-indigo-700',

                    activeLink: 'bg-[#7B2BFF] text-white font-semibold',

                    activeIconBg: 'bg-white/20',

                    activeIconText: 'text-white',

                    hoverLink: 'hover:bg-indigo-50/60 hover:text-indigo-700',

                    hoverIconBg: 'group-hover:bg-indigo-100',

                    hoverIconText: 'group-hover:text-indigo-700',

                    dot: 'bg-indigo-600'

                }

            case 'Customers & Support':

                return {

                    headerText: 'text-rose-700',

                    headerIconBg: 'bg-rose-100',

                    headerIconText: 'text-rose-700',

                    activeLink: 'bg-[#7B2BFF] text-white font-semibold',

                    activeIconBg: 'bg-white/20',

                    activeIconText: 'text-white',

                    hoverLink: 'hover:bg-rose-50/60 hover:text-rose-700',

                    hoverIconBg: 'group-hover:bg-rose-100',

                    hoverIconText: 'group-hover:text-rose-700',

                    dot: 'bg-rose-600'

                }

            default:

                return {

                    headerText: 'text-slate-600',

                    headerIconBg: 'bg-slate-100',

                    headerIconText: 'text-slate-700',

                    activeLink: 'bg-[#7B2BFF] text-white font-semibold',

                    activeIconBg: 'bg-white/20',

                    activeIconText: 'text-white',

                    hoverLink: 'hover:bg-slate-100 hover:text-slate-700',

                    hoverIconBg: 'group-hover:bg-slate-200',

                    hoverIconText: 'group-hover:text-slate-700',

                    dot: 'bg-slate-600'

                }

        }

    }



    useEffect(() => {
        const media = window.matchMedia('(min-width: 1024px)')
        const sync = () => setWide(media.matches)
        sync()
        media.addEventListener('change', sync)
        try {
            const savedSidebar = window.localStorage.getItem(SIDEBAR_PIN_KEY)
            setPinned(savedSidebar === '1')
            setIconsOnly(savedSidebar === 'icon')
            const savedSections = JSON.parse(window.localStorage.getItem(SECTION_PINS_KEY) || '[]')
            setPinnedSections(Array.isArray(savedSections) ? savedSections.filter((name) => typeof name === 'string') : [])
        } catch {
            setPinned(false)
            setPinnedSections([])
        }
        setPinReady(true)
        return () => media.removeEventListener('change', sync)
    }, [])

    useEffect(() => {
        if (!pinReady) return
        try {
            window.localStorage.setItem(SIDEBAR_PIN_KEY, iconsOnly ? 'icon' : (pinned ? '1' : '0'))
            window.localStorage.setItem(SECTION_PINS_KEY, JSON.stringify(pinnedSections))
        } catch {
            // Ignore storage failures. The choice still works for this visit.
        }
    }, [pinned, iconsOnly, pinnedSections, pinReady])

    const showIconTip = (event, label) => {
        if (expanded) return
        const rect = event.currentTarget.getBoundingClientRect()
        setIconTip({
            label,
            top: rect.top + (rect.height / 2),
            left: rect.right + 10,
        })
    }

    const hideIconTip = () => setIconTip(null)

    useEffect(() => {
        if (expanded) setIconTip(null)
    }, [expanded])

    useEffect(() => {
        if (showFullMenu) return
        const activeSection = sidebarSections.find((section) => section.links.some((href) => resolveActive(href)))
        if (activeSection) setOpenSection(activeSection.name)
    }, [pathname, showFullMenu])

    return (

        <aside data-store-sidebar className={`sticky top-0 flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-sm ${expanded ? 'w-[236px]' : 'w-[60px] md:w-[68px]'}`}>
                <div className={`flex shrink-0 border-b border-slate-200 px-1.5 py-2 ${expanded ? 'justify-end px-2' : 'justify-center'}`}>
                    <button
                        type="button"
                        onClick={() => {
                            if (expanded) {
                                setIconsOnly(true)
                                setPinned(false)
                                return
                            }
                            setIconsOnly(false)
                            setPinned(true)
                        }}
                        aria-pressed={expanded}
                        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                        {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                    </button>
                </div>

                <div className={`scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-2 ${expanded ? 'px-2' : ''}`}>

                    {sidebarSections.map((section) => {

                        const SectionIcon = getSectionIcon(section.name)

                        const theme = getSectionTheme(section.name)

                        const visibleLinks = section.links.filter((href) => linkByHref[href] && canAccessHref(href))
                        const showVaultsPayStatement = section.name === 'Sales' && canSeeVaultsPayStatement

                        if (visibleLinks.length === 0 && !showVaultsPayStatement) return null



                        const sectionPinned = pinnedSections.includes(section.name)
                        const alwaysOpen = section.name === 'Mobile'
                        const sectionOpen = alwaysOpen || showFullMenu || sectionPinned || openSection === section.name

                        return (

                            <div key={section.name} className={`mt-2 first:mt-0 ${expanded ? 'mt-3' : ''}`}>

                                <div className={`${expanded ? 'flex' : 'hidden'} items-center gap-1 px-1 pb-1.5`}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (alwaysOpen || showFullMenu || sectionPinned) return
                                            setOpenSection((current) => current === section.name ? "" : section.name)
                                        }}
                                        className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide ${theme.headerText} ${alwaysOpen || showFullMenu || sectionPinned ? '' : theme.hoverLink}`}
                                        aria-expanded={sectionOpen}
                                    >
                                        <span className={`rounded-md p-0.5 ${theme.headerIconBg}`}>
                                            <SectionIcon size={12} className={theme.headerIconText} />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{section.name}</span>
                                        {alwaysOpen || showFullMenu ? null : (
                                            <ChevronDown size={14} className={`shrink-0 transition ${sectionOpen ? "rotate-180" : ""}`} />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPinnedSections((current) => (
                                            current.includes(section.name)
                                                ? current.filter((name) => name !== section.name)
                                                : [...current, section.name]
                                        ))}
                                        aria-pressed={sectionPinned}
                                        aria-label={sectionPinned ? `Unpin ${section.name}` : `Pin ${section.name} open`}
                                        title={sectionPinned ? 'Unpin section' : 'Keep this section open'}
                                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
                                            sectionPinned
                                                ? 'bg-[#7B2BFF] text-white'
                                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                        }`}
                                    >
                                        <Pin size={12} />
                                    </button>
                                </div>



                                <div className={`space-y-0.5 ${expanded ? 'pt-0' : 'border-t border-slate-200/80 pt-1.5 first:border-t-0 first:pt-0'} ${expanded && !sectionOpen ? 'hidden' : ''}`}>

                                    {visibleLinks.map((href) => {

                                            const link = linkByHref[href]

                                            if (!link) return null



                                            const Icon = link.icon

                                            const isActive = resolveActive(link.href)



                                            return (

                                                <StoreNavLink

                                                    key={`${section.name}-${link.href}`}

                                                    href={link.href}

                                                    aria-label={link.name}

                                                    onMouseEnter={(event) => showIconTip(event, link.name)}

                                                    onMouseLeave={hideIconTip}

                                                    aria-current={isActive ? 'page' : undefined}

                                                    className={`group relative flex items-center gap-2 rounded-lg px-1 py-2 transition-all duration-200 ${expanded ? 'justify-start px-2.5 py-1.5' : 'justify-center'} ${

                                                        isActive

                                                            ? theme.activeLink

                                                            : `text-slate-700 ${theme.hoverLink}`

                                                    }`}

                                                >

                                                    <div className={`relative rounded-md transition-colors ${expanded ? 'p-1' : 'p-1.5'} ${

                                                        isActive 

                                                            ? theme.activeIconBg

                                                            : `bg-slate-100 ${theme.hoverIconBg}`

                                                    }`}>

                                                        <Icon size={expanded ? 15 : 18} className={isActive ? theme.activeIconText : `text-slate-600 ${theme.hoverIconText}`} />

                                                        {link.href === '/store/orders' && canViewOrders && unreadCount > 0 && !expanded ? (
                                                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-600" />
                                                        ) : null}
                                                        {link.href === '/store/todays-pickup' && overduePickupCount > 0 && !expanded ? (
                                                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
                                                        ) : null}

                                                    </div>

                                                    <span className={`${expanded ? 'inline' : 'hidden'} flex-1 leading-tight text-[13px]`}>{link.name}</span>

                                                    {link.href === '/store/orders' && canViewOrders && unreadCount > 0 && expanded ? (
                                                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                                            {unreadCount > 9 ? '9+' : unreadCount}
                                                        </span>
                                                    ) : null}
                                                    {link.href === '/store/todays-pickup' && overduePickupCount > 0 && expanded ? (
                                                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                                            {overduePickupCount > 9 ? '9+' : overduePickupCount}
                                                        </span>
                                                    ) : null}


                                                </StoreNavLink>

                                            )

                                        })}

                                    {showVaultsPayStatement ? (
                                        <a
                                            href={VAULTSPAY_STATEMENT_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="VaultsPay statement"
                                            onMouseEnter={(event) => showIconTip(event, 'VaultsPay statement')}
                                            onMouseLeave={hideIconTip}
                                            className={`group relative flex items-center gap-2 rounded-lg px-1 py-2 text-slate-700 transition-all duration-200 ${expanded ? 'justify-start px-2.5 py-1.5' : 'justify-center'} ${theme.hoverLink}`}
                                        >
                                            <div className={`relative rounded-md bg-slate-100 transition-colors ${expanded ? 'p-1' : 'p-1.5'} ${theme.hoverIconBg}`}>
                                                <Wallet size={expanded ? 15 : 18} className={`text-slate-600 ${theme.hoverIconText}`} />
                                            </div>
                                            <span className={`${expanded ? 'inline' : 'hidden'} flex-1 leading-tight text-[13px]`}>VaultsPay statement</span>
                                        </a>
                                    ) : null}

                                </div>

                            </div>

                        )

                    })}

                </div>



                <div className={`shrink-0 border-t border-slate-200 bg-slate-50/50 px-1.5 py-2 ${expanded ? 'px-2' : ''}`}>

                        {canViewActivityHistory ? (
                            <StoreNavLink
                                href="/store/settings/history"
                                aria-label="Settings history"
                                onMouseEnter={(event) => showIconTip(event, 'History')}
                                onMouseLeave={hideIconTip}
                                aria-current={pathname.startsWith('/store/settings/history') ? 'page' : undefined}
                                className={`relative mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition ${expanded ? 'px-3' : ''} ${
                                    pathname.startsWith('/store/settings/history')
                                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {pathname.startsWith('/store/settings/history') ? (
                                    <span className="absolute inset-y-1 start-0 w-1 rounded-full bg-white" />
                                ) : null}
                                <span className={expanded ? 'inline' : 'hidden'}>History</span>
                                <span className={expanded ? 'hidden' : 'inline'}>Log</span>
                            </StoreNavLink>
                        ) : null}

                        <StoreNavLink

                            href="/store/settings"

                            aria-label="Settings"

                            onMouseEnter={(event) => showIconTip(event, 'Settings')}

                            onMouseLeave={hideIconTip}

                            aria-current={pathname === '/store/settings' ? 'page' : undefined}

                            className={`group relative flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-sm font-medium transition-all duration-200 ${expanded ? 'px-3 py-2' : ''} ${
                                pathname === '/store/settings'
                                    ? 'border-slate-800 bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-md'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}

                        >

                            {pathname === '/store/settings' ? (
                                <span className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-white" />
                            ) : null}

                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />

                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />

                            </svg>

                            <span className={expanded ? 'inline' : 'hidden'}>Settings</span>

                        </StoreNavLink>

                    </div>

        {!expanded && iconTip && typeof document !== 'undefined' ? createPortal(
            <span
                role="tooltip"
                className="pointer-events-none fixed z-[90] -translate-y-1/2"
                style={{ top: iconTip.top, left: iconTip.left }}
            >
                <span className="relative block whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)]">
                    <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-r-[6px] border-y-transparent border-r-slate-900" />
                    {iconTip.label}
                </span>
            </span>,
            document.body,
        ) : null}

        </aside>

    )

}



export default StoreSidebar

