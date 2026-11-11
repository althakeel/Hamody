import mongoose from 'mongoose';

const customProductSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, default: '' },
  sku: { type: String, default: '' },
  image: { type: String, default: '' },
}, { _id: false });

const lowStockAlertSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  enabled: { type: Boolean, default: true },
  threshold: { type: Number, default: 20 },
  intervalHours: { type: Number, default: 3 },
  recipients: { type: [String], default: [] },
  customEnabled: { type: Boolean, default: false },
  customThreshold: { type: Number, default: 20 },
  customIntervalHours: { type: Number, default: 3 },
  customRecipients: { type: [String], default: [] },
  customProducts: { type: [customProductSchema], default: [] },
  updatedBy: { type: String, default: '' },
}, { timestamps: true, versionKey: false });

const LowStockAlertSettings = mongoose.models.LowStockAlertSettings
  || mongoose.model('LowStockAlertSettings', lowStockAlertSettingsSchema);

export default LowStockAlertSettings;
