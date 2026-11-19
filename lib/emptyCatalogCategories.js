import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';
import HomeMenuCategorySettings from '@/models/HomeMenuCategorySettings';
import { invalidateCategoryCaches } from '@/lib/categoryCache';

function referencedCategoryIds(products = []) {
  const used = new Set();
  for (const product of products) {
    const single = String(product?.category || '').trim();
    if (single) used.add(single);
    for (const categoryId of Array.isArray(product?.categories) ? product.categories : []) {
      const value = String(categoryId || '').trim();
      if (value) used.add(value);
    }
  }
  return used;
}

/**
 * When a store has no products left, drop its categories.
 * Categories still referenced by another product are kept.
 */
export async function removeCategoriesIfCatalogEmpty(storeId) {
  const storeKey = String(storeId || '').trim();
  if (!storeKey) return { removed: 0 };

  await connectDB();
  const remaining = await Product.countDocuments({ storeId: storeKey });
  if (remaining > 0) return { removed: 0 };

  const [categories, products] = await Promise.all([
    Category.find({
      $or: [
        { storeId: storeKey },
        { storeId: null },
        { storeId: '' },
        { storeId: { $exists: false } },
      ],
    }).select('_id parentId name slug url storeId').lean(),
    Product.find({}).select('category categories').lean(),
  ]);

  const used = referencedCategoryIds(products);
  const removable = categories.filter((category) => !used.has(String(category._id)));
  if (!removable.length) return { removed: 0 };

  const ids = removable.map((category) => String(category._id));
  try {
    const { redirectRetiredCategories } = await import('@/lib/urlRedirects');
    await redirectRetiredCategories(removable, new Set(ids), categories);
  } catch (error) {
    console.error('[categories] empty catalog redirects', error);
  }

  const result = await Category.deleteMany({ _id: { $in: ids } });
  await HomeMenuCategorySettings.updateMany(
    { storeId: storeKey },
    { $pull: { items: { categoryId: { $in: ids } } } },
  );
  invalidateCategoryCaches();

  return { removed: Number(result?.deletedCount || 0) };
}
