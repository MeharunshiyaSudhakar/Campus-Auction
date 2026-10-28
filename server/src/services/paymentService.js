const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Listing = require('../models/Listing');
const Payment = require('../models/Payment');
const NotificationService = require('./notificationService');
const { getIO } = require('../config/socket');

class PaymentService {
  /**
   * Helper to instantiate Razorpay Node SDK safely
   */
  static getRazorpayInstance() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return null;
    }

    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /**
   * Onboard seller with Route linked account
   */
  static async onboardSeller(sellerId, accountData = {}) {
    const seller = await User.findById(sellerId).select('+linkedAccountId');
    if (!seller) {
      const error = new Error('Seller not found');
      error.statusCode = 404;
      throw error;
    }

    const rzp = this.getRazorpayInstance();

    // If real credentials available, create Route linked account
    let linkedAccountId = `acc_campus_${Date.now()}_${seller._id.toString().slice(-6)}`;

    if (rzp && process.env.NODE_ENV === 'production') {
      try {
        const acc = await rzp.accounts.create({
          email: accountData.email || seller.email,
          phone: accountData.phone,
          type: 'standard',
          legal_business_name: accountData.legalName || seller.name,
          business_type: 'individual',
        });
        linkedAccountId = acc.id;
      } catch (err) {
        console.error('[PaymentService] Razorpay account creation error:', err.message);
        const error = new Error(`Failed to onboard with payment gateway: ${err.message}`);
        error.statusCode = 400;
        throw error;
      }
    }

    seller.linkedAccountId = linkedAccountId;
    seller.payoutStatus = 'active';
    await seller.save();

    return {
      success: true,
      payoutStatus: seller.payoutStatus,
      message: 'Seller payout account onboarded successfully',
    };
  }

  /**
   * Dev-only helper to activate seller payout status for testing
   */
  static async devActivateSeller(sellerId) {
    const seller = await User.findById(sellerId).select('+linkedAccountId');
    if (!seller) {
      const error = new Error('Seller not found');
      error.statusCode = 404;
      throw error;
    }

    const testAccountId = `acc_test_${seller._id.toString().slice(-8)}`;
    seller.linkedAccountId = testAccountId;
    seller.payoutStatus = 'active';
    await seller.save();

    return {
      success: true,
      payoutStatus: seller.payoutStatus,
      testAccountId,
    };
  }

  /**
   * Creates a Razorpay Order with held split transfer to seller's linked account
   */
  static async createOrder(buyerId, dealId) {
    const deal = await Deal.findById(dealId).populate('listing');
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    // Authorization: Caller must be the buyer
    if (deal.buyer.toString() !== buyerId.toString()) {
      const error = new Error('Only the winning buyer can initiate payment for this deal');
      error.statusCode = 403;
      throw error;
    }

    // Deal must be approved or in payment pending
    if (!['approved', 'details_shared', 'payment_pending'].includes(deal.status)) {
      const error = new Error(`Payment cannot be initiated for deal with status '${deal.status}'`);
      error.statusCode = 400;
      throw error;
    }

    // Check payment window (default 24h)
    const windowHours = parseInt(process.env.PAYMENT_WINDOW_HOURS, 10) || 24;
    const dealStartTime = deal.createdAt || new Date();
    const expiresAt = new Date(dealStartTime.getTime() + windowHours * 60 * 60 * 1000);

    if (new Date() > expiresAt) {
      deal.status = 'payment_not_received';
      await deal.save();
      const error = new Error(`Payment window of ${windowHours} hours has expired for this deal`);
      error.statusCode = 400;
      throw error;
    }

    // Check if an already paid/held payment exists
    const existingPayment = await Payment.findOne({
      deal: deal._id,
      status: { $in: ['paid_held', 'released'] },
    });
    if (existingPayment) {
      const error = new Error('A successful payment already exists for this deal');
      error.statusCode = 400;
      throw error;
    }

    // Load seller's linked account ID securely
    const seller = await User.findById(deal.seller).select('+linkedAccountId');
    if (!seller || seller.payoutStatus !== 'active' || !seller.linkedAccountId) {
      const error = new Error(
        'The seller has not activated online payouts. Please pay using Direct UPI QR or Cash on pickup.'
      );
      error.statusCode = 400;
      throw error;
    }

    // Always fetch approved price strictly from the DB (paise = ₹ * 100)
    const amountPaise = Math.round(deal.amount * 100);

    const rzp = this.getRazorpayInstance();
    let razorpayOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let transferId = `trf_test_${Date.now()}`;

    if (rzp) {
      try {
        const orderData = await rzp.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt: `rcpt_deal_${deal._id.toString()}`,
          transfers: [
            {
              account: seller.linkedAccountId,
              amount: amountPaise,
              currency: 'INR',
              on_hold: 1, // Route held until verified handover
            },
          ],
        });
        razorpayOrderId = orderData.id;
        if (orderData.transfers && orderData.transfers[0]) {
          transferId = orderData.transfers[0].id;
        }
      } catch (err) {
        console.warn('[PaymentService] Razorpay order creation fallback to simulated test order:', err.message);
      }
    }

    // Create or reuse pending payment record
    let payment = await Payment.findOne({ deal: deal._id, status: 'created' });
    if (!payment) {
      payment = new Payment({
        deal: deal._id,
        listing: deal.listing._id,
        payer: buyerId,
        receiver: deal.seller,
        amountPaise,
        currency: 'INR',
        status: 'created',
        paymentMethod: 'online',
        razorpayOrderId,
        transferId,
        sellerLinkedAccountId: seller.linkedAccountId,
        holdUntilHandover: true,
        expiresAt,
      });
    } else {
      payment.razorpayOrderId = razorpayOrderId;
      payment.transferId = transferId;
      payment.amountPaise = amountPaise;
      payment.expiresAt = expiresAt;
    }

    await payment.save();

    deal.chosenMethod = 'online';
    deal.status = 'payment_pending';
    deal.payment = payment._id;
    deal.paymentWindowExpiresAt = expiresAt;
    await deal.save();

    return {
      orderId: razorpayOrderId,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_campus_mock_id',
      dealId: deal._id,
      expiresAt,
    };
  }

  /**
   * Verifies the Razorpay checkout signature and puts the transfer in 'paid_held' state
   */
  static async verifyPayment(buyerId, { dealId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    if (deal.buyer.toString() !== buyerId.toString()) {
      const error = new Error('Not authorized to verify payment for this deal');
      error.statusCode = 403;
      throw error;
    }

    const payment = await Payment.findOne({ deal: deal._id });
    if (!payment) {
      const error = new Error('Payment record not found for this deal');
      error.statusCode = 404;
      throw error;
    }

    // Signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    let isValid = false;

    if (
      (razorpaySignature === 'mock_signature' ||
        razorpaySignature?.startsWith('test_sig_') ||
        razorpaySignature?.startsWith('mock_')) &&
      process.env.NODE_ENV !== 'production'
    ) {
      // In development / test mode with simulated checkout
      isValid = true;
    } else if (secret && razorpaySignature) {
      const generated = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      isValid = generated === razorpaySignature;
    }

    if (!isValid) {
      payment.status = 'failed';
      await payment.save();
      const error = new Error('Payment signature verification failed');
      error.statusCode = 400;
      throw error;
    }

    payment.status = 'paid_held';
    payment.paidAt = new Date();
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    await payment.save();

    deal.status = 'payment_confirmed';
    deal.chosenMethod = 'online';
    await deal.save();

    // Notify seller
    try {
      await NotificationService.createNotification({
        recipient: deal.seller,
        type: 'deal_update',
        title: 'Payment Received (Held in Escrow)',
        message: `The winning buyer paid ₹${deal.amount} online. Funds are held safely in escrow until you verify the 6-digit handover code.`,
        relatedListing: deal.listing,
      });
    } catch (e) {}

    // Emit live socket update to deal room
    try {
      const io = getIO();
      if (io) {
        io.to(`deal_${deal._id}`).emit('payment_updated', {
          dealId: deal._id,
          status: 'payment_confirmed',
          chosenMethod: 'online',
          paymentStatus: 'paid_held',
        });
      }
    } catch (e) {}

    return {
      success: true,
      message: 'Payment verified successfully and held in escrow until handover',
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amountPaise / 100,
        paidAt: payment.paidAt,
      },
    };
  }

  /**
   * Release the held transfer to seller's account upon verified handover
   */
  static async releaseTransfer(dealId) {
    const payment = await Payment.findOne({ deal: dealId });
    if (!payment) return null;

    if (payment.status !== 'paid_held') {
      return null;
    }

    const rzp = this.getRazorpayInstance();
    if (rzp && payment.transferId && !payment.transferId.startsWith('trf_test_')) {
      try {
        await rzp.transfers.setHold(payment.transferId, { on_hold: 0 });
      } catch (err) {
        console.error('[PaymentService] Error releasing transfer hold via Razorpay:', err.message);
      }
    }

    payment.status = 'released';
    payment.releasedAt = new Date();
    await payment.save();

    return payment;
  }

  /**
   * Refund the payment in case of cancelled deal or failed handover
   */
  static async refundPayment(dealId, reason = 'Handover cancelled') {
    const payment = await Payment.findOne({ deal: dealId });
    if (!payment || !['paid_held', 'created'].includes(payment.status)) {
      return null;
    }

    const rzp = this.getRazorpayInstance();
    if (rzp && payment.razorpayPaymentId && !payment.razorpayPaymentId.startsWith('pay_test_')) {
      try {
        await rzp.payments.refund(payment.razorpayPaymentId, {
          notes: { reason },
        });
      } catch (err) {
        console.error('[PaymentService] Error refunding payment via Razorpay:', err.message);
      }
    }

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();

    return payment;
  }

  /**
   * Handles incoming Razorpay Webhook events
   */
  static async handleWebhook(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret && signature) {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (expected !== signature) {
        const error = new Error('Invalid webhook signature');
        error.statusCode = 400;
        throw error;
      }
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const { event: eventName, payload } = event;

    if (eventName === 'payment.captured') {
      const payEntity = payload?.payment?.entity;
      if (payEntity?.order_id) {
        const payment = await Payment.findOne({ razorpayOrderId: payEntity.order_id });
        if (payment && payment.status === 'created') {
          payment.status = 'paid_held';
          payment.paidAt = new Date();
          payment.razorpayPaymentId = payEntity.id;
          await payment.save();
        }
      }
    }

    return { received: true };
  }
}

module.exports = PaymentService;
