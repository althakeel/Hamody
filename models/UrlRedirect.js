import mongoose from 'mongoose';

const UrlRedirectSchema = new mongoose.Schema(
  {
    fromPath: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    toPath: {
      type: String,
      default: '',
      trim: true,
    },
    statusCode: {
      type: Number,
      enum: [301, 410],
      default: 301,
    },
    source: {
      type: String,
      enum: ['manual', 'seed', 'category', 'product'],
      default: 'manual',
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true },
);

const UrlRedirect = mongoose.models.UrlRedirect
  || mongoose.model('UrlRedirect', UrlRedirectSchema);

export default UrlRedirect;
