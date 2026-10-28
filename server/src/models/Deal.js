const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required'],
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer reference is required'],
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Deal amount is required'],
      min: [1, 'Amount must be at least ₹1'],
    },
    chosenMethod: {
      type: String,
      enum: ['online', 'upi', 'direct_upi', 'cash_on_pickup', 'other', 'pending_selection'],
      default: 'pending_selection',
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    paymentWindowExpiresAt: {
      type: Date,
      default: null,
    },
    fulfilment: {
      type: String,
      enum: ['campus_pickup', 'courier', 'pending_selection'],
      default: 'pending_selection',
    },
    status: {
      type: String,
      enum: [
        'approved',
        'details_shared',
        'payment_pending',
        'payment_confirmed',
        'pickup_scheduled',
        'shipped',
        'completed',
        'rejected',
        'cancelled',
        'payment_not_received',
        'pickup_failed',
        'courier_issue',
      ],
      default: 'approved',
      index: true,
    },
    // Snapshot of seller's payment details revealed to the winner only after approval and method choice
    sellerPaymentDetails: {
      upiId: { type: String, default: '' },
      contactPhone: { type: String, default: '' },
      otherInstructions: { type: String, default: '' },
    },
    // Courier delivery address submitted by buyer (strictly private to buyer & seller)
    deliveryAddress: {
      recipientName: { type: String, default: '' },
      addressLine1: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      contactPhone: { type: String, default: '' },
      purgedAt: { type: Date, default: null },
    },
    // Courier shipment details provided by seller
    courierInfo: {
      courierName: { type: String, default: '' },
      trackingId: { type: String, default: '' },
      dispatchDate: { type: Date, default: null },
    },
    // Campus pickup details and 6-digit verification code
    handoverCode: {
      type: String,
      default: '',
    },
    pickupInfo: {
      location: { type: String, default: '' },
      scheduledTime: { type: Date, default: null },
      handoverCode: { type: String, default: '' },
      handoverConfirmedAt: { type: Date, default: null },
    },
    // Buyer notes and payment timestamp
    paidAt: { type: Date, default: null },
    paymentConfirmedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancellationReason: { type: String, default: '' },

    // Audit log of status transitions
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes to quickly find deals for a user
dealSchema.index({ buyer: 1, status: 1 });
dealSchema.index({ seller: 1, status: 1 });

module.exports = mongoose.model('Deal', dealSchema);
