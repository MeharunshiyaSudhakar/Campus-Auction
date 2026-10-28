const express = require('express');
const router = express.Router();
const ListingController = require('../controllers/listingController');
const { protect } = require('../middleware/auth');

// Public listing browsing
router.get('/', ListingController.getAllListings);

// Protected routes (must be authenticated)
router.get('/my', protect, ListingController.getMyListings);
router.get('/needs-attention', protect, ListingController.getNeedsAttention);
router.post('/relist/:id', protect, ListingController.relistListing);
router.post('/', protect, ListingController.createListing);
router.get('/:id', ListingController.getListingById);
router.put('/:id', protect, ListingController.updateListing);
router.delete('/:id', protect, ListingController.cancelListing);

module.exports = router;
