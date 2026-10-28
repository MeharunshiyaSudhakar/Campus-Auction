const Listing = require('../models/Listing');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const NotificationService = require('./notificationService');

class ApprovalService {
  /**
   * Seller approves the winning bid on an auction closed pending approval
   * Generates a 6-digit campus handover code and initiates the direct payment Deal record
   * @param {string} sellerId - Logged in seller student ID
   * @param {string} listingId - Listing ID to approve
   */
  static async approveWinningBid(sellerId, listingId) {
    // Select strictly private payment details to safely transfer into the private Deal record
    const listing = await Listing.findById(listingId).select(
      '+upiId +contactPhone +otherInstructions'
    );

    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    // Authorization: only the seller can approve or decline
    if (listing.seller.toString() !== sellerId.toString()) {
      const error = new Error('Only the seller can approve or decline the winning bid');
      error.statusCode = 403;
      throw error;
    }

    if (listing.status !== 'pending_approval') {
      const error = new Error(
        `Listing is not awaiting seller approval (current status: ${listing.status})`
      );
      error.statusCode = 400;
      throw error;
    }

    if (!listing.winner) {
      const error = new Error('No winning bidder recorded on this listing');
      error.statusCode = 400;
      throw error;
    }

    // Generate secure 6-digit campus handover code
    const handoverCode = Math.floor(100000 + Math.random() * 900000).toString();

    listing.status = 'approved';
    listing.handoverCode = handoverCode;
    listing.sellerDecisionAt = new Date();
    await listing.save();

    // Create or retrieve the private Deal record (Module 16)
    let deal = await Deal.findOne({ listing: listing._id });
    if (!deal) {
      deal = await Deal.create({
        listing: listing._id,
        buyer: listing.winner,
        seller: listing.seller,
        amount: listing.finalPrice || listing.currentPrice,
        status: 'approved',
        sellerPaymentDetails: {
          upiId: listing.upiId || '',
          contactPhone: listing.contactPhone || '',
          otherInstructions: listing.otherInstructions || '',
        },
        handoverCode,
        pickupInfo: {
          handoverCode,
        },
      });
    }

    // 1. Notify Winning Buyer
    await Notification.create({
      user: listing.winner,
      type: 'approved',
      title: 'Bid Approved by Seller!',
      message: `The seller approved your ₹${listing.finalPrice} bid for "${listing.title}". Go to your Deal Tracker to select payment method and delivery!`,
      listing: listing._id,
    });

    // 2. Notify Seller
    await Notification.create({
      user: listing.seller,
      type: 'approved',
      title: 'Sale Approved',
      message: `You approved the winning bid for "${listing.title}". Deal tracker is now active with the buyer.`,
      listing: listing._id,
    });

    // 3. Socket.io Real-Time Broadcast
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();

      io.to(`auction:${listingId}`).emit('auction_approved', {
        listingId: listing._id.toString(),
        dealId: deal._id.toString(),
        status: 'approved',
        message: 'Winning bid approved by seller!',
      });

      io.emit('listing_price_updated', {
        listingId: listing._id.toString(),
        status: 'approved',
      });
    } catch (e) {
      // Socket not initialized in CLI/tests
    }

    return {
      listing,
      deal,
      message: 'Winning bid approved. Deal initiated successfully.',
    };
  }

  /**
   * Seller rejects the winning bid on an auction closed pending approval
   * @param {string} sellerId - Logged in seller student ID
   * @param {string} listingId - Listing ID to reject
   * @param {string} reason - Optional explanation from seller
   */
  static async rejectWinningBid(sellerId, listingId, reason = 'Price below expectations') {
    const listing = await Listing.findById(listingId);

    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    if (listing.seller.toString() !== sellerId.toString()) {
      const error = new Error('Only the seller can approve or decline the winning bid');
      error.statusCode = 403;
      throw error;
    }

    if (listing.status !== 'pending_approval') {
      const error = new Error(
        `Listing is not awaiting seller approval (current status: ${listing.status})`
      );
      error.statusCode = 400;
      throw error;
    }

    listing.status = 'rejected';
    listing.sellerDecisionAt = new Date();
    await listing.save();

    // 1. Notify Winning Buyer
    if (listing.winner) {
      await NotificationService.sendNotification({
        user: listing.winner,
        type: 'rejected',
        title: 'Bid Declined by Seller',
        message: `The seller declined the final bid of ₹${listing.finalPrice} for "${listing.title}". Reason: ${reason}`,
        listing: listing._id,
        link: '/browse',
        eventKey: `${listing._id}_buyer_rejected`,
      });
    }

    // 2. Notify Seller (Item appears in Needs Attention)
    await NotificationService.sendNotification({
      user: listing.seller,
      type: 'rejection_confirmed',
      title: 'Listing Declined - Available to Relist',
      message: `You declined the final bid for "${listing.title}". You can adjust starting price and relist from Needs Attention.`,
      listing: listing._id,
      link: '/needs-attention',
      eventKey: `${listing._id}_rejection_confirmed`,
    });

    // 3. Socket.io Real-Time Broadcast
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();

      io.to(`auction:${listingId}`).emit('auction_rejected', {
        listingId: listing._id.toString(),
        status: 'rejected',
        message: 'Winning bid declined by seller.',
      });

      io.emit('listing_price_updated', {
        listingId: listing._id.toString(),
        status: 'rejected',
      });
    } catch (e) {
      // Socket not initialized in CLI/tests
    }

    return {
      listing,
      message: 'Winning bid declined. Listing marked as rejected.',
    };
  }
}

module.exports = ApprovalService;
