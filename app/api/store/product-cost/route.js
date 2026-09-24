import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { findStoreProductsBySkus, parseSkuList } from '@/lib/productBulkSku';
import { queueInventorySheetSync } from '@/lib/googleSheetsInventory';
import { recordProductCostHistory, resolveInventoryActor } from '@/lib/productCostHistory';
import { buildFlexibleSkuRegex, escapeRegex, normalizeSearchKeyword } from '@/lib/productSearch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseCost(value) {
  if (value === undefined || value === null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

function parseSkuCostLines(value) {
  const raw = String(value || '');
  const rows = [];
  raw.split(/[\n;]+/).forEach((line) => {
    const parts = String(line || '')
      .split(/[,\t=]+/)
      .map((part) => String(part || '').trim())
      .filter(Boolean);
    if (!parts.length) return;
    rows.push({
      sku: parts[0],
      costPrice: parts.length > 1 ? parseCost(parts[1]) : null,
    });
  });
  return rows;
}

async function getSellerContext(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
  const storeId = await authSeller(decodedToken.uid);
  if (!storeId) return null;
  return { storeId: String(storeId), userId: decodedToken.uid, decodedToken };
}

function collectProductSkus(product = {}) {
  const skus = [];
  const seen = new Set();
  const add = (value) => {
    const sku = String(value || '').trim();
    const key = sku.toLowerCase();
    if (!sku || seen.has(key)) return;
    seen.add(key);
    skus.push(sku);
  };
  add(product.sku);
  (Array.isArray(product.variants) ? product.variants : []).forEach((variant) => add(variant?.sku));
  return skus;
}

function toProductRow(product = {}) {
  const skus = collectProductSkus(product);
  return {
    _id: String(product._id),
    name: product.name || '',
    sku: skus[0] || '',
    skus,
    price: Number(product.price || 0),
    AED: Number(product.AED || product.price || 0),
    costPrice: Number(product.costPrice || 0),
    supplierName: Array.isArray(product.supplierNames) && product.supplierNames.length
      ? product.supplierNames.filter(Boolean).join(', ')
      : String(product.supplierName || ''),
    images: Array.isArray(product.images) ? product.images : [],
    inStock: product.inStock !== false,
  };
}

export async function GET(request) {
  try {
    const seller = await getSellerContext(request);
    if (!seller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const storeId = seller.storeId;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20));
    const search = normalizeSearchKeyword(searchParams.get('search') || '').replace(/[\\/]+$/g, '');
    const filter = String(searchParams.get('filter') || 'all').trim();
    const supplierId = String(searchParams.get('supplierId') || '').trim();
    const brand = String(searchParams.get('brand') || '').trim();
    const skip = (page - 1) * limit;

    await connectDB();
    const query = { storeId };
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      const skuFlexible = buildFlexibleSkuRegex(search);
      query.$or = [
        { name: regex },
        { sku: regex },
        { 'variants.sku': regex },
        { supplierName: regex },
        { brand: regex },
      ];
      if (skuFlexible) {
        query.$or.push({ sku: skuFlexible }, { 'variants.sku': skuFlexible });
      }
    }
    if (filter === 'missing') {
      query.$and = [...(query.$and || []), {
        $or: [
          { costPrice: { $exists: false } },
          { costPrice: null },
          { costPrice: { $lte: 0 } },
        ],
      }];
    }
    if (filter === 'set') {
      query.costPrice = { $gt: 0 };
    }
    if (supplierId === 'none') {
      query.$and = [...(query.$and || []), {
        $and: [
          { $or: [{ supplierId: { $exists: false } }, { supplierId: null }, { supplierId: '' }] },
          { $or: [{ supplierIds: { $exists: false } }, { supplierIds: { $size: 0 } }, { supplierIds: null }] },
        ],
      }];
    } else if (supplierId) {
      const supplierIds = [supplierId];
      if (mongoose.Types.ObjectId.isValid(supplierId)) {
        supplierIds.push(new mongoose.Types.ObjectId(supplierId));
      }
      query.$and = [...(query.$and || []), {
        $or: [
          { supplierId: { $in: supplierIds } },
          { supplierIds: { $in: supplierIds } },
        ],
      }];
    }
    if (brand) {
      query.brand = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }

    const [products, total, withCostPrice, needConfiguration, brandValues] = await Promise.all([
      Product.find(query)
        .select('name sku price AED costPrice images inStock supplierName supplierNames variants.sku')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
      Product.countDocuments({ storeId, costPrice: { $gt: 0 } }),
      Product.countDocuments({
        storeId,
        $or: [
          { costPrice: { $exists: false } },
          { costPrice: null },
            { costPrice: { $lte: 0 } },
          ],
        }),
      Product.distinct('brand', { storeId, brand: { $nin: [null, ''] } }),
    ]);

    return NextResponse.json({
      success: true,
      products: products.map(toProductRow),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      stats: {
        totalProducts: withCostPrice + needConfiguration,
        withCostPrice,
        needConfiguration,
      },
      brands: (brandValues || []).map((item) => String(item || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    });
  } catch (error) {
    console.error('[product-cost GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to load product costs' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const seller = await getSellerContext(request);
    if (!seller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const storeId = seller.storeId;

    const body = await request.json();
    const productId = String(body?.productId || '').trim();
    const costPrice = parseCost(body?.costPrice);
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    if (costPrice === null) {
      return NextResponse.json({ error: 'Enter a valid cost of 0 or more' }, { status: 400 });
    }

    await connectDB();
    const existing = await Product.findOne({ _id: productId, storeId }).select('name sku costPrice').lean();
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = await Product.findOneAndUpdate(
      { _id: productId, storeId },
      { $set: { costPrice } },
      { new: true },
    ).select('name sku price AED costPrice images inStock supplierName supplierNames').lean();

    const actor = await resolveInventoryActor(seller.userId, seller.decodedToken);
    await recordProductCostHistory({
      ...actor,
      storeId,
      productId,
      productName: existing.name || '',
      sku: existing.sku || '',
      action: 'set_cost',
      previousCost: Number(existing.costPrice || 0),
      newCost: costPrice,
      source: body?.source || 'row_edit',
      details: `Cost ${Number(existing.costPrice || 0)} → ${costPrice}`,
    });

    queueInventorySheetSync(storeId);

    return NextResponse.json({
      success: true,
      message: 'Product cost saved',
      product: toProductRow(product),
    });
  } catch (error) {
    console.error('[product-cost PUT]', error);
    return NextResponse.json({ error: error.message || 'Failed to save product cost' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const seller = await getSellerContext(request);
    if (!seller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const storeId = seller.storeId;

    const body = await request.json();
    const sharedCost = parseCost(body?.costPrice);
    const productIds = [...new Set(
      (Array.isArray(body?.productIds) ? body.productIds : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    )];
    const skuCostRows = parseSkuCostLines(body?.skus || body?.skuList || '');
    const skuList = skuCostRows.map((row) => row.sku);

    await connectDB();
    const skuLookup = await findStoreProductsBySkus(Product, storeId, skuList.length ? skuList : parseSkuList(body?.skus || ''));
    const costBySku = new Map(
      skuCostRows
        .filter((row) => row.sku && row.costPrice !== null)
        .map((row) => [row.sku.toLowerCase(), row.costPrice]),
    );

    const updates = [];
    productIds.forEach((id) => {
      if (sharedCost === null) return;
      updates.push({ productId: id, costPrice: sharedCost });
    });
    skuLookup.products.forEach((product) => {
      const fromSku = costBySku.get(String(product.sku || '').toLowerCase());
      const costPrice = fromSku ?? sharedCost;
      if (costPrice === null) return;
      updates.push({ productId: String(product.id || product._id), costPrice });
    });

    const unique = new Map();
    updates.forEach((item) => unique.set(item.productId, item.costPrice));
    if (!unique.size) {
      return NextResponse.json({
        error: 'Select products or paste SKUs, and enter a cost. You can also paste lines like ST4001,12.50',
      }, { status: 400 });
    }

    const before = await Product.find({
      _id: { $in: [...unique.keys()] },
      storeId,
    }).select('_id name sku costPrice').lean();

    await Promise.all([...unique.entries()].map(([productId, costPrice]) => (
      Product.updateOne({ _id: productId, storeId }, { $set: { costPrice } })
    )));

    const actor = await resolveInventoryActor(seller.userId, seller.decodedToken);
    const source = String(body?.source || (skuList.length ? 'sku_list' : 'selection'));
    await recordProductCostHistory(before.map((product) => ({
      ...actor,
      storeId,
      productId: String(product._id),
      productName: product.name || '',
      sku: product.sku || '',
      action: 'bulk_set_cost',
      previousCost: Number(product.costPrice || 0),
      newCost: unique.get(String(product._id)),
      source,
      details: `Cost ${Number(product.costPrice || 0)} → ${unique.get(String(product._id))}`,
    })));

    queueInventorySheetSync(storeId);

    return NextResponse.json({
      success: true,
      updated: unique.size,
      missingSkus: skuLookup.missing,
      message: skuLookup.missing.length
        ? `Updated cost on ${unique.size} product(s). SKU not found: ${skuLookup.missing.join(', ')}`
        : `Updated cost on ${unique.size} product(s).`,
    });
  } catch (error) {
    console.error('[product-cost POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to bulk update product costs' }, { status: 500 });
  }
}
