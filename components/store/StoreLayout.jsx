'use client'
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, Lock, X } from "lucide-react"
import { HAMODY_LOGO_PATH } from "@/lib/brandLogo"
import SellerNavbar from "./StoreNavbar"
import StoreSidebar from "./StoreSidebar"
import StoreOrderNotificationProvider from "./StoreOrderNotificationProvider"

const SellerSidebar = StoreSidebar
import StoreShellSkeleton from "./StoreShellSkeleton"

import axios from "axios"
import { useAuth } from "@/lib/useAuth";
import { usePathname, useRouter } from "next/navigation";
import {
    buildDeniedPermissions,
    canAccessStorePath,
    getFirstAllowedHref,
    getPermissionIdForHref,
    getPermissionLabel,
} from "@/lib/storeDashboardPermissions";
import { readSellerCache, writeSellerCache } from "@/lib/storeDashboardCache";
import StoreActivityLogger from "@/components/store/StoreActivityLogger";

const ACCESS_REFRESH_MS = 5 * 60 * 1000;
const SELLER_WELCOME_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const SELLER_WELCOME_IMAGE = '/seller-welcome-popup.jpg';

function sellerWelcomeNextKey(uid) {
    return `hamody.sellerWelcomeNextAt.${uid}`;
}

let sellerWelcomeUid = '';
let sellerWelcomeDecision = '';
let sellerWelcomeDismissed = false;

function sellerWelcomeName(user, accountName = '') {
    const savedName = String(accountName || '').trim();
    if (savedName && savedName.toLowerCase() !== 'unknown') return savedName;
    const name = String(user?.displayName || user?.name || '').trim();
    if (name && name.toLowerCase() !== 'unknown') return name;
    const emailName = String(user?.email || '').split('@')[0].trim();
    return emailName || 'there';
}

function SellerWelcomeDialog({ user, accountName, storeName, onClose }) {
    const name = sellerWelcomeName(user, accountName);
    const storeLabel = String(storeName || '').trim() || 'HAMODY';
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        const timeout = window.setTimeout(() => onCloseRef.current(), 5 * 60 * 1000);
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onCloseRef.current();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            window.clearTimeout(timeout);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    return (
        <div dir="ltr" lang="en">
            <style>{`
                @keyframes seller-welcome-image {
                    from { opacity: 0; transform: scale(1.03); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
            <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4 lg:hidden">
                <div
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby="seller-welcome-title-compact"
                    className="pointer-events-auto flex w-full max-w-[750px] items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
                >
                    <img src={HAMODY_LOGO_PATH} alt="" className="h-11 w-11 shrink-0 rounded-xl object-contain" />
                    <div className="min-w-0 flex-1">
                        <h2 id="seller-welcome-title-compact" className="truncate text-base font-semibold text-slate-950">
                            Hi, {name}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-600">
                            Welcome to the HAMODY store. Signed in to {storeLabel}.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            <div className="fixed inset-0 z-[80] hidden items-center justify-center bg-slate-950/45 p-6 lg:flex">
                <button type="button" aria-label="Close welcome" className="absolute inset-0" onClick={onClose} />
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="seller-welcome-title"
                    className="relative aspect-[1024/682] w-full max-w-[750px] overflow-hidden rounded-[28px] text-left shadow-[0_28px_70px_rgba(15,23,42,0.32)]"
                    style={{ animation: 'seller-welcome-image 700ms ease-out' }}
                >
                    <h2 id="seller-welcome-title" className="sr-only">Your store, at a glance</h2>
                    <img
                        src={SELLER_WELCOME_IMAGE}
                        alt="Welcome back. Your store, at a glance. Manage orders, track sales, and keep everything moving."
                        className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute rounded-full"
                        style={{ left: '92.4%', top: '9.6%', width: '4.6%', height: '7%' }}
                    />
                    <Link
                        href="/store/orders"
                        onClick={onClose}
                        aria-label="Orders"
                        className="absolute rounded-2xl"
                        style={{ left: '63.2%', top: '48.5%', width: '33.8%', height: '8.8%' }}
                    />
                    <Link
                        href="/store/sales-report"
                        onClick={onClose}
                        aria-label="Sales overview"
                        className="absolute rounded-2xl"
                        style={{ left: '63.2%', top: '59.2%', width: '33.8%', height: '8.8%' }}
                    />
                    <Link
                        href="/store/inventory"
                        onClick={onClose}
                        aria-label="Inventory"
                        className="absolute rounded-2xl"
                        style={{ left: '63.2%', top: '69.5%', width: '33.8%', height: '8.8%' }}
                    />
                    <Link
                        href="/store"
                        onClick={onClose}
                        aria-label="Open dashboard"
                        className="absolute rounded-full"
                        style={{ left: '63.2%', top: '80.2%', width: '33.8%', height: '9.2%' }}
                    />
                </div>
            </div>
        </div>
    );
}

const StoreLayout = ({ children }) => {

    const { user, loading, getToken } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const [isSeller, setIsSeller] = useState(false);
    const [sellerLoading, setSellerLoading] = useState(true);
    const [storeInfo, setStoreInfo] = useState(null);
    const [accountName, setAccountName] = useState("");
    const [accessIssue, setAccessIssue] = useState(null);
    const [dashboardAccess, setDashboardAccess] = useState({
        isOwner: false,
        permissions: buildDeniedPermissions(),
        accessRole: 'member',
        canManageTeamAccess: false,
        canViewActivityHistory: false,
        isSuperAdmin: false,
    });
    const sellerCacheHydratedRef = useRef(false);
    const lastAccessFetchRef = useRef(0);
    const [hasCachedSeller, setHasCachedSeller] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

    const fetchIsSeller = async (retryCount = 0, { silent = false } = {}) => {
        if (!user) {
            setSellerLoading(false);
            setAccessIssue(null);
            return;
        }

        if (!silent && !readSellerCache()) {
            setSellerLoading(true);
        }
        setAccessIssue(null);
        try {
            let token = await getToken(false);
            if (!token) token = await getToken(true);
            if (!token) {
                if (retryCount < 2) {
                    await new Promise((resolve) => setTimeout(resolve, 400 * (retryCount + 1)));
                    return fetchIsSeller(retryCount + 1, { silent });
                }
                setAccessIssue({
                    type: 'missing-token',
                    message: 'Your login session is not ready yet. Please wait a moment and retry — you do not need to sign out.',
                });
                setSellerLoading(false);
                return;
            }
            const { data } = await axios.get('/api/store/is-seller', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsSeller(data.isSeller);
            setStoreInfo(data.storeInfo);
            setAccountName(String(data.accountName || "").trim());
            const nextAccess = {
                isOwner: Boolean(data.isOwner),
                permissions: data.permissions || buildDeniedPermissions(),
                accessRole: data.accessRole || 'member',
                canManageTeamAccess: Boolean(data.canManageTeamAccess),
                canViewActivityHistory: Boolean(data.canViewActivityHistory),
                isSuperAdmin: Boolean(data.isSuperAdmin),
            };
            setDashboardAccess(nextAccess);
            writeSellerCache({
                isSeller: data.isSeller,
                storeInfo: data.storeInfo,
                accountName: String(data.accountName || "").trim(),
                dashboardAccess: nextAccess,
            });
            setHasCachedSeller(true);
            lastAccessFetchRef.current = Date.now();
            if (!data.isSeller) {
                setAccessIssue({
                    type: data.reason || 'not-seller',
                    message: data.reason === 'not-seller-or-not-approved'
                        ? 'Your account does not have seller access for this store.'
                        : data.reason === 'server-error'
                        ? 'The server could not verify seller access. Please retry.'
                        : 'Unable to verify seller access.',
                });
            }
        } catch (error) {
            const status = error?.response?.status;
            const reason = error?.response?.data?.reason;
            const isNetworkError = !error?.response && (
                error?.code === 'ERR_NETWORK'
                || String(error?.message || '').toLowerCase().includes('network error')
            );
            const canRetry = retryCount < 2 && (status >= 500 || status === 503 || !status);

            if (canRetry) {
                await new Promise((resolve) => setTimeout(resolve, 400 * (retryCount + 1)));
                return fetchIsSeller(retryCount + 1);
            }

            setIsSeller(false);
            setAccessIssue({
                type: isNetworkError
                    ? 'server-offline'
                    : reason || (status === 503 ? 'database-unavailable' : 'request-failed'),
                message: isNetworkError
                    ? 'Cannot reach the app server. Run `npm run dev` in the project folder, then click Retry.'
                    : reason === 'database-unavailable' || status === 503
                    ? 'The dashboard cannot verify access right now because the database is unreachable.'
                    : error?.response?.data?.message || 'Failed to verify seller access. Please retry.',
            });
        } finally {
            setSellerLoading(false);
        }
    };

    useEffect(() => {
        if (sellerCacheHydratedRef.current) return;
        sellerCacheHydratedRef.current = true;
        const cached = readSellerCache();
        if (!cached) return;
        setHasCachedSeller(true);
        setIsSeller(Boolean(cached.isSeller));
        setStoreInfo(cached.storeInfo || null);
        setAccountName(String(cached.accountName || "").trim());
        setDashboardAccess(cached.dashboardAccess || {
            isOwner: false,
            permissions: buildDeniedPermissions(),
            accessRole: 'member',
            canManageTeamAccess: false,
            canViewActivityHistory: false,
        });
        setSellerLoading(false);
    }, []);

    useEffect(() => {
        if (!loading && user) {
            fetchIsSeller(0, { silent: Boolean(readSellerCache()) });
        }
    }, [loading, user]);

    useEffect(() => {
        const refreshAccess = () => {
            if (!user) return;
            if (Date.now() - lastAccessFetchRef.current < ACCESS_REFRESH_MS) return;
            fetchIsSeller(0, { silent: true });
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') refreshAccess();
        };

        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [user]);

    useEffect(() => {
        if (loading || sellerLoading || !isSeller || !user?.uid || !storeInfo) return;
        if (sellerWelcomeUid !== user.uid) {
            sellerWelcomeUid = user.uid;
            sellerWelcomeDecision = '';
            sellerWelcomeDismissed = false;
        }
        if (sellerWelcomeDismissed) return;
        const welcomeEnabled = storeInfo.dashboardWelcomeEnabled !== false;
        if (!welcomeEnabled) {
            sellerWelcomeDecision = 'hide';
            setShowWelcome(false);
            return;
        }
        if (sellerWelcomeDecision === 'show') {
            setShowWelcome(true);
            return;
        }
        try {
            const nextAt = Number(localStorage.getItem(sellerWelcomeNextKey(user.uid)) || 0);
            if (nextAt && Date.now() < nextAt) {
                sellerWelcomeDecision = 'hide';
                return;
            }
            localStorage.setItem(sellerWelcomeNextKey(user.uid), String(Date.now() + SELLER_WELCOME_COOLDOWN_MS));
        } catch {
            // Show the welcome if storage cannot be read.
        }
        sellerWelcomeDecision = 'show';
        setShowWelcome(true);
    }, [loading, sellerLoading, isSeller, user, storeInfo]);

    const dismissWelcome = () => {
        sellerWelcomeDismissed = true;
        setShowWelcome(false);
    };

    const showAuthShell = (loading || sellerLoading) && !hasCachedSeller && !(isSeller && storeInfo);

    const canViewCurrentPage = useMemo(
        () => canAccessStorePath(pathname, dashboardAccess.permissions, {
            isOwner: dashboardAccess.isOwner,
            canViewActivityHistory: dashboardAccess.canViewActivityHistory,
        }),
        [pathname, dashboardAccess.permissions, dashboardAccess.isOwner, dashboardAccess.canViewActivityHistory]
    );

    useEffect(() => {
        if (sellerLoading || !isSeller || dashboardAccess.isOwner || canViewCurrentPage) return;

        const fallbackHref = getFirstAllowedHref(dashboardAccess.permissions, {
            isOwner: dashboardAccess.isOwner,
        });

        if (fallbackHref && fallbackHref !== pathname) {
            router.replace(fallbackHref);
        }
    }, [
        sellerLoading,
        isSeller,
        dashboardAccess.isOwner,
        dashboardAccess.permissions,
        canViewCurrentPage,
        pathname,
        router,
    ]);

    const blockedPermissionId = getPermissionIdForHref(pathname);
    const blockedPageLabel = getPermissionLabel(blockedPermissionId);

    return showAuthShell ? (
        <StoreShellSkeleton />
    ) : !user ? (
            <div className="flex h-full max-h-full min-h-0 flex-col items-center justify-center overflow-y-auto px-6 text-center">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">Authentication Required</h1>
            <p className="text-slate-500 mt-4 mb-8">Please sign in to access the store dashboard</p>
            <Link href="/store/login" className="bg-blue-600 text-white flex items-center gap-2 p-3 px-8 rounded-full hover:bg-blue-700 transition">
                Sign In
            </Link>
            <Link href="/" className="bg-slate-700 text-white flex items-center gap-2 mt-4 p-2 px-6 max-sm:text-sm rounded-full">
                Go to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    ) : isSeller ? (
        <StoreOrderNotificationProvider
            getToken={getToken}
            storeId={storeInfo?._id || storeInfo?.id || null}
            isOwner={dashboardAccess.isOwner}
            permissions={dashboardAccess.permissions}
        >
        <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden bg-slate-50">
            {showWelcome ? (
                <SellerWelcomeDialog
                    user={user}
                    accountName={accountName}
                    storeName={storeInfo?.name}
                    onClose={dismissWelcome}
                />
            ) : null}
            <SellerNavbar
                storeInfo={storeInfo}
                accountName={accountName}
                isOwner={dashboardAccess.isOwner}
                isSuperAdmin={dashboardAccess.isSuperAdmin}
                permissions={dashboardAccess.permissions}
                canViewActivityHistory={dashboardAccess.canViewActivityHistory}
            />
            <div className="flex min-h-0 flex-1 overflow-hidden">
                <StoreActivityLogger />
                <SellerSidebar
                    storeInfo={storeInfo}
                    isOwner={dashboardAccess.isOwner}
                    isSuperAdmin={dashboardAccess.isSuperAdmin}
                    permissions={dashboardAccess.permissions}
                    canViewActivityHistory={dashboardAccess.canViewActivityHistory}
                />
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-3 sm:p-4 lg:p-5">
                    {canViewCurrentPage ? children : (
                        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                <Lock size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">Access locked</h2>
                            <p className="mt-2 max-w-md text-sm text-slate-600">
                                You do not have permission to view {blockedPageLabel}. Ask the store owner to enable this area in Settings → Dashboard Access.
                            </p>
                            <Link
                                href={getFirstAllowedHref(dashboardAccess.permissions, { isOwner: dashboardAccess.isOwner }) || '/'}
                                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                                {getFirstAllowedHref(dashboardAccess.permissions, { isOwner: dashboardAccess.isOwner })
                                    ? 'Go to allowed page'
                                    : 'Leave dashboard'}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </StoreOrderNotificationProvider>
    ) : (
        <div className="flex h-full max-h-full min-h-0 flex-col items-center justify-center overflow-y-auto px-6 text-center">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">
                {accessIssue?.type === 'database-unavailable'
                    ? 'Store Dashboard Temporarily Unavailable'
                    : accessIssue?.type === 'server-offline'
                    ? 'App Server Is Not Running'
                    : 'You are not authorized to access this page'}
            </h1>
            <p className="text-slate-500 mt-4 mb-6 max-w-xl">
                {accessIssue?.message || 'Your account does not have seller access'}
            </p>
            {accessIssue?.type === 'database-unavailable' || accessIssue?.type === 'request-failed' || accessIssue?.type === 'server-error' || accessIssue?.type === 'server-offline' || accessIssue?.type === 'missing-token' ? (
                <button
                    type="button"
                    onClick={() => fetchIsSeller()}
                    className="bg-amber-600 text-white flex items-center gap-2 p-2 px-6 max-sm:text-sm rounded-full hover:bg-amber-700 transition"
                >
                    Retry Access Check
                </button>
            ) : (
                <Link href="/support" className="bg-blue-600 text-white flex items-center gap-2 p-2 px-6 max-sm:text-sm rounded-full hover:bg-blue-700 transition">
                    Contact Support
                </Link>
            )}
            <Link href="/" className="bg-slate-700 text-white flex items-center gap-2 mt-4 p-2 px-6 max-sm:text-sm rounded-full">
                Go to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    )
}

export default StoreLayout