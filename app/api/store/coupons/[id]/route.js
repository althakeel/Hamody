import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import { requireStorePermission } from "@/lib/storeAccessControl";
import { isAdminEmail } from "@/lib/adminEmails";
import { couponCodeEqualsQuery, normalizeCouponCode } from "@/lib/couponAccess";

// PUT - Update a coupon
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    // Firebase Auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split(" ")[1];
    const { getAuth } = await import('firebase-admin/auth');
    const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
    if (getApps().length === 0) {
      initializeApp({ credential: applicationDefault() });
    }
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const seller = await requireStorePermission(decodedToken.uid, decodedToken, 'coupons');
    if (seller.error) {
      return NextResponse.json({ error: seller.error }, { status: seller.status });
    }
    const isSuperAdmin = isAdminEmail(decodedToken.email);

    const { id } = await params;
    const body = await request.json();

    const coupon = await Coupon.findOne({
      _id: id,
      storeId: seller.storeId,
    });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const nextCode = normalizeCouponCode(body?.code);
    const currentCode = normalizeCouponCode(coupon.code);
    if (nextCode && nextCode !== currentCode) {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: "Only the super admin can change a coupon code." },
          { status: 403 },
        );
      }
      const clash = await Coupon.findOne({
        code: couponCodeEqualsQuery(nextCode) || nextCode,
        _id: { $ne: coupon._id },
      }).select("_id").lean();
      if (clash) {
        return NextResponse.json(
          { error: "That coupon code is already in use." },
          { status: 400 },
        );
      }
    }

    // Update fields
    Object.keys(body).forEach((key) => {
      if (key === "code") {
        if (!isSuperAdmin) return;
        coupon[key] = normalizeCouponCode(body[key]);
      } else if (key === "expiresAt" && body[key]) {
        coupon[key] = new Date(body[key]);
      } else if (key !== "_id" && key !== "storeId") {
        coupon[key] = body[key];
      }
    });

    await coupon.save();

    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return NextResponse.json(
      { error: "Failed to update coupon" },
      { status: 500 }
    );
  }
}
