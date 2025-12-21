const User = require('../models/User');
const { TaxPayment, TaxSubscription } = require('../models/TaxPayment');

// ============================================
// STATE REVENUE REPORTS
// ============================================

// @desc    Get revenue by state (Super Admin)
// @route   GET /api/admin/revenue/by-state
// @access  Private (superadmin only)
exports.getRevenueByState = async (req, res) => {
    try {
        const { startDate, endDate, taxType } = req.query;

        // Build match query
        const matchQuery = {
            status: 'completed',
            'taxLocation.state': { $exists: true, $ne: null }
        };

        if (startDate && endDate) {
            matchQuery.paidDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (taxType) {
            matchQuery.taxType = taxType;
        }

        // Aggregate by state
        const stateRevenue = await TaxPayment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$taxLocation.state',
                    totalRevenue: { $sum: '$amount' },
                    paymentCount: { $sum: 1 },
                    averagePayment: { $avg: '$amount' },
                    taxTypes: { $addToSet: '$taxType' }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Calculate total
        const grandTotal = stateRevenue.reduce((sum, state) => sum + state.totalRevenue, 0);

        // Add percentage
        const stateRevenueWithPercentage = stateRevenue.map(state => ({
            state: state._id,
            totalRevenue: state.totalRevenue,
            paymentCount: state.paymentCount,
            averagePayment: Math.round(state.averagePayment),
            percentage: grandTotal > 0 ? Math.round((state.totalRevenue / grandTotal) * 100) : 0,
            taxTypes: state.taxTypes
        }));

        res.json({
            success: true,
            data: {
                states: stateRevenueWithPercentage,
                summary: {
                    totalRevenue: grandTotal,
                    totalPayments: stateRevenue.reduce((sum, s) => sum + s.paymentCount, 0),
                    stateCount: stateRevenue.length
                }
            }
        });
    } catch (error) {
        console.error('Get revenue by state error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get state details (for specific state)
// @route   GET /api/admin/revenue/state/:stateName
// @access  Private (superadmin or state-admin)
exports.getStateDetails = async (req, res) => {
    try {
        const { stateName } = req.params;
        const { startDate, endDate } = req.query;

        console.log(stateName, startDate, endDate, "hello world")

        // Check if user is state-admin and accessing their assigned state
        if (req.user.role === 'state-admin' && req.user.assignedState !== stateName) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your assigned state.'
            });
        }

        const matchQuery = {
            status: 'completed',
            'taxLocation.state': stateName
        };

        if (startDate && endDate) {
            matchQuery.paidDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get LGA breakdown
        const lgaRevenue = await TaxPayment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$taxLocation.lga',
                    totalRevenue: { $sum: '$amount' },
                    paymentCount: { $sum: 1 },
                    averagePayment: { $avg: '$amount' }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Get tax type breakdown
        const taxTypeBreakdown = await TaxPayment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$taxType',
                    totalRevenue: { $sum: '$amount' },
                    paymentCount: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Get recent payments
        const recentPayments = await TaxPayment.find(matchQuery)
            .populate('userId', 'firstName lastName email taxId phone')
            .sort({ paidDate: -1 })
            .limit(20);

        // Get top taxpayers in this state
        const topTaxpayers = await TaxPayment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$userId',
                    totalPaid: { $sum: '$amount' },
                    paymentCount: { $sum: 1 }
                }
            },
            { $sort: { totalPaid: -1 } },
            { $limit: 10 }
        ]);

        // Populate user details for top taxpayers
        const topTaxpayersWithDetails = await User.find({
            _id: { $in: topTaxpayers.map(t => t._id) }
        }).select('firstName lastName email taxId phone');

        const topTaxpayersFormatted = topTaxpayers.map(taxpayer => {
            const user = topTaxpayersWithDetails.find(u => u._id.toString() === taxpayer._id.toString());
            return {
                userId: taxpayer._id,
                name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
                email: user?.email,
                taxId: user?.taxId,
                phone: user?.phone,
                totalPaid: taxpayer.totalPaid,
                paymentCount: taxpayer.paymentCount
            };
        });

        // Calculate totals
        const totalRevenue = lgaRevenue.reduce((sum, lga) => sum + lga.totalRevenue, 0);
        const totalPayments = lgaRevenue.reduce((sum, lga) => sum + lga.paymentCount, 0);

        res.json({
            success: true,
            data: {
                state: stateName,
                summary: {
                    totalRevenue,
                    totalPayments,
                    averagePayment: totalPayments > 0 ? Math.round(totalRevenue / totalPayments) : 0,
                    lgaCount: lgaRevenue.filter(lga => lga._id).length
                },
                lgaRevenue: lgaRevenue.map(lga => ({
                    lga: lga._id || 'Not Specified',
                    totalRevenue: lga.totalRevenue,
                    paymentCount: lga.paymentCount,
                    averagePayment: Math.round(lga.averagePayment)
                })),
                taxTypeBreakdown: taxTypeBreakdown.map(type => ({
                    taxType: type._id,
                    totalRevenue: type.totalRevenue,
                    paymentCount: type.paymentCount,
                    percentage: totalRevenue > 0 ? Math.round((type.totalRevenue / totalRevenue) * 100) : 0
                })),
                topTaxpayers: topTaxpayersFormatted,
                recentPayments: recentPayments.map(payment => ({
                    _id: payment._id,
                    taxPaymentId: payment.taxPaymentId,
                    user: {
                        name: payment.userId ? `${payment.userId.firstName || ''} ${payment.userId.lastName || ''}`.trim() : 'Unknown',
                        email: payment.userId?.email,
                        taxId: payment.userId?.taxId,
                        phone: payment.userId?.phone
                    },
                    taxType: payment.taxType,
                    amount: payment.amount,
                    lga: payment.taxLocation?.lga,
                    paidDate: payment.paidDate,
                    reference: payment.reference
                }))
            }
        });
    } catch (error) {
        console.error('Get state details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get payments by location (with filters)
// @route   GET /api/admin/payments/by-location
// @access  Private (superadmin or state-admin)
exports.getPaymentsByLocation = async (req, res) => {
    try {
        const { state, lga, taxType, status, page = 1, limit = 10 } = req.query;

        // Build filter
        const filter = {};

        // If state-admin, restrict to assigned state
        if (req.user.role === 'state-admin') {
            filter['taxLocation.state'] = req.user.assignedState;
        } else if (state) {
            filter['taxLocation.state'] = state;
        }

        if (lga) filter['taxLocation.lga'] = lga;
        if (taxType) filter.taxType = taxType;
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const payments = await TaxPayment.find(filter)
            .populate('userId', 'firstName lastName email taxId phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await TaxPayment.countDocuments(filter);

        res.json({
            success: true,
            data: {
                payments: payments.map(payment => ({
                    _id: payment._id,
                    taxPaymentId: payment.taxPaymentId,
                    user: {
                        name: payment.userId ? `${payment.userId.firstName || ''} ${payment.userId.lastName || ''}`.trim() : 'Unknown',
                        email: payment.userId?.email,
                        taxId: payment.userId?.taxId,
                        phone: payment.userId?.phone
                    },
                    taxType: payment.taxType,
                    paymentPlan: payment.paymentPlan,
                    amount: payment.amount,
                    location: {
                        state: payment.taxLocation?.state,
                        lga: payment.taxLocation?.lga
                    },
                    status: payment.status,
                    paidDate: payment.paidDate,
                    createdAt: payment.createdAt,
                    reference: payment.reference
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get payments by location error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// ============================================
// STATE ADMIN MANAGEMENT
// ============================================

// @desc    Get all state admins
// @route   GET /api/admin/state-admins
// @access  Private (superadmin only)
exports.getStateAdmins = async (req, res) => {
    try {
        const stateAdmins = await User.find({ role: 'state-admin' })
            .select('firstName lastName email phone assignedState accountStatus createdAt lastLogin')
            .sort({ assignedState: 1 });

        // Get revenue for each state admin's state
        const stateAdminsWithRevenue = await Promise.all(
            stateAdmins.map(async (admin) => {
                const revenue = await TaxPayment.aggregate([
                    {
                        $match: {
                            'taxLocation.state': admin.assignedState,
                            status: 'completed'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$amount' },
                            paymentCount: { $sum: 1 }
                        }
                    }
                ]);

                return {
                    _id: admin._id,
                    name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
                    email: admin.email,
                    phone: admin.phone,
                    assignedState: admin.assignedState,
                    accountStatus: admin.accountStatus,
                    createdAt: admin.createdAt,
                    lastLogin: admin.lastLogin,
                    stateRevenue: revenue[0]?.totalRevenue || 0,
                    statePayments: revenue[0]?.paymentCount || 0
                };
            })
        );

        res.json({
            success: true,
            data: stateAdminsWithRevenue
        });
    } catch (error) {
        console.error('Get state admins error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Create state admin
// @route   POST /api/admin/state-admins
// @access  Private (superadmin only)
exports.createStateAdmin = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, assignedState } = req.body;

        // Validation
        if (!email || !password || !assignedState) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email, password, and assigned state'
            });
        }

        // Check if email exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Check if state already has an admin
        const existingStateAdmin = await User.findOne({
            role: 'state-admin',
            assignedState,
            accountStatus: 'active'
        });

        if (existingStateAdmin) {
            return res.status(400).json({
                success: false,
                message: `${assignedState} already has an active admin: ${existingStateAdmin.email}`
            });
        }

        // Create state admin
        const stateAdmin = new User({
            firstName,
            lastName,
            email,
            password,
            phone,
            role: 'state-admin',
            assignedState,
            accountStatus: 'active',
            emailVerified: true
        });

        stateAdmin.generateTaxId();

        await stateAdmin.save();

        res.status(201).json({
            success: true,
            message: `State admin created for ${assignedState}`,
            data: {
                _id: stateAdmin._id,
                name: `${stateAdmin.firstName || ''} ${stateAdmin.lastName || ''}`.trim(),
                email: stateAdmin.email,
                phone: stateAdmin.phone,
                assignedState: stateAdmin.assignedState
            }
        });
    } catch (error) {
        console.error('Create state admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update state admin
// @route   PUT /api/admin/state-admins/:id
// @access  Private (superadmin only)
exports.updateStateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phone, assignedState, accountStatus } = req.body;

        const stateAdmin = await User.findOne({ _id: id, role: 'state-admin' });

        if (!stateAdmin) {
            return res.status(404).json({
                success: false,
                message: 'State admin not found'
            });
        }

        // If changing assigned state, check if new state already has admin
        if (assignedState && assignedState !== stateAdmin.assignedState) {
            const existingStateAdmin = await User.findOne({
                role: 'state-admin',
                assignedState,
                accountStatus: 'active',
                _id: { $ne: id }
            });

            if (existingStateAdmin) {
                return res.status(400).json({
                    success: false,
                    message: `${assignedState} already has an active admin`
                });
            }
        }

        // Update fields
        if (firstName) stateAdmin.firstName = firstName;
        if (lastName) stateAdmin.lastName = lastName;
        if (phone) stateAdmin.phone = phone;
        if (assignedState) stateAdmin.assignedState = assignedState;
        if (accountStatus) stateAdmin.accountStatus = accountStatus;

        await stateAdmin.save();

        res.json({
            success: true,
            message: 'State admin updated successfully',
            data: {
                _id: stateAdmin._id,
                name: `${stateAdmin.firstName || ''} ${stateAdmin.lastName || ''}`.trim(),
                email: stateAdmin.email,
                phone: stateAdmin.phone,
                assignedState: stateAdmin.assignedState,
                accountStatus: stateAdmin.accountStatus
            }
        });
    } catch (error) {
        console.error('Update state admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Delete/Deactivate state admin
// @route   DELETE /api/admin/state-admins/:id
// @access  Private (superadmin only)
exports.deleteStateAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const stateAdmin = await User.findOne({ _id: id, role: 'state-admin' });

        if (!stateAdmin) {
            return res.status(404).json({
                success: false,
                message: 'State admin not found'
            });
        }

        // Deactivate instead of delete
        stateAdmin.accountStatus = 'suspended';
        await stateAdmin.save();

        res.json({
            success: true,
            message: 'State admin deactivated successfully'
        });
    } catch (error) {
        console.error('Delete state admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get available states (states without active admin)
// @route   GET /api/admin/available-states
// @access  Private (superadmin only)
exports.getAvailableStates = async (req, res) => {
    try {
        // All Nigerian states
        const allStates = [
            'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
            'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
            'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
            'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
            'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
        ];

        // Get states with active admins
        const assignedStates = await User.find({
            role: 'state-admin',
            accountStatus: 'active'
        }).distinct('assignedState');

        // Available states = all - assigned
        const availableStates = allStates.filter(state => !assignedStates.includes(state));

        res.json({
            success: true,
            data: {
                allStates,
                assignedStates,
                availableStates
            }
        });
    } catch (error) {
        console.error('Get available states error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};



// ✅ ADD THIS ENDPOINT TO YOUR adminRevenueController.js

// @desc    Convert existing user to state admin
// @route   POST /api/admin/state-admins
// @access  Private (superadmin only)
exports.convertToStateAdmin = async (req, res) => {
    try {
        const { userId, assignedState } = req.body;

        // Validation
        if (!userId || !assignedState) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId and assigned state'
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is already admin or superadmin
        if (user.role === 'admin' || user.role === 'superadmin') {
            return res.status(400).json({
                success: false,
                message: 'This user already has admin privileges'
            });
        }

        // Check if state already has an admin
        const existingStateAdmin = await User.findOne({
            role: 'state-admin',
            assignedState,
            accountStatus: 'active',
            _id: { $ne: userId }
        });

        if (existingStateAdmin) {
            return res.status(400).json({
                success: false,
                message: `${assignedState} already has an active admin: ${existingStateAdmin.email}`
            });
        }

        // Update user to state admin
        user.role = 'state-admin';
        user.assignedState = assignedState;
        await user.save();

        res.status(200).json({
            success: true,
            message: `${user.firstName} ${user.lastName} is now ${assignedState} State Admin`,
            data: {
                _id: user._id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                email: user.email,
                role: user.role,
                assignedState: user.assignedState
            }
        });
    } catch (error) {
        console.error('Convert to state admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Remove state admin role (convert back to user)
// @route   DELETE /api/admin/state-admins/:id
// @access  Private (superadmin only)
exports.removeStateAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const stateAdmin = await User.findOne({ _id: id, role: 'state-admin' });

        if (!stateAdmin) {
            return res.status(404).json({
                success: false,
                message: 'State admin not found'
            });
        }

        const stateName = stateAdmin.assignedState;

        // Convert back to regular user
        stateAdmin.role = 'user';
        stateAdmin.assignedState = null;
        await stateAdmin.save();

        res.json({
            success: true,
            message: `State admin role removed. ${stateName} is now available for assignment.`
        });
    } catch (error) {
        console.error('Remove state admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};