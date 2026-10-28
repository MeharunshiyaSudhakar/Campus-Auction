const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required'],
      index: true,
    },
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Bidder reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Bid amount is required'],
      min: [1, 'Bid must be at least ₹1'],
    },
    bidTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    bidType: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
    },
    isWinningBid: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch latest bid history for an auction
bidSchema.index({ listing: 1, amount: -1, bidTime: -1 });

module.exports = mongoose.model('Bid', bidSchema);
