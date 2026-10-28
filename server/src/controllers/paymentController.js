const PaymentService = require('../services/paymentService');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User');

class PaymentController {
  /**
   * @route   POST /api/payouts/onboard
   * @desc    Start seller payout account onboarding (passes straight to Razorpay)
   * @access  Private
   */
  static async onboardSeller(req, res, next) {
    try {
      const result = await PaymentService.onboardSeller(req.user._id, req.body);
      return ApiResponse.success(res, result, 'Seller onboarding initiated', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/payouts/dev-activate
   * @desc    Dev-only seed to activate test seller linked account
   * @access  Private
   */
  static async devActivateSeller(req, res, next) {
    try {
      const result = await PaymentService.devActivateSeller(req.user._id);
      return ApiResponse.success(res, result, 'Dev test seller payout activated', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/payouts/status
   * @desc    Get current seller payout status
   * @access  Private
   */
  static async getPayoutStatus(req, res, next) {
    try {
      const user = await User.findById(req.user._id);
      return ApiResponse.success(
        res,
        {
          payoutStatus: user.payoutStatus || 'not_started',
          hasLinkedAccount: !!user.payoutStatus && user.payoutStatus === 'active',
        },
        'Payout status retrieved',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/payments/order
   * @desc    Create Razorpay Order with held Route transfer
   * @access  Private (Buyer only)
   */
  static async createOrder(req, res, next) {
    try {
      const { dealId } = req.body;
      const order = await PaymentService.createOrder(req.user._id, dealId);
      return ApiResponse.success(res, order, 'Payment order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/payments/verify
   * @desc    Verify checkout signature and mark payment paid_held
   * @access  Private (Buyer only)
   */
  static async verifyPayment(req, res, next) {
    try {
      const { dealId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const result = await PaymentService.verifyPayment(req.user._id, {
        dealId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });
      return ApiResponse.success(res, result, 'Payment verified successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/payments/release
   * @desc    Release transfer from hold to seller account
   * @access  Private
   */
  static async releaseTransfer(req, res, next) {
    try {
      const { dealId } = req.body;
      const result = await PaymentService.releaseTransfer(dealId);
      return ApiResponse.success(res, result, 'Transfer released successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/payments/refund
   * @desc    Refund payment to buyer
   * @access  Private
   */
  static async refundPayment(req, res, next) {
    try {
      const { dealId, reason } = req.body;
      const result = await PaymentService.refundPayment(dealId, reason);
      return ApiResponse.success(res, result, 'Payment refunded successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/payments/webhook
   * @desc    Receive webhook event from Razorpay
   * @access  Public
   */
  static async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const result = await PaymentService.handleWebhook(req.body, signature);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PaymentController;
