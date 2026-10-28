const AssistantService = require('../services/assistantService');
const ApiResponse = require('../utils/apiResponse');

class AssistantController {
  /**
   * @route   POST /api/assistant/chat
   * @desc    Interactive AI Chatbot assistant for student queries and bidding guidance
   * @access  Public / Optional Auth
   */
  static async handleChat(req, res, next) {
    try {
      const { message, history } = req.body;
      const result = await AssistantService.chat(message, history);
      return ApiResponse.success(res, result, 'AI assistant response generated', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AssistantController;
