import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import { CUSTOMER_PICKUP_ADDRESS } from '@/lib/customerPickup';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const store = await Store.findOne({})
      .sort({ updatedAt: -1 })
      .select('customerPickupEnabled')
      .lean();
    return NextResponse.json({
      enabled: store?.customerPickupEnabled !== false,
      address: CUSTOMER_PICKUP_ADDRESS.line,
    });
  } catch {
    return NextResponse.json({ enabled: true });
  }
}
