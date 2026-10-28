const DealMessage = require('../models/DealMessage');
const Deal = require('../models/Deal');
const { getIO } = require('../config/socket');

class DealChatService {
  /**
   * Send a private chat message between buyer and seller of an approved deal
   */
  static async sendMessage(dealId, senderId, text) {
    if (!text || !text.trim()) {
      const error = new Error('Message text cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    if (text.trim().length > 1000) {
      const error = new Error('Message cannot exceed 1000 characters');
      error.statusCode = 400;
      throw error;
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    // Authorization: only the two parties of the deal can chat
    const isBuyer = deal.buyer.toString() === senderId.toString();
    const isSeller = deal.seller.toString() === senderId.toString();
    if (!isBuyer && !isSeller) {
      const error = new Error('Forbidden: You are not authorized to message in this deal');
      error.statusCode = 403;
      throw error;
    }

    // Chat opens only after approval
    const allowedStatuses = [
      'approved',
      'details_shared',
      'payment_pending',
      'payment_confirmed',
      'pickup_scheduled',
      'shipped',
      'completed',
    ];
    if (!allowedStatuses.includes(deal.status)) {
      const error = new Error(`Chat is closed for this deal (status: ${deal.status})`);
      error.statusCode = 400;
      throw error;
    }

    const message = await DealMessage.create({
      deal: dealId,
      sender: senderId,
      text: text.trim(),
    });

    await message.populate('sender', 'name');

    // Broadcast in real-time to Socket.io deal room if active
    try {
      const io = getIO();
      if (io) {
        io.to(`deal:${dealId}`).emit('deal_message', message);
      }
    } catch (e) {
      // Socket broadcast failure shouldn't block REST response
      console.warn('[DealChat] Socket broadcast note:', e.message);
    }

    return message;
  }

  /**
   * Get all messages for a deal with safety banner
   */
  static async getMessages(dealId, userId) {
    const deal = await Deal.findById(dealId);
    if (!deal) {
      const error = new Error('Deal not found');
      error.statusCode = 404;
      throw error;
    }

    // Authorization: only parties to the deal can read messages
    const isBuyer = deal.buyer.toString() === userId.toString();
    const isSeller = deal.seller.toString() === userId.toString();
    if (!isBuyer && !isSeller) {
      const error = new Error('Forbidden: You are not authorized to view messages for this deal');
      error.statusCode = 403;
      throw error;
    }

    const messages = await DealMessage.find({ deal: dealId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name');

    return {
      dealId,
      status: deal.status,
      safetyBanner: 'Safety Note: Never share passwords or OTPs. Pay only after inspecting and confirming the item.',
      messages,
    };
  }
}

module.exports = DealChatService;
