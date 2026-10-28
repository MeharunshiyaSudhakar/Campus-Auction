const QaService = require('../services/qaService');
const ApiResponse = require('../utils/apiResponse');

class QaController {
  /**
   * @route   POST /api/qa/listing/:listingId
   * @desc    Prospective buyer asks a question before bidding
   * @access  Private
   */
  static async askQuestion(req, res, next) {
    try {
      const question = await QaService.askQuestion(
        req.user._id,
        req.params.listingId,
        req.body.question
      );
      return ApiResponse.success(res, question, 'Question submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PUT /api/qa/:questionId/answer
   * @desc    Seller answers a question publicly
   * @access  Private (Seller only)
   */
  static async answerQuestion(req, res, next) {
    try {
      const question = await QaService.answerQuestion(
        req.user._id,
        req.params.questionId,
        req.body.answer
      );
      return ApiResponse.success(res, question, 'Answer published successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/qa/listing/:listingId
   * @desc    Get questions for a listing
   * @access  Public (Optional auth for remaining count)
   */
  static async getListingQuestions(req, res, next) {
    try {
      const userId = req.user ? req.user._id : null;
      const data = await QaService.getListingQuestions(req.params.listingId, userId);
      return ApiResponse.success(res, data, 'Questions retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = QaController;
