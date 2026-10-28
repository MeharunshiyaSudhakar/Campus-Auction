const NotificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');

class NotificationController {
  /**
   * @route   GET /api/notifications
   * @desc    Get paginated notifications with unread count
   * @access  Private
   */
  static async getNotifications(req, res, next) {
    try {
      const data = await NotificationService.getUserNotifications(req.user._id, req.query);
      return ApiResponse.success(res, data, 'Notifications retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/notifications/unread-count
   * @desc    Get count of unread notifications
   * @access  Private
   */
  static async getUnreadCount(req, res, next) {
    try {
      const data = await NotificationService.getUnreadCount(req.user._id);
      return ApiResponse.success(res, data, 'Unread count retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PATCH /api/notifications/:id/read
   * @desc    Mark a single notification as read
   * @access  Private
   */
  static async markAsRead(req, res, next) {
    try {
      const notification = await NotificationService.markAsRead(req.params.id, req.user._id);
      return ApiResponse.success(res, notification, 'Notification marked as read', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/notifications/read-all
   * @desc    Mark all notifications for logged-in user as read
   * @access  Private
   */
  static async markAllAsRead(req, res, next) {
    try {
      const result = await NotificationService.markAllAsRead(req.user._id);
      return ApiResponse.success(res, result, 'All notifications marked as read', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;
