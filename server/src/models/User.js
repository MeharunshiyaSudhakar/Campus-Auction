const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'College email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      select: false, // Hidden by default for privacy
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Never expose password hash in queries
    },
    phone: {
      type: String,
      trim: true,
      select: false, // Private - only shared during approved handover
    },
    campusRollNumber: {
      type: String,
      required: [true, 'Campus roll number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      select: false, // Private
      index: true,
    },
    payoutStatus: {
      type: String,
      enum: ['not_started', 'pending', 'active', 'rejected'],
      default: 'not_started',
    },
    linkedAccountId: {
      type: String,
      default: null,
      select: false, // Hidden for privacy
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to verify password candidate
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to return public-safe profile (zero private leaks)
userSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
