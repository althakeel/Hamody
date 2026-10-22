import mongoose from 'mongoose';

const StoreActivityLogSchema = new mongoose.Schema({
  storeId: { type: String, required: true, index: true },
  actorUserId: { type: String, default: '', index: true },
  actorEmail: { type: String, default: '' },
  actorName: { type: String, default: '' },
  actorRole: {
    type: String,
    enum: ['owner', 'admin', 'member', 'customer', 'unknown'],
    default: 'unknown',
  },
  method: { type: String, default: 'POST' },
  path: { type: String, default: '' },
  pagePath: { type: String, default: '' },
  action: { type: String, default: '' },
  summary: { type: String, default: '' },
  status: { type: Number, default: 200 },
  metadata: { type: Object, default: {} },
  ip: { type: String, default: '' },
}, { timestamps: true });

StoreActivityLogSchema.index({ storeId: 1, createdAt: -1 });
StoreActivityLogSchema.index({ storeId: 1, actorUserId: 1, createdAt: -1 });
StoreActivityLogSchema.index({ storeId: 1, actorEmail: 1, createdAt: -1 });

const StoreActivityLog = mongoose.models.StoreActivityLog
  || mongoose.model('StoreActivityLog', StoreActivityLogSchema);

if (!StoreActivityLog.schema.path('ip')) {
  StoreActivityLog.schema.add({ ip: { type: String, default: '' } });
}

export default StoreActivityLog;
