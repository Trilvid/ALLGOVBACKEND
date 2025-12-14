// ✅ CRON HTTP ENDPOINTS - For external cron services (cron-job.com, Railway, etc.)

const express = require('express');
const router = express.Router();
const CronJobs = require('../utils/CronJobs');

/**
 * These endpoints can be called by external cron services
 * like cron-job.com, Railway Cron, or any HTTP-based scheduler
 */

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Simple API key authentication for cron endpoints
const cronAuth = (req, res, next) => {
    const apiKey = req.headers['x-cron-api-key'] || req.query.api_key;
    const validApiKey = process.env.CRON_API_KEY || 'your-secret-cron-key-here';

    if (apiKey !== validApiKey) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid API key'
        });
    }

    next();
};

// ==========================================
// CRON ENDPOINTS
// ==========================================

/**
 * @desc    Check and send expiring subscription reminders
 * @route   GET /api/cron/check-expiring-subscriptions
 * @access  Protected (requires API key)
 * 
 * Usage: 
 * curl -H "x-cron-api-key: YOUR_KEY" https://yourapi.com/api/cron/check-expiring-subscriptions
 */
router.get('/check-expiring-subscriptions', cronAuth, async (req, res) => {
    try {
        console.log('🔔 [CRON] Checking expiring subscriptions...');

        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const { TaxSubscription } = require('../models/TaxPayment');
        const notificationService = require('../services/notificationService');

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

        // Send notifications
        for (const subscription of expiringSoon3Days) {
            await notificationService.subscriptionExpiringSoon(
                subscription.userId,
                subscription.name,
                3
            );
        }

        for (const subscription of expiringSoon7Days) {
            await notificationService.subscriptionExpiringSoon(
                subscription.userId,
                subscription.name,
                7
            );
        }

        const totalSent = expiringSoon3Days.length + expiringSoon7Days.length;
        console.log(`✅ Sent expiration reminders for ${totalSent} subscriptions`);

        res.json({
            success: true,
            message: `Sent expiration reminders for ${totalSent} subscriptions`,
            data: {
                expiring3Days: expiringSoon3Days.length,
                expiring7Days: expiringSoon7Days.length,
                total: totalSent
            }
        });
    } catch (error) {
        console.error('❌ Error checking expiring subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check expiring subscriptions',
            error: error.message
        });
    }
});

/**
 * @desc    Update expired subscriptions
 * @route   GET /api/cron/update-expired-subscriptions
 * @access  Protected (requires API key)
 */
router.get('/update-expired-subscriptions', cronAuth, async (req, res) => {
    try {
        console.log('⏰ [CRON] Updating expired subscriptions...');

        const { TaxSubscription } = require('../models/TaxPayment');
        const notificationService = require('../services/notificationService');

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
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                $lt: new Date()
            }
        });

        for (const subscription of expiredSubscriptions) {
            await notificationService.subscriptionExpired(
                subscription.userId,
                subscription.name
            );
        }

        console.log(`✅ Updated ${result.modifiedCount} expired subscriptions`);

        res.json({
            success: true,
            message: `Updated ${result.modifiedCount} expired subscriptions`,
            data: {
                updated: result.modifiedCount,
                notificationsSent: expiredSubscriptions.length
            }
        });
    } catch (error) {
        console.error('❌ Error updating expired subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update expired subscriptions',
            error: error.message
        });
    }
});

/**
 * @desc    Auto-renew subscriptions
 * @route   GET /api/cron/auto-renew
 * @access  Protected (requires API key)
 */
router.get('/auto-renew', cronAuth, async (req, res) => {
    try {
        console.log('🔄 [CRON] Processing auto-renewals...');

        const { TaxSubscription } = require('../models/TaxPayment');
        const User = require('../models/User');
        const notificationService = require('../services/notificationService');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

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

            if (user.balance >= subscription.amount) {
                user.balance -= subscription.amount;

                await user.addTransaction({
                    amount: subscription.amount,
                    type: 'Tax Payment',
                    status: 'completed',
                    reference: `AUTO-${Date.now()}`,
                    description: `Auto-renewal: ${subscription.name}`
                });

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

                await notificationService.autoRenewalSuccessful(
                    user._id,
                    subscription.name,
                    subscription.amount
                );

                successCount++;
            } else {
                await notificationService.lowWalletBalance(
                    user._id,
                    subscription.amount
                );
                failCount++;
            }
        }

        console.log(`✅ Auto-renewal completed: ${successCount} successful, ${failCount} failed`);

        res.json({
            success: true,
            message: `Auto-renewal completed: ${successCount} successful, ${failCount} failed`,
            data: {
                processed: subscriptionsToRenew.length,
                successful: successCount,
                failed: failCount
            }
        });
    } catch (error) {
        console.error('❌ Error processing auto-renewals:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process auto-renewals',
            error: error.message
        });
    }
});

/**
 * @desc    Check low wallet balances
 * @route   GET /api/cron/check-low-balances
 * @access  Protected (requires API key)
 */
router.get('/check-low-balances', cronAuth, async (req, res) => {
    try {
        console.log('💰 [CRON] Checking for low wallet balances...');

        const User = require('../models/User');
        const notificationService = require('../services/notificationService');

        const lowBalanceThreshold = 5000;

        const users = await User.find({
            balance: { $lt: lowBalanceThreshold, $gt: 0 },
            accountStatus: 'active'
        });

        for (const user of users) {
            await notificationService.lowWalletBalance(user._id, user.balance);
        }

        console.log(`✅ Sent low balance alerts to ${users.length} users`);

        res.json({
            success: true,
            message: `Sent low balance alerts to ${users.length} users`,
            data: {
                alertsSent: users.length
            }
        });
    } catch (error) {
        console.error('❌ Error checking low balances:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check low balances',
            error: error.message
        });
    }
});

/**
 * @desc    Send KYC reminders
 * @route   GET /api/cron/kyc-reminders
 * @access  Protected (requires API key)
 */
router.get('/kyc-reminders', cronAuth, async (req, res) => {
    try {
        console.log('📝 [CRON] Sending KYC reminders...');

        const User = require('../models/User');
        const notificationService = require('../services/notificationService');

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

        console.log(`✅ Sent KYC reminders to ${users.length} users`);

        res.json({
            success: true,
            message: `Sent KYC reminders to ${users.length} users`,
            data: {
                remindersSent: users.length
            }
        });
    } catch (error) {
        console.error('❌ Error sending KYC reminders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send KYC reminders',
            error: error.message
        });
    }
});

/**
 * @desc    Clean up old notifications
 * @route   GET /api/cron/cleanup-notifications
 * @access  Protected (requires API key)
 */
router.get('/cleanup-notifications', cronAuth, async (req, res) => {
    try {
        console.log('🧹 [CRON] Cleaning up old notifications...');

        const Notification = require('../models/Notification');

        const result = await Notification.deleteOldNotifications(30);

        console.log(`✅ Deleted ${result.deletedCount} old notifications`);

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} old notifications`,
            data: {
                deleted: result.deletedCount
            }
        });
    } catch (error) {
        console.error('❌ Error cleaning up notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clean up notifications',
            error: error.message
        });
    }
});

/**
 * @desc    Run all cron jobs (for testing)
 * @route   GET /api/cron/run-all
 * @access  Protected (requires API key)
 */
router.get('/run-all', cronAuth, async (req, res) => {
    try {
        console.log('🚀 [CRON] Running all cron jobs...');

        const results = {
            expiringSubscriptions: null,
            expiredSubscriptions: null,
            autoRenewals: null,
            lowBalances: null,
            kycReminders: null,
            cleanup: null
        };

        // Run all jobs sequentially
        try {
            const expiring = await fetch(`${req.protocol}://${req.get('host')}/api/cron/check-expiring-subscriptions?api_key=${process.env.CRON_API_KEY}`);
            results.expiringSubscriptions = await expiring.json();
        } catch (e) { results.expiringSubscriptions = { error: e.message }; }

        try {
            const expired = await fetch(`${req.protocol}://${req.get('host')}/api/cron/update-expired-subscriptions?api_key=${process.env.CRON_API_KEY}`);
            results.expiredSubscriptions = await expired.json();
        } catch (e) { results.expiredSubscriptions = { error: e.message }; }

        try {
            const renew = await fetch(`${req.protocol}://${req.get('host')}/api/cron/auto-renew?api_key=${process.env.CRON_API_KEY}`);
            results.autoRenewals = await renew.json();
        } catch (e) { results.autoRenewals = { error: e.message }; }

        try {
            const balances = await fetch(`${req.protocol}://${req.get('host')}/api/cron/check-low-balances?api_key=${process.env.CRON_API_KEY}`);
            results.lowBalances = await balances.json();
        } catch (e) { results.lowBalances = { error: e.message }; }

        try {
            const kyc = await fetch(`${req.protocol}://${req.get('host')}/api/cron/kyc-reminders?api_key=${process.env.CRON_API_KEY}`);
            results.kycReminders = await kyc.json();
        } catch (e) { results.kycReminders = { error: e.message }; }

        console.log('✅ All cron jobs completed');

        res.json({
            success: true,
            message: 'All cron jobs executed',
            results
        });
    } catch (error) {
        console.error('❌ Error running all cron jobs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to run all cron jobs',
            error: error.message
        });
    }
});

module.exports = router;