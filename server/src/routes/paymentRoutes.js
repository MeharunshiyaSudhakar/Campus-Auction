const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Seller Payout Onboarding & Status
router.post('/payouts/onboard', protect, PaymentController.onboardSeller);
router.post('/payouts/dev-activate', protect, PaymentController.devActivateSeller);
router.get('/payouts/status', protect, PaymentController.getPayoutStatus);

// Payment Flow
router.post('/payments/order', protect, PaymentController.createOrder);
router.post('/payments/verify', protect, PaymentController.verifyPayment);
router.post('/payments/release', protect, PaymentController.releaseTransfer);
router.post('/payments/refund', protect, PaymentController.refundPayment);
router.post('/payments/webhook', PaymentController.handleWebhook);

module.exports = router;
