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

    console.log('🔍 Verifying payment with reference:', reference);

    // Verify payment with Paystack
    const verification = await paystackService.verifyTransaction(reference);

    if (!verification.status) {
      console.error('❌ Paystack verification failed:', verification.message);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verification.message
      });
    }

    const paymentData = verification.data;
    console.log('✅ Paystack verification successful:', paymentData.status);

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      console.log('⚠️ Payment status is not success:', paymentData.status);
      return res.status(400).json({
        success: false,
        message: 'Payment was not successful',
        status: paymentData.status
      });
    }

    // Get user with explicit selection of balance field
    const user = await User.findById(req.userId).select('+balance +transaction');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('👤 User found:', user.email);
    console.log('💰 Current balance:', user.balance);

    // Find the transaction
    const transactionIndex = user.transaction.findIndex(t => t.reference === reference);
    
    if (transactionIndex === -1) {
      console.error('❌ Transaction not found with reference:', reference);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = user.transaction[transactionIndex];
    console.log('📝 Transaction found:', transaction.type, transaction.status);

    // Check if already processed (prevent duplicate processing)
    if (transaction.status === 'completed') {
      console.log('⚠️ Transaction already processed');
      return res.json({
        success: true,
        message: 'Payment already processed',
        data: {
          amount: transaction.amount,
          balance: user.balance,
          reference,
          transactionDate: transaction.date
        }
      });
    }

    // Calculate amount (convert from kobo to naira)
    const amount = paymentData.amount / 100;
    console.log('💵 Amount to add:', amount);

    // Store old balance for verification
    const oldBalance = user.balance || 0;
    console.log('📊 Old balance:', oldBalance);

    // Update transaction status
    user.transaction[transactionIndex].status = 'completed';
    user.transaction[transactionIndex].timestamp = new Date();
    
    // Update user balance - CRITICAL UPDATE
    user.balance = oldBalance + amount;
    console.log('📊 New balance should be:', user.balance);

    // Mark as modified to ensure Mongoose saves it
    user.markModified('transaction');
    user.markModified('balance');

    // Save to database
    await user.save();
    console.log('💾 User saved to database');

    // Verify the save worked by fetching again
    const verifyUser = await User.findById(req.userId).select('balance');
    console.log('✅ Verified balance in database:', verifyUser.balance);

    // Send notification
    try {
      await notificationService.walletFunded(user._id, amount);
      console.log('📬 Notification sent');
    } catch (notifError) {
      console.error('⚠️ Notification failed but payment successful:', notifError);
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        amount: amount,
        previousBalance: oldBalance,
        newBalance: verifyUser.balance,
        reference: reference,
        transactionDate: transaction.date
      }
    });
  } catch (error) {
    console.error('❌ Verify payment error:', error);
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
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = req.body;
    console.log('📨 Webhook received:', event.event);

    // Handle successful charge
    if (event.event === 'charge.success') {
      const { reference, metadata, amount, status } = event.data;

      console.log('💳 Processing successful charge:', reference);

      const user = await User.findById(metadata.userId);
      if (!user) {
        console.error('❌ User not found:', metadata.userId);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Find and update transaction
      const transactionIndex = user.transaction.findIndex(t => t.reference === reference);
      
      if (transactionIndex !== -1) {
        const transaction = user.transaction[transactionIndex];
        
        if (transaction.status === 'pending') {
          const amountInNaira = amount / 100;
          
          // Update transaction
          user.transaction[transactionIndex].status = 'completed';
          user.transaction[transactionIndex].timestamp = new Date();
          
          // Update balance
          const oldBalance = user.balance || 0;
          user.balance = oldBalance + amountInNaira;
          
          // Mark as modified
          user.markModified('transaction');
          user.markModified('balance');
          
          await user.save();
          
          console.log('✅ Webhook: Balance updated from', oldBalance, 'to', user.balance);
          
          // Send notification
          try {
            await notificationService.walletFunded(user._id, amountInNaira);
          } catch (notifError) {
            console.error('⚠️ Notification error:', notifError);
          }
        } else {
          console.log('⚠️ Transaction already processed');
        }
      } else {
        console.error('❌ Transaction not found:', reference);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook error:', error);
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