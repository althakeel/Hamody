import dbConnect from "@/lib/mongodb";
import HomeSection from "@/models/HomeSection";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import { STOREFRONT_IN_STOCK_FILTER, STOREFRONT_PUBLISHED_FILTER, isStorefrontProductInStock } from '@/lib/productVisibility';
import { getCachedData, setCachedData } from '@/lib/cache';

const HOME_SECTIONS_CACHE_KEY = 'public:home-sections:v1';
const HOME_SECTIONS_CACHE_TTL = 120;

const PRODUCT_SELECT = '_id name price mrp AED images inStock stockQuantity';

function mapSectionProducts(productIds, productMap) {
  return (productIds || [])
    .map((id) => productMap.get(String(id)))
    .filter((product) => product && isStorefrontProductInStock(product))
    .map((product) => ({
      ...product,
      id: product._id.toString(),
      image: product.images?.[0] || null,
      offLabel:
        product.AED && product.AED > product.price
          ? `Min. ${Math.max(0, Math.round(((product.AED - product.price) / product.AED) * 100))}% Off`
          : null,
    }));
}

// GET /api/home/sections
// Returns active homepage selections with product details and optional slides
export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ sections: [] });
    }

    const cached = getCachedData(HOME_SECTIONS_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'X-Cache': 'HIT',
        },
      });
    }

    await dbConnect();
    const selections = await HomeSection.find({ isActive: true })
      .select('section title subtitle slides layout bannerCtaText bannerCtaLink productIds')
      .sort({ sortOrder: 1 })
      .lean();

    const allProductIds = [
      ...new Set(
        selections
          .flatMap((selection) => (Array.isArray(selection.productIds) ? selection.productIds : []))
          .map((id) => String(id || '').trim())
          .filter(Boolean)
      ),
    ];

    const products = allProductIds.length
      ? await Product.find({
          _id: { $in: allProductIds },
          ...STOREFRONT_PUBLISHED_FILTER,
          ...STOREFRONT_IN_STOCK_FILTER,
        }).select(PRODUCT_SELECT).lean()
      : [];

    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const payload = selections.map((selection) => ({
      id: selection._id.toString(),
      key: selection.section,
      title: selection.title,
      subtitle: selection.subtitle,
      slides: selection.slides || [],
      layout: selection.layout,
      bannerCtaText: selection.bannerCtaText,
      bannerCtaLink: selection.bannerCtaLink,
      products: mapSectionProducts(selection.productIds, productMap),
    }));

    const body = { sections: payload };
    setCachedData(HOME_SECTIONS_CACHE_KEY, body, HOME_SECTIONS_CACHE_TTL);

    return NextResponse.json(
      body,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error("/api/home/sections error", error);
    return NextResponse.json({ sections: [] });
  }
}
