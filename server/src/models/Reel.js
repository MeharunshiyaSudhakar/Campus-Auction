const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required'],
      index: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Associated listing is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Reel title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required'],
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: '',
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
      default: '',
    },
    durationSeconds: {
      type: Number,
      default: 15,
      max: [60, 'Demo reels must be under 60 seconds'],
    },
  },
  {
    timestamps: true,
  }
);

reelSchema.index({ seller: 1, createdAt: -1 });
reelSchema.index({ listing: 1, createdAt: -1 });

module.exports = mongoose.model('Reel', reelSchema);
