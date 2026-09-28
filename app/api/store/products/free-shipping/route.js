import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import authSeller from '@/middlewares/authSeller';
import { NextResponse } from 'next/server';
import { FREE_DELIVERY_THRESHOLD_AED } from '@/lib/freeDeliveryPolicy';

export const dynamic = 'force-dynamic';

// PUT: Set freeShippingEligible on selected products, clear it on all others
export async function PUT(request) {
    try {
        await connectDB();

        const authHeader = request.headers.get('authorization');
        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];
            try {
                const { getAuth } = await import('@/lib/firebase-admin');
                const adminAuth = getAuth();
                const decodedToken = await adminAuth.verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (e) {
                return NextResponse.json({ error: 'Auth verification failed' }, { status: 401 });
            }
        }
        const storeId = await authSeller(userId);
        if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

        const { productIds } = await request.json();
        if (!Array.isArray(productIds)) {
            return NextResponse.json({ error: 'productIds must be an array' }, { status: 400 });
        }

        const normalizedIds = productIds
            .map((id) => String(id || '').trim())
            .filter(Boolean);

        // Products under AED 100 follow the seller's list. Products at AED 100 or more stay free.
        await Product.updateMany(
            { storeId: String(storeId), price: { $lt: FREE_DELIVERY_THRESHOLD_AED } },
            { $set: { freeShippingEligible: false } }
        );
        if (normalizedIds.length > 0) {
            await Product.updateMany(
                { storeId: String(storeId), _id: { $in: normalizedIds } },
                { $set: { freeShippingEligible: true } }
            );
        }
        await Product.updateMany(
            { storeId: String(storeId), price: { $gte: FREE_DELIVERY_THRESHOLD_AED } },
            { $set: { freeShippingEligible: true } }
        );

        return NextResponse.json({ success: true, updated: normalizedIds.length });
    } catch (error) {
        console.error('Free shipping batch update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
