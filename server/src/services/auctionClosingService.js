const Listing = require('../models/Listing');
const Bid = require('../models/Bid');
const Notification = require('../models/Notification');

class AuctionClosingService {
  /**
   * Idempotently close a single active auction listing whose closing time has passed
   * @param {string} listingId - ID of the listing to close
   * @returns {object} { closed: boolean, listing: object }
   */
  static async closeListing(listingId) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    // Already closed or processed
    if (listing.status !== 'active') {
      return { closed: false, listing, reason: `Listing status is already '${listing.status}'` };
    }

    const now = new Date();
    // Enforce server clock as single source of truth
    if (now < new Date(listing.closingTime)) {
      return { closed: false, listing, reason: 'Auction closing time has not yet arrived' };
    }

    // Idempotent Concurrency Lock: only update if still active and closingTime <= now
    const filter = {
      _id: listingId,
      status: 'active',
      closingTime: { $lte: now },
    };

    let updatedListing;
    let io = null;
    try {
      const { getIO } = require('../config/socket');
      io = getIO();
    } catch (e) {
      // Socket not initialized in tests or CLI
    }

    if (listing.bidCount > 0 && listing.leadingBidder) {
      // Scenario A: Auction closes with bids -> transition to pending_approval
      const update = {
        $set: {
          status: 'pending_approval',
          winner: listing.leadingBidder,
          winningBid: listing.leadingBid,
          finalPrice: listing.currentPrice,
        },
      };

      updatedListing = await Listing.findOneAndUpdate(filter, update, { new: true })
        .populate('seller', 'name email')
        .populate('leadingBidder', 'name email')
        .populate('winner', 'name email');

      if (!updatedListing) {
        // Concurrently processed by another worker
        return { closed: false, listing: await Listing.findById(listingId) };
      }

      // Mark the winning bid record
      if (listing.leadingBid) {
        await Bid.findByIdAndUpdate(listing.leadingBid, { isWinningBid: true });
      }

      // 1. Notify Seller: action needed to approve or decline winning bid
      await Notification.create({
        user: updatedListing.seller._id,
        type: 'approval_needed',
        title: 'Action Needed: Approve Winning Bid',
        message: `Your auction for "${updatedListing.title}" closed at ₹${updatedListing.finalPrice}! Please review and approve or decline the winning bid.`,
        listing: updatedListing._id,
      });

      // 2. Notify Winner: won auction, awaiting seller price confirmation
      await Notification.create({
        user: updatedListing.winner._id,
        type: 'won',
        title: 'Auction Won (Pending Seller Approval)',
        message: `You placed the winning bid of ₹${updatedListing.finalPrice} on "${updatedListing.title}". The seller has been notified to confirm the sale.`,
        listing: updatedListing._id,
      });

      // 3. Real-Time Socket Broadcasts
      if (io) {
        io.to(`auction:${listingId}`).emit('auction_closed', {
          listingId: updatedListing._id.toString(),
          status: 'pending_approval',
          finalPrice: updatedListing.finalPrice,
          winner: {
            _id: updatedListing.winner._id,
            name: updatedListing.winner.name,
          },
          message: 'Auction closed. Awaiting seller price confirmation.',
        });

        io.emit('listing_price_updated', {
          listingId: updatedListing._id.toString(),
          status: 'pending_approval',
          currentPrice: updatedListing.finalPrice,
          bidCount: updatedListing.bidCount,
          closed: true,
        });
      }
    } else {
      // Scenario B: Auction closes with zero bids -> transition to unsold
      const update = {
        $set: {
          status: 'unsold',
        },
      };

      updatedListing = await Listing.findOneAndUpdate(filter, update, { new: true })
        .populate('seller', 'name email');

      if (!updatedListing) {
        return { closed: false, listing: await Listing.findById(listingId) };
      }

      // Notify Seller: item unsold, available in Needs Attention
      await Notification.create({
        user: updatedListing.seller._id,
        type: 'unsold_alert',
        title: 'Auction Closed Unsold',
        message: `Your auction for "${updatedListing.title}" ended with no bids. You can relist with an adjusted starting price from Needs Attention.`,
        listing: updatedListing._id,
      });

      // Real-Time Socket Broadcasts
      if (io) {
        io.to(`auction:${listingId}`).emit('auction_closed', {
          listingId: updatedListing._id.toString(),
          status: 'unsold',
          message: 'Auction closed with no bids.',
        });

        io.emit('listing_price_updated', {
          listingId: updatedListing._id.toString(),
          status: 'unsold',
          closed: true,
        });
      }
    }

    return { closed: true, listing: updatedListing };
  }

  /**
   * Scan and close all expired active auctions across the platform
   */
  static async closeAllExpired() {
    const now = new Date();
    const expiredListings = await Listing.find({
      status: 'active',
      closingTime: { $lte: now },
    }).select('_id');

    let closedCount = 0;
    for (const item of expiredListings) {
      try {
        const result = await this.closeListing(item._id);
        if (result.closed) closedCount++;
      } catch (err) {
        console.warn(`[AuctionClosing] Error closing listing ${item._id}:`, err.message);
      }
    }

    return { totalChecked: expiredListings.length, closedCount };
  }
}

module.exports = AuctionClosingService;
