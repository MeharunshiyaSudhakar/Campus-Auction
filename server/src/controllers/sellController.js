const SellService = require('../services/sellService');
const ApiResponse = require('../utils/apiResponse');

class SellController {
  /**
   * @route   POST /api/sell/drafts
   * @desc    Start or resume a sell draft
   * @access  Private
   */
  static async startDraft(req, res, next) {
    try {
      const draft = await SellService.startDraft(req.user._id, req.body);
      return ApiResponse.success(res, draft, 'Sell draft initialized', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/sell/drafts/:id
   * @desc    Fetch a sell draft by ID
   * @access  Private
   */
  static async getDraft(req, res, next) {
    try {
      const draft = await SellService.getDraft(req.user._id, req.params.id);
      return ApiResponse.success(res, draft, 'Sell draft retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/sell/drafts/:id/next
   * @desc    Get the current question for the draft
   * @access  Private
   */
  static async getNextQuestion(req, res, next) {
    try {
      const result = await SellService.getNextQuestion(req.user._id, req.params.id);
      return ApiResponse.success(res, result, 'Next question retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PUT /api/sell/drafts/:id/answer
   * @desc    Save an answer to a question
   * @access  Private
   */
  static async saveAnswer(req, res, next) {
    try {
      const { key, value } = req.body;
      const result = await SellService.saveAnswer(req.user._id, req.params.id, { key, value });
      return ApiResponse.success(res, result, 'Answer saved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/sell/drafts/:id/back
   * @desc    Go back to the previous question
   * @access  Private
   */
  static async goBack(req, res, next) {
    try {
      const result = await SellService.goBack(req.user._id, req.params.id);
      return ApiResponse.success(res, result, 'Stepped back successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/sell/drafts/:id/review
   * @desc    Generate AI review (facts-only rephrase & category suggestions)
   * @access  Private
   */
  static async getReview(req, res, next) {
    try {
      const result = await SellService.generateReview(req.user._id, req.params.id);
      return ApiResponse.success(res, result, 'AI review generated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/sell/drafts/:id/publish
   * @desc    Validate and publish draft into a public Listing
   * @access  Private
   */
  static async publishDraft(req, res, next) {
    try {
      const listing = await SellService.publishDraft(req.user._id, req.params.id, req.body);
      return ApiResponse.success(res, listing, 'Auction published successfully!', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SellController;
