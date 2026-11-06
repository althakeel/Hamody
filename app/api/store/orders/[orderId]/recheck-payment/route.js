import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyStoreSeller } from '@/lib/storeSellerAuth';
import { reconcileStoreOrderPaymentById } from '@/lib/orderPaymentReconciliation';

export const dynamic = 'force-dynamic';

/**
 * Recheck one awaiting/failed order against Tabby / Tamara / Stripe / card.
 * Used by the seller dashboard "Recheck payment" button.
 */
export async function POST(request, { params }) {
  try {
    const auth = await verifyStoreSeller(request);
    if (auth.error) return auth.error;

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    await connectDB();
    const result = await reconcileStoreOrderPaymentById(auth.storeId, orderId);

    if (result?.reason === 'order_not_found') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (result?.reason === 'not_recheckable_payment_status') {
      return NextResponse.json(
        {
          error: 'Recheck is only available for awaiting-payment or payment-failed orders',
          reason: result.reason,
          status: result.status,
          isPaid: result.isPaid,
          order: result.order,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[store/orders/recheck-payment]', error);
    return NextResponse.json(
      { error: error?.message || 'Payment recheck failed' },
      { status: 500 },
    );
  }
}
