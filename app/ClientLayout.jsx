"use client";
import { Component, useEffect, useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import ReduxProvider from "@/lib/ReduxProvider";
import Navbar from "@/components/Navbar";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import DynamicMetaTags from "@/components/DynamicMetaTags";
import MetaPixel from "@/components/MetaPixel";
import TikTokPixel from "@/components/TikTokPixel";
import GtmBootstrap from "@/components/GtmBootstrap";
import GtmPageView from "@/components/GtmPageView";
import { Toaster } from "react-hot-toast";
import SilentDomErrorBoundary from "@/components/SilentDomErrorBoundary";
import { installDomReconcileGuard } from "@/lib/domReconcileError";

const SpinWheelWidget = dynamic(() => import("@/components/SpinWheelWidget"), { ssr: false });
const GiveawayCartManager = dynamic(() => import("@/components/GiveawayCartManager"), { ssr: false });
const TawkToWidget = dynamic(() => import("@/components/TawkToWidget"), { ssr: false });
const ScrollToTopButton = dynamic(() => import("@/components/ScrollToTopButton"), { ssr: false });
const AuthSessionGuard = dynamic(() => import("@/components/AuthSessionGuard"), { ssr: false });
const GoogleOneTap = dynamic(() => import("@/components/GoogleOneTap"), { ssr: false });

function DeferredWidgets() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const hideStorefrontChrome = shouldHideStorefrontChrome(pathname);

  useEffect(() => {
    const start = () => setReady(true);
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(start, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <>
      <GiveawayCartManager />
      {!hideStorefrontChrome ? <SpinWheelWidget /> : null}
      <TawkToWidget />
    </>
  );
}

class StorefrontChromeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("[StorefrontChrome]", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback || null;
    return this.props.children;
  }
}

const STOREFRONT_HIDDEN_PREFIXES = ["/store", "/admin"];

function shouldHideStorefrontChrome(pathname) {
  return STOREFRONT_HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
}

export default function ClientLayout({ children, initialStorefrontLanguage = 'en' }) {
  const pathname = usePathname();
  const hideStorefrontChrome = shouldHideStorefrontChrome(pathname);

  useEffect(() => {
    installDomReconcileGuard();
    try {
      window.sessionStorage.removeItem('store1920-chunk-reload');
    } catch {
      // Ignore storage failures.
    }
  }, [pathname]);

  return (
    <ReduxProvider>
      <Suspense fallback={null}>
        <GtmBootstrap />
        <GtmPageView />
        <MetaPixel />
        <TikTokPixel />
      </Suspense>
      <Toaster
        position="top-center"
        containerClassName={hideStorefrontChrome ? 'store-toaster' : 'storefront-toaster'}
        containerStyle={{
          top: hideStorefrontChrome ? 24 : 0,
          bottom: hideStorefrontChrome ? 24 : 0,
          left: 0,
          right: 0,
          zIndex: 2147483000,
          pointerEvents: 'none',
        }}
        toastOptions={
          hideStorefrontChrome
            ? {
                duration: 2500,
                style: {
                  zIndex: 2147483000,
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  maxWidth: '28rem',
                  pointerEvents: 'auto',
                },
              }
            : {
                style: {
                  zIndex: 2147483000,
                  background: 'transparent',
                  boxShadow: 'none',
                  padding: 0,
                  maxWidth: '28rem',
                  pointerEvents: 'none',
                },
              }
        }
      />
      <DynamicMetaTags />
      <AuthSessionGuard />
      {!hideStorefrontChrome ? <GoogleOneTap /> : null}
      <SilentDomErrorBoundary
        className={hideStorefrontChrome ? 'flex h-dvh max-h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50' : 'min-w-0'}
      >
        {!hideStorefrontChrome ? (
          <StorefrontChromeErrorBoundary>
            <TopBar initialLanguage={initialStorefrontLanguage} />
            <Navbar />
          </StorefrontChromeErrorBoundary>
        ) : null}
        {children}
        <DeferredWidgets />
        {!hideStorefrontChrome ? <ScrollToTopButton /> : null}
        {!hideStorefrontChrome ? (
          <StorefrontChromeErrorBoundary>
            <Footer />
          </StorefrontChromeErrorBoundary>
        ) : null}
      </SilentDomErrorBoundary>
    </ReduxProvider>
  );
}
