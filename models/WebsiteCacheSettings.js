import mongoose from 'mongoose';

const WebsiteCacheSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'website-cache' },
    defaultScope: { type: String, enum: ['storefront', 'all'], default: 'storefront' },
    lastClearedAt: { type: Date, default: null },
    lastClearedBy: { type: String, default: '' },
    lastScope: { type: String, enum: ['storefront', 'all', ''], default: '' },
    lastClearedCount: { type: Number, default: 0 },
    history: {
      type: [{
        at: { type: Date, default: Date.now },
        by: { type: String, default: '' },
        scope: { type: String, enum: ['storefront', 'all'], default: 'storefront' },
        clearedCount: { type: Number, default: 0 },
      }],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.models.WebsiteCacheSettings
  || mongoose.model('WebsiteCacheSettings', WebsiteCacheSettingsSchema);
