const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  verifyEmail
} = require('../controllers/authController');
const { protect, loginLimiter } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  validate
} = require('../middleware/validation');

const { lookupByTaxId } = require('../controllers/userController');

// @route   POST /api/auth/register
router.post('/register', registerValidation, validate, register);

// VERIFY EMAIL
router.get("/verify-email/:token", verifyEmail);

// @route   POST /api/auth/login
router.post('/login', loginValidation, validate, loginLimiter, login);

// @route   POST /api/auth/forgot-password
router.post("/forgotpassword", forgotPassword);
router.post("/resetpassword/:token", resetPassword);

// @route   GET /api/auth/me or /api/getData
router.get('/me', protect, getMe);
router.get('/lookup-taxid/:taxId', protect, lookupByTaxId);

// Alternative route for frontend compatibility
router.get('/getData', protect, getMe);

// @route   PUT /api/auth/change-password
router.put('/change-password', protect, changePasswordValidation, validate, changePassword);

// @route   POST /api/auth/logout
router.post('/logout', protect, logout);

module.exports = router;