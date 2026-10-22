import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import { requireStorePermission } from "@/lib/storeAccessControl";

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

    const { id } = params;
    const body = await request.json();

    const coupon = await Coupon.findOne({
      _id: id,
      storeId: seller.storeId,
    });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    // Update fields
    Object.keys(body).forEach((key) => {
      if (key === "code") {
        coupon[key] = body[key].toUpperCase();
      } else if (key === "expiresAt" && body[key]) {
        coupon[key] = new Date(body[key]);
      } else {
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
