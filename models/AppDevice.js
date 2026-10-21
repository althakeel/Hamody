import mongoose from 'mongoose';

const AppDeviceSchema = new mongoose.Schema({
  storeId: { type: String, required: true, index: true },
  token: { type: String, required: true },
  platform: { type: String, enum: ['android', 'ios'], required: true },
  anonymousId: { type: String, default: '' },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });

AppDeviceSchema.index({ storeId: 1, token: 1 }, { unique: true });

const AppDevice = mongoose.models.AppDevice || mongoose.model('AppDevice', AppDeviceSchema);

export default AppDevice;
