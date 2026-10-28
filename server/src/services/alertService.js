const Listing = require('../models/Listing');
const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

class AlertService {
  /**
   * Scan for stale and unsold listings and trigger alerts (called by cron)
   * Guaranteed idempotent via staleNoBidsAlertSent and unsoldAlertSent flags.
   */
  static async checkAndSendUnsoldAlerts() {
    const thresholdDays = Number(process.env.UNSOLD_ALERT_DAYS) || 3;
    const cutoffDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

    let io = null;
    try {
      io = getIO();
    } catch {
      // Socket.io not initialized yet or running in CLI mode
    }

    const createdNotifications = [];

    // 1. Stale Active Listings (0 bids after N days)
    const staleListings = await Listing.find({
      status: 'active',
      bidCount: 0,
      createdAt: { $lte: cutoffDate },
      staleNoBidsAlertSent: { $ne: true },
    });

    for (const listing of staleListings) {
      const notif = await Notification.create({
        user: listing.seller,
        type: 'no_bids_stale',
        title: 'Action Needed: No Bids Yet',
        message: `Your listing "${listing.title}" has had no bids for ${thresholdDays} days. Consider lowering the starting price or adjusting the closing time.`,
        listing: listing._id,
      });

      listing.staleNoBidsAlertSent = true;
      await listing.save();

      createdNotifications.push(notif);

      if (io) {
        io.to(`user:${listing.seller}`).emit('new_notification', notif);
      }
    }

    // 2. Auctions Closed Unsold
    const unsoldListings = await Listing.find({
      status: 'unsold',
      unsoldAlertSent: { $ne: true },
    });

    for (const listing of unsoldListings) {
      const notif = await Notification.create({
        user: listing.seller,
        type: 'unsold_alert',
        title: 'Auction Ended Unsold',
        message: `Your item "${listing.title}" closed without any bids. You can relist it with a lower starting price with one click.`,
        listing: listing._id,
      });

      listing.unsoldAlertSent = true;
      await listing.save();

      createdNotifications.push(notif);

      if (io) {
        io.to(`user:${listing.seller}`).emit('new_notification', notif);
      }
    }

    return {
      staleCount: staleListings.length,
      unsoldCount: unsoldListings.length,
      notificationsCreated: createdNotifications.length,
    };
  }

  /**
   * Get all items of a seller that need attention
   */
  static async getNeedsAttentionListings(sellerId) {
    const thresholdDays = Number(process.env.UNSOLD_ALERT_DAYS) || 3;
    const cutoffDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

    // Fetch items with reasons:
    // a) Active with 0 bids older than threshold
    // b) Unsold
    // c) Rejected price
    // d) Pickup failed
    const listings = await Listing.find({
      seller: sellerId,
      $or: [
        { status: 'active', bidCount: 0, createdAt: { $lte: cutoffDate } },
        { status: 'unsold' },
        { status: 'rejected' },
        { status: 'pickup_failed' },
      ],
    }).sort({ updatedAt: -1 });

    return listings.map((item) => {
      let reasonKey = 'no_bids_stale';
      let reasonText = `No bids after ${thresholdDays} days. Low traffic or price may be too high.`;

      if (item.status === 'unsold') {
        reasonKey = 'closed_unsold';
        reasonText = 'Auction closed with zero bids. Ready for relisting.';
      } else if (item.status === 'rejected') {
        reasonKey = 'rejected_price';
        reasonText = 'Highest bid was rejected by seller. Can be relisted.';
      } else if (item.status === 'pickup_failed') {
        reasonKey = 'pickup_failed';
        reasonText = 'Campus handover could not be completed. Item can be relisted.';
      }

      return {
        _id: item._id,
        title: item.title,
        category: item.category,
        photos: item.photos,
        conditionGrade: item.condition?.grade,
        startingPrice: item.startingPrice,
        currentPrice: item.currentPrice,
        bidCount: item.bidCount,
        status: item.status,
        createdAt: item.createdAt,
        closingTime: item.closingTime,
        reasonKey,
        reasonText,
      };
    });
  }

  /**
   * Relist an item: Creates a brand new listing prefilled from the old one
   */
  static async relistListing(sellerId, oldListingId, options = {}) {
    const oldListing = await Listing.findById(oldListingId);

    if (!oldListing) {
      const error = new Error('Original listing not found');
      error.statusCode = 404;
      throw error;
    }

    if (oldListing.seller.toString() !== sellerId.toString()) {
      const error = new Error('Not authorized to relist this item');
      error.statusCode = 403;
      throw error;
    }

    const newStartingPrice = Number(options.startingPrice) || oldListing.startingPrice;
    const newMinIncrement = Number(options.minIncrement) || oldListing.minIncrement;

    // Default closing time: 48 hours from now
    const newClosingTime = options.closingTime
      ? new Date(options.closingTime)
      : new Date(Date.now() + 48 * 60 * 60 * 1000);

    const newListing = await Listing.create({
      seller: sellerId,
      title: options.title ? options.title.trim() : oldListing.title,
      category: oldListing.category,
      description: options.description ? options.description.trim() : oldListing.description,
      photos: oldListing.photos,
      defectPhotoIncluded: oldListing.defectPhotoIncluded,
      condition: oldListing.condition,
      honestyDeclaration: true,
      startingPrice: newStartingPrice,
      minIncrement: newMinIncrement,
      currentPrice: newStartingPrice,
      closingTime: newClosingTime,
      status: 'active',
      bidCount: 0,
      leadingBid: null,
      leadingBidder: null,
      staleNoBidsAlertSent: false,
      unsoldAlertSent: false,
    });

    return await newListing.populate('seller', 'name');
  }
}

module.exports = AlertService;
