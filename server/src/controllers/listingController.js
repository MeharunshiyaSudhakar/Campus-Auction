const ListingService = require('../services/listingService');
const ApiResponse = require('../utils/apiResponse');

class ListingController {
  /**
   * @route   POST /api/listings
   * @desc    Create a new item auction listing
   * @access  Private
   */
  static async createListing(req, res, next) {
    try {
      const listing = await ListingService.createListing(req.user._id, req.body);
      return ApiResponse.success(res, listing, 'Auction listing created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/listings
   * @desc    Get all active listings (with query filters)
   * @access  Public
   */
  static async getAllListings(req, res, next) {
    try {
      const listings = await ListingService.getListings(req.query);
      return ApiResponse.success(res, listings, 'Listings fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/listings/:id
   * @desc    Get details of a single listing
   * @access  Public
   */
  static async getListingById(req, res, next) {
    try {
      const listing = await ListingService.getListingById(req.params.id);
      return ApiResponse.success(res, listing, 'Listing retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/listings/my
   * @desc    Get all listings created by current logged-in student
   * @access  Private
   */
  static async getMyListings(req, res, next) {
    try {
      const listings = await ListingService.getMyListings(req.user._id);
      return ApiResponse.success(res, listings, 'Your listings retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PUT /api/listings/:id
   * @desc    Edit a listing (locks price if bids exist)
   * @access  Private
   */
  static async updateListing(req, res, next) {
    try {
      const listing = await ListingService.updateListing(req.user._id, req.params.id, req.body);
      return ApiResponse.success(res, listing, 'Listing updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   DELETE /api/listings/:id
   * @desc    Cancel an auction listing
   * @access  Private
   */
  static async cancelListing(req, res, next) {
    try {
      const listing = await ListingService.cancelListing(req.user._id, req.params.id, req.body?.reason);
      return ApiResponse.success(res, listing, 'Listing cancelled successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/listings/needs-attention
   * @desc    Get listings that need attention (stale 0 bids, unsold, rejected)
   * @access  Private
   */
  static async getNeedsAttention(req, res, next) {
    try {
      const AlertService = require('../services/alertService');
      const items = await AlertService.getNeedsAttentionListings(req.user._id);
      return ApiResponse.success(res, items, 'Items needing attention retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/listings/relist/:id
   * @desc    Relist an old/unsold listing as a fresh auction
   * @access  Private
   */
  static async relistListing(req, res, next) {
    try {
      const AlertService = require('../services/alertService');
      const newListing = await AlertService.relistListing(req.user._id, req.params.id, req.body);
      return ApiResponse.success(res, newListing, 'Item relisted successfully as a new auction', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ListingController;
