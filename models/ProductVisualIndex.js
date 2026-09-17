import mongoose from 'mongoose';

const ProductVisualIndexSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
  imageUrl: { type: String, default: '' },
  imageHash: { type: String, default: '', index: true },
  embedding: { type: [Number], default: [] },
  images: {
    type: [{
      url: { type: String, default: '' },
      hash: { type: String, default: '' },
      embedding: { type: [Number], default: [] },
    }],
    default: [],
  },
  indexedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.ProductVisualIndex
  || mongoose.model('ProductVisualIndex', ProductVisualIndexSchema);
