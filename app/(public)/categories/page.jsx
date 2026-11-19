import { getAllActiveCategories } from '@/lib/categoryPageData';
import CategoriesDirectoryView from '@/components/categories/CategoriesDirectoryView';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { STOREFRONT_PUBLISHED_FILTER } from '@/lib/productVisibility';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata = {
  title: 'Shop by Category | hamody.com',
  description: 'Browse all product categories at hamody.com — electronics, fashion, home, beauty, and more.',
};

function categoryHasImage(category, childrenByParent) {
  if (String(category?.image || '').trim()) return true;
  const children = childrenByParent[String(category?._id)] || [];
  return children.some((child) => categoryHasImage(child, childrenByParent));
}

const CATEGORY_IMAGE_HINTS = {
  cooling: ['fan', 'cooler', 'air', 'purifier'],
  air: ['fan', 'cooler', 'purifier', 'humidifier'],
  heating: ['heat', 'heater', 'warmer', 'stove'],
};

function categoryImageRelevance(productName, categoryName) {
  const name = String(productName || '').toLowerCase();
  const words = String(categoryName || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  let score = 0;
  for (const word of words) {
    if (name.includes(word)) score += 4;
    for (const hint of CATEGORY_IMAGE_HINTS[word] || []) {
      if (name.includes(hint)) score += 3;
    }
  }
  if (/insect|zapper|\bkiller\b/.test(name) && score < 4) score -= 5;
  return score;
}

async function productImagesForCategories(categories) {
  const ids = categories.map((category) => category?._id).filter(Boolean);
  if (!ids.length) return {};

  await connectDB();
  const products = await Product.find({
    $and: [
      STOREFRONT_PUBLISHED_FILTER,
      { $or: [{ category: { $in: ids } }, { categories: { $in: ids } }] },
      { 'images.0': { $exists: true, $nin: ['', null] } },
    ],
  })
    .select('name category categories images')
    .sort({ createdAt: -1 })
    .limit(240)
    .lean();

  const namesById = new Map(categories.map((category) => [String(category._id), category.name || '']));
  const bestById = {};
  for (const product of products) {
    const image = String((Array.isArray(product.images) ? product.images.find(Boolean) : '') || '').trim();
    if (!image) continue;
    const keys = [product.category, ...(Array.isArray(product.categories) ? product.categories : [])];
    for (const key of keys) {
      const id = String(key || '');
      if (!namesById.has(id)) continue;
      const score = categoryImageRelevance(product.name, namesById.get(id));
      if (score <= 0) continue;
      const current = bestById[id];
      if (!current || score > current.score) bestById[id] = { image, score };
    }
  }

  return Object.fromEntries(Object.entries(bestById).map(([id, pick]) => [id, pick.image]));
}

function buildChildrenByParent(allCategories) {
  const childrenByParent = {};

  for (const category of allCategories) {
    const parentId = String(category.parentId || '');
    if (!parentId) continue;
    if (!childrenByParent[parentId]) childrenByParent[parentId] = [];
    childrenByParent[parentId].push(category);
  }

  for (const parentId of Object.keys(childrenByParent)) {
    childrenByParent[parentId] = childrenByParent[parentId].sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name)),
    );
  }

  return childrenByParent;
}

export default async function CategoriesPage() {
  const allCategories = await getAllActiveCategories();
  const hiddenRootIds = new Set(
    allCategories
      .filter((cat) => String(cat.slug || '').toLowerCase() === 'home-living')
      .map((cat) => String(cat._id)),
  );
  const parentCategories = allCategories
    .filter((cat) => !cat.parentId && !hiddenRootIds.has(String(cat._id)))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name)));

  const childrenByParent = buildChildrenByParent(allCategories);
  const missingImages = parentCategories.filter((category) => !categoryHasImage(category, childrenByParent));
  const productImagesById = await productImagesForCategories(missingImages);

  return (
    <CategoriesDirectoryView
      parentCategories={parentCategories}
      childrenByParent={childrenByParent}
      productImagesById={productImagesById}
    />
  );
}
