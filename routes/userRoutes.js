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
  verifyTransactionPin
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { updateProfileValidation, validate } = require('../middleware/validation');
const multer = require('multer');

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

module.exports = router;