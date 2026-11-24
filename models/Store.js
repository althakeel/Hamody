import mongoose from "mongoose";

const StoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  email: String,
  contact: String,
  address: String,
  city: String,
  state: String,
  zip: String,
  businessType: String,
  currencyPreference: { type: String, default: 'AED' },
  logo: String,
  banner: String,
  website: String,
  facebook: String,
  instagram: String,
  twitter: String,
  businessHours: String,
  returnPolicy: String,
  shippingPolicy: String,
  smtpSettings: {
    transactional: {
      host: { type: String, default: '' },
      port: { type: Number, default: 465 },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      secure: { type: Boolean, default: true },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: '' },
    },
    promotional: {
      host: { type: String, default: '' },
      port: { type: Number, default: 465 },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      secure: { type: Boolean, default: true },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: '' },
    },
    updatedAt: { type: Date, default: null },
  },
  isActive: { type: Boolean, default: false },
  status: { type: String, default: "pending", enum: ["pending", "approved", "rejected"] },
  featuredProductIds: { type: [String], default: [] }, // Array of featured product IDs
  featuredProductsSource: { type: String, default: 'manual' },
  featuredProductsCategoryIds: { type: [String], default: [] },
  featuredProductsTags: { type: [String], default: [] },
  featuredExcludedProductIds: { type: [String], default: [] },
  featuredColumns: { type: Number, default: 5 },
  featuredRows: { type: Number, default: 2 },
  featuredManualRotateHours: { type: Number, default: 0 },
  featuredSectionTitle: { type: String, default: 'Craziest sale of the year!' },
  featuredSectionDescription: { type: String, default: "Grab the best deals before they're gone!" },
  featuredSectionTitleAr: { type: String, default: '' },
  featuredSectionDescriptionAr: { type: String, default: '' },
  newTagSettings: {
    enabled: { type: Boolean, default: true },
    label: { type: String, default: 'New' },
    labelAr: { type: String, default: 'جديد' },
    displayDays: { type: Number, default: 14 },
    showOnImageOverlay: { type: Boolean, default: true },
    badges: [{
      id: String,
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'New' },
      labelAr: { type: String, default: 'جديد' },
      position: { type: String, default: 'left' },
      placement: { type: String, default: 'top-left' },
      size: { type: String, default: 'medium' },
      shadow: { type: String, default: 'soft' },
      offset: { type: String, default: 'normal' },
      opacity: { type: Number, default: 100 },
      letterSpacing: { type: String, default: 'normal' },
      condition: { type: String, default: 'new' },
      conditionValue: { type: Number, default: 5 },
      productIds: { type: [String], default: [] },
      productNames: { type: [String], default: [] },
      categoryIds: { type: [String], default: [] },
      categoryNames: { type: [String], default: [] },
      tags: { type: [String], default: [] },
      priceMin: { type: Number, default: null },
      priceMax: { type: Number, default: null },
      backgroundColor: { type: String, default: '#E52D27' },
      textColor: { type: String, default: '#FFFFFF' },
      borderColor: { type: String, default: '#E52D27' },
      borderWidth: { type: Number, default: 0 },
      fontFamily: { type: String, default: 'sans' },
      fontWeight: { type: String, default: '700' },
      textTransform: { type: String, default: 'uppercase' },
      shape: { type: String, default: 'pill' },
    }],
  },
  dashboardWelcomeEnabled: { type: Boolean, default: true },
  customerPickupEnabled: { type: Boolean, default: true },
  customerPickupScope: { type: String, enum: ['all', 'include', 'exclude'], default: 'all' },
  customerPickupSkus: { type: [String], default: [] },
  exploreInterestsEnabled: { type: Boolean, default: true },
  exploreInterestsProductIds: { type: [String], default: [] },
  exploreInterestsCategoryIds: { type: [String], default: [] },
  carouselProductIds: { type: [String], default: [] }, // Array of product IDs for carousel slider
  emailMarketingImageLibrary: { type: [String], default: [] },
  homeMenuCategories: {
    count: { type: Number, default: 6 },
    items: [
      {
        name: String,
        image: String,
        url: String,
        categoryId: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
}, { timestamps: true });

// username already has unique index via schema field definition
StoreSchema.index({ userId: 1 });

const Store = mongoose.models.Store || mongoose.model("Store", StoreSchema);
if (!Store.schema.path('dashboardWelcomeEnabled')) {
  Store.schema.add({
    dashboardWelcomeEnabled: { type: Boolean, default: true },
  });
}
if (!Store.schema.path('customerPickupEnabled')) {
  Store.schema.add({
    customerPickupEnabled: { type: Boolean, default: true },
  });
}
if (!Store.schema.path('exploreInterestsCategoryIds')) {
  Store.schema.add({
    exploreInterestsCategoryIds: { type: [String], default: [] },
  });
}
if (!Store.schema.path('customerPickupScope')) {
  Store.schema.add({
    customerPickupScope: { type: String, enum: ['all', 'include', 'exclude'], default: 'all' },
    customerPickupSkus: { type: [String], default: [] },
  });
}
const badgeSchema = Store.schema.path('newTagSettings')?.schema?.path('badges')?.schema;
if (badgeSchema && !badgeSchema.path('productIds')) {
  badgeSchema.add({
    productIds: { type: [String], default: [] },
    productNames: { type: [String], default: [] },
    categoryIds: { type: [String], default: [] },
    categoryNames: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    priceMin: { type: Number, default: null },
    priceMax: { type: Number, default: null },
  });
}

export default Store;
