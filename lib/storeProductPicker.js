import mongoose from 'mongoose';
import { escapeRegex, normalizeSearchKeyword, buildFlexibleSkuRegex } from '@/lib/productSearch';
import { matchesDetailsProgressFilter } from '@/lib/productDetailCompleteness';

const PICKER_FIELDS = '_id name slug sku price AED mrp inStock published stockQuantity fastDelivery freeShippingEligible createdAt images externalImages category categories tags hasVariants imageAspectRatio appDiscountEnabled appDiscountType appDiscountValue';
const MANAGE_LIST_FIELDS = PICKER_FIELDS;

const PICKER_SEARCH_MIN_LENGTH = 2;

function buildPickerTermMatchers(term = '', { categoryIds = [], supplierIds = [] } = {}) {
  const normalized = String(term || '').trim();
  if (!normalized) return [];

  const termRegex = new RegExp(escapeRegex(normalized), 'i');
  const exactRegex = new RegExp(`^${escapeRegex(normalized)}$`, 'i');
  const skuFlexible = buildFlexibleSkuRegex(normalized);

  const matchers = [
    { name: termRegex },
    { nameAr: termRegex },
    { brand: termRegex },
    { brandAr: termRegex },
    { sku: termRegex },
    { slug: termRegex },
    { tags: termRegex },
    { sku: exactRegex },
    { slug: exactRegex },
    { 'variants.sku': termRegex },
    { 'variants.name': termRegex },
    { supplierName: termRegex },
    { supplierNames: termRegex },
  ];

  if (skuFlexible) {
    matchers.push(
      { sku: skuFlexible },
      { 'variants.sku': skuFlexible },
    );
  }

  if (Array.isArray(categoryIds) && categoryIds.length) {
    matchers.push(
      { category: { $in: categoryIds } },
      { categories: { $in: categoryIds } },
    );
  }

  if (Array.isArray(supplierIds) && supplierIds.length) {
    matchers.push(
      { supplierId: { $in: supplierIds } },
      { supplierIds: { $in: supplierIds } },
      { supplierName: termRegex },
      { supplierNames: termRegex },
    );
  }

  return matchers;
}

export function buildPickerSearchClause(search = '', { categoryIds = [], supplierIds = [] } = {}) {
  const normalized = normalizeSearchKeyword(search);
  if (!normalized || normalized.length < PICKER_SEARCH_MIN_LENGTH) return null;

  const words = normalized.split(' ').filter(Boolean);
  const hasCategoryIds = Array.isArray(categoryIds) && categoryIds.length > 0;
  const hasSupplierIds = Array.isArray(supplierIds) && supplierIds.length > 0;

  if (words.length > 1) {
    const wordClause = {
      $and: words.map((word) => ({ $or: buildPickerTermMatchers(word) })),
    };
    const extras = [];
    if (hasCategoryIds) {
      extras.push(
        { category: { $in: categoryIds } },
        { categories: { $in: categoryIds } },
      );
    }
    if (hasSupplierIds) {
      extras.push(
        { supplierId: { $in: supplierIds } },
        { supplierIds: { $in: supplierIds } },
      );
    }
    if (!extras.length) return wordClause;
    return { $or: [wordClause, ...extras] };
  }

  return { $or: buildPickerTermMatchers(normalized, { categoryIds, supplierIds }) };
}

export async function resolveCategoryIdsForSearch(Category, search = '') {
  const normalized = normalizeSearchKeyword(search);
  if (!normalized || normalized.length < PICKER_SEARCH_MIN_LENGTH || !Category) return [];

  const termRegex = new RegExp(escapeRegex(normalized), 'i');
  const categories = await Category.find({
    $or: [
      { name: termRegex },
      { nameAr: termRegex },
      { slug: termRegex },
    ],
  })
    .select('_id')
    .limit(30)
    .lean();

  return [...new Set(
    categories
      .map((category) => String(category?._id || '').trim())
      .filter(Boolean),
  )];
}

export async function resolveSupplierIdsForSearch(storeId, search = '') {
  const normalized = normalizeSearchKeyword(search);
  if (!normalized || normalized.length < PICKER_SEARCH_MIN_LENGTH || !storeId) return [];

  const mongoose = (await import('mongoose')).default;
  const Supplier = (await import('@/models/Supplier')).default;
  const termRegex = new RegExp(escapeRegex(normalized), 'i');
  const storeKeys = [storeId, String(storeId)];
  if (/^[a-fA-F0-9]{24}$/.test(String(storeId))) {
    storeKeys.push(new mongoose.Types.ObjectId(String(storeId)));
  }

  const suppliers = await Supplier.find({
    storeId: { $in: storeKeys },
    $or: [
      { name: termRegex },
      { company: termRegex },
      { contactName: termRegex },
    ],
  })
    .select('_id')
    .limit(30)
    .lean();

  const ids = [];
  const seen = new Set();
  for (const supplier of suppliers) {
    const raw = String(supplier?._id || '').trim();
    if (!/^[a-fA-F0-9]{24}$/.test(raw) || seen.has(raw)) continue;
    seen.add(raw);
    ids.push(new mongoose.Types.ObjectId(raw), raw);
  }
  return ids;
}

function parseOptionalCount(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

function parseOptionalPrice(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export function buildPickerFilter(storeId, search = '', category = '', {
  categoryIds = [],
  filterCategoryIds = [],
  filterTags = [],
  supplierIds = [],
  minPrice = '',
  maxPrice = '',
  sku = '',
  brand = '',
  brands = [],
  supplierId = '',
  supplierName = '',
  inStock = '',
  skuStatus = '',
  minSold = '',
  minStock = '',
  priceAbove = '',
  appDiscount = '',
} = {}) {
  // Product.storeId is stored as a string — never pass a raw ObjectId here.
  const filter = { storeId: String(storeId || '').trim() };
  const query = String(search || '').trim();
  const categoryId = String(category || '').trim();
  const skuQuery = String(sku || '').trim();
  const brandQuery = String(brand || '').trim();
  const brandNames = (Array.isArray(brands) ? brands : [])
    .map((name) => String(name || '').trim())
    .filter(Boolean)
    .slice(0, 80);
  const supplierQuery = String(supplierId || '').trim();
  const stockFilter = String(inStock || '').trim().toLowerCase();
  const andClauses = [];

  const selectedCategoryIds = Array.isArray(filterCategoryIds)
    ? filterCategoryIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  if (selectedCategoryIds.length) {
    andClauses.push({
      $or: [
        { category: { $in: selectedCategoryIds } },
        { categories: { $in: selectedCategoryIds } },
      ],
    });
  } else if (categoryId) {
    andClauses.push({
      $or: [
        { category: categoryId },
        { categories: categoryId },
      ],
    });
  }

  const selectedTags = Array.isArray(filterTags)
    ? filterTags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : [];
  if (selectedTags.length) {
    andClauses.push({ tags: { $in: selectedTags } });
  }

  const searchClause = buildPickerSearchClause(query, { categoryIds, supplierIds });
  if (searchClause) {
    andClauses.push(searchClause);
  }

  if (skuQuery) {
    andClauses.push({
      sku: { $regex: escapeRegex(skuQuery), $options: 'i' },
    });
  }

  const skuStatusFilter = String(skuStatus || '').trim().toLowerCase();
  if (skuStatusFilter === 'missing' || skuStatusFilter === 'none' || skuStatusFilter === 'empty') {
    andClauses.push({
      $or: [
        { sku: { $exists: false } },
        { sku: null },
        { sku: '' },
        { sku: /^\s*$/ },
      ],
    });
  } else if (skuStatusFilter === 'has') {
    andClauses.push({
      sku: { $regex: /\S/ },
    });
  }

  const exactBrandClause = (name) => ({
    $or: [
      { brand: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } },
      { brandAr: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } },
    ],
  });
  if (brandNames.length) {
    andClauses.push({ $or: brandNames.flatMap((name) => exactBrandClause(name).$or) });
  } else if (brandQuery) {
    andClauses.push(exactBrandClause(brandQuery));
  }

  if (supplierQuery && /^[a-fA-F0-9]{24}$/.test(supplierQuery)) {
    const supplierObjectId = new mongoose.Types.ObjectId(supplierQuery);
    const supplierMatch = [
      { supplierId: supplierQuery },
      { supplierId: supplierObjectId },
      { supplierIds: supplierQuery },
      { supplierIds: supplierObjectId },
    ];
    const nameQuery = String(supplierName || '').trim();
    if (nameQuery) {
      const nameExact = { $regex: `^${escapeRegex(nameQuery)}$`, $options: 'i' };
      supplierMatch.push(
        { supplierName: nameExact },
        { supplierNames: nameExact },
      );
    }
    andClauses.push({ $or: supplierMatch });
  } else if (supplierQuery === 'none') {
    andClauses.push({
      $or: [
        { supplierId: { $exists: false } },
        { supplierId: null },
        { supplierId: '' },
      ],
    });
  }

  if (stockFilter === 'in' || stockFilter === 'true' || stockFilter === '1') {
    andClauses.push({
      $or: [
        { inStock: true },
        { stockQuantity: { $gt: 0 } },
      ],
    });
  } else if (stockFilter === 'out' || stockFilter === 'false' || stockFilter === '0') {
    andClauses.push({ inStock: { $ne: true } });
  }

  // Number('') === 0 — never treat blank min/max as a real price bound.
  const min = parseOptionalPrice(minPrice);
  const max = parseOptionalPrice(maxPrice);
  if (min !== null || max !== null) {
    const priceRange = {};
    if (min !== null) priceRange.$gte = min;
    if (max !== null) priceRange.$lte = max;
    andClauses.push({
      $or: [
        { price: priceRange },
        { AED: priceRange },
        { mrp: priceRange },
      ],
    });
  }

  if (String(appDiscount || '').trim().toLowerCase() === 'set') {
    andClauses.push({ appDiscountEnabled: true, appDiscountValue: { $gt: 0 } });
  }

  const soldMoreThan = parseOptionalCount(minSold);
  if (soldMoreThan !== null) andClauses.push({ soldCount: { $gt: soldMoreThan } });
  const stockMoreThan = parseOptionalCount(minStock);
  if (stockMoreThan !== null) andClauses.push({ stockQuantity: { $gt: stockMoreThan } });
  const priceMoreThan = parseOptionalCount(priceAbove);
  if (priceMoreThan !== null) andClauses.push({ price: { $gt: priceMoreThan } });

  if (andClauses.length === 1) {
    Object.assign(filter, andClauses[0]);
  } else if (andClauses.length > 1) {
    filter.$and = andClauses;
  }

  return filter;
}

export function buildPickerSort(sort = 'newest') {
  const sortMap = {
    name: { name: 1 },
    name_desc: { name: -1 },
    price: { price: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    brand: { brand: 1, name: 1 },
    brand_desc: { brand: -1, name: 1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    sold: { soldCount: -1, name: 1 },
    stock: { stockQuantity: -1, name: 1 },
    relevance: { _pickerScore: -1, createdAt: -1 },
  };
  return sortMap[sort] || sortMap.newest;
}

function buildPickerSearchScoreStage(search = '') {
  const normalized = normalizeSearchKeyword(search);
  if (!normalized) return null;

  const escaped = escapeRegex(normalized);
  const lower = normalized.toLowerCase();

  return {
    $addFields: {
      _pickerScore: {
        $add: [
          { $cond: [{ $eq: [{ $toLower: { $ifNull: ['$sku', ''] } }, lower] }, 1000, 0] },
          { $cond: [{ $eq: [{ $toLower: { $ifNull: ['$slug', ''] } }, lower] }, 900, 0] },
          { $cond: [{ $regexMatch: { input: { $ifNull: ['$name', ''] }, regex: `^${escaped}`, options: 'i' } }, 500, 0] },
          { $cond: [{ $regexMatch: { input: { $ifNull: ['$nameAr', ''] }, regex: `^${escaped}`, options: 'i' } }, 480, 0] },
          { $cond: [{ $regexMatch: { input: { $ifNull: ['$sku', ''] }, regex: `^${escaped}`, options: 'i' } }, 400, 0] },
          { $cond: [{ $regexMatch: { input: { $ifNull: ['$brand', ''] }, regex: `^${escaped}`, options: 'i' } }, 350, 0] },
          { $cond: [{ $regexMatch: { input: { $ifNull: ['$name', ''] }, regex: escaped, options: 'i' } }, 200, 0] },
          { $cond: [{ $regexMatch: { input: { $ifNull: ['$nameAr', ''] }, regex: escaped, options: 'i' } }, 180, 0] },
          { $cond: [{ $regexMatch: { input: { $ifNull: ['$sku', ''] }, regex: escaped, options: 'i' } }, 150, 0] },
          { $cond: [{ $regexMatch: { input: { $ifNull: ['$brand', ''] }, regex: escaped, options: 'i' } }, 120, 0] },
          { $cond: [{ $regexMatch: { input: { $ifNull: ['$slug', ''] }, regex: escaped, options: 'i' } }, 100, 0] },
        ],
      },
    },
  };
}

function trimProductImages(product) {
  if (!product || typeof product !== 'object') return product;

  const images = Array.isArray(product.images) ? product.images.slice(0, 1) : product.images;
  const externalImages = Array.isArray(product.externalImages)
    ? product.externalImages.slice(0, 1)
    : product.externalImages;

  return {
    ...product,
    images,
    externalImages,
  };
}

export async function fetchPickerPage(Product, {
  storeId,
  page = 1,
  limit = 24,
  search = '',
  sort = 'newest',
  category = '',
  filterCategoryIds = [],
  filterTags = [],
  mode = 'picker',
  detailsProgress = 'all',
  Category = null,
  minPrice = '',
  maxPrice = '',
  sku = '',
  brand = '',
  brands = [],
  supplierId = '',
  inStock = '',
  skuStatus = '',
  minSold = '',
  minStock = '',
  priceAbove = '',
  appDiscount = '',
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const isManageMode = mode === 'manage';
  const maxLimit = isManageMode ? 500 : 48;
  const safeLimit = Math.min(maxLimit, Math.max(1, Number(limit) || 24));
  const trimmedSearch = normalizeSearchKeyword(search);
  const categoryIds = trimmedSearch.length >= PICKER_SEARCH_MIN_LENGTH && Category
    ? await resolveCategoryIdsForSearch(Category, trimmedSearch)
    : [];
  const supplierIds = trimmedSearch.length >= PICKER_SEARCH_MIN_LENGTH
    ? await resolveSupplierIdsForSearch(storeId, trimmedSearch)
    : [];
  let supplierName = '';
  if (/^[a-fA-F0-9]{24}$/.test(String(supplierId || '').trim())) {
    try {
      const Supplier = (await import('@/models/Supplier')).default;
      const supplierDoc = await Supplier.findById(supplierId).select('name').lean();
      supplierName = String(supplierDoc?.name || '').trim();
    } catch {
      supplierName = '';
    }
  }
  const filter = buildPickerFilter(storeId, search, category, {
    categoryIds,
    filterCategoryIds,
    filterTags,
    supplierIds,
    minPrice,
    maxPrice,
    sku,
    brand,
    brands,
    supplierId,
    supplierName,
    inStock,
    skuStatus,
    minSold,
    minStock,
    priceAbove,
    appDiscount,
  });
  const useRelevanceSort = (
    (sort === 'relevance' || (isManageMode && trimmedSearch.length >= PICKER_SEARCH_MIN_LENGTH))
    && trimmedSearch.length >= PICKER_SEARCH_MIN_LENGTH
  );
  const sortOption = buildPickerSort(useRelevanceSort ? 'relevance' : sort);
  const isMediaMode = mode === 'media';
  const detailsFilter = String(detailsProgress || 'all').trim().toLowerCase();
  const detailsFilterActive = isManageMode && detailsFilter && detailsFilter !== 'all';

  const projection = isManageMode
    ? {
        _id: 1,
        name: 1,
        slug: 1,
        sku: 1,
        price: 1,
        AED: 1,
        mrp: 1,
        inStock: 1,
        published: 1,
        stockQuantity: 1,
        soldCount: 1,
        fastDelivery: 1,
        freeShippingEligible: 1,
        description: 1,
        descriptionAr: 1,
        shortDescription: 1,
        shortDescriptionAr: 1,
        shortDescription2: 1,
        brand: 1,
        brandAr: 1,
        supplierId: 1,
        supplierName: 1,
        supplierIds: 1,
        supplierNames: 1,
        nameAr: 1,
        seoTitle: 1,
        enableFBT: 1,
        fbtProductIds: 1,
        createdAt: 1,
        category: 1,
        categories: 1,
        tags: 1,
        hasVariants: 1,
        variants: {
          $map: {
            input: { $slice: [{ $ifNull: ['$variants', []] }, 40] },
            as: 'variant',
            in: { sku: '$$variant.sku' },
          },
        },
        imageAspectRatio: 1,
        appDiscountEnabled: 1,
        appDiscountType: 1,
        appDiscountValue: 1,
        images: { $slice: [{ $ifNull: ['$images', []] }, 2] },
        externalImages: { $slice: [{ $ifNull: ['$externalImages', []] }, 1] },
      }
    : isMediaMode
    ? {
        _id: 1,
        name: 1,
        price: 1,
        AED: 1,
        createdAt: 1,
        category: 1,
        categories: 1,
        images: { $slice: [{ $ifNull: ['$images', []] }, 1] },
        imageCount: { $size: { $ifNull: ['$images', []] } },
      }
    : {
        _id: 1,
        name: 1,
        sku: 1,
        brand: 1,
        price: 1,
        AED: 1,
        inStock: 1,
        createdAt: 1,
        category: 1,
        categories: 1,
        images: { $slice: [{ $ifNull: ['$images', []] }, 1] },
        externalImages: { $slice: [{ $ifNull: ['$externalImages', []] }, 1] },
      };

  const scoreStage = useRelevanceSort ? buildPickerSearchScoreStage(trimmedSearch) : null;
  const pipeline = [{ $match: filter }];
  if (scoreStage) pipeline.push(scoreStage);

  // Details progress filter must scan the full matched catalog (e.g. 3000+),
  // score each product's Details bar, then paginate the matches.
  if (detailsFilterActive) {
    pipeline.push(
      { $sort: sortOption },
      { $project: projection },
    );

    const allProducts = await Product.aggregate(pipeline);
    const matched = allProducts
      .map(trimProductImages)
      .filter((product) => matchesDetailsProgressFilter(product, detailsFilter));

    const total = matched.length;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    const currentPage = Math.min(safePage, totalPages);
    const skip = (currentPage - 1) * safeLimit;

    return {
      products: matched.slice(skip, skip + safeLimit),
      pagination: {
        page: currentPage,
        limit: safeLimit,
        total,
        totalPages,
      },
    };
  }

  const skip = (safePage - 1) * safeLimit;
  pipeline.push(
    { $sort: sortOption },
    {
      $facet: {
        products: [
          { $skip: skip },
          { $limit: safeLimit },
          { $project: projection },
        ],
        total: [{ $count: 'count' }],
      },
    },
  );

  const [result] = await Product.aggregate(pipeline);

  const total = result?.total?.[0]?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const currentPage = Math.min(safePage, totalPages);

  return {
    products: (result?.products || []).map(trimProductImages),
    pagination: {
      page: currentPage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

function normalizePickerProductId(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value === 'object') {
    if (value.$oid) return String(value.$oid).trim();
    if (value._id) return normalizePickerProductId(value._id);
    const asString = value.toString?.();
    if (asString && asString !== '[object Object]') return String(asString).trim();
  }
  return '';
}

export async function fetchPickerProductsByIds(Product, storeId, ids = []) {
  const normalizedIds = [...new Set(
    (Array.isArray(ids) ? ids : [])
      .map(normalizePickerProductId)
      .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
  )].slice(0, 500);
  if (!normalizedIds.length) return [];

  const storeKey = String(storeId || '').trim();
  const products = await Product.find({ _id: { $in: normalizedIds } })
    .select(PICKER_FIELDS)
    .lean();

  const scoped = storeKey
    ? products.filter((product) => !product.storeId || String(product.storeId) === storeKey)
    : products;
  const usable = scoped.length ? scoped : products;

  const productMap = new Map(usable.map((product) => [String(product._id), trimProductImages(product)]));
  return normalizedIds.map((id) => productMap.get(id)).filter(Boolean);
}

export async function fetchPickerProductIds(Product, storeId, search = '', category = '', extra = {}) {
  const supplierIds = await resolveSupplierIdsForSearch(storeId, search);
  const filter = buildPickerFilter(storeId, search, category, {
    supplierIds,
    filterCategoryIds: extra.filterCategoryIds,
    inStock: extra.inStock,
  });
  const productIds = await Product.distinct('_id', filter);
  return {
    productIds: productIds.map((id) => String(id)),
    total: productIds.length,
  };
}

export function flattenCategoriesMinimal(categories = []) {
  if (!Array.isArray(categories) || !categories.length) return [];

  const byParent = new Map();
  const byId = new Map();

  for (const category of categories) {
    const id = String(category?._id || category?.id || '').trim();
    if (!id) continue;

    const parentId = category?.parentId ? String(category.parentId) : '';
    byId.set(id, { id, name: String(category.name || '').trim(), parentId });

    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(id);
  }

  for (const ids of byParent.values()) {
    ids.sort((leftId, rightId) => {
      const leftName = byId.get(leftId)?.name || '';
      const rightName = byId.get(rightId)?.name || '';
      return leftName.localeCompare(rightName);
    });
  }

  const flattened = [];

  const walk = (parentId, depth) => {
    for (const id of byParent.get(parentId) || []) {
      const category = byId.get(id);
      if (!category) continue;
      flattened.push({ id: category.id, name: category.name, depth });
      walk(id, depth + 1);
    }
  };

  walk('', 0);
  return flattened;
}

export function pickHomeLayout(appearanceSections = {}) {
  const layout = appearanceSections?.homeMenuCategories || {};
  return {
    enabled: layout.enabled !== false,
    style: layout.style === 'carousel' || layout.style === 'horizontal'
      ? 'carousel'
      : 'grid',
    itemsPerRow: Math.min(10, Math.max(1, Number(layout.itemsPerRow) || 5)),
    rows: Math.min(6, Math.max(1, Number(layout.rows) || 2)),
  };
}
