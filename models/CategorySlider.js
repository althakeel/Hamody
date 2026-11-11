import mongoose from 'mongoose';

const CategorySliderBannerSchema = new mongoose.Schema(
  {
    image: { type: String, trim: true, default: '' },
    tabletImage: { type: String, trim: true, default: '' },
    mobileImage: { type: String, trim: true, default: '' },
    imageAr: { type: String, trim: true, default: '' },
    tabletImageAr: { type: String, trim: true, default: '' },
    mobileImageAr: { type: String, trim: true, default: '' },
    link: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const CategorySliderSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      index: true,
    },
    sectionType: {
      type: String,
      enum: ['slider', 'banner'],
      default: 'slider',
      index: true,
    },
    title: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    subtitle: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    titleAr: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    subtitleAr: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    productIds: {
      type: [String],
      required: true,
      default: [],
    },
    banner: {
      type: CategorySliderBannerSchema,
      default: () => ({}),
    },
    sideImage: {
      type: String,
      default: '',
      trim: true,
    },
    sideImageAr: {
      type: String,
      default: '',
      trim: true,
    },
    mobileImage: {
      type: String,
      default: '',
      trim: true,
    },
    mobileImageAr: {
      type: String,
      default: '',
      trim: true,
    },
    mobileImageRatio: {
      type: String,
      default: '3:4',
      trim: true,
    },
    sideImagePosition: {
      type: String,
      default: 'left',
      enum: ['left', 'right'],
    },
    cardsPerRow: {
      type: Number,
      default: 6,
      enum: [5, 6],
    },
    backgroundColor: {
      type: String,
      default: '#f3f0ff',
      trim: true,
    },
    autoSlide: {
      type: Boolean,
      default: false,
    },
    autoSlideIntervalMs: {
      type: Number,
      default: 4000,
    },
    showOutOfStock: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    viewAllEnabled: {
      type: Boolean,
      default: false,
    },
    viewAllTarget: {
      type: String,
      default: 'default',
      enum: ['default', 'category', 'landing', 'page', 'custom'],
    },
    viewAllValue: {
      type: String,
      default: '',
      trim: true,
    },
    sideImageLinkEnabled: {
      type: Boolean,
      default: false,
    },
    sideImageLinkTarget: {
      type: String,
      default: 'category',
      enum: ['category', 'brand', 'landing', 'page', 'custom'],
    },
    sideImageLinkValue: {
      type: String,
      default: '',
      trim: true,
    },
    slug: {
      type: String,
      default: '',
      trim: true,
    },
    slugAliases: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Create compound index for efficient querying
CategorySliderSchema.index({ storeId: 1, createdAt: -1 });
CategorySliderSchema.index({ slug: 1 });

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.sortOrder) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.sideImagePosition) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.backgroundColor) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.autoSlide) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.autoSlideIntervalMs) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.showOutOfStock) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.mobileImage) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.mobileImageRatio) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.viewAllEnabled) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.sideImageLinkEnabled) {
  delete mongoose.models.CategorySlider;
}

if (mongoose.models.CategorySlider && !mongoose.models.CategorySlider.schema.paths.slug) {
  delete mongoose.models.CategorySlider;
}

if (process.env.NODE_ENV === 'development' && mongoose.models.CategorySlider) {
  delete mongoose.models.CategorySlider;
}

export default mongoose.models.CategorySlider ||
  mongoose.model('CategorySlider', CategorySliderSchema);
