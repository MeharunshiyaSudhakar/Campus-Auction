const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const User = require('../models/User');

class DealService {
  /**
   * Initialize a Deal when the seller approves the winning price
   * Only the seller can approve their listing
   */
  static async initializeDeal(sellerId, listingId) {
    const listing = await Listing.findById(listingId).select('+upiId +contactPhone +otherInstructions');
    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    if (listing.seller.toString() !== sellerId.toString()) {
      const error = new Error('Not authorized: only the seller can approve the deal');
      error.statusCode = 403;
      throw error;
    }

    const winnerId = listing.winner || listing.leadingBidder;
    if (!winnerId) {
      const error = new Error('Cannot approve deal: no winning bidder exists for this auction');
      error.statusCode = 400;
      throw error;
    }

    // Generate 6-digit campus handover verification code
    const handoverCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Update listing state
    listing.status = 'approved';
    listing.sellerDecisionAt = new Date();
    listing.handoverCode = handoverCode;
    listing.finalPrice = listing.currentPrice;
    await listing.save();

    // Create or retrieve existing Deal
    let deal = await Deal.findOne({ listing: listingId });
    if (!deal) {
      deal = await Deal.create({
        listing: listingId,
        buyer: winnerId,
        seller: sellerId,
        amount: listing.currentPrice,
        status: 'approved',
        pickupInfo: {
          handoverCode,
        },
        statusHistory: [
          {
            status: 'approved',
            changedBy: sellerId,
            note: `Seller approved the winning price of ₹${listing.currentPrice}`,
            timestamp: new Date(),
          },
        ],
      });
    }

    return await deal.populate(['buyer', 'seller', 'listing']);
  }

  /**
   * Get Deal details with strict privacy protection
   * - 403 if user is not buyer or seller
   * - Seller payment info revealed to winner ONLY after approval and method choice
   * - Delivery address revealed to seller ONLY if courier fulfilment
   */
  static async getDealById(dealId, userId) {
    const deal = await Deal.findById(dealId)
      .populate('listing', 'title currentPrice category photos acceptedPaymentMethods fulfilment status')
      .populate('seller', 'name')
      .populate('buyer', 'name');

    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    const isBuyer = deal.buyer._id.toString() === userId.toString();
    const isSeller = deal.seller._id.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      const error = new Error('Forbidden: You are not a party to this deal');
      error.statusCode = 403;
      throw error;
    }

    const dealObj = deal.toObject();

    // Privacy rule 1: Seller payment details are hidden from buyer until details_shared status
    if (isBuyer) {
      if (['approved'].includes(deal.status)) {
        // Buyer has not chosen method yet; don't expose seller's snapshot yet
        dealObj.sellerPaymentDetails = {
          upiId: '',
          contactPhone: '',
          otherInstructions: '',
        };
      }
    }

    // Privacy rule 2: Third parties never see delivery address; only seller sees courier address
    if (isSeller && deal.fulfilment !== 'courier') {
      delete dealObj.deliveryAddress;
    }

    return dealObj;
  }

  /**
   * Buyer chooses payment method and fulfilment option
   */
  static async chooseMethodAndFulfilment(dealId, buyerId, data) {
    const { chosenMethod, fulfilment, deliveryAddress } = data;

    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    if (deal.buyer.toString() !== buyerId.toString()) {
      const error = new Error('Forbidden: Only the winning buyer can choose payment and delivery');
      error.statusCode = 403;
      throw error;
    }

    if (deal.status !== 'approved') {
      const error = new Error(`Cannot choose methods when deal is in '${deal.status}' status`);
      error.statusCode = 400;
      throw error;
    }

    // Load seller's hidden payment config from Listing
    const listing = await Listing.findById(deal.listing).select('+upiId +contactPhone +otherInstructions');
    if (!listing) {
      const error = new Error('Associated listing not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate chosen method is offered by seller
    const offeredMethods = listing.acceptedPaymentMethods || ['upi', 'cash_on_pickup'];
    if (!offeredMethods.includes(chosenMethod)) {
      const error = new Error(
        `Invalid payment method '${chosenMethod}'. Seller only accepts: ${offeredMethods.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    // Validate fulfilment option
    const offeredFulfilment = listing.fulfilment || ['campus_pickup'];
    if (!offeredFulfilment.includes(fulfilment)) {
      const error = new Error(
        `Invalid fulfilment option '${fulfilment}'. Seller only offers: ${offeredFulfilment.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    // Courier requires delivery address
    if (fulfilment === 'courier') {
      if (!deliveryAddress || !deliveryAddress.addressLine1 || !deliveryAddress.city || !deliveryAddress.postalCode) {
        const error = new Error('Complete delivery address (line 1, city, postal code, phone) is mandatory for courier fulfilment');
        error.statusCode = 400;
        throw error;
      }
      deal.deliveryAddress = {
        recipientName: deliveryAddress.recipientName || '',
        addressLine1: deliveryAddress.addressLine1.trim(),
        addressLine2: deliveryAddress.addressLine2 || '',
        city: deliveryAddress.city.trim(),
        state: deliveryAddress.state || '',
        postalCode: deliveryAddress.postalCode.trim(),
        contactPhone: deliveryAddress.contactPhone || '',
      };
    }

    // Snapshot seller payment details for the buyer
    deal.chosenMethod = chosenMethod;
    deal.fulfilment = fulfilment;
    deal.sellerPaymentDetails = {
      upiId: listing.upiId || '',
      contactPhone: listing.contactPhone || '',
      otherInstructions: listing.otherInstructions || '',
    };

    deal.status = 'details_shared';
    deal.statusHistory.push({
      status: 'details_shared',
      changedBy: buyerId,
      note: `Buyer chose ${chosenMethod} via ${fulfilment}. Seller details revealed.`,
      timestamp: new Date(),
    });

    await deal.save();
    return await deal.populate(['buyer', 'seller', 'listing']);
  }

  /**
   * Buyer confirms "I have paid" (for UPI / Direct payment)
   */
  static async markPaid(dealId, buyerId, note = 'Payment sent by buyer') {
    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    if (deal.buyer.toString() !== buyerId.toString()) {
      const error = new Error('Forbidden: Only the buyer can mark payment sent');
      error.statusCode = 403;
      throw error;
    }

    if (!['details_shared'].includes(deal.status)) {
      const error = new Error(`Cannot mark paid when status is '${deal.status}'`);
      error.statusCode = 400;
      throw error;
    }

    deal.status = 'payment_pending';
    deal.paidAt = new Date();
    deal.statusHistory.push({
      status: 'payment_pending',
      changedBy: buyerId,
      note: note || 'Buyer confirmed payment transfer',
      timestamp: new Date(),
    });

    await deal.save();
    return deal;
  }

  /**
   * Seller confirms "Payment received"
   */
  static async confirmPayment(dealId, sellerId, note = 'Payment received and verified by seller') {
    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    if (deal.seller.toString() !== sellerId.toString()) {
      const error = new Error('Forbidden: Only the seller can confirm receipt of payment');
      error.statusCode = 403;
      throw error;
    }

    if (!['payment_pending', 'details_shared'].includes(deal.status)) {
      const error = new Error(`Cannot confirm payment from status '${deal.status}'`);
      error.statusCode = 400;
      throw error;
    }

    deal.status = 'payment_confirmed';
    deal.paymentConfirmedAt = new Date();
    deal.statusHistory.push({
      status: 'payment_confirmed',
      changedBy: sellerId,
      note: note || 'Seller confirmed payment received in bank/UPI',
      timestamp: new Date(),
    });

    await deal.save();
    return deal;
  }

  /**
   * Seller enters courier tracking information
   * Security guard: Seller should ship only after payment is confirmed
   */
  static async updateCourierDispatch(dealId, sellerId, courierData) {
    const { courierName, trackingId, dispatchDate } = courierData;

    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    if (deal.seller.toString() !== sellerId.toString()) {
      const error = new Error('Forbidden: Only the seller can dispatch courier tracking');
      error.statusCode = 403;
      throw error;
    }

    if (deal.fulfilment !== 'courier') {
      const error = new Error('Courier dispatch is only applicable when fulfilment is set to courier');
      error.statusCode = 400;
      throw error;
    }

    // Security guard: require payment_confirmed before shipping
    if (deal.status !== 'payment_confirmed') {
      const error = new Error('Item should be dispatched only after payment is confirmed');
      error.statusCode = 400;
      throw error;
    }

    if (!courierName || !trackingId) {
      const error = new Error('Courier service name and tracking ID are required');
      error.statusCode = 400;
      throw error;
    }

    deal.courierInfo = {
      courierName: courierName.trim(),
      trackingId: trackingId.trim(),
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
    };
    deal.status = 'shipped';
    deal.statusHistory.push({
      status: 'shipped',
      changedBy: sellerId,
      note: `Dispatched via ${courierName} (Tracking ID: ${trackingId})`,
      timestamp: new Date(),
    });

    await deal.save();
    return deal;
  }

  /**
   * Schedule Campus Pickup
   */
  static async schedulePickup(dealId, userId, pickupData) {
    const { location, scheduledTime } = pickupData;

    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    const isParty = deal.buyer.toString() === userId.toString() || deal.seller.toString() === userId.toString();
    if (!isParty) {
      const error = new Error('Forbidden: Not a party to this deal');
      error.statusCode = 403;
      throw error;
    }

    deal.pickupInfo.location = location || 'Campus Main Library Entrance';
    deal.pickupInfo.scheduledTime = scheduledTime ? new Date(scheduledTime) : new Date(Date.now() + 86400000);
    deal.status = 'pickup_scheduled';
    deal.statusHistory.push({
      status: 'pickup_scheduled',
      changedBy: userId,
      note: `Pickup scheduled at ${deal.pickupInfo.location}`,
      timestamp: new Date(),
    });

    await deal.save();
    return deal;
  }

  /**
   * Complete deal:
   * - For pickup: Handover confirmed (optionally with 6-digit handover code)
   * - For courier: Buyer confirms "received"
   * Updates Listing to 'completed' and feeds profile totals
   */
  static async confirmCompleted(dealId, userId, { handoverCode } = {}) {
    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    const isBuyer = deal.buyer.toString() === userId.toString();
    const isSeller = deal.seller.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      const error = new Error('Forbidden: Not authorized');
      error.statusCode = 403;
      throw error;
    }

    if (deal.fulfilment === 'courier') {
      // For courier, only buyer confirms "received"
      if (!isBuyer) {
        const error = new Error('Only the buyer can confirm package delivery received');
        error.statusCode = 403;
        throw error;
      }
    } else {
      // For campus pickup: verify 6-digit code if provided
      if (handoverCode) {
        if (handoverCode.trim() !== deal.pickupInfo.handoverCode) {
          const error = new Error('Invalid 6-digit handover code. Please check code on buyer screen.');
          error.statusCode = 400;
          throw error;
        }
      }
    }

    deal.status = 'completed';
    deal.completedAt = new Date();
    deal.pickupInfo.handoverConfirmedAt = new Date();
    deal.statusHistory.push({
      status: 'completed',
      changedBy: userId,
      note: deal.fulfilment === 'courier' ? 'Buyer confirmed package received' : 'Handover confirmed on campus',
      timestamp: new Date(),
    });
    await deal.save();

    // Mark listing completed so profile totals count it
    await Listing.findByIdAndUpdate(deal.listing, {
      status: 'completed',
      handoverCompletedAt: new Date(),
      finalPrice: deal.amount,
    });

    return deal;
  }

  /**
   * Record other deal outcomes (rejected, cancelled, payment_not_received, pickup_failed, courier_issue)
   */
  static async recordDealOutcome(dealId, userId, { outcome, reason }) {
    const validOutcomes = [
      'rejected',
      'cancelled',
      'payment_not_received',
      'pickup_failed',
      'courier_issue',
    ];

    if (!validOutcomes.includes(outcome)) {
      const error = new Error(`Invalid deal outcome '${outcome}'`);
      error.statusCode = 400;
      throw error;
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    const isParty = deal.buyer.toString() === userId.toString() || deal.seller.toString() === userId.toString();
    if (!isParty) {
      const error = new Error('Forbidden: Not a party to this deal');
      error.statusCode = 403;
      throw error;
    }

    deal.status = outcome;
    deal.cancellationReason = reason || `Marked as ${outcome}`;
    deal.statusHistory.push({
      status: outcome,
      changedBy: userId,
      note: reason || `Outcome marked as ${outcome}`,
      timestamp: new Date(),
    });
    await deal.save();

    // Update listing status
    await Listing.findByIdAndUpdate(deal.listing, {
      status: outcome === 'rejected' ? 'rejected' : 'cancelled',
    });

    return deal;
  }

  /**
   * Optional GDPR/Privacy cron: purge delivery addresses N days after deal completion
   */
  static async purgeOldDeliveryAddresses(days = 7) {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await Deal.updateMany(
      {
        status: 'completed',
        completedAt: { $lte: threshold },
        'deliveryAddress.addressLine1': { $exists: true, $ne: '' },
      },
      {
        $set: {
          'deliveryAddress.addressLine1': '[PURGED FOR PRIVACY]',
          'deliveryAddress.addressLine2': '',
          'deliveryAddress.contactPhone': '[PURGED]',
          'deliveryAddress.purgedAt': new Date(),
        },
      }
    );
    return result;
  }
}

module.exports = DealService;
