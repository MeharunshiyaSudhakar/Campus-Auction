const express = require('express');
const router = express.Router();
const QaController = require('../controllers/qaController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public listing questions (optional auth to identify seller or own questions)
router.get('/listing/:listingId', optionalAuth, QaController.getListingQuestions);

// Prospective buyer asks a question (requires login)
router.post('/listing/:listingId', protect, QaController.askQuestion);

// Seller answers a question (requires login)
router.put('/:questionId/answer', protect, QaController.answerQuestion);

module.exports = router;
