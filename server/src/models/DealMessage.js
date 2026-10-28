const mongoose = require('mongoose');

const dealMessageSchema = new mongoose.Schema(
  {
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      required: [true, 'Deal reference is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required'],
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    isSystemNotice: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

dealMessageSchema.index({ deal: 1, createdAt: 1 });

module.exports = mongoose.model('DealMessage', dealMessageSchema);
