import mongoose from 'mongoose';

const StockNotifyRequestSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true, trim: true, index: true },
    productId: { type: String, required: true, trim: true, index: true },
    productName: { type: String, trim: true, default: '' },
    sku: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    contactKey: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'notified'],
      default: 'pending',
      index: true,
    },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    deletedByName: { type: String, default: null },
  },
  { timestamps: true },
);

StockNotifyRequestSchema.index({ storeId: 1, createdAt: -1 });
StockNotifyRequestSchema.index({ storeId: 1, productId: 1, contactKey: 1 }, { unique: true });

const StockNotifyRequestModel = mongoose.models.StockNotifyRequest
  || mongoose.model('StockNotifyRequest', StockNotifyRequestSchema);

if (!StockNotifyRequestModel.schema.path('deletedAt')) {
  StockNotifyRequestModel.schema.add({
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    deletedByName: { type: String, default: null },
  });
}

export default StockNotifyRequestModel;
