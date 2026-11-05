import dbConnect from '@/lib/mongodb';
import CategorySlider from '@/models/CategorySlider';
import Product from '@/models/Product';
import { getCachedData, setCachedData } from '@/lib/cache';
import { FEATURED_SECTIONS_CACHE_KEY } from '@/lib/categorySliderCache';
import { normalizeCategorySliderBackground, normalizeCategorySliderSideImagePosition, normalizeCategorySliderAutoSlide, normalizeCategorySliderAutoSlideInterval, normalizeCategorySliderShowOutOfStock, filterCategorySliderProducts, serializeCategorySliderMobileImageRatio } from '@/lib/categorySliderTheme';
import { serializeCategorySliderViewAll } from '@/lib/categorySliderViewAll';
import { ensureCategorySliderSlug } from '@/lib/categorySliderSlug';
import { sortCategorySliders, backfillCategorySliderSortOrdersIfNeeded } from '@/lib/categorySliderOrder';
import mongoose from 'mongoose';
import { attachProductRatings } from '@/lib/attachProductRatings';

const SERVER_CACHE_TTL_SECONDS = 120;

function orderProductsByIds(products, ids) {
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  return ids
    .map((id) => productMap.get(String(id)))
    .filter(Boolean);
}

export async function getPublicFeaturedSections() {
  const cached = getCachedData(FEATURED_SECTIONS_CACHE_KEY);
  if (cached) return cached;

  await dbConnect();
  await backfillCategorySliderSortOrdersIfNeeded(CategorySlider);

  const sections = sortCategorySliders(
    await CategorySlider.find({})
      .select('title titleAr subtitle subtitleAr slug sideImage sideImageAr mobileImage mobileImageAr mobileImageRatio sideImagePosition cardsPerRow backgroundColor autoSlide autoSlideIntervalMs showOutOfStock viewAllEnabled viewAllTarget viewAllValue productIds storeId sortOrder createdAt updatedAt')
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

  const products = allProductIds.length
    ? await attachProductRatings(
        await Product.find({
          _id: { $in: allProductIds },
          published: { $ne: false },
        })
          .select('name nameAr slug sku price mrp AED images category inStock stockQuantity fastDelivery freeShippingEligible useProductsPath imageAspectRatio imageBadgeIds legacySourceId createdAt shortDescription shortDescriptionAr specTableRows')
          .lean()
      )
    : [];

  const payload = {
    sections: sections.map((section) => {
      const productIds = Array.isArray(section.productIds) ? section.productIds : [];
      return {
        ...section,
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
        products: filterCategorySliderProducts(
          orderProductsByIds(products, productIds),
          section.showOutOfStock,
        ).map((product) => ({
          ...product,
          images: Array.isArray(product.images) ? product.images.slice(0, 4) : [],
        })),
      };
    }),
  };

  setCachedData(FEATURED_SECTIONS_CACHE_KEY, payload, SERVER_CACHE_TTL_SECONDS);
  return payload;
}
