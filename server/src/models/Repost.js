const mongoose = require('mongoose');

const repostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reposts by the same user for the same listing
repostSchema.index({ user: 1, listing: 1 }, { unique: true });

module.exports = mongoose.model('Repost', repostSchema);
