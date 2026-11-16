import { getAllActiveCategories } from '@/lib/categoryPageData';
import CategoriesDirectoryView from '@/components/categories/CategoriesDirectoryView';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata = {
  title: 'Shop by Category | hamody.com',
  description: 'Browse all product categories at hamody.com — electronics, fashion, home, beauty, and more.',
};

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

  return (
    <CategoriesDirectoryView
      parentCategories={parentCategories}
      childrenByParent={childrenByParent}
    />
  );
}
