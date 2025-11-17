const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// @route   GET /api/notifications
router.get('/', protect, getNotifications);

// @route   GET /api/notifications/unread-count
router.get('/unread-count', protect, getUnreadCount);

// @route   PUT /api/notifications/:id/read
router.put('/:id/read', protect, markAsRead);

// @route   PUT /api/notifications/mark-all-read
router.put('/mark-all-read', protect, markAllAsRead);

// @route   DELETE /api/notifications/:id
router.delete('/:id', protect, deleteNotification);

// @route   DELETE /api/notifications/clear-all
router.delete('/clear-all', protect, clearAllNotifications);

module.exports = router;