import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import CategorySlider from '@/models/CategorySlider';
import Product from '@/models/Product';
import { attachProductRatings } from '@/lib/attachProductRatings';
import { filterCategorySliderProducts } from '@/lib/categorySliderTheme';
import { categorySliderDefaultPath, normalizeCategorySliderViewAll } from '@/lib/categorySliderViewAll';
import { ensureCategorySliderSlug } from '@/lib/categorySliderSlug';

const PRODUCT_FIELDS = 'name nameAr slug sku price mrp AED images category inStock stockQuantity fastDelivery freeShippingEligible useProductsPath imageAspectRatio imageBadgeIds legacySourceId createdAt shortDescription shortDescriptionAr specTableRows';

function orderProductsByIds(products, ids) {
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  return ids.map((id) => productMap.get(String(id))).filter(Boolean);
}

export async function loadCategorySliderGrid(key) {
  const raw = decodeURIComponent(String(key || '').trim());
  if (!raw) return null;

  await dbConnect();
  const isObjectId = /^[a-f0-9]{24}$/i.test(raw);
  let slider = null;
  let shouldRedirect = false;

  if (isObjectId) {
    slider = await CategorySlider.findById(raw).lean();
    shouldRedirect = true;
  } else {
    slider = await CategorySlider.findOne({ slug: raw }).lean();
    if (!slider) {
      slider = await CategorySlider.findOne({ slugAliases: raw }).lean();
      shouldRedirect = Boolean(slider);
    }
  }

  if (!slider) return null;
  const slug = await ensureCategorySliderSlug(CategorySlider, slider);
  const redirectTo = shouldRedirect || raw !== slug ? categorySliderDefaultPath(slug) : '';

  const viewAll = normalizeCategorySliderViewAll(slider);
  if (!viewAll.viewAllEnabled || viewAll.viewAllTarget !== 'default') return null;

  if (redirectTo) {
    return { redirectTo };
  }

  const productIds = (Array.isArray(slider.productIds) ? slider.productIds : [])
    .map((productId) => String(productId || '').trim())
    .filter((productId) => mongoose.Types.ObjectId.isValid(productId));

  const products = productIds.length
    ? await attachProductRatings(
      await Product.find({
        _id: { $in: productIds },
        published: { $ne: false },
      })
        .select(PRODUCT_FIELDS)
        .lean(),
    )
    : [];

  return {
    slider: {
      _id: String(slider._id),
      title: slider.title || '',
      titleAr: slider.titleAr || '',
      subtitle: slider.subtitle || '',
      subtitleAr: slider.subtitleAr || '',
    },
    products: filterCategorySliderProducts(orderProductsByIds(products, productIds), slider.showOutOfStock),
  };
}
