const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect); // All notification routes require authentication

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/:id/read', NotificationController.markAsRead);
router.post('/read-all', NotificationController.markAllAsRead);

module.exports = router;
