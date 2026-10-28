const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required'],
      index: true,
    },
    asker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Asker reference is required'],
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required'],
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      minlength: [5, 'Question must be at least 5 characters'],
      maxlength: [500, 'Question cannot exceed 500 characters'],
    },
    answer: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, 'Answer cannot exceed 1000 characters'],
    },
    isAnswered: {
      type: Boolean,
      default: false,
      index: true,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    isSpam: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ listing: 1, isAnswered: 1, createdAt: -1 });
questionSchema.index({ listing: 1, asker: 1 });

module.exports = mongoose.model('Question', questionSchema);
