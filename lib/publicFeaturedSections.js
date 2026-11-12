import dbConnect from '@/lib/mongodb';
import CategorySlider from '@/models/CategorySlider';
import Product from '@/models/Product';
import { getCachedData, setCachedData } from '@/lib/cache';
import { FEATURED_SECTIONS_CACHE_KEY } from '@/lib/categorySliderCache';
import { normalizeCategorySliderBackground, normalizeCategorySliderSideImagePosition, normalizeCategorySliderAutoSlide, normalizeCategorySliderAutoSlideInterval, normalizeCategorySliderShowOutOfStock, filterCategorySliderProducts, serializeCategorySliderMobileImageRatio } from '@/lib/categorySliderTheme';
import { serializeCategorySliderViewAll } from '@/lib/categorySliderViewAll';
import { serializeCategorySliderSideImageLink } from '@/lib/categorySliderSideImageLink';
import { ensureCategorySliderSlug } from '@/lib/categorySliderSlug';
import { sortCategorySliders, backfillCategorySliderSortOrdersIfNeeded } from '@/lib/categorySliderOrder';
import { serializeCategorySliderBanner } from '@/lib/categorySliderBanner';
import mongoose from 'mongoose';
import { attachProductRatings } from '@/lib/attachProductRatings';

const SERVER_CACHE_TTL_SECONDS = 120;

function orderProductsByIds(products, ids) {
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  return ids
    .map((id) => productMap.get(String(id)))
    .filter(Boolean);
}

const FEATURED_SECTIONS_SLIM_CACHE_KEY = `${FEATURED_SECTIONS_CACHE_KEY}:slim-v3-side-link`;
const FEATURED_SECTIONS_SHELL_CACHE_KEY = `${FEATURED_SECTIONS_CACHE_KEY}:shell-v1`;
const HOMEPAGE_SECTION_PRODUCT_CAP = 12;

export async function getPublicFeaturedSections({ includeProducts = true } = {}) {
  const cacheKey = includeProducts ? FEATURED_SECTIONS_SLIM_CACHE_KEY : FEATURED_SECTIONS_SHELL_CACHE_KEY;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  await dbConnect();
  await backfillCategorySliderSortOrdersIfNeeded(CategorySlider);

  const sections = sortCategorySliders(
    await CategorySlider.find({})
      .select('sectionType banner title titleAr subtitle subtitleAr slug sideImage sideImageAr mobileImage mobileImageAr mobileImageRatio sideImagePosition sideImageLinkEnabled sideImageLinkTarget sideImageLinkValue cardsPerRow backgroundColor autoSlide autoSlideIntervalMs showOutOfStock viewAllEnabled viewAllTarget viewAllValue productIds storeId sortOrder createdAt updatedAt')
      .lean()
  );

  for (const section of sections) {
    if (!section.slug) {
      section.slug = await ensureCategorySliderSlug(CategorySlider, section);
    }
  }

  const allProductIds = [
    ...new Set(
      sections
        .flatMap((section) => (Array.isArray(section.productIds) ? section.productIds : []))
        .map((id) => String(id || '').trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  const products = includeProducts && allProductIds.length
    ? await attachProductRatings(
        await Product.find({
          _id: { $in: allProductIds },
          published: { $ne: false },
        })
          .select('name nameAr slug sku price mrp AED images category inStock stockQuantity fastDelivery freeShippingEligible useProductsPath imageAspectRatio imageBadgeIds legacySourceId createdAt')
          .lean()
      )
    : [];

  const payload = {
    sections: sections.map((section) => {
      const bannerMeta = serializeCategorySliderBanner(section);
      const productIds = (Array.isArray(section.productIds) ? section.productIds : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
        .slice(0, includeProducts ? undefined : HOMEPAGE_SECTION_PRODUCT_CAP);
      if (bannerMeta.sectionType === 'banner') {
        return {
          _id: section._id,
          storeId: section.storeId,
          title: section.title || '',
          titleAr: section.titleAr || '',
          subtitle: section.subtitle || '',
          subtitleAr: section.subtitleAr || '',
          sortOrder: Number.isFinite(Number(section.sortOrder)) ? Number(section.sortOrder) : 0,
          ...bannerMeta,
          productIds: [],
          products: [],
        };
      }
      return {
        ...section,
        ...bannerMeta,
        titleAr: section.titleAr || '',
        subtitleAr: section.subtitleAr || '',
        sideImageAr: section.sideImageAr || '',
        mobileImage: section.mobileImage || '',
        mobileImageAr: section.mobileImageAr || '',
        ...serializeCategorySliderMobileImageRatio(section.mobileImageRatio),
        cardsPerRow: section.cardsPerRow === 5 ? 5 : 6,
        sideImagePosition: normalizeCategorySliderSideImagePosition(section.sideImagePosition),
        sortOrder: Number.isFinite(Number(section.sortOrder)) ? Number(section.sortOrder) : 0,
        backgroundColor: normalizeCategorySliderBackground(section.backgroundColor),
        autoSlide: normalizeCategorySliderAutoSlide(section.autoSlide),
        autoSlideIntervalMs: normalizeCategorySliderAutoSlideInterval(section.autoSlideIntervalMs),
        showOutOfStock: normalizeCategorySliderShowOutOfStock(section.showOutOfStock),
        ...serializeCategorySliderViewAll(section),
        ...serializeCategorySliderSideImageLink(section),
        productIds,
        products: includeProducts
          ? filterCategorySliderProducts(
            orderProductsByIds(products, productIds),
            section.showOutOfStock,
          )
            .slice(0, HOMEPAGE_SECTION_PRODUCT_CAP)
            .map((product) => {
              const {
                shortDescription,
                shortDescriptionAr,
                shortDescription2,
                specTableRows,
                specTableColumns,
                description,
                descriptionAr,
                ...rest
              } = product || {};
              return {
                ...rest,
                images: Array.isArray(rest.images) ? rest.images.filter(Boolean).slice(0, 1) : [],
              };
            })
          : [],
      };
    }),
  };

  setCachedData(cacheKey, payload, SERVER_CACHE_TTL_SECONDS);
  return payload;
}
