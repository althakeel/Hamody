import mongoose from 'mongoose';

const lowStockDigestRunSchema = new mongoose.Schema({
  slotKey: { type: String, required: true, unique: true },
  status: { type: String, enum: ['sending', 'sent', 'failed'], required: true },
  lockExpiresAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  error: { type: String, default: '' },
}, { timestamps: true });

const LowStockDigestRun = mongoose.models.LowStockDigestRun
  || mongoose.model('LowStockDigestRun', lowStockDigestRunSchema);

export default LowStockDigestRun;
