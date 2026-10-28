const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

// All profile endpoints are strictly protected to the authenticated owner
router.get('/selling', protect, ProfileController.getSellingHistory);
router.get('/buying', protect, ProfileController.getBuyingHistory);
router.get('/summary', protect, ProfileController.getSummary);
router.get('/chart', protect, ProfileController.getChartData);

module.exports = router;
