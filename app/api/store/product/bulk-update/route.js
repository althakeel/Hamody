import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
import authSeller from '@/middlewares/authSeller'
import { getAuth } from '@/lib/firebase-admin'
import { getCurrentStock } from '@/lib/storeInventory'
import { recordInventoryHistory, resolveInventoryActor } from '@/lib/inventoryHistory'
import { resolveDashboardAccess } from '@/lib/storeAccessControl'
import { canBulkEditProducts, canChangeProductPricing } from '@/lib/productSaveGuards'
import { setProductsSupplierId } from '@/lib/supplierServer'
import { assignProductSkus, findStoreProductsBySkus, parseSkuList } from '@/lib/productBulkSku'
import { queueInventorySheetSync } from '@/lib/googleSheetsInventory'
import { invalidateStorefrontProductCaches } from '@/lib/cache'

export const runtime = 'nodejs'

async function getSellerContextFromRequest(request) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return null

  const idToken = authHeader.replace('Bearer ', '')
  const decodedToken = await getAuth().verifyIdToken(idToken)
  const storeId = await authSeller(decodedToken.uid)
  if (!storeId) return null
  return { storeId, userId: decodedToken.uid, decodedToken }
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function applyBooleanDirective(updateData, fieldName, directive) {
  if (directive === 'enable') {
    updateData[fieldName] = true
  }
  if (directive === 'disable') {
    updateData[fieldName] = false
  }
}

export async function PATCH(request) {
  try {
    const sellerContext = await getSellerContextFromRequest(request)
    if (!sellerContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { storeId, userId, decodedToken } = sellerContext
    const access = await resolveDashboardAccess(userId, decodedToken)
    if (!canBulkEditProducts(access)) {
      return NextResponse.json({
        error: 'You do not have permission to bulk edit products. Ask the store owner to enable Bulk edit products in Team Access.',
      }, { status: 403 })
    }
    const canChangePrice = canChangeProductPricing(access)

    const body = await request.json()
    await connectDB()
    const skuLookup = await findStoreProductsBySkus(Product, storeId, body?.skus || body?.findSkus || '')
    const productIds = [...new Set([
      ...(Array.isArray(body?.productIds)
        ? body.productIds.map((productId) => String(productId).trim()).filter(Boolean)
        : []),
      ...skuLookup.productIds,
    ])]

    if (!productIds.length) {
      return NextResponse.json({ error: 'Select products or paste SKUs to edit.' }, { status: 400 })
    }

    const updateData = {}
    applyBooleanDirective(updateData, 'inStock', body?.inStock)
    applyBooleanDirective(updateData, 'fastDelivery', body?.fastDelivery)
    applyBooleanDirective(updateData, 'freeShippingEligible', body?.freeShippingEligible)
    applyBooleanDirective(updateData, 'published', body?.published)

    const stockQuantity = parseOptionalNumber(body?.stockQuantity)
    const stockQuantityWasProvided = body?.stockQuantity !== undefined
      && body?.stockQuantity !== null
      && body?.stockQuantity !== ''
    const setZeroStockToFive = body?.inStock === 'enable' && !stockQuantityWasProvided
    const price = parseOptionalNumber(body?.price)
    const aed = parseOptionalNumber(body?.AED)
    const brand = typeof body?.brand === 'string' ? body.brand.trim() : undefined
    const supplierIdRaw = typeof body?.supplierId === 'string' ? body.supplierId.trim() : undefined

    if (stockQuantity !== undefined) {
      updateData.stockQuantity = stockQuantity
      updateData.stockUpdatedAt = new Date()
    }
    if (brand !== undefined && brand !== '') {
      updateData.brand = brand
    }
    if (price !== undefined || aed !== undefined) {
      if (!canChangePrice) {
        return NextResponse.json(
          { error: 'You do not have permission to change prices. Ask the store owner to enable Change product prices in Team Access.' },
          { status: 403 },
        )
      }
      if (price !== undefined) updateData.price = price
      if (aed !== undefined) updateData.AED = aed
    }

    const supplierChangeRequested = supplierIdRaw !== undefined && supplierIdRaw !== '' && supplierIdRaw !== 'keep'
    const assignSkus = parseSkuList(body?.assignSkus || '')
    const skuAssignRequested = assignSkus.length > 0

    if (!Object.keys(updateData).length && !supplierChangeRequested && !skuAssignRequested) {
      return NextResponse.json({ error: 'Choose at least one field to update.' }, { status: 400 })
    }

    if (supplierChangeRequested) {
      await setProductsSupplierId(storeId, productIds, supplierIdRaw)
    }
    if (skuAssignRequested) {
      await assignProductSkus(Product, storeId, productIds, assignSkus)
    }

    const stockChangeRequested = stockQuantity !== undefined || setZeroStockToFive
    const productsBeforeUpdate = stockChangeRequested
      ? await Product.find({ _id: { $in: productIds }, storeId: String(storeId) })
        .select('_id name sku stockQuantity hasVariants variants')
        .lean()
      : []

    const result = Object.keys(updateData).length
      ? await Product.updateMany(
          {
            _id: { $in: productIds },
            storeId: String(storeId),
          },
          { $set: updateData }
        )
      : { matchedCount: productIds.length, modifiedCount: supplierChangeRequested ? productIds.length : 0 }

    const autoStockHistory = []
    if (setZeroStockToFive && productsBeforeUpdate.length) {
      await Promise.all(productsBeforeUpdate.map(async (product) => {
        if (getCurrentStock(product) !== 0) return

        const nextProduct = { ...product }
        const update = { stockUpdatedAt: new Date() }
        if (product.hasVariants && Array.isArray(product.variants) && product.variants.length) {
          nextProduct.variants = product.variants.map((variant) => {
            if (Number(variant?.stock ?? 0) > 0) return variant
            return { ...variant, stock: 5 }
          })
          update.variants = nextProduct.variants
        } else {
          nextProduct.stockQuantity = 5
          update.stockQuantity = 5
        }

        await Product.updateOne(
          { _id: product._id, storeId: String(storeId) },
          { $set: update },
        )
        autoStockHistory.push({ product, nextProduct })
      }))
    }

    if (stockChangeRequested && productsBeforeUpdate.length) {
      const actor = await resolveInventoryActor(userId, decodedToken)
      const historyProducts = stockQuantity !== undefined
        ? productsBeforeUpdate.map((product) => ({
            product,
            nextStock: product.hasVariants && Array.isArray(product.variants) && product.variants.length
              ? getCurrentStock(product)
              : stockQuantity,
          }))
        : autoStockHistory.map(({ product, nextProduct }) => ({
            product,
            nextStock: getCurrentStock(nextProduct),
          }))
      await Promise.all(historyProducts.map(({ product, nextStock }) => {
        const previousStock = getCurrentStock(product)
        return recordInventoryHistory({
          ...actor,
          productId: String(product._id),
          productName: product.name || '',
          sku: product.sku || '',
          action: 'bulk_update',
          quantityDelta: nextStock - previousStock,
          previousStock,
          newStock: nextStock,
          source: 'bulk_update',
          details: `Bulk update for ${productIds.length} product(s)`,
        })
      }))
    }

    invalidateStorefrontProductCaches()
    queueInventorySheetSync(storeId)

    return NextResponse.json({
      success: true,
      matchedCount: Number(result?.matchedCount || 0),
      modifiedCount: Number(result?.modifiedCount || 0) || ((skuAssignRequested || supplierChangeRequested) ? productIds.length : 0),
      missingSkus: skuLookup.missing,
      productIds,
      message: `Updated ${productIds.length} product(s) successfully.`,
    })
  } catch (error) {
    console.error('[store product bulk-update PATCH] error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to bulk update products' }, { status: error?.statusCode || 500 })
  }
}