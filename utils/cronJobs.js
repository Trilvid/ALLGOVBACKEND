const cron = require('node-cron');
const { TaxSubscription } = require('../models/TaxPayment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

class CronJobs {
  // Check for expiring subscriptions (runs daily at 9 AM)
  static checkExpiringSubscriptions() {
    cron.schedule('0 9 * * *', async () => {
      try {
        console.log('Checking for expiring subscriptions...');

        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        // Find subscriptions expiring in 3 days
        const expiringSoon3Days = await TaxSubscription.find({
          status: 'Active',
          expiryDate: {
            $gte: new Date(),
            $lte: threeDaysFromNow
          }
        });

        // Find subscriptions expiring in 7 days
        const expiringSoon7Days = await TaxSubscription.find({
          status: 'Active',
          expiryDate: {
            $gte: threeDaysFromNow,
            $lte: sevenDaysFromNow
          }
        });

        // Send notifications for 3 days
        for (const subscription of expiringSoon3Days) {
          await notificationService.subscriptionExpiringSoon(
            subscription.userId,
            subscription.name,
            3
          );
        }

        // Send notifications for 7 days
        for (const subscription of expiringSoon7Days) {
          await notificationService.subscriptionExpiringSoon(
            subscription.userId,
            subscription.name,
            7
          );
        }

        console.log(`Sent expiration reminders for ${expiringSoon3Days.length + expiringSoon7Days.length} subscriptions`);
      } catch (error) {
        console.error('Error checking expiring subscriptions:', error);
      }
    });
  }

  // Check and update expired subscriptions (runs daily at midnight)
  static updateExpiredSubscriptions() {
    cron.schedule('0 0 * * *', async () => {
      try {
        console.log('Updating expired subscriptions...');

        const result = await TaxSubscription.updateMany(
          {
            status: 'Active',
            expiryDate: { $lt: new Date() }
          },
          {
            status: 'Expired'
          }
        );

        // Find newly expired subscriptions and send notifications
        const expiredSubscriptions = await TaxSubscription.find({
          status: 'Expired',
          expiryDate: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            $lt: new Date()
          }
        });

        for (const subscription of expiredSubscriptions) {
          await notificationService.subscriptionExpired(
            subscription.userId,
            subscription.name
          );
        }

        console.log(`Updated ${result.modifiedCount} expired subscriptions`);
      } catch (error) {
        console.error('Error updating expired subscriptions:', error);
      }
    });
  }

  // Auto-renew subscriptions (runs daily at 1 AM)
  static autoRenewSubscriptions() {
    cron.schedule('0 1 * * *', async () => {
      try {
        console.log('Processing auto-renewals...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find subscriptions that should be auto-renewed today
        const subscriptionsToRenew = await TaxSubscription.find({
          status: 'Active',
          autoRenew: true,
          nextPaymentDate: {
            $gte: today,
            $lt: tomorrow
          }
        });

        let successCount = 0;
        let failCount = 0;

        for (const subscription of subscriptionsToRenew) {
          const user = await User.findById(subscription.userId);
          
          if (!user) continue;

          // Check if user has sufficient balance
          if (user.balance >= subscription.amount) {
            // Deduct amount
            user.balance -= subscription.amount;

            // Add transaction
            await user.addTransaction({
              amount: subscription.amount,
              type: 'Tax Payment',
              status: 'completed',
              reference: `AUTO-${Date.now()}`,
              description: `Auto-renewal: ${subscription.name}`
            });

            // Update subscription
            subscription.lastPaymentDate = new Date();
            subscription.totalPaid += subscription.amount;
            subscription.calculateNextPayment();
            subscription.paymentHistory.push({
              amount: subscription.amount,
              date: new Date(),
              status: 'completed',
              reference: `AUTO-${Date.now()}`
            });

            await subscription.save();
            await user.save();

            // Send success notification
            await notificationService.autoRenewalSuccessful(
              user._id,
              subscription.name,
              subscription.amount
            );

            successCount++;
          } else {
            // Insufficient balance - send notification
            await notificationService.lowWalletBalance(
              user._id,
              subscription.amount
            );
            failCount++;
          }
        }

        console.log(`Auto-renewal completed: ${successCount} successful, ${failCount} failed`);
      } catch (error) {
        console.error('Error processing auto-renewals:', error);
      }
    });
  }

  // Check for low wallet balances (runs daily at 10 AM)
  static checkLowBalances() {
    cron.schedule('0 10 * * *', async () => {
      try {
        console.log('Checking for low wallet balances...');

        const lowBalanceThreshold = 5000; // ₦5,000

        const users = await User.find({
          balance: { $lt: lowBalanceThreshold, $gt: 0 },
          accountStatus: 'active'
        });

        for (const user of users) {
          await notificationService.lowWalletBalance(user._id, user.balance);
        }

        console.log(`Sent low balance alerts to ${users.length} users`);
      } catch (error) {
        console.error('Error checking low balances:', error);
      }
    });
  }

  // Clean up old notifications (runs weekly on Sunday at 2 AM)
  static cleanupOldNotifications() {
    cron.schedule('0 2 * * 0', async () => {
      try {
        console.log('Cleaning up old notifications...');

        const result = await Notification.deleteOldNotifications(30); // Delete read notifications older than 30 days

        console.log(`Deleted ${result.deletedCount} old notifications`);
      } catch (error) {
        console.error('Error cleaning up notifications:', error);
      }
    });
  }

  // Send KYC reminders (runs daily at 11 AM)
  static sendKYCReminders() {
    cron.schedule('0 11 * * *', async () => {
      try {
        console.log('Sending KYC reminders...');

        // Find users with pending KYC who registered more than 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const users = await User.find({
          'kyc.status': 'pending',
          createdAt: { $lt: sevenDaysAgo },
          accountStatus: 'active'
        });

        for (const user of users) {
          await notificationService.kycPendingReminder(user._id);
        }

        console.log(`Sent KYC reminders to ${users.length} users`);
      } catch (error) {
        console.error('Error sending KYC reminders:', error);
      }
    });
  }

  // Initialize all cron jobs
  static initializeAll() {
    console.log('Initializing cron jobs...');
    
    this.checkExpiringSubscriptions();
    this.updateExpiredSubscriptions();
    this.autoRenewSubscriptions();
    this.checkLowBalances();
    this.cleanupOldNotifications();
    this.sendKYCReminders();

    console.log('All cron jobs initialized');
  }
}

module.exports = CronJobs;