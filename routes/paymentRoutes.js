const express = require('express');
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  getTransactions,
  withdrawFunds
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Wallet Funding Routes
// @route   POST /api/payment/initialize
router.post('/initialize', protect, initializePayment);

// @route   GET /api/payment/verify/:reference
router.get('/verify/:reference', protect, verifyPayment);

// @route   GET /api/payment/transactions
router.get('/transactions', protect, getTransactions);

// @route   POST /api/payment/withdraw
router.post('/withdraw', protect, withdrawFunds);

// Webhook (no authentication needed - Paystack will send requests)
// @route   POST /api/payment/webhook
router.post('/webhook', paystackWebhook);

module.exports = router;