const BidService = require('../services/bidService');
const ApiResponse = require('../utils/apiResponse');

class BidController {
  /**
   * @route   POST /api/bids
   * @desc    Place a bid on an active auction
   * @access  Private (Authenticated students only)
   */
  static async placeBid(req, res, next) {
    try {
      const result = await BidService.placeBid(req.user._id, req.body);
      return ApiResponse.success(res, result, result.message, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/bids/listing/:listingId
   * @desc    Get public transparent bid history for an auction
   * @access  Public
   */
  static async getListingBids(req, res, next) {
    try {
      const bids = await BidService.getListingBids(req.params.listingId);
      return ApiResponse.success(res, bids, 'Public bid history retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/bids/my
   * @desc    Get all bids placed by the logged-in student
   * @access  Private
   */
  static async getMyBids(req, res, next) {
    try {
      const bids = await BidService.getMyBids(req.user._id);
      return ApiResponse.success(res, bids, 'Your bid history retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BidController;
