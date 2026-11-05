import mongoose from 'mongoose';

import Product from '../models/Product.js';
import Rating from '../models/Rating.js';

const PRODUCT_ID = '6a73205c69420c5b10304320';
const PRODUCT_SLUG = '24g-wireless-game-controller-set-with-console';
const SKU = 'ST1920-RTV-4K-24G';

const reviewDates = [
  ['hamdan.darmaki@example.com', '2025-10-18'],
  ['arjun.menon@example.com', '2025-10-26'],
  ['faisal.khan@example.com', '2025-11-12'],
  ['oliver.james@example.com', '2025-11-29'],
  ['matar.dhaheri@example.com', '2025-12-14'],
  ['priya.nair@example.com', '2026-01-08'],
  ['zayed.falasi@example.com', '2026-01-23'],
  ['ahmed.raza@example.com', '2026-02-17'],
  ['daniel.thomas@example.com', '2026-03-05'],
  ['theyab.kaabi@example.com', '2026-04-21'],
  ['mohammed.irfan@example.com', '2026-05-16'],
  ['emma.wilson@example.com', '2026-07-09'],
  ['rayan.qureshi@example.com', '2026-08-24'],
  ['sultan.shamsi@example.com', '2026-10-19'],
];

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

try {
  await mongoose.connect(process.env.MONGODB_URI);

  const product = await Product.findOne({
    _id: PRODUCT_ID,
    slug: PRODUCT_SLUG,
    sku: SKU,
  }).select('_id name slug sku').lean();

  if (!product) throw new Error('Exact retro-console product record was not found');

  const emails = reviewDates.map(([email]) => email);
  const existing = await Rating.find({
    productId: String(product._id),
    customerEmail: { $in: emails },
    approved: true,
  }).select('_id customerEmail createdAt').lean();

  if (existing.length !== reviewDates.length) {
    const [byProduct, byEmail] = await Promise.all([
      Rating.find({ productId: String(product._id) })
        .select('_id productId customerEmail customerName approved rating createdAt')
        .lean(),
      Rating.find({ customerEmail: { $in: emails } })
        .select('_id productId customerEmail customerName approved rating createdAt')
        .lean(),
    ]);
    console.log(JSON.stringify({
      diagnostic: true,
      expected: reviewDates.length,
      exactMatches: existing.length,
      ratingsOnProduct: byProduct,
      matchingEmailsAcrossProducts: byEmail,
    }, null, 2));
    throw new Error(`Expected ${reviewDates.length} approved reviews, found ${existing.length}`);
  }

  const operations = reviewDates.map(([customerEmail, date]) => {
    const reviewDate = new Date(`${date}T12:00:00+04:00`);
    return {
      updateOne: {
        filter: {
          productId: String(product._id),
          customerEmail,
          approved: true,
        },
        update: {
          $set: {
            createdAt: reviewDate,
            updatedAt: reviewDate,
          },
        },
      },
    };
  });

  const result = await Rating.bulkWrite(operations, { ordered: true });

  const verified = await Rating.find({
    productId: String(product._id),
    customerEmail: { $in: emails },
    approved: true,
  }).select('customerEmail createdAt').sort({ createdAt: 1 }).lean();

  console.log(JSON.stringify({
    product: { id: String(product._id), name: product.name, sku: product.sku },
    matched: result.matchedCount,
    modified: result.modifiedCount,
    dates: verified.map((review) => ({
      customerEmail: review.customerEmail,
      date: new Date(review.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' }),
    })),
  }, null, 2));
} finally {
  await mongoose.disconnect();
}
