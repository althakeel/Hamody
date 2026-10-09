import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailCampaignPage from '@/models/EmailCampaignPage';
import Product from '@/models/Product';
import Category from '@/models/Category';
import {
  campaignPageAbsoluteUrl,
  normalizeCampaignPageProductIds,
  slugifyCampaignPageTitle,
  toStoreCampaignPage,
} from '@/lib/emailCampaignPageHelpers';
import { attachProductRatings } from '@/lib/attachProductRatings';
import {
  buildCategoryLookupForProductRefs,
  getProductCategoryLabels,
} from '@/lib/categoryLookup';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { getProductPath } from '@/lib/productUrl';
import { PLACEHOLDER_IMAGE } from '@/lib/mediaUrls';
import { STOREFRONT_PUBLISHED_FILTER } from '@/lib/productVisibility';

export const dynamic = 'force-dynamic';

const CAMPAIGN_PAGE_SIZE = 20;

function mapPublicProduct(product, categoryLabels = []) {
  const id = String(product._id || '');
  const image = getProductThumbnailUrl(product, { fallback: PLACEHOLDER_IMAGE, allowVideo: false });
  const labels = categoryLabels.filter(Boolean);
  return {
    id,
    _id: id,
    name: product.name || '',
    nameAr: product.nameAr || '',
    slug: product.slug || '',
    price: product.salePrice ?? product.price ?? product.AED ?? 0,
    AED: product.AED ?? product.originalPrice ?? product.mrp ?? null,
    originalPrice: product.originalPrice || product.mrp || product.AED || null,
    image: image && image !== PLACEHOLDER_IMAGE ? image : (Array.isArray(product.images) ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url) : '') || '',
    href: getProductPath(product),
    inStock: product.inStock !== false,
    brand: product.brand || '',
    category: labels[0] || '',
    categories: labels,
    averageRating: Number(product.averageRating) || 0,
    ratingCount: Number(product.ratingCount) || 0,
    createdAt: product.createdAt || null,
  };
}

export async function GET(request, { params }) {
  try {
    const { slug: rawSlug } = await params;
    const slug = slugifyCampaignPageTitle(rawSlug);
    if (!slug) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await connectDB();
    const page = await EmailCampaignPage.findOne({
      slug,
      status: 'published',
    }).lean();

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const productIds = normalizeCampaignPageProductIds(page.productIds);
    const { searchParams } = new URL(request.url);
    const pageNumber = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(40, Math.max(1, Number.parseInt(searchParams.get('limit') || String(CAMPAIGN_PAGE_SIZE), 10) || CAMPAIGN_PAGE_SIZE));
    const start = (pageNumber - 1) * limit;
    const pageIds = productIds.slice(start, start + limit);
    let products = [];
    if (pageIds.length) {
      const docs = await Product.find({
        _id: { $in: pageIds },
        ...STOREFRONT_PUBLISHED_FILTER,
      })
        .select('_id name nameAr slug price salePrice originalPrice mrp AED images brand inStock stockQuantity category categories createdAt legacySourceId')
        .lean();
      const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
      const ordered = pageIds.map((id) => byId.get(id)).filter(Boolean);
      const rated = await attachProductRatings(ordered);
      const categoryLookup = await buildCategoryLookupForProductRefs(Category, rated);
      products = rated.map((doc) => mapPublicProduct(doc, getProductCategoryLabels(doc, categoryLookup)));
    }

    const payload = toStoreCampaignPage(page);
    return NextResponse.json({
      success: true,
      page: {
        ...payload,
        publicUrl: campaignPageAbsoluteUrl(page.slug),
      },
      products,
      total: productIds.length,
      pageNumber,
      limit,
      hasMore: start + limit < productIds.length,
    });
  } catch (error) {
    console.error('[public campaign page GET]', error);
    return NextResponse.json({ error: 'Failed to load page' }, { status: 500 });
  }
}
