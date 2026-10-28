const DealService = require('../services/dealService');
const DealChatService = require('../services/dealChatService');
const ApiResponse = require('../utils/apiResponse');

class DealController {
  /**
   * @route   POST /api/deals/initialize/:listingId
   * @desc    Seller approves winning price and initializes Deal
   * @access  Private (Seller only)
   */
  static async initializeDeal(req, res, next) {
    try {
      const deal = await DealService.initializeDeal(req.user._id, req.params.listingId);
      return ApiResponse.success(res, deal, 'Deal initialized successfully upon seller approval', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/deals/:id
   * @desc    Get deal details (Protected: buyer and seller only)
   * @access  Private
   */
  static async getDealById(req, res, next) {
    try {
      const deal = await DealService.getDealById(req.params.id, req.user._id);
      return ApiResponse.success(res, deal, 'Deal details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/deals/:id/choose-method
   * @desc    Winner chooses payment method (UPI, COD, other) and fulfilment (pickup/courier)
   * @access  Private (Buyer only)
   */
  static async chooseMethod(req, res, next) {
    try {
      const deal = await DealService.chooseMethodAndFulfilment(req.params.id, req.user._id, req.body);
      return ApiResponse.success(res, deal, 'Payment method and fulfilment chosen. Seller details revealed.', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/deals/:id/mark-paid
   * @desc    Buyer confirms payment sent ("I have paid")
   * @access  Private (Buyer only)
   */
  static async markPaid(req, res, next) {
    try {
      const deal = await DealService.markPaid(req.params.id, req.user._id, req.body?.note);
      return ApiResponse.success(res, deal, 'Payment marked as sent. Awaiting seller confirmation.', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/deals/:id/confirm-payment
   * @desc    Seller confirms payment received
   * @access  Private (Seller only)
   */
  static async confirmPayment(req, res, next) {
    try {
      const deal = await DealService.confirmPayment(req.params.id, req.user._id, req.body?.note);
      return ApiResponse.success(res, deal, 'Payment confirmed by seller.', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/deals/:id/courier
   * @desc    Seller dispatches courier and records tracking
   * @access  Private (Seller only)
   */
  static async updateCourier(req, res, next) {
    try {
      const deal = await DealService.updateCourierDispatch(req.params.id, req.user._id, req.body);
      return ApiResponse.success(res, deal, 'Courier dispatch details updated.', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/deals/:id/schedule-pickup
   * @desc    Schedule campus handover meeting
   * @access  Private (Buyer or Seller)
   */
  static async schedulePickup(req, res, next) {
    try {
      const deal = await DealService.schedulePickup(req.params.id, req.user._id, req.body);
      return ApiResponse.success(res, deal, 'Campus pickup scheduled.', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/deals/:id/complete
   * @desc    Complete deal (Handover confirmed or buyer confirms received)
   * @access  Private (Buyer or Seller)
   */
  static async confirmCompleted(req, res, next) {
    try {
      const deal = await DealService.confirmCompleted(req.params.id, req.user._id, req.body);
      return ApiResponse.success(res, deal, 'Deal completed successfully! Handover verified.', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/deals/:id/outcome
   * @desc    Record outcome (rejected, cancelled, payment_not_received, pickup_failed, courier_issue)
   * @access  Private (Buyer or Seller)
   */
  static async recordOutcome(req, res, next) {
    try {
      const deal = await DealService.recordDealOutcome(req.params.id, req.user._id, req.body);
      return ApiResponse.success(res, deal, `Deal outcome recorded: ${deal.status}`, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/deals/:id/chat
   * @desc    Send private deal chat message
   * @access  Private (Buyer or Seller)
   */
  static async sendChatMessage(req, res, next) {
    try {
      const message = await DealChatService.sendMessage(req.params.id, req.user._id, req.body?.text);
      return ApiResponse.success(res, message, 'Message sent', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/deals/:id/chat
   * @desc    Get deal chat history with safety banner
   * @access  Private (Buyer or Seller)
   */
  static async getChatMessages(req, res, next) {
    try {
      const chat = await DealChatService.getMessages(req.params.id, req.user._id);
      return ApiResponse.success(res, chat, 'Chat history retrieved', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DealController;
