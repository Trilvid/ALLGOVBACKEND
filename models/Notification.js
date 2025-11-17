const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['success', 'warning', 'info', 'error'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['payment', 'subscription', 'kyc', 'security', 'system', 'tax'],
    default: 'system'
  },
  read: {
    type: Boolean,
    default: false
  },
  actionUrl: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for faster queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(userId, data) {
  return await this.create({
    userId,
    ...data
  });
};

// Static method to mark as read
notificationSchema.statics.markAsRead = async function(userId, notificationId) {
  return await this.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { userId, read: false },
    { read: true }
  );
};

// Static method to delete old notifications
notificationSchema.statics.deleteOldNotifications = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    read: true
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;