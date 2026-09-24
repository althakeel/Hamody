import mongoose from 'mongoose';

const ProductCostHistorySchema = new mongoose.Schema({
  storeId: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  productName: { type: String, default: '' },
  sku: { type: String, default: '' },
  actorUserId: { type: String, default: '', index: true },
  actorEmail: { type: String, default: '' },
  actorName: { type: String, default: '' },
  actorRole: { type: String, default: 'unknown' },
  action: { type: String, default: 'set_cost' },
  previousCost: { type: Number, default: 0 },
  newCost: { type: Number, default: 0 },
  source: { type: String, default: 'product_cost_page' },
  details: { type: String, default: '' },
}, { timestamps: true });

ProductCostHistorySchema.index({ storeId: 1, createdAt: -1 });

export default mongoose.models.ProductCostHistory || mongoose.model('ProductCostHistory', ProductCostHistorySchema);
