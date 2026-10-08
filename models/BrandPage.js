import mongoose from 'mongoose';

const BrandPageSchema = new mongoose.Schema({
  storeId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  nameAr: { type: String, default: '' },
  description: { type: String, default: '' },
  descriptionAr: { type: String, default: '' },
  image: { type: String, default: '' },
  bannerEn: { type: String, default: '' },
  bannerAr: { type: String, default: '' },
  bannerTabletEn: { type: String, default: '' },
  bannerTabletAr: { type: String, default: '' },
  bannerMobileEn: { type: String, default: '' },
  bannerMobileAr: { type: String, default: '' },
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
}, { timestamps: true });

BrandPageSchema.index({ storeId: 1, slug: 1 }, { unique: true });
BrandPageSchema.index({ storeId: 1, name: 1 });

const BrandPage = mongoose.models.BrandPage || mongoose.model('BrandPage', BrandPageSchema);

export default BrandPage;
