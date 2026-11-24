import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { invalidateCategoryCaches } from '@/lib/categoryCache';

async function verifyStoreSeller(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const idToken = authHeader.split('Bearer ')[1];
  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(idToken);
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const storeId = await authSeller(decodedToken.uid);
  if (!storeId) {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 401 }) };
  }

  return { userId: decodedToken.uid };
}

function getCategoryDepth(categoryId, categoryById) {
  let depth = 0;
  let current = categoryById.get(String(categoryId));

  while (current?.parentId) {
    depth += 1;
    current = categoryById.get(String(current.parentId));
  }

  return depth;
}

export async function POST(request) {
  try {
    const auth = await verifyStoreSeller(request);
    if (auth.error) return auth.error;

    const { ids } = await request.json();
    if (!Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ error: 'Category ids are required' }, { status: 400 });
    }

    await connectDB();

    const allCategories = await Category.find({}).select('_id parentId name slug url').lean();
    const categoryById = new Map(allCategories.map((category) => [String(category._id), category]));
    const childrenByParent = new Map();
    for (const category of allCategories) {
      const parentId = category.parentId ? String(category.parentId) : '';
      if (!parentId) continue;
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }
      childrenByParent.get(parentId).push(category);
    }

    const idsToDelete = new Set();
    for (const rawId of ids) {
      const categoryId = String(rawId || '').trim();
      if (!categoryId) continue;
      idsToDelete.add(categoryId);
    }

    const sortedIds = [...idsToDelete].sort(
      (left, right) => getCategoryDepth(right, categoryById) - getCategoryDepth(left, categoryById)
    );

    const deleted = [];
    const deletedCategories = [];
    const notFound = [];
    const failed = [];

    for (const categoryId of sortedIds) {
      const category = categoryById.get(categoryId);
      if (!category) {
        notFound.push(categoryId);
        continue;
      }

      const children = childrenByParent.get(categoryId) || [];
      if (children.length > 0) {
        failed.push({
          id: categoryId,
          name: category.name,
          error: 'Delete the subcategories first, then delete this category.',
          subcategoryCount: children.length,
          subcategoryNames: children.map((child) => child.name).filter(Boolean),
        });
        continue;
      }

      await Category.findByIdAndDelete(categoryId);
      deletedCategories.push(category);
      categoryById.delete(categoryId);
      childrenByParent.forEach((childList, parentId) => {
        childrenByParent.set(
          parentId,
          childList.filter((child) => String(child._id) !== categoryId)
        );
      });
      const parentId = category.parentId ? String(category.parentId) : '';
      if (parentId && childrenByParent.has(parentId)) {
        childrenByParent.set(
          parentId,
          childrenByParent.get(parentId).filter((child) => String(child._id) !== categoryId)
        );
      }
      deleted.push(categoryId);
    }

    if (deleted.length) {
      invalidateCategoryCaches();
      try {
        const { redirectRetiredCategories } = await import('@/lib/urlRedirects');
        await redirectRetiredCategories(deletedCategories, idsToDelete, allCategories);
      } catch (error) {
        console.error('[url-redirects] category bulk delete', error);
      }
    }

    return NextResponse.json({
      deleted,
      notFound,
      failed,
      message: `Deleted ${deleted.length} categor${deleted.length === 1 ? 'y' : 'ies'}`,
    }, { status: 200 });
  } catch (error) {
    console.error('[categories bulk-delete]', error);
    return NextResponse.json({ error: 'Failed to delete categories' }, { status: 500 });
  }
}
