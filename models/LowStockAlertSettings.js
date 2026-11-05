import mongoose from 'mongoose';

const lowStockAlertSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  enabled: { type: Boolean, default: true },
  threshold: { type: Number, default: 20 },
  intervalHours: { type: Number, default: 3 },
  recipients: { type: [String], default: [] },
  updatedBy: { type: String, default: '' },
}, { timestamps: true, versionKey: false });

const LowStockAlertSettings = mongoose.models.LowStockAlertSettings
  || mongoose.model('LowStockAlertSettings', lowStockAlertSettingsSchema);

export default LowStockAlertSettings;
