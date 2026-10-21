import mongoose from 'mongoose';

const AppPushNotificationSchema = new mongoose.Schema({
  storeId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  buttonText: { type: String, default: '' },
  path: { type: String, default: '/' },
  audience: { type: String, enum: ['all', 'android', 'ios'], default: 'all' },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  targetCount: { type: Number, default: 0 },
  error: { type: String, default: '' },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

const AppPushNotification = mongoose.models.AppPushNotification
  || mongoose.model('AppPushNotification', AppPushNotificationSchema);

export default AppPushNotification;
