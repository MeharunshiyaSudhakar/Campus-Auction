const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'outbid',
        'won',
        'approval_needed',
        'approved',
        'rejected',
        'pickup_scheduled',
        'completed',
        'unsold_alert',
        'unsold_no_bids',
        'rejection_confirmed',
        'payment_not_received',
        'pickup_failed',
        'deal_cancelled',
        'no_bids_stale',
        'wanted_match',
        'qa_question',
        'qa_answered',
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
      index: true,
    },
    link: {
      type: String,
      default: null,
      trim: true,
    },
    eventKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
