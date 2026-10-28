const Question = require('../models/Question');
const Listing = require('../models/Listing');
const Notification = require('../models/Notification');

class QaService {
  /**
   * Prospective student asks a public question before bidding
   * Enforces spam protection and a max rate limit of 3 questions per student per listing
   */
  static async askQuestion(askerId, listingId, questionText) {
    if (!questionText || typeof questionText !== 'string' || questionText.trim().length < 5) {
      const error = new Error('Question must be at least 5 characters long');
      error.statusCode = 400;
      throw error;
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    if (listing.status !== 'active') {
      const error = new Error('Questions can only be asked on active listings');
      error.statusCode = 400;
      throw error;
    }

    if (listing.seller.toString() === askerId.toString()) {
      const error = new Error('Sellers cannot ask questions on their own listing');
      error.statusCode = 403;
      throw error;
    }

    // Rate Limit Guard: max 3 questions per student on this listing
    const userQuestionCount = await Question.countDocuments({
      listing: listingId,
      asker: askerId,
    });

    if (userQuestionCount >= 3) {
      const error = new Error(
        'Rate limit reached: You can ask a maximum of 3 questions per listing to prevent spam'
      );
      error.statusCode = 429;
      throw error;
    }

    // Basic content filtering (detect external links or contact info)
    const urlPattern = /(https?:\/\/|www\.|\.com|\.in|\.org|\.io)/i;
    if (urlPattern.test(questionText)) {
      const error = new Error('For security, external links are not allowed in Q&A');
      error.statusCode = 400;
      throw error;
    }

    const question = await Question.create({
      listing: listingId,
      asker: askerId,
      seller: listing.seller,
      question: questionText.trim(),
    });

    await question.populate('asker', 'name');

    // Notify Seller
    await Notification.create({
      user: listing.seller,
      type: 'qa_question',
      title: 'New Question on Your Listing',
      message: `A student asked: "${questionText.trim().slice(0, 70)}..." on "${listing.title}"`,
      listing: listing._id,
    });

    // Real-Time Socket Broadcast
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to(`auction:${listingId}`).emit('new_question', {
        listingId,
        question: {
          _id: question._id,
          question: question.question,
          asker: { _id: askerId, name: question.asker.name },
          isAnswered: false,
          createdAt: question.createdAt,
        },
      });
    } catch (e) {
      // Socket not initialized in tests/CLI
    }

    return question;
  }

  /**
   * Seller answers a prospective buyer's question
   * Once answered, question and answer appear publicly for all students
   */
  static async answerQuestion(sellerId, questionId, answerText) {
    if (!answerText || typeof answerText !== 'string' || answerText.trim().length < 2) {
      const error = new Error('Answer must be at least 2 characters long');
      error.statusCode = 400;
      throw error;
    }

    const question = await Question.findById(questionId).populate('listing', 'title');
    if (!question) {
      const error = new Error('Question not found');
      error.statusCode = 404;
      throw error;
    }

    if (question.seller.toString() !== sellerId.toString()) {
      const error = new Error('Forbidden: Only the seller can answer questions on this listing');
      error.statusCode = 403;
      throw error;
    }

    question.answer = answerText.trim();
    question.isAnswered = true;
    question.answeredAt = new Date();
    await question.save();

    await question.populate('asker', 'name');

    // Notify Asker
    await Notification.create({
      user: question.asker._id,
      type: 'qa_answered',
      title: 'Seller Answered Your Question',
      message: `The seller replied: "${answerText.trim().slice(0, 70)}..." on "${question.listing?.title}"`,
      listing: question.listing?._id,
    });

    // Real-Time Socket Broadcast
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to(`auction:${question.listing._id}`).emit('question_answered', {
        listingId: question.listing._id.toString(),
        questionId: question._id.toString(),
        answer: question.answer,
        answeredAt: question.answeredAt,
      });
    } catch (e) {
      // Socket not initialized in tests/CLI
    }

    return question;
  }

  /**
   * Get all public answered Q&A for a listing
   * If current viewer is the seller, also include unanswered questions so they can reply
   */
  static async getListingQuestions(listingId, currentUserId = null) {
    const listing = await Listing.findById(listingId).select('seller');
    if (!listing) {
      const error = new Error('Listing not found');
      error.statusCode = 404;
      throw error;
    }

    const isSeller = currentUserId && listing.seller.toString() === currentUserId.toString();

    let filter;
    if (isSeller) {
      // Seller sees all questions (answered + pending response)
      filter = { listing: listingId, isSpam: false };
    } else if (currentUserId) {
      // Buyer sees all answered questions PLUS their own unanswered questions
      filter = {
        listing: listingId,
        isSpam: false,
        $or: [{ isAnswered: true }, { asker: currentUserId }],
      };
    } else {
      // Anonymous public sees only answered questions
      filter = { listing: listingId, isAnswered: true, isSpam: false };
    }

    const questions = await Question.find(filter)
      .sort({ createdAt: -1 })
      .populate('asker', 'name');

    // Count questions already asked by this user to communicate rate limit
    let askedCount = 0;
    if (currentUserId) {
      askedCount = await Question.countDocuments({
        listing: listingId,
        asker: currentUserId,
      });
    }

    return {
      questions,
      askedCount,
      remainingCount: Math.max(0, 3 - askedCount),
      isSeller,
    };
  }
}

module.exports = QaService;
