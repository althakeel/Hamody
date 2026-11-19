import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
import authSeller from '@/middlewares/authSeller'
import { getAuth } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

async function getStoreIdFromRequest(request) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return null

  const idToken = authHeader.replace('Bearer ', '')
  const decodedToken = await getAuth().verifyIdToken(idToken)
  return authSeller(decodedToken.uid)
}

export async function POST(request) {
  try {
    const storeId = await getStoreIdFromRequest(request)
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const productIds = Array.isArray(body?.productIds)
      ? [...new Set(body.productIds.map((productId) => String(productId).trim()).filter(Boolean))]
      : []

    if (!productIds.length) {
      return NextResponse.json({ error: 'Select at least one product to delete.' }, { status: 400 })
    }

    await connectDB()

    const products = await Product.find({
      _id: { $in: productIds },
      storeId: String(storeId),
    }).select('slug').lean()

    const result = await Product.deleteMany({
      _id: { $in: productIds },
      storeId: String(storeId),
    })

    try {
      const { recordProductsGone } = await import('@/lib/urlRedirects')
      await recordProductsGone(products.map((product) => product.slug), 'Product deleted')
    } catch (redirectError) {
      console.error('[url-redirects] product bulk delete', redirectError)
    }

    let categoriesRemoved = 0
    try {
      const { removeCategoriesIfCatalogEmpty } = await import('@/lib/emptyCatalogCategories')
      const cleared = await removeCategoriesIfCatalogEmpty(storeId)
      categoriesRemoved = Number(cleared?.removed || 0)
    } catch (categoryError) {
      console.error('[categories] empty catalog bulk delete', categoryError)
    }

    const { queueInventorySheetSync } = await import('@/lib/googleSheetsInventory')
    queueInventorySheetSync(storeId)

    const deletedCount = Number(result?.deletedCount || 0)
    const categoryNote = categoriesRemoved
      ? ` Removed ${categoriesRemoved} categor${categoriesRemoved === 1 ? 'y' : 'ies'}.`
      : ''

    return NextResponse.json({
      success: true,
      deletedCount,
      categoriesRemoved,
      message: `Deleted ${deletedCount} product(s) successfully.${categoryNote}`,
    })
  } catch (error) {
    console.error('[store product bulk-delete POST] error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete selected products' }, { status: 500 })
  }
}