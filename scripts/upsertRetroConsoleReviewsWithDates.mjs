import crypto from 'node:crypto';
import mongoose from 'mongoose';

import Product from '../models/Product.js';
import Rating from '../models/Rating.js';
import User from '../models/User.js';

const PRODUCT_ID = '6a73205c69420c5b10304320';
const PRODUCT_SLUG = '24g-wireless-game-controller-set-with-console';
const SKU = 'ST1920-RTV-4K-24G';

const reviews = [
  {
    customerName: 'Hamdan Al Darmaki', customerEmail: 'hamdan.darmaki@example.com', date: '2025-10-18',
    review: 'Really enjoyable little gaming console. Setup was simple, just connected it to the TV and started playing. The two wireless controllers make it great for playing with family. Lots of classic games to explore.',
  },
  {
    customerName: 'Arjun Menon', customerEmail: 'arjun.menon@example.com', date: '2025-10-26',
    review: 'Bought this mainly for the retro games, and it brings back so many childhood memories. The console is compact, easy to connect and comes with two controllers. Great entertainment for the price.',
  },
  {
    customerName: 'Faisal Khan', customerEmail: 'faisal.khan@example.com', date: '2025-11-12',
    review: 'Very good for family gaming. My kids enjoy playing the classic games, and the wireless controllers make it more convenient. Having so many games in one device is definitely a plus.',
  },
  {
    customerName: 'Oliver James', customerEmail: 'oliver.james@example.com', date: '2025-11-29',
    review: 'Nice little retro gaming system. Easy installation and a good selection of old-school games. I like that both controllers are wireless, so there are no cables getting in the way.',
  },
  {
    customerName: 'Matar Al Dhaheri', customerEmail: 'matar.dhaheri@example.com', date: '2025-12-14',
    review: 'جهاز حلو وايد، شبكته على التلفزيون واشتغل بسهولة. الألعاب القديمة ذكرتني بأيام الطفولة، واليدين اللاسلكية ميزة ممتازة.',
  },
  {
    customerName: 'Priya Nair', customerEmail: 'priya.nair@example.com', date: '2026-01-08',
    review: 'Purchased this for my family, and everyone is enjoying it. There are so many classic games to choose from. The two controllers make it perfect for playing together. Good entertainment at home.',
  },
  {
    customerName: 'Zayed Al Falasi', customerEmail: 'zayed.falasi@example.com', date: '2026-01-23',
    review: 'صراحة تجربة حلوة، خصوصاً الألعاب الكلاسيكية. الجهاز صغير وسهل التوصيل بالتلفزيون، والكنترولر اللاسلكي يخلي اللعب أريح.',
  },
  {
    customerName: 'Ahmed Raza', customerEmail: 'ahmed.raza@example.com', date: '2026-02-17',
    review: 'Good collection of retro games. I was surprised by how many games are included. The setup is straightforward, and having two wireless controllers is useful for multiplayer gaming.',
  },
  {
    customerName: 'Daniel Thomas', customerEmail: 'daniel.thomas@example.com', date: '2026-03-05',
    review: "A fun product for anyone who enjoys classic gaming. The compact console doesn't need much space, and connecting it to the TV was easy. Great way to enjoy old games again.",
  },
  {
    customerName: 'ذياب الكعبي', customerEmail: 'theyab.kaabi@example.com', date: '2026-04-21',
    review: 'خذته حق البيت وطلع ممتع. فيه ألعاب وايد قديمة وحلوة، وعيالي استانسوا عليه. حلو إن فيه يدين لاسلكية ونقدر نلعب مع بعض.',
  },
  {
    customerName: 'Mohammed Irfan', customerEmail: 'mohammed.irfan@example.com', date: '2026-05-16',
    review: 'Really nice gaming box with a large selection of classic titles. I like the save and load feature, and the wireless controllers are comfortable to use. Worth considering for retro gaming fans.',
  },
  {
    customerName: 'Emma Wilson', customerEmail: 'emma.wilson@example.com', date: '2026-07-09',
    review: 'Bought this as a gift, and it was a great choice. Easy to connect and fun to use. The variety of games makes it suitable for different age groups. Everyone enjoyed trying it out.',
  },
  {
    customerName: 'Rayan Qureshi', customerEmail: 'rayan.qureshi@example.com', date: '2026-08-24',
    review: 'The console is compact and convenient. I especially like having two wireless controllers included. It is a nice option for casual gaming and spending time with friends.',
  },
  {
    customerName: 'سلطان الشامسي', customerEmail: 'sultan.shamsi@example.com', date: '2026-10-19',
    review: 'الجهاز يستاهل التجربة، توصيله سهل وفيه ألعاب كلاسيكية كثيرة. مناسب حق اللمة واللعب مع الأهل والأصدقاء. عجبني حجمه الصغير وسهولة استخدامه.',
  },
];

function manualUserId(email) {
  return `manual_${crypto.createHash('sha256').update(email).digest('hex').slice(0, 24)}`;
}

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

try {
  await mongoose.connect(process.env.MONGODB_URI);

  const product = await Product.findOne({
    _id: PRODUCT_ID,
    slug: PRODUCT_SLUG,
    sku: SKU,
  }).select('_id name slug sku').lean();
  if (!product) throw new Error('Exact retro-console product record was not found');

  const operations = [];
  for (const item of reviews) {
    const user = await User.findOneAndUpdate(
      { email: item.customerEmail },
      {
        $setOnInsert: {
          _id: manualUserId(item.customerEmail),
          name: item.customerName,
          email: item.customerEmail,
          image: '/placeholder-avatar.png',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const reviewDate = new Date(`${item.date}T12:00:00+04:00`);
    operations.push({
      updateOne: {
        filter: {
          productId: String(product._id),
          customerEmail: item.customerEmail,
        },
        update: {
          $set: {
            userId: String(user._id),
            productId: String(product._id),
            rating: 5,
            review: item.review,
            customerName: item.customerName,
            customerEmail: item.customerEmail,
            approved: true,
            isApproved: true,
            createdAt: reviewDate,
            updatedAt: reviewDate,
          },
          $setOnInsert: {
            images: [], videos: [], helpfulCount: 0, helpfulVoters: [],
          },
        },
        upsert: true,
      },
    });
  }

  const result = await Rating.collection.bulkWrite(operations, { ordered: true });
  const emails = reviews.map((item) => item.customerEmail);
  const verified = await Rating.find({
    productId: String(product._id),
    customerEmail: { $in: emails },
    approved: true,
  }).select('customerEmail createdAt rating').sort({ createdAt: 1 }).lean();

  if (verified.length !== reviews.length) {
    throw new Error(`Expected ${reviews.length} reviews after import, found ${verified.length}`);
  }

  console.log(JSON.stringify({
    product: { id: String(product._id), name: product.name, sku: product.sku },
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    approvedCount: verified.length,
    dates: verified.map((item) => ({
      customerEmail: item.customerEmail,
      createdAt: item.createdAt,
    })),
  }, null, 2));
} finally {
  await mongoose.disconnect();
}
