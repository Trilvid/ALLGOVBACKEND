const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updateVehicleInfo,
  uploadProfileImage,
  updateSettings,
  submitKYC,
  getNotifications,
  deleteAccount,
  requestPinChangeCode,
  changeTransactionPin,
  verifyCode,
  verifyTransactionPin,
  submitContactForm
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');
const { updateProfileValidation, validate } = require('../middleware/validation');
const multer = require('multer');
const {
  getDashboardStats,
  getRecentUsers,
  getRecentPayments,
  // User Management
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  updateUser,
  deleteUser,
  exportUsers,
  bulkUpdateUserStatus,
  // KYC Management
  getAllKYC,
  getKYCDetails,
  approveKYC,
  rejectKYC,
  resetKYC,
  bulkApproveCompleteKYCs,
  getCompleteKYCCount
} = require('../controllers/adminController');

const {
  getAllPayments,
  exportPayments,
  getPaymentStats,
  getTopPayingUsers,
  getPaymentDetails,
  updatePaymentStatus,
  processRefund
} = require('./../controllers/adminPaymentController')

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET /api/user/profile
router.get('/profile', protect, getProfile);

// @route   PUT /api/user/profile
router.put('/profile', protect, updateProfileValidation, validate, updateProfile);

// @route   PUT /api/user/vehicle-info
router.put('/vehicle-info', protect, updateVehicleInfo);

// @route   POST /api/user/upload-profile-image
router.post('/upload-profile-image', protect, upload.single('image'), uploadProfileImage);

// @route   PUT /api/user/settings
router.put('/settings', protect, updateSettings);

// @route   POST /api/user/request-pin-change-code
router.post('/request-pin-change-code', protect, requestPinChangeCode);

router.post('/verify-pin-change-code', protect, verifyCode);

// @route   POST /api/users/verify-transaction-pin
router.post('/verify-transaction-pin', protect, verifyTransactionPin);

// @route   PUT /api/user/change-transaction-pin
router.put('/change-transaction-pin', protect, changeTransactionPin);

// @route   POST /api/user/kyc
router.post('/kyc', protect, upload.array('documents', 5), submitKYC);

// @route   GET /api/user/notifications
router.get('/notifications', protect, getNotifications);

// @route   DELETE /api/user/account
router.delete('/account', protect, deleteAccount);


// public use

router.get('/checkpayment/:id', getPaymentDetails);
router.post("/contact", submitContactForm);

// ============================================
// ADMIN ROUTES                             
// ============================================

// @route   GET /api/admin/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/dashboard/stats', protect, admin, getDashboardStats);

// @route   GET /api/admin/dashboard/recent-users
// @desc    Get recent users with pagination
// @access  Private/Admin
router.get('/dashboard/recent-users', protect, admin, getRecentUsers);

// @route   GET /api/admin/dashboard/recent-payments
// @desc    Get recent payments with pagination
// @access  Private/Admin
router.get('/dashboard/recent-payments', protect, admin, getRecentPayments);

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
router.get('/users', protect, admin, getAllUsers);

// @route   GET /api/admin/users/export
// @desc    Export users to CSV
router.get('/users/export', exportUsers);

// @route   GET /api/admin/users/:id
// @desc    Get single user details
router.get('/users/:id', protect, admin, getUserDetails);

// @route   PUT /api/admin/users/:id
// @desc    Update user details
router.put('/users/:id', protect, admin, updateUser);

// @route   PUT /api/admin/users/:id/status
// @desc    Update user account status (suspend/activate)
router.put('/users/:id/status', protect, admin, updateUserStatus);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
router.delete('/users/:id', protect, admin, deleteUser);
router.post('/users/bulk-status', protect, admin, bulkUpdateUserStatus);


// ============================================
// KYC MANAGEMENT ROUTES
// ============================================

// @route   GET /api/admin/kyc/bulk-approve/count
// @desc    Get count of complete pending KYCs ready for bulk approval
router.get('/kyc/bulk-approve/count', protect, admin, getCompleteKYCCount);

// @route   POST /api/admin/kyc/bulk-approve
// @desc    Bulk approve all complete pending KYCs
router.post('/kyc/bulk-approve', protect, admin, bulkApproveCompleteKYCs);

// @route   GET /api/admin/kyc
// @desc    Get all KYC submissions with pagination and filters
router.get('/kyc', protect, admin, getAllKYC);

// @route   GET /api/admin/kyc/:userId
// @desc    Get single KYC details
router.get('/kyc/:userId', protect, admin, getKYCDetails);

// @route   PUT /api/admin/kyc/:userId/approve
// @desc    Approve KYC
router.put('/kyc/:userId/approve', protect, admin, approveKYC);

// @route   PUT /api/admin/kyc/:userId/reject
// @desc    Reject KYC
router.put('/kyc/:userId/reject', protect, admin, rejectKYC);

// @route   PUT /api/admin/kyc/:userId/reset
// @desc    Reset KYC (allow resubmission)
router.put('/kyc/:userId/reset', protect, admin, resetKYC);

router.use(protect);
// router.use(admin);

// Payment management routes
router.get('/payments', getAllPayments);
router.get('/payments/export', exportPayments);
router.get('/payments/stats', getPaymentStats);
router.get('/payments/top-users', getTopPayingUsers);
router.get('/payments/:id', getPaymentDetails);
router.put('/payments/:id/status', updatePaymentStatus);
router.post('/payments/:id/refund', processRefund);



module.exports = router;