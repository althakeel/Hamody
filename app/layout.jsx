import "./globals.css";
import React from "react";
import { cookies, headers } from "next/headers";
import { Montserrat, Poppins, Shadows_Into_Light } from "next/font/google";
import ClientLayout from "./ClientLayout";
import StorefrontLanguageInitScript from "@/components/StorefrontLanguageInitScript";
import EarlyHeadScripts from "@/components/EarlyHeadScripts";
import {
  STOREFRONT_LANGUAGE_COOKIE,
  detectLanguageFromAcceptLanguage,
} from "@/lib/storefrontLanguage";
import { getGtmNoscriptSrc } from "@/lib/gtm";
import { META_PIXEL_ID, getMetaPixelNoscriptSrc } from "@/lib/metaPixelConfig";
import OrganizationJsonLd from "@/components/OrganizationJsonLd";
import { SITE_URL } from "@/lib/sitemapData";
import { getRequestHostFromHeaders, isStagingStoreHost } from "@/lib/stagingHost";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
  preload: true,
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-montserrat",
  preload: false,
});

const shadowsIntoLight = Shadows_Into_Light({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-shadows-into-light",
  preload: false,
});

export async function generateMetadata() {
  const requestHeaders = await headers();
  const staging = isStagingStoreHost(getRequestHostFromHeaders(requestHeaders));

  return {
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: "./",
    },
    title: "store1920 - Shop smarter",
    description:
      "Discover trending gadgets, fashion, home essentials & more at the best price. Fast delivery, secure checkout, and deals you don't want to miss.",
    verification: {
      google: "6_NMAlJb-plXJUzALtGyiXfM4NGylL8AZWUKwguRxzM",
    },
    robots: staging
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
        },
  };
}

// Performance optimization - Prevent auto-zoom on mobile
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
  viewportFit: 'cover',
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const cookieLanguage = cookieStore.get(STOREFRONT_LANGUAGE_COOKIE)?.value;
  const acceptLanguage = String(requestHeaders.get('accept-language') || '');
  const storefrontLanguage = cookieLanguage === 'ar' || cookieLanguage === 'en'
    ? cookieLanguage
    : detectLanguageFromAcceptLanguage(acceptLanguage);
  const isArabic = storefrontLanguage === 'ar';
  const s3PublicUrl = process.env.AWS_S3_PUBLIC_URL || process.env.NEXT_PUBLIC_AWS_S3_PUBLIC_URL;
  let s3Origin = null;
  try {
    if (s3PublicUrl) s3Origin = new URL(s3PublicUrl).origin;
  } catch {}

  const imageKitEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  let imageKitOrigin = null;
  try {
    if (imageKitEndpoint) imageKitOrigin = new URL(imageKitEndpoint).origin;
  } catch {}

  return (
    <html
      lang={storefrontLanguage}
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`${poppins.variable} ${montserrat.variable} ${shadowsIntoLight.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* S3 media preconnect */}
        {s3Origin && (
          <>
            <link rel="dns-prefetch" href={s3Origin} />
            <link rel="preconnect" href={s3Origin} crossOrigin="anonymous" />
          </>
        )}
        {imageKitOrigin && (
          <>
            <link rel="dns-prefetch" href={imageKitOrigin} />
            <link rel="preconnect" href={imageKitOrigin} crossOrigin="anonymous" />
          </>
        )}
        {/* Analytics preconnects intentionally omitted — pixels load after idle/interaction. */}
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
      </head>
      <body className={`${poppins.className} overflow-x-clip antialiased`} suppressHydrationWarning>
        <div id="store1920-root" suppressHydrationWarning>
          <EarlyHeadScripts />
          <StorefrontLanguageInitScript />
          <ClientLayout initialStorefrontLanguage={storefrontLanguage}>{children}</ClientLayout>
          <OrganizationJsonLd />
        </div>
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<iframe src="${getGtmNoscriptSrc()}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe><img height="1" width="1" style="display:none" src="${getMetaPixelNoscriptSrc(META_PIXEL_ID)}" alt="" />`,
          }}
        />
      </body>
    </html>
  );
}
