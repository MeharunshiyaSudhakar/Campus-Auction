const Listing = require('../models/Listing');
const Bid = require('../models/Bid');

class ListingService {
  /**
   * Create a new item listing
   */
  static async createListing(sellerId, data) {
    const {
      title,
      category,
      description,
      photos,
      defectPhotoIncluded,
      condition,
      honestyDeclaration,
      startingPrice,
      minIncrement,
      closingTime,
    } = data;

    // Validate honesty declaration
    if (honestyDeclaration !== true) {
      const error = new Error('You must confirm the seller honesty declaration');
      error.statusCode = 400;
      throw error;
    }

    // Validate photos (minimum 2 photos required)
    if (!Array.isArray(photos) || photos.length < 2) {
      const error = new Error('A minimum of 2 photos is required so buyers can inspect item condition');
      error.statusCode = 400;
      throw error;
    }

    // Validate structured condition grade and mandatory defect disclosure
    if (!condition || !condition.grade) {
      const error = new Error('Item condition grade is mandatory');
      error.statusCode = 400;
      throw error;
    }

    if (['Fair', 'Poor'].includes(condition.grade)) {
      if (!condition.defects || condition.defects.trim().length < 8) {
        const error = new Error(
          'Detailed explanation of known defects (min 8 chars) is strictly mandatory for items in Fair or Poor condition'
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // Validate closing time is in the future
    const closeDate = new Date(closingTime);
    if (isNaN(closeDate.getTime()) || closeDate <= new Date()) {
      const error = new Error('Auction closing time must be a valid future date and time');
      error.statusCode = 400;
      throw error;
    }

    const listing = await Listing.create({
      seller: sellerId,
      title: title.trim(),
      category,
      description: description.trim(),
      photos,
      defectPhotoIncluded: !!defectPhotoIncluded,
      condition,
      honestyDeclaration: true,
      startingPrice: Number(startingPrice),
      minIncrement: Number(minIncrement) || 10,
      currentPrice: Number(startingPrice),
      closingTime: closeDate,
      status: 'active',
    });

    return await listing.populate('seller', 'name');
  }

  /**
   * Get all active listings with multi-faceted search, filters, and pagination
   */
  static async getListings(query = {}) {
    const filter = {};

    // Status filter: default to 'active' unless explicitly overridden
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    } else if (!query.status) {
      filter.status = 'active';
    }

    // Category filter: support single or comma-separated list
    if (query.category && query.category !== 'all') {
      const categories = query.category.split(',').map((c) => c.trim()).filter(Boolean);
      if (categories.length > 0) {
        filter.category = { $in: categories };
      }
    }

    // Condition grade filter: support single or comma-separated list
    if (query.condition && query.condition !== 'all') {
      const conditions = query.condition.split(',').map((c) => c.trim()).filter(Boolean);
      if (conditions.length > 0) {
        filter['condition.grade'] = { $in: conditions };
      }
    }

    // Keyword search across title, description, defects, and category
    const searchTerm = (query.q || query.search || '').trim();
    if (searchTerm) {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { 'condition.defects': searchRegex },
        { category: searchRegex },
      ];
    }

    // Price range filters
    if (
      (query.minPrice !== undefined && query.minPrice !== '') ||
      (query.maxPrice !== undefined && query.maxPrice !== '')
    ) {
      filter.currentPrice = {};
      if (query.minPrice !== undefined && query.minPrice !== '') {
        const min = Number(query.minPrice);
        if (!isNaN(min)) filter.currentPrice.$gte = min;
      }
      if (query.maxPrice !== undefined && query.maxPrice !== '') {
        const max = Number(query.maxPrice);
        if (!isNaN(max)) filter.currentPrice.$lte = max;
      }
    }

    // Closing soon filter (e.g. items closing within 24 hours)
    if (query.closingSoon === 'true') {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      filter.closingTime = { $gte: now, $lte: in24h };
    }

    // Sorting
    let sort = { closingTime: 1 }; // Default: closing soonest first
    if (query.sort === 'price_asc') sort = { currentPrice: 1 };
    else if (query.sort === 'price_desc') sort = { currentPrice: -1 };
    else if (query.sort === 'newest') sort = { createdAt: -1 };
    else if (query.sort === 'most_bids') sort = { bidCount: -1 };
    else if (query.sort === 'closing_soon') sort = { closingTime: 1 };

    // Pagination
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const total = await Listing.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    const listings = await Listing.find(filter)
      .populate('seller', 'name')
      .populate('leadingBidder', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return {
      listings,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Get a single listing by ID with full details, transparent bid history, and server clock
   */
  static async getListingById(id) {
    const listing = await Listing.findById(id)
      .populate('seller', 'name')
      .populate('leadingBidder', 'name')
      .populate('winner', 'name');

    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    // Fetch public transparent bid history
    const bids = await Bid.find({ listing: id })
      .sort({ amount: -1, bidTime: -1, createdAt: -1 })
      .populate('bidder', 'name');

    const listingObj = listing.toObject();
    listingObj.bids = bids;
    listingObj.serverTime = new Date();
    listingObj.timeLeftMs = Math.max(0, new Date(listing.closingTime).getTime() - Date.now());
    listingObj.isClosed = listingObj.timeLeftMs === 0 || listing.status !== 'active';

    return listingObj;
  }

  /**
   * Get all listings created by a specific seller
   */
  static async getMyListings(sellerId) {
    const listings = await Listing.find({ seller: sellerId })
      .populate('leadingBidder', 'name')
      .sort({ createdAt: -1 });

    return listings;
  }

  /**
   * Update an existing listing (Enforcing Price Lock if bids exist)
   */
  static async updateListing(sellerId, listingId, updateData) {
    const listing = await Listing.findById(listingId);

    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify ownership
    if (listing.seller.toString() !== sellerId.toString()) {
      const error = new Error('Not authorized to edit this listing');
      error.statusCode = 403;
      throw error;
    }

    // Cannot edit non-active listings
    if (listing.status !== 'active') {
      const error = new Error(`Cannot edit listing with status '${listing.status}'`);
      error.statusCode = 400;
      throw error;
    }

    // --- Core Rule: Price Locking Logic ---
    if (listing.bidCount > 0) {
      if (
        (updateData.startingPrice !== undefined && Number(updateData.startingPrice) !== listing.startingPrice) ||
        (updateData.minIncrement !== undefined && Number(updateData.minIncrement) !== listing.minIncrement)
      ) {
        const error = new Error(
          'Price fields (starting price, minimum increment) are locked because active bids have already been placed on this item.'
        );
        error.statusCode = 400;
        throw error;
      }
    } else {
      // If no bids yet, seller can update prices
      if (updateData.startingPrice) {
        listing.startingPrice = Number(updateData.startingPrice);
        listing.currentPrice = Number(updateData.startingPrice);
      }
      if (updateData.minIncrement) {
        listing.minIncrement = Number(updateData.minIncrement);
      }
    }

    // Update editable fields
    if (updateData.title) listing.title = updateData.title.trim();
    if (updateData.category) listing.category = updateData.category;
    if (updateData.description) listing.description = updateData.description.trim();
    if (Array.isArray(updateData.photos) && updateData.photos.length >= 2) {
      listing.photos = updateData.photos;
    }
    if (updateData.defectPhotoIncluded !== undefined) {
      listing.defectPhotoIncluded = !!updateData.defectPhotoIncluded;
    }
    if (updateData.condition) {
      if (['Fair', 'Poor'].includes(updateData.condition.grade)) {
        if (!updateData.condition.defects || updateData.condition.defects.trim().length < 8) {
          const error = new Error('Known defects description is mandatory for Fair or Poor condition');
          error.statusCode = 400;
          throw error;
        }
      }
      listing.condition = { ...listing.condition, ...updateData.condition };
    }
    if (updateData.closingTime) {
      const newClose = new Date(updateData.closingTime);
      if (newClose > new Date()) {
        listing.closingTime = newClose;
      }
    }

    await listing.save();
    return await listing.populate('seller', 'name');
  }

  /**
   * Cancel an active listing
   */
  static async cancelListing(sellerId, listingId, cancellationReason = 'Cancelled by seller') {
    const listing = await Listing.findById(listingId);

    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify ownership
    if (listing.seller.toString() !== sellerId.toString()) {
      const error = new Error('Not authorized to cancel this listing');
      error.statusCode = 403;
      throw error;
    }

    if (listing.status !== 'active') {
      const error = new Error(`Cannot cancel listing that is already ${listing.status}`);
      error.statusCode = 400;
      throw error;
    }

    listing.status = 'cancelled';
    await listing.save();

    return listing;
  }
}

module.exports = ListingService;
