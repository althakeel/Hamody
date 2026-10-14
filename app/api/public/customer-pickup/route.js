import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import { CUSTOMER_PICKUP_ADDRESS, normalizeCustomerPickupRule } from '@/lib/customerPickup';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const store = await Store.findOne({})
      .sort({ updatedAt: -1 })
      .select('customerPickupEnabled customerPickupScope customerPickupSkus')
      .lean();
    const rule = normalizeCustomerPickupRule(store || {});
    return NextResponse.json({
      enabled: rule.enabled,
      scope: rule.scope,
      skus: rule.skus,
      address: CUSTOMER_PICKUP_ADDRESS.line,
    });
  } catch {
    return NextResponse.json({ enabled: true, scope: 'all', skus: [] });
  }
}
