const User = require('../models/User');
const { TaxPayment, TaxSubscription } = require('../models/TaxPayment');
const Notification = require('../models/Notification');

// ============================================
// PAYMENT MANAGEMENT
// ============================================

// @desc    Get all payments with filters
// @route   GET /api/admin/payments
// @access  Private/Admin
exports.getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      taxType = '',
      dateFilter = '',
      startDate = '',
      endDate = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Search by reference, tax ID, or user details
    if (search) {
      const users = await User.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { taxId: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const userIds = users.map(u => u._id);

      query.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { 'metadata.receiptNumber': { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by tax type
    if (taxType && taxType !== 'all') {
      query.taxType = taxType;
    }

    // Date filters
    const now = new Date();
    let dateQuery = {};

    if (dateFilter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      dateQuery = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
    } else if (dateFilter === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateQuery = { createdAt: { $gte: startOfWeek } };
    } else if (dateFilter === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateQuery = { createdAt: { $gte: startOfMonth } };
    } else if (dateFilter === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      dateQuery = { createdAt: { $gte: startOfYear } };
    } else if (dateFilter === 'custom' && startDate && endDate) {
      dateQuery = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59))
        }
      };
    }

    if (Object.keys(dateQuery).length > 0) {
      query = { ...query, ...dateQuery };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const payments = await TaxPayment.find(query)
      .populate('userId', 'firstName lastName email taxId phone profileImage')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await TaxPayment.countDocuments(query);

    // Calculate summary stats for filtered results
    const summaryStats = await TaxPayment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          completedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
          },
          failedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    console.log(summaryStats, total)

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        },
        summary: summaryStats[0] || {
          totalAmount: 0,
          completedAmount: 0,
          pendingAmount: 0,
          failedAmount: 0,
          completedCount: 0,
          pendingCount: 0,
          failedCount: 0
        }
      }
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message
    });
  }
};

// @desc    Get single payment details
// @route   GET /api/admin/payments/:id
// @access  Private/Admin
exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await TaxPayment.findById(req.params.id)
      .populate('userId', 'firstName lastName email taxId phone profileImage address kyc accountStatus createdAt');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Get user's payment history count
    const userPaymentCount = await TaxPayment.countDocuments({ userId: payment.userId._id });
    const userTotalSpent = await TaxPayment.aggregate([
      { $match: { userId: payment.userId._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        payment,
        userStats: {
          totalPayments: userPaymentCount,
          totalSpent: userTotalSpent[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details',
      error: error.message
    });
  }
};

// @desc    Update payment status (for manual verification)
// @route   PUT /api/admin/payments/:id/status
// @access  Private/Admin
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!['completed', 'pending', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const payment = await TaxPayment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Store previous status for notification
    const previousStatus = payment.status;

    // Update payment
    payment.status = status;
    payment.metadata = {
      ...payment.metadata,
      adminNote: note,
      statusUpdatedBy: req.user._id,
      statusUpdatedAt: new Date(),
      previousStatus
    };

    if (status === 'completed' && !payment.paidDate) {
      payment.paidDate = new Date();
    }

    await payment.save();

    // Send notification to user
    await Notification.create({
      userId: payment.userId,
      title: 'Payment Status Updated',
      message: `Your payment of ₦${payment.amount.toLocaleString()} has been marked as ${status}.${note ? ` Note: ${note}` : ''}`,
      type: status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'info',
      category: 'payment',
      metadata: {
        paymentId: payment._id,
        referenceNumber: payment.referenceNumber
      }
    });

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${status}`,
      data: payment
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment status',
      error: error.message
    });
  }
};

// @desc    Process refund
// @route   POST /api/admin/payments/:id/refund
// @access  Private/Admin
exports.processRefund = async (req, res) => {
  try {
    const { reason, refundAmount } = req.body;

    const payment = await TaxPayment.findById(req.params.id)
      .populate('userId', 'firstName lastName email walletBalance');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    if (payment.metadata?.refunded) {
      return res.status(400).json({
        success: false,
        message: 'This payment has already been refunded'
      });
    }

    const amountToRefund = refundAmount || payment.amount;

    if (amountToRefund > payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed payment amount'
      });
    }

    // Update user wallet balance
    const user = await User.findById(payment.userId._id);
    user.walletBalance = (user.walletBalance || 0) + amountToRefund;
    await user.save();

    // Update payment status
    payment.status = 'refunded';
    payment.metadata = {
      ...payment.metadata,
      refunded: true,
      refundAmount: amountToRefund,
      refundReason: reason,
      refundedBy: req.user._id,
      refundedAt: new Date()
    };
    await payment.save();

    // Send notification to user
    await Notification.create({
      userId: payment.userId._id,
      title: 'Payment Refunded',
      message: `A refund of ₦${amountToRefund.toLocaleString()} has been credited to your wallet.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'success',
      category: 'payment',
      metadata: {
        paymentId: payment._id,
        refundAmount: amountToRefund
      }
    });

    res.status(200).json({
      success: true,
      message: `Refund of ₦${amountToRefund.toLocaleString()} processed successfully`,
      data: {
        payment,
        newWalletBalance: user.walletBalance
      }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: error.message
    });
  }
};

// @desc    Export payments to CSV
// @route   GET /api/admin/payments/export
// @access  Private/Admin
exports.exportPayments = async (req, res) => {
  try {
    const {
      status = '',
      taxType = '',
      dateFilter = '',
      startDate = '',
      endDate = ''
    } = req.query;

    // Build query (same as getAllPayments)
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (taxType && taxType !== 'all') {
      query.taxType = taxType;
    }

    // Date filters
    const now = new Date();
    if (dateFilter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query.createdAt = { $gte: startOfDay };
    } else if (dateFilter === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      query.createdAt = { $gte: startOfWeek };
    } else if (dateFilter === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.createdAt = { $gte: startOfMonth };
    } else if (dateFilter === 'custom' && startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59))
      };
    }

    const payments = await TaxPayment.find(query)
      .populate('userId', 'firstName lastName email taxId phone')
      .sort({ createdAt: -1 });

    // Generate CSV
    const headers = [
      'Reference',
      'User Name',
      'Email',
      'Tax ID',
      'Phone',
      'Tax Type',
      'Amount',
      'Status',
      'Payment Method',
      'Date',
      'Paid Date'
    ];

    const rows = payments.map(p => [
      p.referenceNumber || '',
      p.userId ? `${p.userId.firstName} ${p.userId.lastName}` : 'N/A',
      p.userId?.email || 'N/A',
      p.userId?.taxId || 'N/A',
      p.userId?.phone || 'N/A',
      p.taxType || '',
      p.amount || 0,
      p.status || '',
      p.paymentMethod || '',
      p.createdAt ? new Date(p.createdAt).toISOString() : '',
      p.paidDate ? new Date(p.paidDate).toISOString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payments-export-${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting payments',
      error: error.message
    });
  }
};

// @desc    Get payment statistics
// @route   GET /api/admin/payments/stats
// @access  Private/Admin
exports.getPaymentStats = async (req, res) => {
  console.log("trying....")
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // This month stats
    const thisMonthStats = await TaxPayment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgTransaction: { $avg: '$amount' }
        }
      }
    ]);

    // Last month stats
    const lastMonthStats = await TaxPayment.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    // Revenue by tax type
    const revenueByTaxType = await TaxPayment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$taxType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Revenue by payment method
    const revenueByMethod = await TaxPayment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Daily revenue for current month (for chart)
    const dailyRevenue = await TaxPayment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate growth percentage
    const thisMonthRevenue = thisMonthStats[0]?.totalRevenue || 0;
    const lastMonthRevenue = lastMonthStats[0]?.totalRevenue || 0;
    const revenueGrowth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    res.status(200).json({
      status: 200,
      success: true,
      data: {
        thisMonth: {
          revenue: thisMonthRevenue,
          transactions: thisMonthStats[0]?.totalTransactions || 0,
          avgTransaction: thisMonthStats[0]?.avgTransaction || 0
        },
        lastMonth: {
          revenue: lastMonthRevenue,
          transactions: lastMonthStats[0]?.totalTransactions || 0
        },
        revenueGrowth,
        revenueByTaxType,
        revenueByMethod,
        dailyRevenue
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment statistics',
      error: error.message
    });
  }
};

// hello world 

// @desc    Get top paying users
// @route   GET /api/admin/payments/top-users
// @access  Private/Admin
exports.getTopPayingUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topUsers = await TaxPayment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          lastPayment: { $max: '$createdAt' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          transactionCount: 1,
          lastPayment: 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.email': 1,
          'user.taxId': 1,
          'user.profileImage': 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: topUsers
    });
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top users',
      error: error.message
    });
  }
};