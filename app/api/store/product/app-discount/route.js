import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { applyAppProductDiscount, normalizeAppDiscount } from '@/lib/appProductDiscount';
import { rowsToAppPrices } from '@/lib/appDiscountSheet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function sellerStoreId(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    return authSeller(decoded.uid);
  } catch {
    return null;
  }
}

export async function PUT(request) {
  try {
    const storeId = await sellerStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const productId = String(body?.productId || '').trim();
    if (!/^[a-fA-F0-9]{24}$/.test(productId)) {
      return NextResponse.json({ error: 'Choose a product' }, { status: 400 });
    }

    await connectDB();
    const product = await Product.findOne({ _id: productId, storeId }).select('_id price').lean();
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const discount = normalizeAppDiscount(body);
    const salePrice = Number(product.price) || 0;
    if (discount.appDiscountEnabled && discount.appDiscountType === 'amount' && discount.appDiscountValue >= salePrice) {
      return NextResponse.json({ error: 'The amount off must be less than the sale price' }, { status: 400 });
    }

    const updated = await Product.findOneAndUpdate(
      { _id: productId, storeId },
      { $set: discount },
      { new: true },
    ).select('_id name price appDiscountEnabled appDiscountType appDiscountValue').lean();

    return NextResponse.json({
      product: updated,
      appPrice: applyAppProductDiscount(updated?.price, updated),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not save the app discount' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const storeId = await sellerStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const percent = Number(body?.percent);
    const productIds = Array.isArray(body?.productIds)
      ? [...new Set(body.productIds.map((id) => String(id || '').trim()).filter((id) => /^[a-fA-F0-9]{24}$/.test(id)))].slice(0, 200)
      : [];
    const categoryIds = Array.isArray(body?.categoryIds)
      ? [...new Set(body.categoryIds.map((id) => String(id || '').trim()).filter((id) => /^[a-fA-F0-9]{24}$/.test(id)))].slice(0, 100)
      : [];
    const brandNames = Array.isArray(body?.brands)
      ? [...new Set(body.brands.map((name) => String(name || '').trim()).filter(Boolean))].slice(0, 80)
      : [];
    const wantsPercent = Array.isArray(body?.productIds) || Array.isArray(body?.categoryIds) || Array.isArray(body?.brands);
    if (wantsPercent) {
      if (!productIds.length && !categoryIds.length && !brandNames.length) {
        return NextResponse.json({ error: 'Select products, categories, or brands' }, { status: 400 });
      }
      if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) {
        return NextResponse.json({ error: 'Enter a percent between 1 and 99' }, { status: 400 });
      }
      const clauses = [];
      if (productIds.length) clauses.push({ _id: { $in: productIds } });
      if (categoryIds.length) {
        clauses.push({
          $or: [
            { category: { $in: categoryIds } },
            { categories: { $in: categoryIds } },
          ],
        });
      }
      if (brandNames.length) {
        clauses.push({
          $or: [
            { brand: { $in: brandNames } },
            { brandAr: { $in: brandNames } },
          ],
        });
      }
      await connectDB();
      const discount = normalizeAppDiscount({ enabled: true, type: 'percent', value: percent });
      const result = await Product.updateMany(
        { storeId, ...(clauses.length === 1 ? clauses[0] : { $and: clauses }) },
        { $set: discount },
      );
      const matched = result.matchedCount || 0;
      if (!matched) {
        return NextResponse.json({ error: 'No products matched this selection' }, { status: 404 });
      }
      return NextResponse.json({
        updated: result.modifiedCount || 0,
        matched,
        percent: discount.appDiscountValue,
        message: `Applied ${discount.appDiscountValue}% to ${matched} product${matched === 1 ? '' : 's'}`,
      });
    }

    const rows = rowsToAppPrices(Array.isArray(body?.rows) ? body.rows : []);
    if (!rows.length) {
      return NextResponse.json({ error: 'The file needs a SKU column and a Mobile price column' }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: 'Upload 500 SKUs or fewer at a time' }, { status: 400 });
    }

    await connectDB();
    const products = await Product.find({
      storeId,
      sku: { $in: rows.map((row) => row.sku) },
    }).collation({ locale: 'en', strength: 2 }).select('_id sku price').lean();

    const bySku = new Map();
    products.forEach((product) => {
      const sku = String(product.sku || '').trim().toLowerCase();
      if (sku && !bySku.has(sku)) bySku.set(sku, product);
    });

    const missing = [];
    const tooHigh = [];
    const operations = [];
    rows.forEach((row) => {
      const product = bySku.get(row.sku.toLowerCase());
      if (!product) {
        missing.push(row.sku);
        return;
      }
      const salePrice = Number(product.price) || 0;
      if (!(row.mobilePrice < salePrice)) {
        tooHigh.push({ sku: row.sku, salePrice, mobilePrice: row.mobilePrice });
        return;
      }
      const discount = normalizeAppDiscount({
        enabled: true,
        type: 'amount',
        value: Math.round((salePrice - row.mobilePrice) * 100) / 100,
      });
      operations.push({
        updateOne: {
          filter: { _id: product._id, storeId },
          update: { $set: discount },
        },
      });
    });

    if (operations.length) await Product.bulkWrite(operations);

    return NextResponse.json({
      updated: operations.length,
      missing,
      tooHigh,
      message: `Updated ${operations.length} product${operations.length === 1 ? '' : 's'}`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not update these app prices' }, { status: 500 });
  }
}
