
'use client'
import GuestOrderLinker from "@/components/GuestOrderLinker";
import SilentDomErrorBoundary from "@/components/SilentDomErrorBoundary";
import dynamic from "next/dynamic";
import { useEffect, Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { isProductDetailPath } from "@/lib/productUrl";

const MobileBottomNav = dynamic(() => import("@/components/MobileBottomNav"), {
  ssr: false,
  loading: () => null,
});
const UtmTracker = dynamic(() => import("@/components/UtmTracker"), { ssr: false });
const EmailTrackCapture = dynamic(() => import("@/components/EmailTrackCapture"), { ssr: false });
const AdsAttribution = dynamic(() => import("@/components/AdsAttribution"), { ssr: false });
const CustomerSessionTracker = dynamic(() => import("@/components/CustomerSessionTracker"), { ssr: false });
const HeatmapClickTracker = dynamic(() => import("@/components/HeatmapClickTracker"), { ssr: false });

function DeferredTrackers() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let started = false;
        let idleId = null;
        let timerId = null;

        const cleanup = () => {
            ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((eventName) => {
                window.removeEventListener(eventName, start, { capture: true });
            });
            if (idleId != null && typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(idleId);
            }
            if (timerId != null) window.clearTimeout(timerId);
        };

        const start = () => {
            if (cancelled || started) return;
            started = true;
            cleanup();
            setReady(true);
        };

        // Keep first scroll/clicks free of heatmap/session capture listeners.
        ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((eventName) => {
            window.addEventListener(eventName, start, { once: true, passive: true, capture: true });
        });

        if (typeof window.requestIdleCallback === 'function') {
            idleId = window.requestIdleCallback(start, { timeout: 6000 });
        } else {
            timerId = window.setTimeout(start, 5000);
        }

        return () => {
            cancelled = true;
            cleanup();
        };
    }, []);

    if (!ready) return null;

    return (
        <>
            <UtmTracker />
            <EmailTrackCapture />
            <AdsAttribution />
            <CustomerSessionTracker />
            <HeatmapClickTracker />
        </>
    );
}

function PublicLayoutContent({ children }) {
    const pathname = usePathname();
    const isCheckout = pathname === '/checkout';
    const isCartPage = pathname === '/cart';
    const isProductPage = isProductDetailPath(pathname);
    const isHomePage = pathname === '/';
    const showMobileBottomNav = !isCheckout && !isProductPage;
    const mobileMainPadding = isProductPage
        ? 'pb-0'
        : isCheckout
            ? 'pb-8'
            : isHomePage
                ? 'pb-0'
                : 'pb-[5.25rem]';

    return (
        <div className={`flex flex-col ${isCartPage || isProductPage ? '' : 'min-h-screen'}`}>
            <GuestOrderLinker />
            <DeferredTrackers />
            <main className={`${isProductPage ? '' : 'flex flex-1 flex-col'} min-w-0 overflow-x-clip ${mobileMainPadding} lg:pb-0`}>
                <SilentDomErrorBoundary className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</SilentDomErrorBoundary>
            </main>
            {showMobileBottomNav && <MobileBottomNav />}
        </div>
    );
}

function PublicLayoutAuthed({ children }) {
    return (
        <Suspense fallback={<div className="flex flex-col"><main className="flex-1 pb-[5.25rem] lg:pb-0" /></div>}>
            <PublicLayoutContent>{children}</PublicLayoutContent>
        </Suspense>
    );
}

export default function PublicLayout(props) {
    return <PublicLayoutAuthed {...props} />;
}
