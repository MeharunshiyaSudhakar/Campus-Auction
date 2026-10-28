const express = require('express');
const router = express.Router();
const DealController = require('../controllers/dealController');
const { protect } = require('../middleware/auth');

// All deal and deal chat routes require student authentication
router.use(protect);

router.post('/initialize/:listingId', DealController.initializeDeal);
router.get('/:id', DealController.getDealById);
router.post('/:id/choose-method', DealController.chooseMethod);
router.post('/:id/mark-paid', DealController.markPaid);
router.post('/:id/confirm-payment', DealController.confirmPayment);
router.post('/:id/courier', DealController.updateCourier);
router.post('/:id/schedule-pickup', DealController.schedulePickup);
router.post('/:id/complete', DealController.confirmCompleted);
router.post('/:id/outcome', DealController.recordOutcome);

// Module 16b: Deal Chat routes
router.post('/:id/chat', DealController.sendChatMessage);
router.get('/:id/chat', DealController.getChatMessages);

module.exports = router;
