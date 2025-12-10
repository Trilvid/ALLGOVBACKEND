const express = require('express');
const router = express.Router();
const {
    getRevenueByState,
    getStateDetails,
    getPaymentsByLocation,
    getStateAdmins,
    createStateAdmin,
    updateStateAdmin,
    deleteStateAdmin,
    getAvailableStates
} = require('../controllers/adminRevenueController');
const { protect, restrictTo } = require('../middleware/auth');

// ============================================
// REVENUE REPORTS
// ============================================

// @route   GET /api/admin/revenue/by-state
// @desc    Get revenue breakdown by state
// @access  Private (superadmin only)
router.get('/revenue/by-state', protect, restrictTo('superadmin', 'admin'), getRevenueByState);

// @route   GET /api/admin/revenue/state/:stateName
// @desc    Get detailed revenue for specific state
// @access  Private (superadmin or state-admin)
router.get('/revenue/state/:stateName', protect, restrictTo('superadmin', 'state-admin'), getStateDetails);

// @route   GET /api/admin/payments/by-location
// @desc    Get payments filtered by location
// @access  Private (superadmin or state-admin)
router.get('/payments/by-location', protect, restrictTo('superadmin', 'state-admin'), getPaymentsByLocation);

// ============================================
// STATE ADMIN MANAGEMENT
// ============================================

// @route   GET /api/admin/state-admins
// @desc    Get all state admins
// @access  Private (superadmin only)
router.get('/state-admins', protect, restrictTo('superadmin', 'admin'), getStateAdmins);

// @route   POST /api/admin/state-admins
// @desc    Create new state admin
// @access  Private (superadmin only)
router.post('/state-admins', protect, restrictTo('superadmin', 'admin'), createStateAdmin);

// @route   PUT /api/admin/state-admins/:id
// @desc    Update state admin
// @access  Private (superadmin only)
router.put('/state-admins/:id', protect, restrictTo('superadmin', 'admin'), updateStateAdmin);

// @route   DELETE /api/admin/state-admins/:id
// @desc    Deactivate state admin
// @access  Private (superadmin only)
router.delete('/state-admins/:id', protect, restrictTo('superadmin', 'admin'), deleteStateAdmin);

// @route   GET /api/admin/available-states
// @desc    Get states without assigned admin
// @access  Private (superadmin only)
router.get('/available-states', protect, restrictTo('superadmin', 'admin'), getAvailableStates);

module.exports = router;