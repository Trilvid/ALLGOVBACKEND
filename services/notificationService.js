const Notification = require('../models/Notification');

class NotificationService {
  // Payment successful notification
  async paymentSuccessful(userId, amount, taxType) {
    return await Notification.createNotification(userId, {
      title: 'Payment Successful',
      message: `Your tax payment for ${taxType} of ₦${amount.toLocaleString()} was successful`,
      type: 'success',
      category: 'payment',
      metadata: {
        amount,
        taxType
      }
    });
  }

  // Payment failed notification
  async paymentFailed(userId, amount) {
    return await Notification.createNotification(userId, {
      title: 'Payment Failed',
      message: `Your payment attempt of ₦${amount.toLocaleString()} failed. Please try again.`,
      type: 'error',
      category: 'payment',
      metadata: {
        amount
      }
    });
  }

  // Wallet funded notification
  async walletFunded(userId, amount) {
    return await Notification.createNotification(userId, {
      title: 'Wallet Funded',
      message: `₦${amount.toLocaleString()} has been added to your wallet.`,
      type: 'success',
      category: 'payment',
      metadata: {
        amount
      }
    });
  }

  // Payment from wallet notification
  async paymentFromWallet(userId, amount, taxType) {
    return await Notification.createNotification(userId, {
      title: 'Payment Made from Wallet',
      message: `₦${amount.toLocaleString()} was deducted from your wallet for ${taxType}.`,
      type: 'info',
      category: 'payment',
      metadata: {
        amount,
        taxType
      }
    });
  }

  // Low wallet balance notification
  async lowWalletBalance(userId, balance) {
    return await Notification.createNotification(userId, {
      title: 'Low Wallet Balance',
      message: `Your wallet balance is below ₦${balance.toLocaleString()}.`,
      type: 'warning',
      category: 'payment'
    });
  }

  // Subscription expiring soon notification
  async subscriptionExpiringSoon(userId, subscriptionName, daysLeft) {
    return await Notification.createNotification(userId, {
      title: 'Upcoming Tax Due Date',
      message: `Your ${subscriptionName} will expire in ${daysLeft} days`,
      type: 'warning',
      category: 'subscription',
      metadata: {
        subscriptionName,
        daysLeft
      }
    });
  }

  // Subscription expired notification
  async subscriptionExpired(userId, subscriptionName) {
    return await Notification.createNotification(userId, {
      title: 'Subscription Expired',
      message: `Your ${subscriptionName} has expired. Renew to stay compliant.`,
      type: 'error',
      category: 'subscription',
      metadata: {
        subscriptionName
      }
    });
  }

  // Auto-renewal successful notification
  async autoRenewalSuccessful(userId, subscriptionName, amount) {
    return await Notification.createNotification(userId, {
      title: 'Auto-Renewal Successful',
      message: `Your ${subscriptionName} was auto-renewed using your wallet balance.`,
      type: 'success',
      category: 'subscription',
      metadata: {
        subscriptionName,
        amount
      }
    });
  }

  // Overdue payment alert notification
  async overduePaymentAlert(userId, taxType) {
    return await Notification.createNotification(userId, {
      title: 'Overdue Payment Alert',
      message: `Your ${taxType} is overdue. Penalties may apply.`,
      type: 'error',
      category: 'tax',
      metadata: {
        taxType
      }
    });
  }

  // KYC verification notifications
  async kycSubmitted(userId) {
    return await Notification.createNotification(userId, {
      title: 'KYC Documents Submitted',
      message: 'Your KYC documents have been submitted for verification.',
      type: 'info',
      category: 'kyc'
    });
  }

  async kycVerified(userId) {
    return await Notification.createNotification(userId, {
      title: 'KYC Verified',
      message: 'Your KYC verification was successful!',
      type: 'success',
      category: 'kyc'
    });
  }

  async kycRejected(userId, reason) {
    return await Notification.createNotification(userId, {
      title: 'KYC Verification Failed',
      message: `Your KYC verification was rejected. Reason: ${reason}`,
      type: 'error',
      category: 'kyc',
      metadata: {
        reason
      }
    });
  }

  async kycPendingReminder(userId) {
    return await Notification.createNotification(userId, {
      title: 'Please Complete Your KYC',
      message: 'Complete your KYC verification to unlock all features.',
      type: 'warning',
      category: 'kyc'
    });
  }

  // Security notifications
  async passwordChanged(userId) {
    return await Notification.createNotification(userId, {
      title: 'Password Changed',
      message: 'Your password was successfully changed.',
      type: 'success',
      category: 'security'
    });
  }

  async twoFactorEnabled(userId) {
    return await Notification.createNotification(userId, {
      title: '2 Factor Authentication Enabled',
      message: '2 factor authentication was successfully set-up',
      type: 'success',
      category: 'security'
    });
  }

  async loginFromNewDevice(userId, device, location) {
    return await Notification.createNotification(userId, {
      title: 'New Login Detected',
      message: `Login detected from ${device} in ${location}`,
      type: 'warning',
      category: 'security',
      metadata: {
        device,
        location
      }
    });
  }

  // Transaction code changed notification
  async transactionCodeChanged(userId) {
    return await Notification.createNotification(userId, {
      title: 'Transaction Code Changed',
      message: 'You successfully updated your transaction code.',
      type: 'success',
      category: 'security'
    });
  }

  // Account deactivation warning
  async accountDeactivationWarning(userId) {
    return await Notification.createNotification(userId, {
      title: 'Account Deactivation Warning',
      message: 'Your account will be deactivated due to inactivity.',
      type: 'warning',
      category: 'system'
    });
  }
}

module.exports = new NotificationService();