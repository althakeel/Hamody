import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { findOwnedProduct, ownedProductFilter } from "@/lib/ownedProductQuery";
import authSeller from "@/middlewares/authSeller";
import { invalidateStorefrontProductCaches } from "@/lib/cache";
import { getAuth } from "@/lib/firebase-admin";

import { NextResponse } from "next/server";

function zeroVariantStocks(variants = []) {
  return (Array.isArray(variants) ? variants : []).map((variant) => ({
    ...variant,
    stock: 0,
  }));
}

function restoreVariantStocks(variants = [], qty = 1) {
  const nextQty = Math.max(1, Number(qty) || 1);
  return (Array.isArray(variants) ? variants : []).map((variant) => ({
    ...variant,
    stock: nextQty,
  }));
}

// Toggle stock of a product.
// Out of stock → Stock Qty 0 (and pack/variant rows 0).
// Back in stock with qty 0 → Stock Qty 1 so the storefront can sell again.

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    let userId = null;
    try {
      const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    const { productId } = await request.json();
    if (!productId || typeof productId !== "string" || !productId.match(/^[a-fA-F0-9]{24}$/)) {
      return NextResponse.json({ error: "Product ID required or invalid format" }, { status: 400 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    await dbConnect();

    const product = await findOwnedProduct(storeId, productId, "_id inStock stockQuantity hasVariants variants");

    if (!product) {
      return NextResponse.json({ error: "no product found" }, { status: 404 });
    }

    const nextInStock = !product.inStock;
    const update = {
      inStock: nextInStock,
      stockUpdatedAt: new Date(),
      updatedAt: new Date(),
    };

    if (!nextInStock) {
      update.stockQuantity = 0;
      if (Array.isArray(product.variants) && product.variants.length) {
        update.variants = zeroVariantStocks(product.variants);
      }
    } else {
      const currentQty = Math.max(0, Number(product.stockQuantity) || 0);
      const restoredQty = currentQty > 0 ? currentQty : 1;
      update.stockQuantity = restoredQty;
      if (Array.isArray(product.variants) && product.variants.length) {
        const hasPositiveVariant = product.variants.some((variant) => Number(variant?.stock) > 0);
        if (!hasPositiveVariant) {
          update.variants = restoreVariantStocks(product.variants, restoredQty);
        }
      }
    }

    await Product.updateOne(ownedProductFilter(storeId, productId), { $set: update });
    invalidateStorefrontProductCaches();

    return NextResponse.json({
      message: nextInStock
        ? "Product marked in stock"
        : "Product marked out of stock (Stock Qty set to 0)",
      inStock: nextInStock,
      stockQuantity: update.stockQuantity,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}
