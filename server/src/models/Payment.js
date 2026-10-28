const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      required: [true, 'Deal reference is required'],
      index: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required'],
      index: true,
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer reference is required'],
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver reference is required'],
      index: true,
    },
    amountPaise: {
      type: Number,
      required: [true, 'Amount in paise is required'],
      min: [100, 'Minimum amount is ₹1 (100 paise)'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['created', 'paid_held', 'released', 'refunded', 'failed', 'expired'],
      default: 'created',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'direct_upi', 'cash_on_pickup'],
      default: 'online',
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    razorpaySignature: {
      type: String,
      select: false, // Internal verification
      default: null,
    },
    transferId: {
      type: String,
      trim: true,
      default: null,
    },
    sellerLinkedAccountId: {
      type: String,
      trim: true,
      default: null,
      select: false, // Strictly private
    },
    holdUntilHandover: {
      type: Boolean,
      default: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
