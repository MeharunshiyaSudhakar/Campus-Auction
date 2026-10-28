const express = require('express');
const router = express.Router();
const SellController = require('../controllers/sellController');
const { protect } = require('../middleware/auth');

// All sell guided flow endpoints are protected to authenticated students
router.post('/drafts', protect, SellController.startDraft);
router.get('/drafts/:id', protect, SellController.getDraft);
router.get('/drafts/:id/next', protect, SellController.getNextQuestion);
router.put('/drafts/:id/answer', protect, SellController.saveAnswer);
router.post('/drafts/:id/back', protect, SellController.goBack);
router.post('/drafts/:id/review', protect, SellController.getReview);
router.post('/drafts/:id/publish', protect, SellController.publishDraft);

module.exports = router;
