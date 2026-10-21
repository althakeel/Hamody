import mongoose from 'mongoose';

const AppInstallSchema = new mongoose.Schema({
  storeId: { type: String, required: true, index: true },
  anonymousId: { type: String, required: true },
  platform: { type: String, enum: ['android', 'ios', 'unknown'], default: 'unknown' },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });

AppInstallSchema.index({ storeId: 1, anonymousId: 1 }, { unique: true });

const AppInstall = mongoose.models.AppInstall || mongoose.model('AppInstall', AppInstallSchema);

export default AppInstall;
