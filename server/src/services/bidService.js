const Listing = require('../models/Listing');
const Bid = require('../models/Bid');

class BidService {
  /**
   * Place a new bid on an active auction item
   * Enforces server-clock validation, anti-sniping rules, price increments, and atomic concurrency
   */
  static async placeBid(bidderId, { listingId, amount, bidType = 'manual' }) {
    if (!listingId) {
      const error = new Error('Listing ID is required');
      error.statusCode = 400;
      throw error;
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      const error = new Error('Bid amount must be a valid positive number');
      error.statusCode = 400;
      throw error;
    }

    // 1. Fetch current listing state
    const listing = await Listing.findById(listingId);
    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    // 2. Validate listing status
    if (listing.status !== 'active') {
      const error = new Error(`Auction is not active (current status: ${listing.status})`);
      error.statusCode = 400;
      throw error;
    }

    // 3. Server clock is the single source of truth for auction close
    const now = new Date();
    if (now >= new Date(listing.closingTime)) {
      const error = new Error('Auction has closed. Bids are no longer accepted.');
      error.statusCode = 400;
      throw error;
    }

    // 4. Seller cannot bid on their own item
    if (listing.seller.toString() === bidderId.toString()) {
      const error = new Error('Sellers cannot bid on their own listings');
      error.statusCode = 403;
      throw error;
    }

    // 5. Bid increment and starting price validation
    if (listing.bidCount === 0) {
      if (numAmount < listing.startingPrice) {
        const error = new Error(
          `First bid must be at least the starting price of ₹${listing.startingPrice}`
        );
        error.statusCode = 400;
        throw error;
      }
    } else {
      // Check if bidder is already the leading bidder
      if (listing.leadingBidder && listing.leadingBidder.toString() === bidderId.toString()) {
        if (numAmount <= listing.currentPrice) {
          const error = new Error(
            `You already hold the leading bid of ₹${listing.currentPrice}. Enter a higher amount to increase your lead.`
          );
          error.statusCode = 400;
          throw error;
        }
      }

      const minRequired = listing.currentPrice + listing.minIncrement;
      if (numAmount < minRequired) {
        const error = new Error(
          `Bid must be at least ₹${minRequired} (current price ₹${listing.currentPrice} + minimum increment ₹${listing.minIncrement})`
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // 6. Anti-sniping check: if bid placed in the final 30 seconds, extend closing time to 60 seconds from now
    const timeRemainingMs = new Date(listing.closingTime).getTime() - now.getTime();
    const isUnder30Seconds = timeRemainingMs <= 30000;
    const newClosingTime = isUnder30Seconds ? new Date(now.getTime() + 60000) : listing.closingTime;

    // 7. Atomic Concurrency Lock: update listing atomically to prevent race conditions
    const filter = {
      _id: listingId,
      status: 'active',
      closingTime: { $gt: now },
    };

    if (listing.bidCount === 0) {
      filter.bidCount = 0;
    } else {
      filter.currentPrice = { $lte: numAmount - listing.minIncrement };
    }

    const updateObj = {
      $set: {
        currentPrice: numAmount,
        leadingBidder: bidderId,
        closingTime: newClosingTime,
      },
      $inc: { bidCount: 1 },
    };

    const updatedListing = await Listing.findOneAndUpdate(filter, updateObj, { new: true });

    if (!updatedListing) {
      // Fetch latest state to provide a clear, helpful error
      const freshListing = await Listing.findById(listingId);
      if (!freshListing || freshListing.status !== 'active' || now >= new Date(freshListing.closingTime)) {
        const error = new Error('Auction is no longer active or has closed');
        error.statusCode = 400;
        throw error;
      }
      const nextMin = freshListing.currentPrice + freshListing.minIncrement;
      const error = new Error(
        `A higher bid of ₹${freshListing.currentPrice} was just placed concurrently. The minimum valid bid is now ₹${nextMin}`
      );
      error.statusCode = 409;
      throw error;
    }

    // 8. Create Bid record
    const bid = await Bid.create({
      listing: listingId,
      bidder: bidderId,
      amount: numAmount,
      bidTime: now,
      bidType,
      isWinningBid: false,
    });

    // Link leading bid reference
    updatedListing.leadingBid = bid._id;
    await updatedListing.save();

    // Populate bidder public name only (zero private details)
    await bid.populate('bidder', 'name');

    return {
      bid,
      listing: {
        _id: updatedListing._id,
        currentPrice: updatedListing.currentPrice,
        bidCount: updatedListing.bidCount,
        closingTime: updatedListing.closingTime,
        extended: isUnder30Seconds,
        leadingBidder: {
          _id: bidderId,
          name: bid.bidder?.name,
        },
      },
      extended: isUnder30Seconds,
      message: isUnder30Seconds
        ? `Bid of ₹${numAmount} placed! Anti-sniping active: Auction extended by 60 seconds.`
        : `Bid of ₹${numAmount} placed successfully!`,
    };
  }

  /**
   * Get public transparent bid history for an auction
   */
  static async getListingBids(listingId) {
    const bids = await Bid.find({ listing: listingId })
      .sort({ amount: -1, bidTime: -1 })
      .populate('bidder', 'name');

    return bids;
  }

  /**
   * Get all bids placed by the logged-in student
   */
  static async getMyBids(userId) {
    const bids = await Bid.find({ bidder: userId })
      .sort({ bidTime: -1 })
      .populate('listing', 'title currentPrice status closingTime photos category');

    return bids;
  }
}

module.exports = BidService;
