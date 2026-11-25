import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Store from '@/models/Store'
import { getCachedData, setCachedData } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'public:explore-interests:v3-approved-store'
const CACHE_TTL = 120

function normalizeIds(arr) {
  return Array.from(new Set(
    (Array.isArray(arr) ? arr : []).map((id) => String(id || '').trim()).filter(Boolean)
  ))
}

function normalizeCategoryIds(arr) {
  return Array.from(new Set(
    (Array.isArray(arr) ? arr : [])
      .map((id) => String(id || '').trim())
      .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
  )).slice(0, 40)
}

export async function GET() {
  try {
    const cached = getCachedData(CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
          'X-Cache': 'HIT',
        },
      })
    }

    await connectDB()

    const store = await Store.findOne({ status: 'approved' })
      .sort({ updatedAt: -1 })
      .select('_id exploreInterestsEnabled exploreInterestsProductIds exploreInterestsCategoryIds')
      .lean()

    const productIds = normalizeIds(store?.exploreInterestsProductIds)
    const payload = {
      enabled: typeof store?.exploreInterestsEnabled === 'boolean' ? store.exploreInterestsEnabled : true,
      productIds,
      categoryIds: normalizeCategoryIds(store?.exploreInterestsCategoryIds),
      _storeId: store?._id ? String(store._id) : null,
    }

    setCachedData(CACHE_KEY, payload, CACHE_TTL)

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('[explore interests public GET] error:', error)
    return NextResponse.json({ enabled: true, productIds: [], categoryIds: [] })
  }
}
