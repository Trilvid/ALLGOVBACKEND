const User = require('../models/User');
const paystackService = require('../services/paystackService');
const { generateReference } = require('../utils/helpers');
const notificationService = require('../services/notificationService');

// @desc    Initialize payment
// @route   POST /api/payment/initialize
// @access  Private
exports.initializePayment = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid amount'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate unique reference
    const reference = generateReference();

    // Initialize Paystack payment
    const paymentData = {
      email: user.email,
      amount: amount * 100, // Convert to kobo (Paystack uses smallest currency unit)
      reference: reference,
      callback_url: `${process.env.FRONTEND_URL}/payment/verify`,
      metadata: {
        userId: user._id.toString(),
        username: user.username,
        type: 'deposit'
      }
    };

    const paystackResponse = await paystackService.initializeTransaction(paymentData);

    if (!paystackResponse.status) {
      return res.status(400).json({
        success: false,
        message: 'Failed to initialize payment',
        error: paystackResponse.message
      });
    }

    // Create pending transaction
    await user.addTransaction({
      amount,
      type: 'deposit',
      status: 'pending',
      reference: reference,
      description: 'Wallet funding via Paystack'
    });

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
        reference: reference
      }
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify payment
// @route   GET /api/payment/verify/:reference
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    // Verify payment with Paystack
    const verification = await paystackService.verifyTransaction(reference);

    if (!verification.status) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verification.message
      });
    }

    const paymentData = verification.data;

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment was not successful',
        status: paymentData.status
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the transaction
    const transaction = user.transaction.find(t => t.reference === reference);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if already processed
    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already processed',
        data: {
          amount: transaction.amount,
          balance: user.balance
        }
      });
    }

    // Update transaction status
    transaction.status = 'completed';
    
    // Update user balance
    const amount = paymentData.amount / 100; // Convert from kobo to naira
    user.balance += amount;

    await user.save();

    // Send notification
    await notificationService.walletFunded(user._id, amount);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        amount: amount,
        balance: user.balance,
        reference: reference,
        transactionDate: transaction.date
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Paystack webhook
// @route   POST /api/payment/webhook
// @access  Public (but verified)
exports.paystackWebhook = async (req, res) => {
  try {
    const hash = require('crypto')
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = req.body;

    // Handle successful charge
    if (event.event === 'charge.success') {
      const { reference, metadata, amount, status } = event.data;

      const user = await User.findById(metadata.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Find and update transaction
      const transaction = user.transaction.find(t => t.reference === reference);
      if (transaction && transaction.status === 'pending') {
        transaction.status = 'completed';
        user.balance += amount / 100;
        await user.save();
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};

// @desc    Get all transactions
// @route   GET /api/payment/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('transaction');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Sort transactions by timestamp (newest first)
    const sortedTransactions = user.transaction.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json({
      success: true,
      count: sortedTransactions.length,
      transactions: sortedTransactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Withdraw funds
// @route   POST /api/payment/withdraw
// @access  Private
exports.withdrawFunds = async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid amount'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    const reference = generateReference();

    // Create withdrawal transaction
    await user.addTransaction({
      amount,
      type: 'withdrawal',
      status: 'pending',
      reference: reference,
      description: 'Withdrawal request'
    });

    // Deduct from balance
    user.balance -= amount;
    await user.save();

    // Here you would typically integrate with Paystack Transfer API
    // For now, we'll just create the transaction

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        reference: reference,
        amount: amount,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};