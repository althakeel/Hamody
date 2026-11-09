"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { HOME_SECTION_INNER_CLASS } from '@/lib/storefrontCarousel';
import { useAuth } from '@/lib/useAuth';
import { auth } from '@/lib/firebase';
import { STORE1920_LOGO_PATH } from '@/lib/brandLogo';
import {
    DEFAULT_FOOTER,
    applyFooterTokens,
    footerLines,
    footerPhoneHref,
    footerPhoneLabel,
    normalizeFooter,
} from '@/lib/footerSettings';

/** Same key as Navbar — never flash a bundled static logo while loading. */
const NAVBAR_APPEARANCE_CACHE_KEY = 'navbarAppearanceCache';

function resolveFooterLogoFromAppearance(data = {}) {
    const sameAsNavbar = data?.footerLogoSameAsNavbar !== false;
    const customFooterUrl = String(data?.footerLogoUrl || '').trim();
    const navbarLogoUrl = String(data?.logoUrl || '').trim();
    const resolvedFromApi = String(data?.resolvedFooterLogoUrl || '').trim();
    const customUrl = resolvedFromApi
        || (sameAsNavbar ? navbarLogoUrl : (customFooterUrl || navbarLogoUrl));
    const logoUrl = customUrl || STORE1920_LOGO_PATH;
    const usingBrandMark = !customUrl;
    const widthSource = sameAsNavbar ? data?.logoWidth : (data?.footerLogoWidth ?? data?.logoWidth);
    const heightSource = sameAsNavbar ? data?.logoHeight : (data?.footerLogoHeight ?? data?.logoHeight);
    return {
        logoUrl,
        usingBrandMark,
        logoWidth: usingBrandMark ? 72 : (Number(widthSource) > 0 ? Number(widthSource) : 160),
        logoHeight: usingBrandMark ? 72 : (Number(heightSource) > 0 ? Number(heightSource) : 40),
    };
}

const Footer = () => {
    const { t, isArabic } = useStorefrontI18n();
    const { user } = useAuth();
    const isSignedIn = Boolean(user || auth.currentUser);

    const [footerLogo, setFooterLogo] = useState({
        logoUrl: '',
        usingBrandMark: true,
        logoWidth: 72,
        logoHeight: 72,
    });
    const [footerLogoLoading, setFooterLogoLoading] = useState(true);
    const [footerContent, setFooterContent] = useState(DEFAULT_FOOTER);
    const [appComingSoonOpen, setAppComingSoonOpen] = useState(false);
    const [portalReady, setPortalReady] = useState(false);

    useEffect(() => {
        setPortalReady(true);
    }, []);

    useEffect(() => {
        if (!appComingSoonOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') setAppComingSoonOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [appComingSoonOpen]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const raw = window.localStorage.getItem(NAVBAR_APPEARANCE_CACHE_KEY);
                if (raw) {
                    const cached = JSON.parse(raw);
                    const resolved = resolveFooterLogoFromAppearance(cached);
                    if (resolved.logoUrl) {
                        setFooterLogo(resolved);
                        setFooterLogoLoading(false);
                    }
                }
            } catch {
                // Ignore cache parse issues.
            }
        }

        const fetchNavbarAppearance = async () => {
            try {
                const { fetchNavbarMenu } = await import('@/lib/storefrontPublicFetch');
                const data = await fetchNavbarMenu();
                setFooterLogo(resolveFooterLogoFromAppearance(data));
            } catch {
                // Keep skeleton / text — never flash a bundled static logo.
            } finally {
                setFooterLogoLoading(false);
            }
        };

        fetchNavbarAppearance();

        const fetchFooterContent = async () => {
            try {
                const { fetchAppearanceSectionsPublic } = await import('@/lib/storefrontPublicFetch');
                const data = await fetchAppearanceSectionsPublic();
                setFooterContent(normalizeFooter(data?.footer || DEFAULT_FOOTER));
            } catch {
                setFooterContent(DEFAULT_FOOTER);
            }
        };

        fetchFooterContent();

        const handleNavbarAppearanceUpdate = (event) => {
            const detail = event?.detail || {};
            setFooterLogo((prev) => resolveFooterLogoFromAppearance({
                logoUrl: typeof detail.logoUrl === 'string' ? detail.logoUrl : prev.logoUrl,
                logoWidth: typeof detail.logoWidth === 'number' ? detail.logoWidth : prev.logoWidth,
                logoHeight: typeof detail.logoHeight === 'number' ? detail.logoHeight : prev.logoHeight,
                footerLogoSameAsNavbar: detail.footerLogoSameAsNavbar,
                footerLogoUrl: detail.footerLogoUrl,
                footerLogoWidth: detail.footerLogoWidth,
                footerLogoHeight: detail.footerLogoHeight,
                resolvedFooterLogoUrl: detail.resolvedFooterLogoUrl,
            }));
            setFooterLogoLoading(false);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('navbarAppearanceUpdated', handleNavbarAppearanceUpdate);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('navbarAppearanceUpdated', handleNavbarAppearanceUpdate);
            }
        };
    }, []);

    const MailIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.6654 4.66699L8.67136 8.48499C8.46796 8.60313 8.23692 8.66536 8.0017 8.66536C7.76647 8.66536 7.53544 8.60313 7.33203 8.48499L1.33203 4.66699M2.66536 2.66699H13.332C14.0684 2.66699 14.6654 3.26395 14.6654 4.00033V12.0003C14.6654 12.7367 14.0684 13.3337 13.332 13.3337H2.66536C1.92898 13.3337 1.33203 12.7367 1.33203 12.0003V4.00033C1.33203 3.26395 1.92898 2.66699 2.66536 2.66699Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const PhoneIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M9.22003 11.045C9.35772 11.1082 9.51283 11.1227 9.65983 11.086C9.80682 11.0493 9.93692 10.9636 10.0287 10.843L10.2654 10.533C10.3896 10.3674 10.5506 10.233 10.7357 10.1404C10.9209 10.0479 11.125 9.99967 11.332 9.99967H13.332C13.6857 9.99967 14.0248 10.1402 14.2748 10.3902C14.5249 10.6402 14.6654 10.9794 14.6654 11.333V13.333C14.6654 13.6866 14.5249 14.0258 14.2748 14.2758C14.0248 14.5259 13.6857 14.6663 13.332 14.6663C10.1494 14.6663 7.09719 13.4021 4.84675 11.1516C2.59631 8.90119 1.33203 5.84894 1.33203 2.66634C1.33203 2.31272 1.47251 1.97358 1.72256 1.72353C1.9726 1.47348 2.31174 1.33301 2.66536 1.33301H4.66536C5.01899 1.33301 5.35812 1.47348 5.60817 1.72353C5.85822 1.97358 5.9987 2.31272 5.9987 2.66634V4.66634C5.9987 4.87333 5.9505 5.07749 5.85793 5.26263C5.76536 5.44777 5.63096 5.60881 5.46536 5.73301L5.15336 5.96701C5.03098 6.06046 4.94471 6.1934 4.90923 6.34324C4.87374 6.49308 4.89122 6.65059 4.9587 6.78901C5.86982 8.63959 7.36831 10.1362 9.22003 11.045Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const MapPinIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M13.3346 6.66634C13.3346 9.99501 9.64197 13.4617 8.40197 14.5323C8.28645 14.6192 8.14583 14.6662 8.0013 14.6662C7.85677 14.6662 7.71615 14.6192 7.60064 14.5323C6.36064 13.4617 2.66797 9.99501 2.66797 6.66634C2.66797 5.25185 3.22987 3.8953 4.23007 2.89511C5.23026 1.89491 6.58681 1.33301 8.0013 1.33301C9.41579 1.33301 10.7723 1.89491 11.7725 2.89511C12.7727 3.8953 13.3346 5.25185 13.3346 6.66634Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M8.0013 8.66634C9.10587 8.66634 10.0013 7.77091 10.0013 6.66634C10.0013 5.56177 9.10587 4.66634 8.0013 4.66634C6.89673 4.66634 6.0013 5.56177 6.0013 6.66634C6.0013 7.77091 6.89673 8.66634 8.0013 8.66634Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const FacebookIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.9987 1.66699H12.4987C11.3936 1.66699 10.3338 2.10598 9.55242 2.88738C8.77102 3.66878 8.33203 4.72859 8.33203 5.83366V8.33366H5.83203V11.667H8.33203V18.3337H11.6654V11.667H14.1654L14.9987 8.33366H11.6654V5.83366C11.6654 5.61265 11.7532 5.40068 11.9094 5.2444C12.0657 5.08812 12.2777 5.00033 12.4987 5.00033H14.9987V1.66699Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const InstagramIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.5846 5.41699H14.593M5.83464 1.66699H14.168C16.4692 1.66699 18.3346 3.53247 18.3346 5.83366V14.167C18.3346 16.4682 16.4692 18.3337 14.168 18.3337H5.83464C3.53345 18.3337 1.66797 16.4682 1.66797 14.167V5.83366C1.66797 3.53247 3.53345 1.66699 5.83464 1.66699ZM13.3346 9.47533C13.4375 10.1689 13.319 10.8772 12.9961 11.4995C12.6732 12.1218 12.1623 12.6265 11.536 12.9417C10.9097 13.2569 10.2 13.3667 9.50779 13.2553C8.81557 13.1439 8.1761 12.8171 7.68033 12.3213C7.18457 11.8255 6.85775 11.1861 6.74636 10.4938C6.63497 9.80162 6.74469 9.0919 7.05991 8.46564C7.37512 7.83937 7.87979 7.32844 8.50212 7.00553C9.12445 6.68261 9.83276 6.56415 10.5263 6.66699C11.2337 6.7719 11.8887 7.10154 12.3944 7.60725C12.9001 8.11295 13.2297 8.76789 13.3346 9.47533Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const TikTokIcon = () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14.5 3c.5 2.6 2.1 4.4 4.7 4.8v3.1c-1.6.1-3.1-.4-4.4-1.3v5.7c0 3.6-2.9 6.5-6.5 6.5S1.8 18.9 1.8 15.3 4.7 8.8 8.3 8.8c.4 0 .8 0 1.2.1v3.2c-.4-.1-.8-.2-1.2-.2-1.8 0-3.3 1.5-3.3 3.4s1.5 3.4 3.3 3.4 3.3-1.5 3.3-3.4V3h2.9z" stroke="#90A1B9" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
    const PinterestIcon = () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2.5c-5.2 0-9.5 4.2-9.5 9.5 0 4 2.5 7.4 6 8.7-.1-.7-.2-1.9 0-2.7.2-.7 1.4-5.9 1.4-5.9s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.4-.9 3.8-.3 1.1.5 2 1.6 2 2 0 3.4-2.5 3.4-5.5 0-2.3-1.5-3.9-4.3-3.9-3.1 0-5.1 2.3-5.1 4.9 0 .9.3 1.8.7 2.3.1.1.1.2.1.3l-.3 1.1c0 .2-.1.2-.3.1-1.3-.6-1.9-2.1-1.9-3.8 0-2.8 2.4-6.2 7.1-6.2 3.8 0 6.3 2.7 6.3 5.7 0 3.9-2.2 6.8-5.4 6.8-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2-1.3 2.7 1.1.3 2.3.5 3.5.5 5.2 0 9.5-4.2 9.5-9.5S17.2 2.5 12 2.5z" stroke="#90A1B9" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    )
    const SnapchatIcon = () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 3.2c2.7 0 4.7 1.9 4.7 4.9v1.3c0 .4.1.8.4 1.1.5.5 1.3.7 2 .5.2 0 .4.2.3.4-.4 1.1-1.5 1.7-2.4 2.2-.4.2-.7.5-.7.9 0 .5.5 1 1.1 1.3.9.4 1.9.7 2.2 1.1.2.3 0 .7-.3.8-1 .4-1.7.2-2.4 0-.3-.1-.6-.1-.9.1-.7.5-1.6 1.2-2.6 1.5-.2.1-.4.1-.6.1h-.8c-.2 0-.4 0-.6-.1-1-.3-1.9-1-2.6-1.5-.3-.2-.6-.2-.9-.1-.7.2-1.4.4-2.4 0-.3-.1-.5-.5-.3-.8.3-.4 1.3-.7 2.2-1.1.6-.3 1.1-.8 1.1-1.3 0-.4-.3-.7-.7-.9-.9-.5-2-1.1-2.4-2.2-.1-.2.1-.4.3-.4.7.2 1.5 0 2-.5.3-.3.4-.7.4-1.1V8.1c0-3 2-4.9 4.7-4.9z" stroke="#90A1B9" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    )
    const pickFooterText = (english, arabic) => (
        isArabic && String(arabic || '').trim() ? arabic : english
    );
    const legalName = pickFooterText(footerContent.legalName, footerContent.legalNameAr);
    const footerDescription = pickFooterText(footerContent.description, footerContent.descriptionAr);
    const operatedByLine = applyFooterTokens(
        pickFooterText(footerContent.operatedBy, footerContent.operatedByAr),
        { legalName },
    );
    const copyrightLine = applyFooterTokens(
        pickFooterText(footerContent.copyright, footerContent.copyrightAr),
        { year: new Date().getFullYear(), legalName },
    );
    const registeredOfficeLines = footerLines(
        pickFooterText(footerContent.registeredOffice, footerContent.registeredOfficeAr),
    );
    const fulfilmentAddressLines = footerLines(
        pickFooterText(footerContent.fulfilmentAddress, footerContent.fulfilmentAddressAr),
    );
    const phoneDisplay = footerPhoneLabel(footerContent.phone);
    const phoneHref = footerPhoneHref(footerContent.phone);
    const visiblePaymentMethods = (footerContent.paymentMethods || [])
        .filter((item) => item.enabled !== false && item.image);
    const socialIconById = {
        facebook: FacebookIcon,
        instagram: InstagramIcon,
        tiktok: TikTokIcon,
        pinterest: PinterestIcon,
        snapchat: SnapchatIcon,
    };
    const socialIcons = (footerContent.socialLinks || [])
        .filter((item) => item.enabled !== false && item.url && socialIconById[item.id])
        .map((item) => ({
            icon: socialIconById[item.id],
            link: item.url,
            label: item.id,
        }));
    const linkSections = (footerContent.columns || [])
        .filter((column) => column.enabled !== false)
        .map((column) => ({
            title: pickFooterText(column.title, column.titleAr),
            links: (column.links || [])
                .filter((link) => link.enabled !== false && link.label && link.href)
                .map((link) => ({
                    text: pickFooterText(link.label, link.labelAr),
                    path: link.href,
                    requiresAuth: link.requiresAuth === true,
                })),
        }))
        .filter((column) => column.title && column.links.length);

    const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.store1920.com&hl=en';

    const renderAppComingSoonPopup = () => {
        if (!appComingSoonOpen || !portalReady) return null;

        return createPortal(
            <div
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4"
                onClick={() => setAppComingSoonOpen(false)}
                role="dialog"
                aria-modal="true"
                aria-label={t('footer.comingSoon')}
            >
                <div
                    className="w-full max-w-[280px] rounded-2xl bg-white px-5 py-4 text-center shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <p className="text-base font-semibold text-slate-900">{t('footer.comingSoon')}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {t('footer.appComingSoonMessage')}
                    </p>
                    <button
                        type="button"
                        onClick={() => setAppComingSoonOpen(false)}
                        className="mt-4 h-10 w-full rounded-lg bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        OK
                    </button>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <footer id="storefront-footer" className="bg-black text-slate-200 border-t border-slate-800 pt-0 pb-[5.25rem] lg:pb-12 lg:pt-12" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className={HOME_SECTION_INNER_CLASS}>
                <div className="space-y-8 py-6 lg:grid lg:grid-cols-6 lg:gap-6 lg:space-y-0 lg:py-2">
                    <div className="min-w-0 lg:col-span-2">
                        {footerLogoLoading ? (
                            <div
                                className="mb-4 animate-pulse rounded-md bg-slate-700/80"
                                style={{
                                    width: Math.min(Number(footerLogo.logoWidth) || 160, 180),
                                    height: Math.min(Number(footerLogo.logoHeight) || 40, 48),
                                }}
                                aria-hidden="true"
                            />
                        ) : (
                            <Link href="/" className="mb-4 inline-block">
                                <Image
                                    src={footerLogo.logoUrl || STORE1920_LOGO_PATH}
                                    alt="Store1920 Logo"
                                    width={footerLogo.logoWidth || 72}
                                    height={footerLogo.logoHeight || 72}
                                    className={footerLogo.usingBrandMark
                                        ? 'h-[64px] w-[64px] rounded-2xl object-contain sm:h-[72px] sm:w-[72px]'
                                        : 'h-auto max-h-12 w-auto object-contain'}
                                    loading="lazy"
                                />
                            </Link>
                        )}
                        <p className="mb-3 max-w-sm text-sm leading-relaxed text-slate-400">
                            {footerDescription}
                        </p>
                        {operatedByLine ? (
                            <p className="mb-5 max-w-sm text-xs text-slate-500 sm:mb-6">
                                {operatedByLine}
                            </p>
                        ) : null}
                        <div className="mb-5 space-y-3 sm:mb-6">
                            {phoneHref ? (
                            <div className="flex items-center gap-2 text-sm">
                                <PhoneIcon />
                                <a href={phoneHref} className="text-slate-400 transition hover:text-white">
                                    {phoneDisplay}
                                </a>
                            </div>
                            ) : null}
                            {footerContent.email ? (
                            <div className="flex items-center gap-2 text-sm">
                                <MailIcon />
                                <a href={`mailto:${footerContent.email}`} className="break-all text-slate-400 transition hover:text-white">
                                    {footerContent.email}
                                </a>
                            </div>
                            ) : null}
                            <div className="flex items-start gap-2 text-sm">
                                <MapPinIcon />
                                <span className="min-w-0 leading-relaxed text-slate-400">
                                    <span className="block text-[11px] uppercase tracking-wide text-slate-500">
                                        {pickFooterText(footerContent.registeredOfficeLabel, footerContent.registeredOfficeLabelAr)}
                                    </span>
                                    {registeredOfficeLines.map((line) => (
                                        <span key={`office-${line}`} className="block">{line}</span>
                                    ))}
                                    <span className="mt-2 block text-[11px] uppercase tracking-wide text-slate-500">
                                        {pickFooterText(footerContent.fulfilmentLabel, footerContent.fulfilmentLabelAr)}
                                    </span>
                                    {fulfilmentAddressLines.map((line) => (
                                        <span key={`fulfilment-${line}`} className="block">{line}</span>
                                    ))}
                                </span>
                            </div>
                        </div>
                        <div className="mb-4 hidden flex-wrap items-center gap-2 lg:flex" aria-label={t('footer.paymentMethods')}>
                            {visiblePaymentMethods.map((method) => (
                                <span
                                    key={method.id}
                                    className="inline-flex h-9 items-center justify-center"
                                    title={method.label}
                                >
                                    <img
                                        src={method.image}
                                        alt={method.label || 'Payment'}
                                        className="h-9 w-auto max-w-[96px] object-contain"
                                    />
                                </span>
                            ))}
                        </div>
                        <div className="hidden items-center gap-2 lg:flex">
                            <a
                                href={PLAY_STORE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex transition hover:opacity-90"
                                aria-label={t('footer.googlePlay')}
                            >
                                <img
                                    src="/badges/google-play.png"
                                    alt={t('footer.googlePlay')}
                                    className="h-11 w-auto object-contain"
                                />
                            </a>
                            <button
                                type="button"
                                onClick={() => setAppComingSoonOpen(true)}
                                className="inline-flex transition hover:opacity-90"
                                aria-label={`${t('footer.appStore')} — ${t('footer.comingSoon')}`}
                            >
                                <img
                                    src="/badges/app-store.png"
                                    alt={t('footer.appStore')}
                                    className="h-11 w-auto object-contain"
                                />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:col-span-4 lg:contents">
                        {linkSections.map((section) => (
                            <div key={section.title} className="min-w-0">
                                <h3 className="mb-3 text-xs font-semibold tracking-wider text-white sm:mb-4 sm:text-sm">
                                    {section.title}
                                </h3>
                                <ul className="space-y-2.5 sm:space-y-3">
                                    {section.links.map((link) => (
                                        <li key={link.path} className="min-w-0">
                                            <Link
                                                href={link.path}
                                                className="inline-block text-sm leading-snug text-slate-400 transition hover:text-white"
                                                onClick={(event) => {
                                                    if (!link.requiresAuth || isSignedIn) return;
                                                    event.preventDefault();
                                                    window.dispatchEvent(new CustomEvent('openSignInModal', {
                                                        detail: { mode: 'login' },
                                                    }));
                                                }}
                                            >
                                                {link.text}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 flex w-full flex-col border-t border-slate-800 py-6 sm:mt-4 sm:py-8">
                    <div className="mb-6 flex flex-col items-center gap-4 lg:hidden">
                        <div className="flex flex-wrap items-center justify-center gap-2" aria-label={t('footer.paymentMethods')}>
                            {visiblePaymentMethods.map((method) => (
                                <span
                                    key={`mobile-${method.id}`}
                                    className="inline-flex h-7 items-center justify-center"
                                    title={method.label}
                                >
                                    <img
                                        src={method.image}
                                        alt={method.label || 'Payment'}
                                        className="h-7 w-auto max-w-[76px] object-contain"
                                    />
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-2.5">
                            <a
                                href={PLAY_STORE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex shrink-0 transition hover:opacity-90"
                                aria-label={t('footer.googlePlay')}
                            >
                                <img
                                    src="/badges/google-play.png"
                                    alt={t('footer.googlePlay')}
                                    className="h-9 w-auto object-contain"
                                />
                            </a>
                            <button
                                type="button"
                                onClick={() => setAppComingSoonOpen(true)}
                                className="inline-flex shrink-0 transition hover:opacity-90"
                                aria-label={`${t('footer.appStore')} — ${t('footer.comingSoon')}`}
                            >
                                <img
                                    src="/badges/app-store.png"
                                    alt={t('footer.appStore')}
                                    className="h-9 w-auto object-contain"
                                />
                            </button>
                        </div>
                    </div>
                    <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center justify-center gap-3 lg:justify-start">
                            {socialIcons.map((item) => (
                                <Link
                                    href={item.link}
                                    key={item.label}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={item.label}
                                    title={item.label}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-white/5 transition hover:border-slate-700 hover:bg-white/10"
                                >
                                    <item.icon />
                                </Link>
                            ))}
                        </div>
                        <p className="px-2 text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
                            {copyrightLine}
                        </p>
                    </div>
                </div>
            </div>
            {renderAppComingSoonPopup()}
        </footer>
    );
};

export default Footer;