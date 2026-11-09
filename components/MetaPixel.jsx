"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID } from "@/lib/metaPixelConfig";
import { trackPageView } from "@/lib/metaPixelTracking";
import { ensureMetaClickId } from "@/lib/metaBrowserAttribution";

export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;

    const pathOnly = pathname.split('?')[0];
    if (pathOnly === '/order-success') return;
    if (
      pathOnly.startsWith('/store')
      || pathOnly.startsWith('/admin')
      || pathOnly.startsWith('/dashboard')
    ) return;

    let cancelled = false;
    let tries = 0;

    const fire = () => {
      if (cancelled) return;
      if (!window.fbq) {
        if (tries++ < 40) {
          window.setTimeout(fire, 250);
        }
        return;
      }
      window.fbq('set', 'autoConfig', false, META_PIXEL_ID);
      ensureMetaClickId();
      trackPageView({ pagePath: pathOnly });
    };

    fire();
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
