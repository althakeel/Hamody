import authSeller from "@/middlewares/authSeller";
import connectDB from '@/lib/mongodb';
import Rating from '@/models/Rating';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { orderContainsReviewProduct } from '@/lib/verifiedReview';
import { invalidateProductReviewCaches } from '@/lib/storeReviewCache';


// POST: Approve or reject a review
export async function POST(request) {
    try {
        await connectDB();
        
        // Firebase Auth
        const authHeader = request.headers.get('authorization');
        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];
            const { getAuth } = await import('firebase-admin/auth');
            const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
            if (getApps().length === 0) {
                initializeApp({ credential: applicationDefault() });
            }
            try {
                const decodedToken = await getAuth().verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (e) {
                userId = null;
            }
        }

        const storeId = await authSeller(userId);
        if (!storeId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { reviewId, approved } = await request.json();

        if (!reviewId || typeof approved !== 'boolean') {
            return Response.json({ error: "Missing required fields" }, { status: 400 });
        }

        const review = await Rating.findById(reviewId).lean();

        if (!review) {
            return Response.json({ error: "Review not found" }, { status: 404 });
        }

        const product = await Product.findOne({
            _id: review.productId,
            storeId,
        }).select('_id').lean();

        if (!product) {
            return Response.json({ error: "Unauthorized to modify this review" }, { status: 403 });
        }

        if (approved) {
            if (!review.orderId) {
                return Response.json({ error: 'Only reviews linked to a verified purchase can be published' }, { status: 403 });
            }

            const order = await Order.findOne({
                _id: review.orderId,
                storeId: String(storeId),
                status: { $regex: /^delivered$/i },
            }).select('_id orderItems items').lean();
            if (!order || !orderContainsReviewProduct(order, review.productId)) {
                return Response.json({ error: 'The delivered purchase for this review could not be verified' }, { status: 403 });
            }
        }

        const updatedReview = await Rating.findByIdAndUpdate(
            reviewId,
            { approved, isApproved: approved },
            { new: true }
        );
        invalidateProductReviewCaches(review.productId);

        return Response.json({
            success: true,
            message: approved ? "Review approved successfully" : "Review rejected successfully",
            review: updatedReview
        });

    } catch (error) {
        console.error('Review approval error:', error);
        return Response.json({
            error: error.message || "Failed to update review"
        }, { status: 500 });
    }
}
