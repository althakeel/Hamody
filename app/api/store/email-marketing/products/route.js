import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { buildCategoryLookup, getProductCategoryLabels } from '@/lib/categoryLookup';
import { escapeRegex, normalizeSearchKeyword } from '@/lib/productSearch';
import { mapProductsForEmail } from '@/lib/emailCampaignBuilder';

async function getStoreId(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
    return authSeller(decoded.uid);
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const storeId = await getStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = String(searchParams.get('ids') || '').trim();
    const requestedIds = idsParam
      ? idsParam.split(',').map((id) => id.trim()).filter(Boolean).slice(0, 500)
      : [];
    const selectAll = searchParams.get('all') === '1';
    const defaultLimit = requestedIds.length ? requestedIds.length : 48;
    const maxLimit = requestedIds.length || selectAll ? 500 : 100;
    const limit = Math.min(maxLimit, Math.max(4, Number(searchParams.get('limit') || defaultLimit) || defaultLimit));
    const categoryParam = String(searchParams.get('category') || '').trim();
    const brandParam = String(searchParams.get('brand') || '').trim();
    const tagList = String(searchParams.get('tags') || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 40);
    const source = String(searchParams.get('source') || '').trim().toLowerCase();
    const includeCatalog = searchParams.get('catalog') === '1';
    const q = normalizeSearchKeyword(searchParams.get('q') || searchParams.get('search') || '');

    await connectDB();

    const allCategories = await Category.find({})
      .select('_id name nameAr slug')
      .sort({ name: 1 })
      .lean();
    const categoryLookup = buildCategoryLookup(allCategories);

    const filter = {
      storeId: String(storeId),
    };

    if (requestedIds.length) {
      filter._id = { $in: requestedIds };
    } else if (!(q && q.length >= 2)) {
      // Browse lists prefer in-stock; search / id lookup should still find products.
      filter.inStock = true;
    }

    if (!requestedIds.length && brandParam) {
      filter.brand = { $regex: `^${escapeRegex(brandParam)}$`, $options: 'i' };
    }

    if (!requestedIds.length && tagList.length) {
      filter.tags = { $in: tagList };
    }

    if (!requestedIds.length && categoryParam) {
      const matchedCategory = allCategories.find((item) => {
        const id = String(item._id);
        const name = String(item.name || '').trim();
        return id === categoryParam
          || name === categoryParam
          || name.toLowerCase() === categoryParam.toLowerCase();
      });
      const categoryId = matchedCategory ? String(matchedCategory._id) : categoryParam;
      filter.$or = [
        { category: categoryId },
        { categories: categoryId },
      ];
      if (matchedCategory?.name) {
        filter.$or.push({ categoryName: matchedCategory.name });
      }
    }

    if (!requestedIds.length && q && q.length >= 2) {
      const termRegex = new RegExp(escapeRegex(q), 'i');
      const searchClause = {
        $or: [
          { name: termRegex },
          { nameAr: termRegex },
          { brand: termRegex },
          { brandAr: termRegex },
          { sku: termRegex },
          { slug: termRegex },
          { tags: termRegex },
        ],
      };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, searchClause];
        delete filter.$or;
      } else {
        Object.assign(filter, searchClause);
      }
    }

    let products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(requestedIds.length || selectAll ? limit : (q || categoryParam || brandParam || tagList.length ? Math.max(limit, 60) : 160))
      .select('_id name slug price mrp AED images description shortDescription category categories categoryName stockQuantity inStock brand sku createdAt')
      .lean();

    if (!products.length && !q && !categoryParam && !brandParam && !tagList.length && !requestedIds.length) {
      products = await Product.find({ storeId: String(storeId) })
        .sort({ createdAt: -1 })
        .limit(160)
        .select('_id name slug price mrp AED images description shortDescription category categories categoryName stockQuantity inStock brand sku createdAt')
        .lean();
    }

    const mapped = mapProductsForEmail(
      products.map((product) => {
        const labels = getProductCategoryLabels(product, categoryLookup).filter(Boolean);
        return {
          ...product,
          categoryName: labels[0] || product.categoryName || '',
        };
      }),
    );
    // Keep search / id hits even when thumbnail resolution fails; browse can prefer imaged items.
    const page = (requestedIds.length || selectAll || (q && q.length >= 2)
      ? mapped
      : mapped.filter((product) => Boolean(product.image))
    ).slice(0, limit);

    let brands = [];
    if (includeCatalog) {
      const rawBrands = await Product.distinct('brand', {
        storeId: String(storeId),
        brand: { $nin: [null, ''] },
      });
      brands = Array.from(new Set(
        (rawBrands || []).map((name) => String(name || '').trim()).filter(Boolean),
      )).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    const categories = allCategories
      .map((item) => ({
        id: String(item._id),
        name: String(item.name || '').trim(),
      }))
      .filter((item) => item.id && item.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    const latest = [...page].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const relatedSeed = page[0]?.categoryId || page[0]?.category;
    const related = relatedSeed
      ? page.filter((item) => (
        String(item.categoryId) === String(relatedSeed)
        || String(item.category) === String(relatedSeed)
      ))
      : page;

    return NextResponse.json({
      success: true,
      products: page,
      categories,
      brands,
      categoryNames: categories.map((item) => item.name),
      buckets: {
        featured: page,
        latest,
        related: related.length ? related : page,
      },
      heroImages: page.slice(0, 12).map((product) => product.image).filter(Boolean),
      meta: {
        q,
        category: categoryParam,
        brand: brandParam,
        tags: tagList,
        source,
        total: mapped.length,
      },
    });
  } catch (error) {
    console.error('[email-marketing products]', error);
    return NextResponse.json({ error: error.message || 'Failed to load products' }, { status: 500 });
  }
}
