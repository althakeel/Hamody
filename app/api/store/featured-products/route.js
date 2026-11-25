import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { getCachedData, setCachedData, invalidateStorefrontProductCaches } from '@/lib/cache'
import { invalidateCategorySliderCaches } from '@/lib/categorySliderCache'
import { buildFeaturedProductsListQuery, FEATURED_PRODUCT_MAX, isManualFeaturedSelection, manualFeaturedWindow, normalizeManualRotateHours, resolvePublicFeaturedStore } from '@/lib/featuredProducts'
import { clampFeaturedColumns, clampFeaturedRows, featuredVisibleCount } from '@/lib/featuredProductLimit'
import { getAuth } from '@/lib/firebase-admin'
import authSeller from '@/middlewares/authSeller'
import Store from '@/models/Store'
import Product from '@/models/Product'
import { attachProductRatings } from '@/lib/attachProductRatings'
import { STOREFRONT_IN_STOCK_FILTER, STOREFRONT_PUBLISHED_FILTER, filterStorefrontInStockProducts, isProductPublished } from '@/lib/productVisibility'

const DEFAULT_FEATURED_RESPONSE = {
    productIds: [],
    sourceMode: 'manual',
    categoryIds: [],
    tags: [],
    excludedProductIds: [],
    columns: 5,
    rows: 2,
    sectionTitle: 'Craziest sale of the year!',
    sectionDescription: "Grab the best deals before they're gone!",
    sectionTitleAr: '',
    sectionDescriptionAr: '',
}

function createFeaturedResponse(payload) {
    return NextResponse.json(payload, {
        headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0' },
    })
}

const normalizeList = (value) => {
    if (!Array.isArray(value)) return []
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)))
}

const normalizeMode = (value) => {
    if (value === 'category' || value === 'tag' || value === 'latest') return value
    return 'manual'
}

const normalizeId = (value) => {
    if (!value) return null
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (typeof value === 'object') {
        if (value.$oid) return String(value.$oid)
        const stringValue = value.toString?.()
        return stringValue && stringValue !== '[object Object]' ? String(stringValue) : null
    }
    return null
}

const buildProductProjection = '_id name nameAr slug price mrp AED images category categories tags inStock stockQuantity published createdAt'

async function getSellerFromAuthHeader(request) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null

    const idToken = authHeader.split('Bearer ')[1]
    try {
        const decodedToken = await getAuth().verifyIdToken(idToken)
        if (!decodedToken?.uid) return null
        return { uid: decodedToken.uid, email: decodedToken.email || '' }
    } catch {
        return null
    }
}

export async function GET(request) {
    try {
        await connectDB()

        const { searchParams } = new URL(request.url)
        const includeProducts = searchParams.get('includeProducts') === 'true'
        const limit = Number(searchParams.get('limit') || 0)

        // If authenticated, always return the caller's own store data.
        let seller = null
        try {
            seller = await getSellerFromAuthHeader(request)
        } catch (authError) {
            console.warn('[featured-products GET] auth lookup failed, falling back to public data:', authError?.message || authError)
        }

        const isPublicRequest = !seller?.uid
        let store = null
        if (seller?.uid) {
            try {
                const storeId = await authSeller(seller.uid, seller.email)
                if (storeId) {
                    store = await Store.findById(storeId).lean()
                }
            } catch (sellerError) {
                console.warn('[featured-products GET] seller lookup failed, falling back to public data:', sellerError?.message || sellerError)
            }
        }

        // Public fallback: use the store that most recently listed an in-stock product.
        if (!store) {
            store = await resolvePublicFeaturedStore(Store, Product)
        }
        const sourceMode = normalizeMode(store?.featuredProductsSource)
        const productIds = normalizeList(store?.featuredProductIds)
        const categoryIds = normalizeList(store?.featuredProductsCategoryIds)
        const tags = normalizeList(store?.featuredProductsTags)
        const excludedProductIds = normalizeList(store?.featuredExcludedProductIds)
        const columns = clampFeaturedColumns(store?.featuredColumns)
        const rows = clampFeaturedRows(store?.featuredRows)
        const visibleCount = featuredVisibleCount(columns, rows)
        const sectionTitle = store?.featuredSectionTitle || 'Craziest sale of the year!'
        const sectionDescription = store?.featuredSectionDescription || "Grab the best deals before they're gone!"
        const sectionTitleAr = store?.featuredSectionTitleAr || ''
        const sectionDescriptionAr = store?.featuredSectionDescriptionAr || ''
        const manualRotateHours = normalizeManualRotateHours(store?.featuredManualRotateHours)
        const rotateWindow = manualRotateHours > 0
            ? Math.floor(Date.now() / (manualRotateHours * 60 * 60 * 1000))
            : 0
        const cacheKey = isPublicRequest
            ? `public:featured-products:api:v15:${includeProducts}:${visibleCount}:${columns}:${rows}:${categoryIds.join(',')}:${tags.join(',')}:${excludedProductIds.join(',')}:${manualRotateHours}:${rotateWindow}`
            : null
        if (cacheKey) {
            const cached = getCachedData(cacheKey)
            if (cached) {
                return createFeaturedResponse(cached, true)
            }
        }

        const resolveProducts = async () => {
            if (isManualFeaturedSelection(sourceMode, productIds)) {
                const productsRaw = await Product.find({
                    _id: { $in: productIds },
                    ...STOREFRONT_PUBLISHED_FILTER,
                    ...(isPublicRequest ? STOREFRONT_IN_STOCK_FILTER : {}),
                })
                    .select(buildProductProjection)
                    .lean()
                const productMap = new Map(productsRaw.map((product) => [product._id.toString(), product]))
                return productIds
                    .map((id) => productMap.get(id))
                    .filter((product) => product && isProductPublished(product))
            }

            const { query, sort } = buildFeaturedProductsListQuery({
                sourceMode,
                productIds,
                categoryIds,
                tags,
                storeId: store?._id,
                excludedProductIds,
            })

            const productsRaw = await Product.find(query)
                .sort(sort)
                .select(buildProductProjection)
                .limit(visibleCount)
                .lean()

            return productsRaw
        }

        if (!includeProducts) {
            const payload = {
                productIds,
                sourceMode,
                categoryIds,
                tags,
                excludedProductIds,
                columns,
                rows,
                sectionTitle,
                sectionDescription,
                sectionTitleAr,
                sectionDescriptionAr,
                manualRotateHours,
            }
            if (cacheKey) setCachedData(cacheKey, payload, 15)
            return createFeaturedResponse(payload, isPublicRequest)
        }

        let products = await resolveProducts()
        if (isPublicRequest || isManualFeaturedSelection(sourceMode, productIds)) {
            products = filterStorefrontInStockProducts(products)
        }

        if (isManualFeaturedSelection(sourceMode, productIds)) {
            products = manualFeaturedWindow(products, {
                rotateHours: manualRotateHours,
                slotCount: visibleCount,
            }).products
        }
        products = products.slice(0, visibleCount)
        products = await attachProductRatings(products)

        const resolvedProductIds = products.map((product) => normalizeId(product?._id || product?.id)).filter(Boolean)

        const payload = {
            productIds: isPublicRequest ? resolvedProductIds : productIds,
            sourceMode,
            categoryIds,
            tags,
            excludedProductIds,
            columns,
            rows,
            sectionTitle,
            sectionDescription,
            sectionTitleAr,
            sectionDescriptionAr,
            manualRotateHours,
            products
        }
        if (cacheKey) setCachedData(cacheKey, payload, 15)
        return createFeaturedResponse(payload)
    } catch (error) {
        console.error('Error fetching featured products:', error)
        return createFeaturedResponse({
            ...DEFAULT_FEATURED_RESPONSE,
            products: [],
        })
    }
}

export async function POST(request) {
    try {
        await connectDB()

        const seller = await getSellerFromAuthHeader(request)
        if (!seller?.uid) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

        const storeId = await authSeller(seller.uid, seller.email)
        if (!storeId) {
            return NextResponse.json({ error: 'Store not found for user' }, { status: 404 })
        }

        const { productIds, sourceMode, categoryIds, tags, excludedProductIds, columns, rows, sectionTitle, sectionDescription, sectionTitleAr, sectionDescriptionAr, manualRotateHours } = await request.json()

        // Validate productIds is an array
        if (!Array.isArray(productIds)) {
            return NextResponse.json({ error: 'productIds must be an array' }, { status: 400 })
        }

        const normalizedSourceMode = normalizeMode(sourceMode)
        const normalizedProductIds = normalizeList(productIds).slice(0, FEATURED_PRODUCT_MAX)
        const normalizedCategoryIds = normalizeList(categoryIds)
        const normalizedTags = normalizeList(tags)

        // Update store with featured product IDs
        const updatedStore = await Store.findByIdAndUpdate(
            storeId,
            {
                featuredProductIds: normalizedProductIds,
                featuredProductsSource: normalizedSourceMode,
                featuredProductsCategoryIds: normalizedCategoryIds,
                featuredProductsTags: normalizedTags,
                featuredExcludedProductIds: normalizeList(excludedProductIds),
                featuredColumns: clampFeaturedColumns(columns),
                featuredRows: clampFeaturedRows(rows),
                ...(manualRotateHours !== undefined
                    ? { featuredManualRotateHours: normalizeManualRotateHours(manualRotateHours) }
                    : {}),
                ...(typeof sectionTitle === 'string' ? { featuredSectionTitle: sectionTitle.trim() } : {}),
                ...(typeof sectionDescription === 'string' ? { featuredSectionDescription: sectionDescription.trim() } : {}),
                ...(typeof sectionTitleAr === 'string' ? { featuredSectionTitleAr: sectionTitleAr.trim() } : {}),
                ...(typeof sectionDescriptionAr === 'string' ? { featuredSectionDescriptionAr: sectionDescriptionAr.trim() } : {}),
            },
            { new: true, strict: false }
        )

        invalidateStorefrontProductCaches()
        invalidateCategorySliderCaches()

        return NextResponse.json({ 
            message: 'Featured products updated successfully',
            productIds: updatedStore.featuredProductIds,
            sourceMode: updatedStore.featuredProductsSource,
            categoryIds: updatedStore.featuredProductsCategoryIds || [],
            tags: updatedStore.featuredProductsTags || [],
            excludedProductIds: updatedStore.featuredExcludedProductIds || [],
            columns: clampFeaturedColumns(updatedStore.featuredColumns),
            rows: clampFeaturedRows(updatedStore.featuredRows),
            sectionTitle: updatedStore.featuredSectionTitle,
            sectionDescription: updatedStore.featuredSectionDescription,
            sectionTitleAr: updatedStore.featuredSectionTitleAr || '',
            sectionDescriptionAr: updatedStore.featuredSectionDescriptionAr || '',
            manualRotateHours: normalizeManualRotateHours(updatedStore.featuredManualRotateHours),
        })
    } catch (error) {
        console.error('Error saving featured products:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
