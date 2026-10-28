const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Get paginated notifications for logged-in student with unread counter
   */
  static async getUserNotifications(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { user: userId };
    if (query.unreadOnly === 'true' || query.unreadOnly === true) {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('listing', 'title category photos currentPrice finalPrice status'),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: userId, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    notification.isRead = true;
    await notification.save();

    return notification;
  }

  /**
   * Mark all notifications for user as read
   */
  static async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );

    return {
      success: true,
      markedCount: result.modifiedCount,
    };
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId) {
    const count = await Notification.countDocuments({ user: userId, isRead: false });
    return { unreadCount: count };
  }
}

module.exports = NotificationService;
