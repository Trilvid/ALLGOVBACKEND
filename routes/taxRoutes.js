const express = require('express');
const router = express.Router();
const {
  initiateTaxPayment,
  verifyTaxPayment,
  getTaxPayments,
  getTaxPayment,
  createSubscription,
  getSubscriptions,
  updateSubscription,
  getDashboardStats,
  renewSubscription
} = require('../controllers/taxController');
const { protect } = require('../middleware/auth');
const {
  taxPaymentValidation,
  subscriptionValidation,
  validate
} = require('../middleware/validation');

// Tax Payment Routes
// @route   POST /api/tax/pay
router.post('/pay', protect, taxPaymentValidation, validate, initiateTaxPayment);

// @route   GET /api/tax/verify/:reference
router.get('/verify/:reference', protect, verifyTaxPayment);

// @route   GET /api/tax/payments
router.get('/payments', protect, getTaxPayments);

// @route   GET /api/tax/payment/:id
router.get('/payment/:id', protect, getTaxPayment);

// Tax Subscription Routes
// @route   POST /api/tax/subscription
router.post('/subscription', protect, subscriptionValidation, validate, createSubscription);

// @route   GET /api/tax/subscriptions
router.get('/subscriptions', protect, getSubscriptions);

// @route   PUT /api/tax/subscription/:id
router.put('/subscription/:id', protect, updateSubscription);
router.post('/subscription/:id/renew', protect, renewSubscription);

// Dashboard Routes
// @route   GET /api/tax/dashboard/stats
router.get('/dashboard/stats', protect, getDashboardStats);

module.exports = router;