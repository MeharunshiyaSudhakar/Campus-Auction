const ProfileService = require('../services/profileService');
const ApiResponse = require('../utils/apiResponse');

class ProfileController {
  /**
   * @route   GET /api/profile/:userId
   * @desc    Get student's public Instagram-style profile (name, stats: posts, reels, reposts, engagement)
   * @access  Public (Zero private info leaked)
   */
  static async getPublicProfile(req, res, next) {
    try {
      const profile = await ProfileService.getPublicProfile(req.params.userId);
      return ApiResponse.success(res, profile, 'Public profile retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/profile/:userId/posts
   * @desc    Get student's public listing posts
   * @access  Public
   */
  static async getUserPosts(req, res, next) {
    try {
      const posts = await ProfileService.getUserPosts(req.params.userId, req.query);
      return ApiResponse.success(res, posts, 'Posts retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/profile/:userId/reposts
   * @desc    Get student's public reshared/reposted auctions
   * @access  Public
   */
  static async getUserReposts(req, res, next) {
    try {
      const reposts = await ProfileService.getUserReposts(req.params.userId, req.query);
      return ApiResponse.success(res, reposts, 'Reposts retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/profile/:userId/reels
   * @desc    Get student's item condition demo reels
   * @access  Public
   */
  static async getUserReels(req, res, next) {
    try {
      const reels = await ProfileService.getUserReels(req.params.userId);
      return ApiResponse.success(res, reels, 'Reels retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/profile/reels
   * @desc    Create a short item condition demo clip (up to 60s)
   * @access  Private (Seller only)
   */
  static async createReel(req, res, next) {
    try {
      const reel = await ProfileService.createReel(req.user._id, req.body);
      return ApiResponse.success(res, reel, 'Condition demo reel posted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/listings/:id/repost
   * @desc    Reshare or un-reshare an auction to profile
   * @access  Private
   */
  static async toggleRepost(req, res, next) {
    try {
      const result = await ProfileService.toggleRepost(req.user._id, req.params.id);
      return ApiResponse.success(res, result, result.reposted ? 'Auction reposted to profile' : 'Auction removed from reposts', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/listings/:id/repost-status
   * @desc    Check if authenticated user reposted this listing
   * @access  Private
   */
  static async checkRepostStatus(req, res, next) {
    try {
      const reposted = await ProfileService.hasUserReposted(req.user._id, req.params.id);
      return ApiResponse.success(res, { reposted }, 'Repost status checked', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/profile/engagement
   * @desc    Get owner's detailed engagement stats (views, bids received, questions answered)
   * @access  Private (Owner only)
   */
  static async getOwnerEngagement(req, res, next) {
    try {
      const engagement = await ProfileService.getOwnerEngagement(req.user._id);
      return ApiResponse.success(res, engagement, 'Engagement metrics retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

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
