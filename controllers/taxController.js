const User = require('../models/User');
const { TaxPayment, TaxSubscription } = require('../models/TaxPayment');
const paystackService = require('../services/paystackService');
const { generateReference, generateTransactionId } = require('../utils/helpers');

// ✅ HELPER FUNCTION: Auto-create subscription for recurring payment plans
async function createAutoSubscription(userId, taxType, amount, paymentPlan, taxPaymentId) {
  try {
    console.log(`🔄 Checking subscription creation for ${taxType} - ${paymentPlan}`);

    const recurringPlans = ['Monthly', 'Quarterly', 'Annually'];

    if (!recurringPlans.includes(paymentPlan)) {
      console.log(`⏭️  One-time payment - no subscription created`);
      return null;
    }

    const normalizedPlan = paymentPlan.charAt(0).toUpperCase() + paymentPlan.slice(1).toLowerCase();
    const startDate = new Date();
    let expiryDate = new Date();

    switch (normalizedPlan) {
      case 'Monthly':
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        break;
      case 'Quarterly':
        expiryDate.setMonth(expiryDate.getMonth() + 3);
        break;
      case 'Annually':
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        break;
    }

    const existingSub = await TaxSubscription.findOne({
      userId,
      taxType,
      status: 'Active'
    });

    if (existingSub) {
      console.log(`✅ Updating existing subscription for ${taxType}`);
      existingSub.expiryDate = expiryDate;
      existingSub.lastPaymentDate = new Date();
      existingSub.totalPaid += amount;
      existingSub.paymentHistory.push({
        amount,
        date: new Date(),
        status: 'completed',
        reference: taxPaymentId
      });
      existingSub.calculateNextPayment();
      await existingSub.save();
      return existingSub;
    }

    const subscription = new TaxSubscription({
      userId,
      name: `${normalizedPlan} ${taxType} Tax`,
      taxType,
      amount,
      frequency: normalizedPlan,
      startDate,
      expiryDate,
      autoRenew: true,
      lastPaymentDate: new Date(),
      totalPaid: amount,
      paymentHistory: [{
        amount,
        date: new Date(),
        status: 'completed',
        reference: taxPaymentId
      }]
    });

    subscription.calculateNextPayment();
    await subscription.save();
    console.log(`✅ Created subscription: ${subscription.name}, autoRenew: ${subscription.autoRenew}`);
    return subscription;
  } catch (error) {
    console.error('❌ Subscription error:', error);
    return null;
  }
}

// @desc    Initialize tax payment
// @route   POST /api/tax/pay
// @access  Private
exports.initiateTaxPayment = async (req, res) => {
  try {
    const { taxType, paymentPlan, payFor, amount, beneficiaryInfo, taxLocation } = req.body;

    if (!taxType || !paymentPlan || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // ✅ Validate taxLocation
    if (!taxLocation || !taxLocation.state) {
      return res.status(400).json({
        success: false,
        message: 'Please provide tax payment location (state is required)'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const paymentMethod = req.body.paymentMethod || 'paystack';

    if (paymentMethod === 'wallet') {
      if (user.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }
    }

    const taxPayment = new TaxPayment({
      userId: user._id,
      taxPaymentId: generateTransactionId(),
      taxType,
      paymentPlan,
      payFor: payFor || 'Self',
      amount,
      reference: generateReference(),
      beneficiaryInfo: payFor === 'Others' ? beneficiaryInfo : null,
      taxLocation: {
        country: taxLocation.country || 'Nigeria',
        state: taxLocation.state,
        lga: taxLocation.lga || null,
        description: `${taxLocation.state} State ${taxType} Tax`
      }
    });

    await taxPayment.save();

    if (paymentMethod === 'wallet') {
      user.balance -= amount;

      await user.addTransaction({
        amount,
        type: 'tax payment',
        status: 'completed',
        reference: taxPayment.reference,
        description: `${taxType} tax payment`
      });

      taxPayment.status = 'completed';
      taxPayment.paidDate = new Date();
      await taxPayment.save();

      // ✅ Auto-create subscription
      await createAutoSubscription(user._id, taxType, amount, paymentPlan, taxPayment.taxPaymentId);

      return res.json({
        success: true,
        message: 'Tax payment successful',
        data: {
          taxPaymentId: taxPayment.taxPaymentId,
          reference: taxPayment.reference,
          amount: taxPayment.amount,
          balance: user.balance
        }
      });
    }

    const paymentData = {
      email: user.email,
      amount: amount * 100,
      reference: taxPayment.reference,
      callback_url: `${process.env.FRONTEND_URL}/tax/verify`,
      metadata: {
        userId: user._id.toString(),
        username: user.username,
        type: 'tax payment',
        taxType,
        taxPaymentId: taxPayment.taxPaymentId,
        paymentPlan
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

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
        reference: taxPayment.reference,
        taxPaymentId: taxPayment.taxPaymentId
      }
    });
  } catch (error) {
    console.error('Tax payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify tax payment
// @route   GET /api/tax/verify/:reference
// @access  Private
exports.verifyTaxPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const taxPayment = await TaxPayment.findOne({ reference });
    if (!taxPayment) {
      return res.status(404).json({
        success: false,
        message: 'Tax payment not found'
      });
    }

    if (taxPayment.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: taxPayment
      });
    }

    const verification = await paystackService.verifyTransaction(reference);

    if (!verification.status || verification.data.status !== 'success') {
      taxPayment.status = 'failed';
      await taxPayment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    taxPayment.status = 'completed';
    taxPayment.paidDate = new Date();
    await taxPayment.save();

    const user = await User.findById(taxPayment.userId);
    await user.addTransaction({
      amount: taxPayment.amount,
      type: 'tax payment',
      status: 'completed',
      reference: taxPayment.reference,
      description: `${taxPayment.taxType} tax payment`
    });

    // ✅ Auto-create subscription after Paystack verification
    await createAutoSubscription(
      taxPayment.userId,
      taxPayment.taxType,
      taxPayment.amount,
      taxPayment.paymentPlan,
      taxPayment.taxPaymentId
    );

    res.json({
      success: true,
      message: 'Tax payment verified successfully',
      data: taxPayment
    });
  } catch (error) {
    console.error('Verify tax payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// @desc    Get user tax payments
// @route   GET /api/tax/payments
// @access  Private
exports.getTaxPayments = async (req, res) => {
  try {
    const taxPayments = await TaxPayment.find({ userId: req.userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: taxPayments.length,
      data: taxPayments
    });
  } catch (error) {
    console.error('Get tax payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};



// @desc    Get single tax payment
// @route   GET /api/tax/payment/:id
// @access  Private
exports.getTaxPayment = async (req, res) => {
  try {
    const taxPayment = await TaxPayment.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!taxPayment) {
      return res.status(404).json({
        success: false,
        message: 'Tax payment not found'
      });
    }


    res.json({
      success: true,
      data: taxPayment
    });
  } catch (error) {
    console.error('Get tax payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create tax subscription
// @route   POST /api/tax/subscription
// @access  Private
exports.createSubscription = async (req, res) => {
  try {
    const { name, taxType, amount, frequency, autoRenew } = req.body;

    if (!name || !taxType || !amount || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate expiry date
    const startDate = new Date();
    let expiryDate = new Date();

    switch (frequency) {
      case 'Monthly':
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        break;
      case 'Quarterly':
        expiryDate.setMonth(expiryDate.getMonth() + 3);
        break;
      case 'Annually':
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        break;
    }

    const subscription = new TaxSubscription({
      userId: user._id,
      name,
      taxType,
      amount,
      frequency,
      startDate,
      expiryDate,
      autoRenew: autoRenew || false
    });

    subscription.calculateNextPayment();
    await subscription.save();

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user subscriptions
// @route   GET /api/tax/subscriptions
// @access  Private
exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await TaxSubscription.find({ userId: req.userId })
      .sort({ createdAt: -1 });

    // Update expired subscriptions
    for (let sub of subscriptions) {
      if (sub.isExpired() && sub.status === 'Active') {
        sub.status = 'Expired';
        await sub.save();
      }
    }

    res.json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update subscription
// @route   PUT /api/tax/subscription/:id
// @access  Private
exports.updateSubscription = async (req, res) => {
  try {
    const { status, autoRenew } = req.body;

    const subscription = await TaxSubscription.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (status) subscription.status = status;
    if (autoRenew !== undefined) subscription.autoRenew = autoRenew;

    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/tax/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    // Get spending statistics
    const taxPayments = await TaxPayment.find({
      userId: req.userId,
      status: 'completed'
    });

    // // Calculate statistics by payment method/type
    // const stats = {
    //   Transportation: { total: 0, percentage: 0 },
    //   Income: { total: 0, percentage: 0 },
    //   Property: { total: 0, percentage: 0 },
    //   Business: { total: 0, percentage: 0 },
    //   Vehicle: { total: 0, percentage: 0 }
    // };

    const totalSpent = taxPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // // Calculate by vehicle info type (simplified example)
    // // taxPayments.forEach(payment => {
    // //   if (payment.metadata?.vehicleInfo?.stickerId) {
    // //     stats.sticker.total += payment.amount;
    // //   } else if (payment.metadata?.vehicleInfo?.cardId) {
    // //     stats.card.total += payment.amount;
    // //   } else {
    // //     stats.other.total += payment.amount;
    // //   }
    // // });
    // taxPayments.forEach(payment => {
    //   if (payment.taxType?.Transportation) {
    //     stats.Transportation.total += payment.amount;
    //   } else if (payment.taxType?.Property) {
    //     stats.Property.total += payment.amount;
    //   } else {
    //     stats.other.total += payment.amount;
    //   }
    // });


    // // Calculate percentages
    // if (totalSpent > 0) {
    //   stats.sticker.percentage = Math.round((stats.sticker.total / totalSpent) * 100);
    //   stats.card.percentage = Math.round((stats.card.total / totalSpent) * 100);
    //   stats.other.percentage = Math.round((stats.other.total / totalSpent) * 100);
    // }

    const stats = {
      transportation: { total: 0, percentage: 0, label: 'Transportation' },
      property: { total: 0, percentage: 0, label: 'Property' },
      business: { total: 0, percentage: 0, label: 'Business' },
      income: { total: 0, percentage: 0, label: 'Income' },
      vehicle: { total: 0, percentage: 0, label: 'Vehicle' },
      others: { total: 0, percentage: 0, label: 'Other' }
    };

    taxPayments.forEach(payment => {
      const type = payment.taxType.toLowerCase();
      if (stats[type]) {
        stats[type].total += payment.amount;
        stats[type].percentage = Math.round((stats[type].total / totalSpent) * 100);
      } else {
        stats.others.total += payment.amount;
      }
    });

    // Get active subscriptions
    const activeSubscriptions = await TaxSubscription.find({
      userId: req.userId,
      status: 'Active'
    }).limit(4);

    // Get expiring soon subscriptions
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = await TaxSubscription.find({
      userId: req.userId,
      status: 'Active',
      expiryDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
    }).limit(2);

    // Get recent transactions
    const recentTransactions = taxPayments.slice(0, 5);

    res.json({
      success: true,
      data: {
        balance: user.balance,
        accountHolder: user.username,
        accountNumber: user.taxId,
        spendingStats: stats,
        totalSpent,
        activeSubscriptions,
        expiringSoon,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


exports.renewSubscription = async (req, res) => {
  try {
    const { paymentMethod, newExpiryDate } = req.body;
    const subscriptionId = req.params.id;

    const subscription = await TaxSubscription.findOne({
      _id: subscriptionId,
      userId: req.userId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (paymentMethod === 'wallet') {
      const user = await User.findById(req.userId);

      if (user.balance < subscription.amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }

      // Deduct from balance
      user.balance -= subscription.amount;

      // Add transaction
      await user.addTransaction({
        amount: subscription.amount,
        type: 'tax payment',
        status: 'completed',
        reference: `RENEW-${Date.now()}`,
        description: `Renewal: ${subscription.name}`
      });

      // Update subscription
      subscription.expiryDate = newExpiryDate;
      subscription.lastPaymentDate = new Date();
      subscription.calculateNextPayment();

      await subscription.save();
      await user.save();

      return res.json({
        success: true,
        message: 'Subscription renewed successfully',
        data: subscription
      });
    }

    res.status(400).json({
      success: false,
      message: 'Invalid payment method'
    });
  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// GET /api/admin/tax/revenue-by-state
exports.getTaxRevenueByState = async (req, res) => {
  try {
    const { startDate, endDate, taxType } = req.query;

    const pipeline = [
      {
        $match: {
          status: 'completed',
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          ...(taxType && { taxType })
        }
      },
      {
        $group: {
          _id: '$taxLocation.state',
          totalRevenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          averagePayment: { $avg: '$amount' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ];

    const stateRevenue = await TaxPayment.aggregate(pipeline);

    res.json({
      success: true,
      data: stateRevenue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/tax/payments-by-location
exports.getTaxPaymentsByLocation = async (req, res) => {
  try {
    const { state, lga, taxType, page = 1, limit = 20 } = req.query;

    const filter = {
      status: 'completed',
      ...(state && { 'taxLocation.state': state }),
      ...(lga && { 'taxLocation.lga': lga }),
      ...(taxType && { taxType })
    };

    const payments = await TaxPayment.find(filter)
      .populate('userId', 'username email taxId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await TaxPayment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};