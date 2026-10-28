const mongoose = require('mongoose');

const sellDraftSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required'],
      index: true,
    },
    category: {
      type: String,
      enum: ['cycle', 'calculator', 'books', 'electronics'],
      default: 'cycle',
      index: true,
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    currentStep: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'completed', 'abandoned'],
      default: 'draft',
      index: true,
    },
    aiReview: {
      rephrasedDescription: { type: String, default: '' },
      originalDescription: { type: String, default: '' },
      suggestions: { type: [String], default: [] },
      generatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

sellDraftSchema.index({ seller: 1, status: 1 });

module.exports = mongoose.model('SellDraft', sellDraftSchema);
