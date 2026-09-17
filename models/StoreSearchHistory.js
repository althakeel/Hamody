import mongoose from 'mongoose';

const StoreSearchHistorySchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true, index: true },
    query: { type: String, required: true, trim: true, maxlength: 80 },
    queryDisplay: { type: String, default: '', trim: true, maxlength: 80 },
    visitorType: { type: String, enum: ['guest', 'customer'], default: 'guest', index: true },
    userId: { type: String, default: '', trim: true },
    anonymousId: { type: String, default: '', trim: true },
    sessionId: { type: String, default: '', trim: true },
    source: { type: String, default: 'shop', trim: true, maxlength: 40 },
    resultCount: { type: Number, default: null },
  },
  { timestamps: true },
);

StoreSearchHistorySchema.index({ storeId: 1, createdAt: -1 });
StoreSearchHistorySchema.index({ storeId: 1, query: 1, createdAt: -1 });
StoreSearchHistorySchema.index({ storeId: 1, anonymousId: 1, query: 1, createdAt: -1 });

export default mongoose.models.StoreSearchHistory
  || mongoose.model('StoreSearchHistory', StoreSearchHistorySchema);
