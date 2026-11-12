import { cookies, headers } from "next/headers";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { getProductPageData } from "@/lib/productPageData";
import { resolveStorefrontLanguage } from "@/lib/storefrontLanguage";
import { resolveProductPage } from "@/lib/productPageRoute";
import { resolveProductSlugRedirect } from "@/lib/productRedirects";
import ProductPageClient from "@/components/ProductPageClient";
import ProductJsonLd from "@/components/ProductJsonLd";
import { getProductCanonicalUrl } from "@/lib/productSeo";
import { getProductThumbnailUrl } from "@/lib/productMedia";
import { PLACEHOLDER_IMAGE } from "@/lib/mediaUrls";

export const revalidate = 120;

async function getStorefrontLanguage() {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  return resolveStorefrontLanguage({ cookies: cookieStore, headers: requestHeaders });
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = String(resolvedParams?.slug || "").trim();
  if (!slug) notFound();

  if (resolveProductSlugRedirect(slug)) {
    return { title: "Redirecting…" };
  }

  try {
    const language = await getStorefrontLanguage();
    const data = await getProductPageData(slug, language);
    const product = data?.product;

    if (!product) notFound();

    const keywords = Array.isArray(product.seoKeywords) && product.seoKeywords.length > 0
      ? product.seoKeywords
      : (Array.isArray(product.tags) ? product.tags : []);

    const canonical = getProductCanonicalUrl(product);
    const title = String(product.seoTitle || product.name || "Product").trim();
    const description = String(product.seoDescription || product.shortDescription || "").trim();
    const shareImage = getProductThumbnailUrl(product);
    const shareImages = shareImage && shareImage !== PLACEHOLDER_IMAGE
      ? [{ url: shareImage, alt: String(product.name || title).trim() }]
      : undefined;

    return {
      title,
      description,
      keywords: keywords.length > 0 ? keywords.join(", ") : undefined,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        ...(shareImages ? { images: shareImages } : {}),
      },
      twitter: shareImages
        ? { card: "summary_large_image", title, description, images: [shareImage] }
        : undefined,
    };
  } catch (error) {
    unstable_rethrow(error);
    return { title: "Product" };
  }
}

export default async function ProductsSlugProductPage({ params }) {
  const resolvedParams = await params;
  const slug = String(resolvedParams?.slug || "").trim();

  const slugRedirect = resolveProductSlugRedirect(slug);
  if (slugRedirect) {
    redirect(slugRedirect);
  }

  const language = await getStorefrontLanguage();
  const initialData = await resolveProductPage(slug, language, "products");

  return (
    <>
      <ProductJsonLd
        product={initialData.product}
        reviews={initialData.reviews}
        categoryChain={initialData.categoryChain || initialData.product?.categoryChain}
      />
      <ProductPageClient slug={slug} initialData={initialData} />
    </>
  );
}
