const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      lowercase: true,
      trim: true,
      enum: {
        values: [
          'vehicles',
          'stationery',
          'books',
          'electronics',
          'furniture',
          'clothing',
          'sports',
          'other',
          'cycle',
          'calculator',
        ],
        message: '{VALUE} is not a supported category',
      },
      index: true,
    },
    itemSubtype: {
      type: String,
      trim: true,
      default: '',
    },
    acceptedPaymentMethods: {
      type: [String],
      enum: ['upi', 'direct_upi', 'cash_on_pickup', 'other'],
      default: ['upi', 'cash_on_pickup'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 1;
        },
        message: 'At least one accepted payment method must be selected',
      },
    },
    // Strictly Private Seller Payment & Deal Details (select: false ensures zero leak in public queries)
    upiId: {
      type: String,
      trim: true,
      default: '',
      select: false,
      validate: {
        validator: function (v) {
          if (!v) return true;
          // Valid UPI format: username@bank
          return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v);
        },
        message: 'Invalid UPI ID format. Expected format: username@bank',
      },
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },
    otherInstructions: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },
    // Fulfilment options
    fulfilment: {
      type: [String],
      enum: ['campus_pickup', 'courier'],
      default: ['campus_pickup'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 1;
        },
        message: 'At least one fulfilment option (campus_pickup or courier) is required',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    photos: {
      type: [String],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length >= 2;
        },
        message: 'At least 2 photos are required for buyers to inspect the item',
      },
      required: true,
    },
    defectPhotoIncluded: {
      type: Boolean,
      default: false,
    },

    // --- Core Principle: Mandatory Structured Condition ---
    condition: {
      grade: {
        type: String,
        required: [true, 'Condition grade is mandatory'],
        enum: ['New', 'Like new', 'Good', 'Fair', 'Poor'],
      },
      age: {
        type: String, // e.g. "6 months", "1 year", "2+ years"
        required: [true, 'Item age disclosure is mandatory'],
      },
      workingStatus: {
        type: String,
        required: [true, 'Working status is mandatory'],
        enum: ['Fully functional', 'Partially functional', 'Needs repair / For parts'],
      },
      defects: {
        type: String,
        trim: true,
        validate: {
          validator: function (val) {
            // Strictly mandatory if Fair or Poor
            if (this.condition && ['Fair', 'Poor'].includes(this.condition.grade)) {
              return typeof val === 'string' && val.trim().length >= 8;
            }
            return true;
          },
          message: 'Detailed description of known defects is mandatory when condition is Fair or Poor',
        },
        default: 'None reported',
      },
      accessories: {
        type: [String],
        default: [],
      },
      // Category-specific structured details
      categoryDetails: {
        // Cycle details
        cycle: {
          brakes: {
            type: String,
            default: 'N/A',
          },
          tyres: {
            type: String,
            default: 'N/A',
          },
          frameSize: { type: String, default: '' },
          geared: { type: Boolean, default: false },
        },
        // Calculator details
        calculator: {
          display: {
            type: String,
            default: 'N/A',
          },
          battery: {
            type: String,
            default: 'N/A',
          },
          modelType: {
            type: String,
            default: 'Scientific',
          },
        },
        // Books details
        books: {
          edition: { type: String, default: '' },
          markedPages: {
            type: String,
            default: 'Clean / No marks',
          },
          binding: {
            type: String,
            default: 'Intact / Tight',
          },
        },
        // Electronics details
        electronics: {
          batteryHealth: { type: String, default: 'Standard' },
          chargerIncluded: { type: Boolean, default: false },
          screenCondition: { type: String, default: 'Good' },
          portsFunctional: { type: Boolean, default: true },
        },
      },
    },

    honestyDeclaration: {
      type: Boolean,
      required: [true, 'Seller honesty declaration is required'],
      validate: {
        validator: (v) => v === true,
        message: 'You must check the honesty declaration confirming item accuracy',
      },
    },

    // --- Pricing & Auction Mechanics ---
    startingPrice: {
      type: Number,
      required: [true, 'Starting price is required'],
      min: [1, 'Starting price must be at least ₹1'],
    },
    minIncrement: {
      type: Number,
      required: [true, 'Minimum bid increment is required'],
      default: 10,
      min: [1, 'Minimum increment must be at least ₹1'],
    },
    currentPrice: {
      type: Number,
      default: function () {
        return this.startingPrice;
      },
    },
    closingTime: {
      type: Date,
      required: [true, 'Auction closing time is required'],
      validate: {
        validator: function (v) {
          // Enforce future time for newly created active auctions
          if (this.isNew && (!this.status || this.status === 'active')) {
            return v > new Date();
          }
          return true;
        },
        message: 'Auction closing time must be set in the future',
      },
      index: true,
    },

    // --- Live Bid & Social State (Denormalized for O(1) reads) ---
    bidCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    repostCount: {
      type: Number,
      default: 0,
    },
    leadingBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },
    leadingBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // --- Auction & Sale Lifecycle ---
    status: {
      type: String,
      enum: [
        'active',
        'closed',
        'pending_approval',
        'approved',
        'pickup_scheduled',
        'completed',
        'unsold',
        'rejected',
        'cancelled',
        'pickup_failed',
      ],
      default: 'active',
      index: true,
    },

    // Post-Auction Handover & Tracker
    winningBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalPrice: {
      type: Number,
      default: null,
    },
    handoverCode: {
      type: String,
      default: null, // Generated when seller approves the winning price
    },
    sellerDecisionAt: {
      type: Date,
      default: null,
    },
    handoverCompletedAt: {
      type: Date,
      default: null,
    },

    // --- Module 15: Unsold / Stale Alert Flags (Prevents duplicate notifications across restarts) ---
    staleNoBidsAlertSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    unsoldAlertSent: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Search, filtering, profile history and alert indexes
listingSchema.index({ status: 1, category: 1, closingTime: 1 });
listingSchema.index(
  { title: 'text', description: 'text', 'condition.defects': 'text' },
  { weights: { title: 5, description: 2, 'condition.defects': 1 }, name: 'ListingTextIndex' }
);
listingSchema.index({ seller: 1, createdAt: -1 });
listingSchema.index({ winner: 1, createdAt: -1 });
listingSchema.index({ seller: 1, status: 1 });
listingSchema.index({ status: 1, bidCount: 1, createdAt: 1 });

module.exports = mongoose.model('Listing', listingSchema);
