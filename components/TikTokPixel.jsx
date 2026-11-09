"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackTikTokPageView } from "@/lib/tiktokPixelTracking";

export default function TikTokPixel() {
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
      if (!window.ttq) {
        if (tries++ < 40) {
          window.setTimeout(fire, 250);
        }
        return;
      }
      trackTikTokPageView({ pagePath: pathOnly });
    };

    fire();
    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
