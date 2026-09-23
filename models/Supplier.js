import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true, default: '' },
    contactName: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    trn: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

SupplierSchema.index({ storeId: 1, name: 1 });
SupplierSchema.index({ storeId: 1, updatedAt: -1 });

const Supplier =
  mongoose.models.Supplier
  || mongoose.model('Supplier', SupplierSchema);

if (!Supplier.schema.path('trn')) {
  Supplier.schema.add({ trn: { type: String, trim: true, default: '' } });
}

export default Supplier;
