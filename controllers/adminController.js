const User = require('../models/User');
const { TaxPayment, TaxSubscription } = require('../models/TaxPayment');
const Notification = require('../models/Notification');

// ============================================
// DASHBOARD STATS
// ============================================

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ accountStatus: 'active' });
    const suspendedUsers = await User.countDocuments({ accountStatus: 'suspended' });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    const pendingKYC = await User.countDocuments({ 'kyc.status': 'pending' });
    const verifiedKYC = await User.countDocuments({ 'kyc.status': 'verified' });
    const rejectedKYC = await User.countDocuments({ 'kyc.status': 'rejected' });

    const allPayments = await TaxPayment.find({ status: 'completed' });
    const totalRevenue = allPayments.reduce((sum, payment) => sum + payment.amount, 0);

    const paymentsThisMonth = await TaxPayment.find({
      status: 'completed',
      paidDate: { $gte: startOfMonth }
    });
    const revenueThisMonth = paymentsThisMonth.reduce((sum, payment) => sum + payment.amount, 0);

    const activeSubscriptions = await TaxSubscription.countDocuments({ status: 'Active' });
    const expiredSubscriptions = await TaxSubscription.countDocuments({ status: 'Expired' });

    const paymentsByTaxType = await TaxPayment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$taxType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const usersLastMonth = await User.countDocuments({
      createdAt: { $gte: lastMonth, $lt: startOfMonth }
    });
    const userGrowth = usersLastMonth > 0
      ? Math.round(((newUsersThisMonth - usersLastMonth) / usersLastMonth) * 100)
      : newUsersThisMonth > 0 ? 100 : 0;

    const lastMonthEnd = startOfMonth;
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const paymentsLastMonth = await TaxPayment.find({
      status: 'completed',
      paidDate: { $gte: lastMonthStart, $lt: lastMonthEnd }
    });
    const revenueLastMonth = paymentsLastMonth.reduce((sum, payment) => sum + payment.amount, 0);
    const revenueGrowth = revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : revenueThisMonth > 0 ? 100 : 0;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await TaxPayment.aggregate([
      {
        $match: {
          status: 'completed',
          paidDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidDate' },
            month: { $month: '$paidDate' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlyUsers = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          newThisMonth: newUsersThisMonth,
          growth: userGrowth
        },
        kyc: {
          pending: pendingKYC,
          verified: verifiedKYC,
          rejected: rejectedKYC,
          total: pendingKYC + verifiedKYC + rejectedKYC
        },
        payments: {
          total: allPayments.length,
          totalRevenue,
          thisMonth: paymentsThisMonth.length,
          revenueThisMonth,
          revenueGrowth
        },
        subscriptions: {
          active: activeSubscriptions,
          expired: expiredSubscriptions,
          total: activeSubscriptions + expiredSubscriptions
        },
        paymentsByTaxType,
        charts: {
          monthlyRevenue,
          monthlyUsers
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get recent users with pagination
// @route   GET /api/admin/dashboard/recent-users
// @access  Private/Admin
exports.getRecentUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { taxId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('firstName lastName email createdAt accountStatus kyc.status profileImage taxId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get recent users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get recent payments with pagination
// @route   GET /api/admin/dashboard/recent-payments
// @access  Private/Admin
exports.getRecentPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      taxType = 'all',
      search = ''
    } = req.query;

    const query = {};

    if (status !== 'all') {
      query.status = status;
    }

    if (taxType !== 'all') {
      query.taxType = taxType;
    }

    let payments = await TaxPayment.find(query)
      .populate('userId', 'firstName lastName email taxId')
      .select('taxType amount status paidDate createdAt paymentReference')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    if (search) {
      const searchLower = search.toLowerCase();
      payments = payments.filter(payment => {
        const userName = `${payment.userId?.firstName || ''} ${payment.userId?.lastName || ''}`.toLowerCase();
        const userEmail = (payment.userId?.email || '').toLowerCase();
        const taxId = (payment.userId?.taxId || '').toLowerCase();
        const paymentRef = (payment.paymentReference || '').toLowerCase();

        return userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          taxId.includes(searchLower) ||
          paymentRef.includes(searchLower);
      });
    }

    const total = await TaxPayment.countDocuments(query);
    const taxTypes = await TaxPayment.distinct('taxType');

    res.json({
      success: true,
      data: payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      },
      filters: {
        taxTypes
      }
    });
  } catch (error) {
    console.error('Get recent payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

exports.oldgetAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      kycStatus = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {
      role: { $in: ['user', 'state-admin'] }
    };

    // Search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { taxId: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status !== 'all') {
      query.accountStatus = status;
    }

    // KYC filter
    if (kycStatus !== 'all') {
      query['kyc.status'] = kycStatus;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await User.countDocuments(query);

    // Get filter counts (only for visible roles)
    const baseRoleFilter = { role: { $in: ['user', 'state-admin'] } };

    const statusCounts = {
      all: await User.countDocuments(baseRoleFilter),
      active: await User.countDocuments({ ...baseRoleFilter, accountStatus: 'active' }),
      suspended: await User.countDocuments({ ...baseRoleFilter, accountStatus: 'suspended' })
    };

    const kycCounts = {
      all: await User.countDocuments(baseRoleFilter),
      verified: await User.countDocuments({ ...baseRoleFilter, 'kyc.status': 'verified' }),
      pending: await User.countDocuments({ ...baseRoleFilter, 'kyc.status': 'pending' }),
      rejected: await User.countDocuments({ ...baseRoleFilter, 'kyc.status': 'rejected' })
    };

    res.json({
      success: true,
      data: users,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      filters: {
        statusCounts,
        kycCounts
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      kycStatus = 'all',
      role = 'all',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    // Build query - ✅ ONLY show regular and state-admin users
    const query = {
      role: { $in: ['user', 'state-admin'] } // ✅ Exclude super-admin
    };

    // Status filter
    if (status !== 'all') {
      query.accountStatus = status;
    }

    // KYC filter
    if (kycStatus !== 'all') {
      if (kycStatus === 'none') {
        query['kyc.status'] = { $exists: false };
      } else {
        query['kyc.status'] = kycStatus;
      }
    }

    // Role filter
    if (role !== 'all') {
      query.role = role;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Search filter
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { taxId: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    // Get users
    const users = await User.find(query)
      .select('-password -transactionPin')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    // ✅ FIXED: Get filter counts - Only count regular and state-admin users
    const baseQuery = { role: { $in: ['user', 'state-admin'] } };

    const statusCounts = {
      all: await User.countDocuments(baseQuery),
      active: await User.countDocuments({ ...baseQuery, accountStatus: 'active' }),
      suspended: await User.countDocuments({ ...baseQuery, accountStatus: 'suspended' })
    };

    const kycCounts = {
      all: await User.countDocuments(baseQuery),
      pending: await User.countDocuments({ ...baseQuery, 'kyc.status': 'pending' }),
      verified: await User.countDocuments({ ...baseQuery, 'kyc.status': 'verified' }),
      rejected: await User.countDocuments({ ...baseQuery, 'kyc.status': 'rejected' }),
      none: await User.countDocuments({ ...baseQuery, 'kyc.status': { $exists: false } })
    };

    const roleCounts = {
      all: await User.countDocuments(baseQuery),
      regular: await User.countDocuments({ role: 'user' }),
      'state-admin': await User.countDocuments({ role: 'state-admin' })
    };

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      },
      filters: {
        statusCounts,
        kycCounts,
        roleCounts
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// @desc    Get single user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -transactionPin');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const payments = await TaxPayment.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const subscriptions = await TaxSubscription.find({ userId: user._id })
      .sort({ createdAt: -1 });

    const totalSpent = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      data: {
        user,
        payments,
        subscriptions,
        stats: {
          totalPayments: payments.length,
          completedPayments: payments.filter(p => p.status === 'completed').length,
          totalSpent,
          activeSubscriptions: subscriptions.filter(s => s.status === 'Active').length
        }
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user account status (suspend/activate)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { accountStatus, reason } = req.body;

    if (!['active', 'suspended'].includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status. Must be "active" or "suspended"'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin' && accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend admin accounts'
      });
    }

    user.accountStatus = accountStatus;

    if (!user.statusHistory) {
      user.statusHistory = [];
    }
    user.statusHistory.push({
      status: accountStatus,
      changedBy: req.user._id,
      reason: reason || '',
      changedAt: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: `User account ${accountStatus === 'active' ? 'activated' : 'suspended'} successfully`,
      data: {
        _id: user._id,
        accountStatus: user.accountStatus,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user details (admin edit)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, phone, role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;

    if (role && req.user.role === 'admin') {
      if (user.role === 'admin' && role !== 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot remove the last admin'
          });
        }
      }
      user.role = role;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin accounts'
      });
    }

    const activeSubscriptions = await TaxSubscription.countDocuments({
      userId: user._id,
      status: 'Active'
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user with ${activeSubscriptions} active subscription(s). Please cancel subscriptions first.`
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Export users to CSV
// @route   GET /api/admin/users/export
// @access  Private/Admin
exports.exportUsers = async (req, res) => {
  try {
    const { status = 'all', kycStatus = 'all' } = req.query;

    const query = {};
    if (status !== 'all') query.accountStatus = status;
    if (kycStatus !== 'all') query['kyc.status'] = kycStatus;

    const users = await User.find(query)
      .select('firstName lastName email phone taxId accountStatus kyc.status createdAt walletBalance')
      .sort({ createdAt: -1 });

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Tax ID', 'Status', 'KYC Status', 'Wallet Balance', 'Created At'];
    const csvRows = [headers.join(',')];

    users.forEach(user => {
      const row = [
        user.firstName || '',
        user.lastName || '',
        user.email || '',
        user.phone || '',
        user.taxId || '',
        user.accountStatus || '',
        user.kyc?.status || 'none',
        user.walletBalance || 0,
        user.createdAt ? new Date(user.createdAt).toISOString() : ''
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ============================================
// KYC MANAGEMENT (NEW)
// ============================================

// @desc    Get all KYC submissions with filtering and pagination
// @route   GET /api/admin/kyc
// @access  Private/Admin
exports.getAllKYC = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      search = '',
      sortBy = 'kyc.submittedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - only get users who have started KYC
    const query = {
      'kyc.status': { $exists: true }
    };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { taxId: { $regex: search, $options: 'i' } },
        { 'kyc.identityVerification.bvn': { $regex: search, $options: 'i' } },
        { 'kyc.identityVerification.nin': { $regex: search, $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      query['kyc.status'] = status;
    }

    const users = await User.find(query)
      .select('firstName lastName email phone taxId profileImage kyc createdAt')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    // Get counts for each status
    const statusCounts = {
      all: await User.countDocuments({ 'kyc.status': { $exists: true } }),
      pending: await User.countDocuments({ 'kyc.status': 'pending' }),
      verified: await User.countDocuments({ 'kyc.status': 'verified' }),
      rejected: await User.countDocuments({ 'kyc.status': 'rejected' })
    };

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      },
      statusCounts
    });
  } catch (error) {
    console.error('Get all KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single KYC details
// @route   GET /api/admin/kyc/:userId
// @access  Private/Admin
exports.getKYCDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('firstName lastName email phone taxId profileImage kyc createdAt address vehicleInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.kyc || !user.kyc.status) {
      return res.status(404).json({
        success: false,
        message: 'No KYC submission found for this user'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get KYC details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Approve KYC
// @route   PUT /api/admin/kyc/:userId/approve
// @access  Private/Admin
exports.approveKYC = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.kyc || !user.kyc.status) {
      return res.status(400).json({
        success: false,
        message: 'No KYC submission found for this user'
      });
    }

    if (user.kyc.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'KYC is already verified'
      });
    }

    // Update KYC status
    user.kyc.status = 'verified';
    user.kyc.verificationDate = new Date();
    user.kyc.verifiedBy = req.user._id;
    user.kyc.completionPercentage = 100;
    user.kyc.rejectionReason = null;

    await user.save();

    // Send notification to user
    try {
      if (Notification) {
        await Notification.create({
          userId: user._id,
          title: 'KYC Verified! ✅',
          message: 'Congratulations! Your KYC verification has been approved. You now have full access to all features.',
          type: 'success',
          category: 'kyc'
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.json({
      success: true,
      message: 'KYC approved successfully',
      data: {
        userId: user._id,
        kycStatus: user.kyc.status,
        verificationDate: user.kyc.verificationDate
      }
    });
  } catch (error) {
    console.error('Approve KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reject KYC
// @route   PUT /api/admin/kyc/:userId/reject
// @access  Private/Admin
exports.rejectKYC = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.kyc || !user.kyc.status) {
      return res.status(400).json({
        success: false,
        message: 'No KYC submission found for this user'
      });
    }

    // Update KYC status
    user.kyc.status = 'rejected';
    user.kyc.verificationDate = new Date();
    user.kyc.verifiedBy = req.user._id;
    user.kyc.rejectionReason = reason;

    await user.save();

    // Send notification to user
    try {
      if (Notification) {
        await Notification.create({
          userId: user._id,
          title: 'KYC Rejected ❌',
          message: `Your KYC verification was rejected. Reason: ${reason}. Please update your information and resubmit.`,
          type: 'error',
          category: 'kyc'
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.json({
      success: true,
      message: 'KYC rejected',
      data: {
        userId: user._id,
        kycStatus: user.kyc.status,
        rejectionReason: user.kyc.rejectionReason
      }
    });
  } catch (error) {
    console.error('Reject KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk approve complete KYCs
 * @route   POST /api/admin/kyc/bulk-approve
 * @access  Private/Admin
 */
exports.bulkApproveCompleteKYCs = async (req, res) => {
  try {
    // Find all pending KYCs with complete information
    const usersWithCompleteKYC = await User.find({
      'kyc.status': 'pending',
      'kyc.personalInfo.phone': { $exists: true, $ne: '' },
      'kyc.taxVehicleInfo.plateNumber': { $exists: true, $ne: '' },
      'kyc.identityVerification.nin': { $exists: true, $ne: '' },
      'kyc.identityVerification.bvn': { $exists: true, $ne: '' },
      'kyc.originDetails.stateOfOrigin': { $exists: true, $ne: '' },
      'kyc.originDetails.lgaOfOrigin': { $exists: true, $ne: '' },
      'kyc.originDetails.townOfOrigin': { $exists: true, $ne: '' },
      'kyc.residentialDetails.stateOfResidence': { $exists: true, $ne: '' },
      'kyc.residentialDetails.lgaOfResidence': { $exists: true, $ne: '' },
      'kyc.residentialDetails.townOfResidence': { $exists: true, $ne: '' },
      'kyc.residentialDetails.residentialAddress': { $exists: true, $ne: '' }
    });

    if (usersWithCompleteKYC.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No complete KYC submissions found to approve'
      });
    }

    // Track results
    const approvedUsers = [];
    const failedUsers = [];

    // Approve each KYC
    for (const user of usersWithCompleteKYC) {
      try {
        user.kyc.status = 'verified';
        user.kyc.verificationDate = new Date();
        user.kyc.verifiedBy = req.user._id;
        user.kyc.completionPercentage = 100;
        user.kyc.rejectionReason = null;

        await user.save();

        approvedUsers.push({
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        });

        // Send notification to user
        try {
          if (Notification) {
            await Notification.create({
              userId: user._id,
              title: 'KYC Verified! ✅',
              message: 'Congratulations! Your KYC verification has been approved. You now have full access to all features.',
              type: 'success',
              category: 'kyc'
            });
          }
        } catch (notifError) {
          console.error(`Notification error for user ${user._id}:`, notifError);
        }
      } catch (saveError) {
        console.error(`Failed to approve KYC for user ${user._id}:`, saveError);
        failedUsers.push({
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          error: saveError.message
        });
      }
    }

    console.log(`Bulk KYC approval: ${approvedUsers.length} approved, ${failedUsers.length} failed`);

    res.json({
      success: true,
      message: `Successfully approved ${approvedUsers.length} KYC submission(s)`,
      data: {
        totalProcessed: usersWithCompleteKYC.length,
        approved: approvedUsers.length,
        failed: failedUsers.length,
        approvedUsers: approvedUsers.map(u => ({ userId: u.userId, name: u.name })),
        failedUsers: failedUsers.length > 0 ? failedUsers : undefined
      }
    });
  } catch (error) {
    console.error('Bulk approve KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get count of complete pending KYCs
 * @route   GET /api/admin/kyc/bulk-approve/count
 * @access  Private/Admin
 */
exports.getCompleteKYCCount = async (req, res) => {
  try {
    const count = await User.countDocuments({
      'kyc.status': 'pending',
      'kyc.personalInfo.phone': { $exists: true, $ne: '' },
      'kyc.taxVehicleInfo.plateNumber': { $exists: true, $ne: '' },
      'kyc.identityVerification.nin': { $exists: true, $ne: '' },
      'kyc.identityVerification.bvn': { $exists: true, $ne: '' },
      'kyc.originDetails.stateOfOrigin': { $exists: true, $ne: '' },
      'kyc.originDetails.lgaOfOrigin': { $exists: true, $ne: '' },
      'kyc.originDetails.townOfOrigin': { $exists: true, $ne: '' },
      'kyc.residentialDetails.stateOfResidence': { $exists: true, $ne: '' },
      'kyc.residentialDetails.lgaOfResidence': { $exists: true, $ne: '' },
      'kyc.residentialDetails.townOfResidence': { $exists: true, $ne: '' },
      'kyc.residentialDetails.residentialAddress': { $exists: true, $ne: '' }
    });
    console.log(count, 'hello world')

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Get complete KYC count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reset KYC (allow user to resubmit)
// @route   PUT /api/admin/kyc/:userId/reset
// @access  Private/Admin
exports.resetKYC = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset KYC to pending so user can resubmit
    user.kyc.status = 'pending';
    user.kyc.rejectionReason = null;
    user.kyc.verificationDate = null;
    user.kyc.verifiedBy = null;

    await user.save();

    // Send notification to user
    try {
      if (Notification) {
        await Notification.create({
          userId: user._id,
          title: 'KYC Reset',
          message: 'Your KYC has been reset. Please review and resubmit your information.',
          type: 'info',
          category: 'kyc'
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.json({
      success: true,
      message: 'KYC reset successfully',
      data: {
        userId: user._id,
        kycStatus: user.kyc.status
      }
    });
  } catch (error) {
    console.error('Reset KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


/**
 * @desc    Bulk deactivate/activate users
 * @route   POST /api/admin/users/bulk-status
 * @access  Private/Admin
 */
exports.bulkUpdateUserStatus = async (req, res) => {
  try {
    const {
      userIds,        // Array of user IDs
      accountStatus,  // 'active' or 'suspended'
      reason,         // Reason for action
      startDate,      // Optional: filter by date range
      endDate         // Optional: filter by date range
    } = req.body;

    // Validate status
    if (!['active', 'suspended'].includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status. Use "active" or "suspended"'
      });
    }

    let query = {};

    // Option 1: Use specific user IDs
    if (userIds && userIds.length > 0) {
      query._id = { $in: userIds };
    }
    // Option 2: Use date range
    else if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either userIds or date range'
      });
    }

    // Don't deactivate super-admins
    query.role = { $ne: 'super-admin' };

    // Count users before update
    const usersToUpdate = await User.countDocuments(query);

    if (usersToUpdate === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found matching the criteria'
      });
    }

    // Perform bulk update
    const result = await User.updateMany(
      query,
      {
        $set: {
          accountStatus: accountStatus,
          updatedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: accountStatus,
            reason: reason || `Bulk ${accountStatus === 'suspended' ? 'suspension' : 'activation'} by admin`,
            changedBy: req.user._id,
            changedAt: new Date()
          }
        }
      }
    );

    // Send notifications to affected users
    // const notificationService = require('../services/notificationService');
    // const affectedUsers = await User.find(query).select('_id');

    // for (const user of affectedUsers) {
    //   if (accountStatus === 'suspended') {
    //     await notificationService.accountSuspended(
    //       user._id,
    //       reason || 'Bulk suspension by admin'
    //     );
    //   } else {
    //     await notificationService.accountActivated(user._id);
    //   }
    // }

    console.log(`Bulk status update: ${result.modifiedCount} users ${accountStatus}`);

    res.json({
      success: true,
      message: `Successfully ${accountStatus === 'suspended' ? 'suspended' : 'activated'} ${result.modifiedCount} users`,
      data: {
        totalMatched: usersToUpdate,
        totalModified: result.modifiedCount,
        status: accountStatus,
        reason: reason
      }
    });

  } catch (error) {
    console.error('Bulk update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};