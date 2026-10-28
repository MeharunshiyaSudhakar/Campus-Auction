const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

// Owner-Only Private Endpoints (strictly protected to the authenticated owner)
router.get('/selling', protect, ProfileController.getSellingHistory);
router.get('/buying', protect, ProfileController.getBuyingHistory);
router.get('/summary', protect, ProfileController.getSummary);
router.get('/chart', protect, ProfileController.getChartData);
router.get('/engagement', protect, ProfileController.getOwnerEngagement);
router.post('/reels', protect, ProfileController.createReel);

// Public Instagram-Style Student Profile Endpoints (Zero private leaks)
router.get('/:userId', ProfileController.getPublicProfile);
router.get('/:userId/posts', ProfileController.getUserPosts);
router.get('/:userId/reposts', ProfileController.getUserReposts);
router.get('/:userId/reels', ProfileController.getUserReels);

module.exports = router;
