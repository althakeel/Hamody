import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { getCurrentStock } from '@/lib/storeInventory';
import { applyStockUpdateToProduct, describeMainStockChange } from '@/lib/applyMainStock';
import { recordInventoryHistory, resolveInventoryActor } from '@/lib/inventoryHistory';
import { parseSkuList, parseSkuStockRows } from '@/lib/parseSkuList';
import { queueInventorySheetSync } from '@/lib/googleSheetsInventory';
import Supplier from '@/models/Supplier';
import {
  findOrCreateSupplierByName,
  storeIdMatch,
  supplierFieldsFromDoc,
} from '@/lib/supplierServer';

export const dynamic = 'force-dynamic';

const MAX_SKUS = 10000;

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

function parseStockValue(value) {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 0 || !Number.isInteger(qty)) return null;
  return qty;
}

function parseBulkSkuRequest(body = {}) {
  const excelRows = parseSkuStockRows(body?.rows || body?.excelRows || []);
  const pastedSkus = parseSkuList(Array.isArray(body?.skus) ? body.skus.join(',') : (body?.skus || body?.skuList || ''));
  const fallbackStock = parseStockValue(body?.stockQuantity);

  if (excelRows.length) {
    return {
      skuRows: excelRows,
      skus: excelRows.map((row) => row.sku),
      stockQuantity: fallbackStock,
      source: 'excel',
    };
  }

  return {
    skuRows: pastedSkus.map((sku) => ({ sku, stockQuantity: fallbackStock })),
    skus: pastedSkus,
    stockQuantity: fallbackStock,
    source: 'paste',
  };
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
      supplierName: String(entry?.supplierName || '').trim(),
      brand: String(entry?.brand || '').trim(),
    };
  }).filter((entry) => entry.productId);
}

function rowHasSheetUpdate(row = {}) {
  return row.stockQuantity != null
    || String(row.supplierName || '').trim()
    || String(row.brand || '').trim();
}

function validateBulkSkuInput(skuRows, stockQuantity, updates = [], confirming = false) {
  if (!skuRows.length) {
    return 'Add SKUs by paste or a sheet with SKU, PRODUCT NAME, STOCK, SUPPLIER NAME, BRAND.';
  }
  if (skuRows.length > MAX_SKUS) return `You can update at most ${MAX_SKUS} SKUs at once.`;
  const missingRowStock = skuRows.some((row) => row.stockQuantity == null);
  const hasSheetFields = skuRows.some((row) => rowHasSheetUpdate(row));
  if (!confirming && missingRowStock && stockQuantity == null && !hasSheetFields) {
    return 'Enter stock, or include STOCK / SUPPLIER NAME / BRAND in the sheet.';
  }
  if (!confirming) return '';
  if (!updates.length && missingRowStock && stockQuantity == null && !hasSheetFields) {
    return 'Enter a whole-number stock (0 or more) in the New column.';
  }
  for (const update of updates) {
    const hasOther = Boolean(update.supplierName || update.brand);
    if (update.stockQuantity == null && !hasOther) {
      return 'Enter a whole-number stock (0 or more) in the New column.';
    }
    if (update.stockQuantity != null && update.variants.some((variant) => variant.stock == null)) {
      return 'Enter a whole-number stock (0 or more) for each variant.';
    }
  }
  return '';
}

async function loadProductsForSkus(storeId, skus) {
  const values = [...new Set(
    (Array.isArray(skus) ? skus : [])
      .flatMap((sku) => {
        const raw = String(sku || '').trim();
        if (!raw) return [];
        return [raw, raw.toLowerCase(), raw.toUpperCase()];
      }),
  )];
  if (!values.length) return [];
  return Product.find({
    storeId: String(storeId),
    $or: [
      { sku: { $in: values } },
      { 'variants.sku': { $in: values } },
    ],
  });
}

function currentSupplierName(product = {}) {
  const names = Array.isArray(product.supplierNames)
    ? product.supplierNames.map((name) => String(name || '').trim()).filter(Boolean)
    : [];
  if (names.length) return names.join(', ');
  return String(product.supplierName || '').trim();
}

function buildPreview(products, skuRows, fallbackStock, existingSupplierNames = new Set()) {
  const seen = new Set();
  const matches = [];

  for (const row of skuRows) {
    const sku = String(row.sku || '').trim();
    if (!sku) continue;
    const product = products.find((item) => productMatchesSku(item, sku.toLowerCase()));
    if (!product) continue;
    const id = String(product._id);
    if (seen.has(id)) continue;
    seen.add(id);
    const stockQuantity = parseStockValue(row.stockQuantity ?? fallbackStock);
    const preview = describeMainStockChange(product, stockQuantity ?? getCurrentStock(product));
    const supplierName = String(row.supplierName || '').trim();
    const brand = String(row.brand || '').trim();
    matches.push({
      productId: id,
      sku: preview.sku || product.sku || sku,
      name: preview.name,
      hasVariants: preview.hasVariants,
      hasBundle: preview.hasBundle,
      currentStock: preview.currentStock,
      newStock: stockQuantity ?? preview.currentStock,
      variants: stockQuantity == null ? [] : preview.variants,
      currentSupplier: currentSupplierName(product),
      newSupplier: supplierName || currentSupplierName(product),
      supplierName,
      createSupplier: Boolean(supplierName) && !existingSupplierNames.has(supplierName.toLowerCase()),
      currentBrand: String(product.brand || '').trim(),
      newBrand: brand || String(product.brand || '').trim(),
      brand,
    });
  }

  const missing = skuRows
    .map((row) => String(row.sku || '').trim())
    .filter((sku) => sku && !products.some((product) => productMatchesSku(product, sku.toLowerCase())));

  return { matches, missing: [...new Set(missing)] };
}

export async function POST(request) {
  try {
    const sellerContext = await getSellerContextFromRequest(request);
    if (!sellerContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storeId, userId, decodedToken } = sellerContext;
    const body = await request.json();
    const { skuRows, skus, stockQuantity, source } = parseBulkSkuRequest(body);
    const updates = parseBulkSkuUpdates(body, stockQuantity);
    const validationError = validateBulkSkuInput(skuRows, stockQuantity, updates, body?.confirm === true);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await connectDB();
    const products = await loadProductsForSkus(storeId, skus);
    const namedSuppliers = await Supplier.find({ storeId: storeIdMatch(storeId) })
      .select('name')
      .lean();
    const existingSupplierNames = new Set(
      namedSuppliers.map((item) => String(item?.name || '').trim().toLowerCase()).filter(Boolean),
    );
    const { matches, missing } = buildPreview(products, skuRows, stockQuantity, existingSupplierNames);

    if (body?.confirm !== true) {
      const stockLabel = source === 'excel'
        ? 'the sheet'
        : String(stockQuantity);
      return NextResponse.json({
        preview: true,
        requested: skus.length,
        stockQuantity,
        source,
        matches,
        missing,
        message: matches.length
          ? `Preview: ${matches.length} product(s) will update stock, supplier, and/or brand from ${stockLabel}. SKU and product name stay the same. Confirm to apply.`
          : 'No matching products found. Nothing was changed.',
      });
    }

    if (!matches.length) {
      return NextResponse.json({ error: 'No matching products to update.' }, { status: 400 });
    }

    const now = new Date();
    const actor = await resolveInventoryActor(userId, decodedToken);
    const updatesById = new Map(updates.map((entry) => [entry.productId, entry]));
    const confirmIds = new Set(matches.map((row) => row.productId));
    const supplierCache = new Map();
    let updated = 0;
    let createdSuppliers = 0;

    for (const product of products) {
      const productId = String(product._id);
      if (!confirmIds.has(productId)) continue;
      const matched = matches.find((row) => row.productId === productId);
      const update = updatesById.get(productId) || {
        stockQuantity: matched?.newStock ?? stockQuantity,
        variants: [],
        supplierName: matched?.supplierName || '',
        brand: matched?.brand || '',
      };
      const previousStock = getCurrentStock(product);
      const previousName = product.name;
      const previousSku = product.sku;
      const changeParts = [];

      if (update.stockQuantity != null) {
        applyStockUpdateToProduct(product, update);
        product.stockUpdatedAt = now;
        changeParts.push(`stock ${update.stockQuantity}`);
      }

      if (update.supplierName) {
        const cacheKey = update.supplierName.toLowerCase();
        let supplier = supplierCache.get(cacheKey);
        if (!supplier) {
          const existed = existingSupplierNames.has(cacheKey);
          supplier = await findOrCreateSupplierByName(storeId, update.supplierName, userId);
          supplierCache.set(cacheKey, supplier);
          if (supplier && !existed) {
            createdSuppliers += 1;
            existingSupplierNames.add(cacheKey);
          }
        }
        if (supplier) {
          Object.assign(product, supplierFieldsFromDoc(supplier));
          changeParts.push(`supplier ${supplier.name}`);
        }
      }

      if (update.brand) {
        product.brand = update.brand;
        changeParts.push(`brand ${update.brand}`);
      }

      product.name = previousName;
      product.sku = previousSku;
      await product.save();
      const nextStock = getCurrentStock(product);
      updated += 1;

      await recordInventoryHistory({
        ...actor,
        productId,
        productName: product.name || '',
        sku: product.sku || '',
        action: update.stockQuantity != null ? 'set_stock' : 'product_edit',
        quantityDelta: nextStock - previousStock,
        previousStock,
        newStock: nextStock,
        source: source === 'excel' ? 'bulk_sku_excel' : 'bulk_sku',
        details: `Updated ${changeParts.join(', ') || 'inventory'} from ${source === 'excel' ? 'sheet' : 'SKU list'} (${skus.length} SKU(s)). SKU and product name were not changed.`,
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
      createdSuppliers,
      message: [
        `Updated ${updated} product(s). SKU and product name were not changed.`,
        createdSuppliers ? `Created ${createdSuppliers} new supplier(s) by name.` : '',
        missing.length ? `${missing.length} SKU(s) not found.` : '',
      ].filter(Boolean).join(' '),
    });
  } catch (error) {
    console.error('[store/inventory/bulk-sku POST]', error);
    return NextResponse.json({ error: error?.message || 'Failed to update stock by SKU' }, { status: 500 });
  }
}
