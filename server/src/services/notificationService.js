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

  /**
   * Deduplicated notification dispatcher with in-app socket & email alerts
   * @param {object} params
   * @param {string} params.user - Recipient user ID
   * @param {string} params.type - Notification enum type
   * @param {string} params.title - Alert headline
   * @param {string} params.message - Full message body
   * @param {string} [params.listing] - Related listing ID
   * @param {string} [params.link] - Action URL (e.g. '/needs-attention')
   * @param {string} [params.eventKey] - Unique deduplication key (e.g. `${listingId}_${type}`)
   */
  static async sendNotification({ user, type, title, message, listing = null, link = null, eventKey = null }) {
    if (eventKey) {
      const existing = await Notification.findOne({ eventKey });
      if (existing) {
        return { created: false, duplicate: true, notification: existing };
      }
    }

    let notif;
    try {
      notif = await Notification.create({
        user,
        type,
        title,
        message,
        listing,
        link,
        eventKey,
      });
    } catch (err) {
      if (err.code === 11000) {
        const existing = await Notification.findOne({ eventKey });
        return { created: false, duplicate: true, notification: existing };
      }
      throw err;
    }

    // 1. Socket.io Real-Time Dispatch to User Room
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to(`user:${user}`).emit('new_notification', notif);
    } catch (e) {
      // Socket not active in CLI/tests
    }

    // 2. Email Notification Dispatch
    try {
      const EmailService = require('./emailService');
      const User = require('../models/User');
      const recipient = await User.findById(user).select('email name');
      if (recipient && recipient.email) {
        await EmailService.sendAlertEmail(recipient.email, title, message, link);
      }
    } catch (emailErr) {
      console.warn('[NotificationService] Email alert warning:', emailErr.message);
    }

    return { created: true, notification: notif };
  }
}

module.exports = NotificationService;
