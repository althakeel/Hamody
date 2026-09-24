import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { getCurrentStock } from '@/lib/storeInventory';
import { applyStockUpdateToProduct, describeMainStockChange } from '@/lib/applyMainStock';
import { recordInventoryHistory, resolveInventoryActor } from '@/lib/inventoryHistory';
import { parseSkuList } from '@/lib/parseSkuList';
import { queueInventorySheetSync } from '@/lib/googleSheetsInventory';
import { escapeRegex } from '@/lib/productSearch';

export const dynamic = 'force-dynamic';

const MAX_SKUS = 200;

async function getSellerContextFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const decodedToken = await getAuth().verifyIdToken(authHeader.replace('Bearer ', ''));
  const storeId = await authSeller(decodedToken.uid);
  if (!storeId) return null;
  return { storeId, userId: decodedToken.uid, decodedToken };
}

function productMatchesSku(product, skuLower) {
  if (String(product?.sku || '').trim().toLowerCase() === skuLower) return true;
  return (Array.isArray(product?.variants) ? product.variants : []).some(
    (variant) => String(variant?.sku || '').trim().toLowerCase() === skuLower,
  );
}

function parseBulkSkuRequest(body = {}) {
  const skus = parseSkuList(Array.isArray(body?.skus) ? body.skus.join(',') : (body?.skus || body?.skuList || ''));
  const stockQuantity = Number(body?.stockQuantity);
  return { skus, stockQuantity };
}

function parseStockValue(value) {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 0 || !Number.isInteger(qty)) return null;
  return qty;
}

function parseBulkSkuUpdates(body = {}, fallbackStock) {
  if (!Array.isArray(body?.updates)) return [];
  return body.updates.map((entry) => {
    const stockQuantity = parseStockValue(entry?.stockQuantity ?? fallbackStock);
    const variants = (Array.isArray(entry?.variants) ? entry.variants : [])
      .map((variant) => ({
        index: Number(variant?.index),
        stock: parseStockValue(variant?.stock),
      }))
      .filter((variant) => Number.isInteger(variant.index) && variant.index >= 0);
    return {
      productId: String(entry?.productId || '').trim(),
      stockQuantity,
      variants,
    };
  }).filter((entry) => entry.productId);
}

function validateBulkSkuInput(skus, stockQuantity, updates = []) {
  if (!skus.length) return 'Paste at least one SKU.';
  if (skus.length > MAX_SKUS) return `You can update at most ${MAX_SKUS} SKUs at once.`;
  if (!updates.length && (stockQuantity == null || !Number.isFinite(stockQuantity) || stockQuantity < 0 || !Number.isInteger(stockQuantity))) {
    return 'Enter a whole-number main stock (0 or more).';
  }
  for (const update of updates) {
    if (update.stockQuantity == null) {
      return 'Enter a whole-number stock (0 or more) in the New column.';
    }
    if (update.variants.some((variant) => variant.stock == null)) {
      return 'Enter a whole-number stock (0 or more) for each variant.';
    }
  }
  return '';
}

async function loadProductsForSkus(storeId, skus) {
  const skuRegexes = skus.map((sku) => new RegExp(`^${escapeRegex(sku)}$`, 'i'));
  return Product.find({
    storeId: String(storeId),
    $or: [
      { sku: { $in: skuRegexes } },
      { 'variants.sku': { $in: skuRegexes } },
    ],
  });
}

function buildPreview(products, skus, stockQuantity) {
  const seen = new Set();
  const matches = [];

  for (const sku of skus) {
    const product = products.find((row) => productMatchesSku(row, sku.toLowerCase()));
    if (!product) continue;
    const id = String(product._id);
    if (seen.has(id)) continue;
    seen.add(id);
    const preview = describeMainStockChange(product, stockQuantity);
    matches.push({
      productId: id,
      sku: preview.sku || product.sku || sku,
      name: preview.name,
      hasVariants: preview.hasVariants,
      hasBundle: preview.hasBundle,
      currentStock: preview.currentStock,
      newStock: preview.newStock,
      variants: preview.variants,
    });
  }

  const missing = skus.filter((sku) => (
    !products.some((product) => productMatchesSku(product, sku.toLowerCase()))
  ));

  return { matches, missing };
}

export async function POST(request) {
  try {
    const sellerContext = await getSellerContextFromRequest(request);
    if (!sellerContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storeId, userId, decodedToken } = sellerContext;
    const body = await request.json();
    const { skus, stockQuantity } = parseBulkSkuRequest(body);
    const updates = parseBulkSkuUpdates(body, stockQuantity);
    const validationError = validateBulkSkuInput(skus, stockQuantity, body?.confirm === true ? updates : []);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await connectDB();
    const products = await loadProductsForSkus(storeId, skus);
    const { matches, missing } = buildPreview(products, skus, stockQuantity);

    if (body?.confirm !== true) {
      return NextResponse.json({
        preview: true,
        requested: skus.length,
        stockQuantity,
        matches,
        missing,
        message: matches.length
          ? `Preview: ${matches.length} product(s) will be set to ${stockQuantity}. Bundle packs share that stock. Confirm to apply.`
          : 'No matching products found. Stock was not changed.',
      });
    }

    if (!matches.length) {
      return NextResponse.json({ error: 'No matching products to update.' }, { status: 400 });
    }

    const now = new Date();
    const actor = await resolveInventoryActor(userId, decodedToken);
    const updatesById = new Map(updates.map((entry) => [entry.productId, entry]));
    const confirmIds = new Set(matches.map((row) => row.productId));
    let updated = 0;

    for (const product of products) {
      const productId = String(product._id);
      if (!confirmIds.has(productId)) continue;
      const update = updatesById.get(productId) || { stockQuantity, variants: [] };
      const previousStock = getCurrentStock(product);
      applyStockUpdateToProduct(product, update);
      product.stockUpdatedAt = now;
      await product.save();
      const nextStock = getCurrentStock(product);
      updated += 1;

      await recordInventoryHistory({
        ...actor,
        productId,
        productName: product.name || '',
        sku: product.sku || '',
        action: 'set_stock',
        quantityDelta: nextStock - previousStock,
        previousStock,
        newStock: nextStock,
        source: 'bulk_sku',
        details: `Set main stock to ${update.stockQuantity} from SKU list (${skus.length} SKU(s))`,
      });
    }

    queueInventorySheetSync(storeId);

    return NextResponse.json({
      success: true,
      preview: false,
      updated,
      requested: skus.length,
      matchedProducts: updated,
      missing,
      stockQuantity,
      message: missing.length
        ? `Updated stock on ${updated} product(s). ${missing.length} SKU(s) not found.`
        : `Updated stock on ${updated} product(s).`,
    });
  } catch (error) {
    console.error('[store/inventory/bulk-sku POST]', error);
    return NextResponse.json({ error: error?.message || 'Failed to update stock by SKU' }, { status: 500 });
  }
}
