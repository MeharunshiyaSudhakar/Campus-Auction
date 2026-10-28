const ProfileService = require('../services/profileService');
const ApiResponse = require('../utils/apiResponse');

class ProfileController {
  /**
   * @route   GET /api/profile/selling
   * @desc    Get owner's selling history with outcome and final prices
   * @access  Private (Owner only via JWT)
   */
  static async getSellingHistory(req, res, next) {
    try {
      const history = await ProfileService.getSellingHistory(req.user._id, req.query);
      return ApiResponse.success(res, history, 'Selling history retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/profile/buying
   * @desc    Get owner's buying history with outcomes
   * @access  Private (Owner only via JWT)
   */
  static async getBuyingHistory(req, res, next) {
    try {
      const history = await ProfileService.getBuyingHistory(req.user._id, req.query);
      return ApiResponse.success(res, history, 'Buying history retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/profile/summary
   * @desc    Get total spent, total received, and pending balances
   * @access  Private (Owner only via JWT)
   */
  static async getSummary(req, res, next) {
    try {
      const summary = await ProfileService.getSummary(req.user._id, req.query);
      return ApiResponse.success(res, summary, 'Financial summary retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/profile/chart
   * @desc    Get time-series spending and earnings aggregation
   * @access  Private (Owner only via JWT)
   */
  static async getChartData(req, res, next) {
    try {
      const chart = await ProfileService.getChartData(req.user._id, req.query);
      return ApiResponse.success(res, chart, 'Chart data retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProfileController;
