const express = require('express');
const router = express.Router();
const BidController = require('../controllers/bidController');
const { protect } = require('../middleware/auth');

// Public route: view public transparent bid history for an auction
router.get('/listing/:listingId', BidController.getListingBids);

// Protected routes (requires logged-in student)
router.post('/', protect, BidController.placeBid);
router.get('/my', protect, BidController.getMyBids);

module.exports = router;
