const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required for OTP verification'],
      lowercase: true,
      trim: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: [true, 'Code hash is required'],
    },
    purpose: {
      type: String,
      enum: ['signup', 'login'],
      required: [true, 'Purpose (signup or login) is required'],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically clean up expired OTP records after 24 hours
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model('Otp', otpSchema);
