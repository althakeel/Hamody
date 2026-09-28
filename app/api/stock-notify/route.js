import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import StockNotifyRequest from '@/models/StockNotifyRequest';
import { parseNotifyContact } from '@/lib/stockNotify';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const productId = String(body?.productId || '').trim();
    const contact = parseNotifyContact({
      email: body?.email,
      phone: body?.phone,
      phoneCode: body?.phoneCode,
    });
    if (contact.error) {
      return NextResponse.json({ error: contact.error }, { status: 400 });
    }
    if (!productId) {
      return NextResponse.json({ error: 'Product is required.' }, { status: 400 });
    }

    await connectDB();
    const product = await Product.findById(productId)
      .select('_id name sku storeId')
      .lean();
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const storeId = String(product.storeId || '').trim();
    if (!storeId) {
      return NextResponse.json({ error: 'Product store is missing.' }, { status: 400 });
    }

    try {
      await StockNotifyRequest.create({
        storeId,
        productId: String(product._id),
        productName: String(product.name || '').trim(),
        sku: String(body?.sku || product.sku || '').trim(),
        email: contact.email,
        phone: contact.phone,
        contactKey: contact.contactKey,
        status: 'pending',
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      await StockNotifyRequest.updateOne(
        { storeId, productId: String(product._id), contactKey: contact.contactKey },
        {
          $set: {
            status: 'pending',
            email: contact.email,
            phone: contact.phone,
            productName: String(product.name || '').trim(),
            sku: String(body?.sku || product.sku || '').trim(),
            deletedAt: null,
            deletedBy: null,
            deletedByName: null,
          },
        },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'We will notify you when this is back in stock.',
    });
  } catch (error) {
    console.error('[stock-notify POST]', error);
    return NextResponse.json({ error: 'Failed to save notify request.' }, { status: 500 });
  }
}
