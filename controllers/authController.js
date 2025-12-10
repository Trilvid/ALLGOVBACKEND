const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const sendEmail = require("./../services/emailService");
const bcrypt = require("bcryptjs");

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { firstname, lastname, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      firstName: firstname,
      lastName: lastname,
      email,
      password,
      phone
    });

    // Generate tax ID
    user.generateTaxId();

    // Generate token
    const token = generateToken(user._id);
    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    await sendEmail.sendWelcomeEmail(user);
    await sendEmail.sendVerificationEmail(email, token);

    res.status(201).json({
      status: 201,
      success: true,
      message: 'Registered successfully, Check your email to verify your account.',
      token,
      user: {
        id: user._id,
        username: user.firstName,
        email: user.email,
        taxId: user.taxId,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with matching token & check expiration
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "Invalid or expired verification link."
      });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;

    await user.save();

    res.json({
      status: true,
      message: "Email verification successful. You can now log in."
    });

  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      status: false,
      message: "An error occurred while verifying email."
    });
  }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { taxId, password } = req.body;

    // Check if user exists
    // const user = await User.findOne({ taxId });
    const user = await User.findOne({ $or: [{ taxId }, { email: taxId }] });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check account status
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact support.'
      });
    }

    // Check account status
    if (user.emailVerified === false) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified, please verify your email to continue. \n Check your inbox or spam folder'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    return res.status(200).json({
      status: 200,
      success: true,
      message: 'Login successful',
      token,
      isAdmin: user.role,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        taxId: user.taxId,
        balance: user.balance,
        profileImage: user.profileImage,
      }
    });


  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Email not found" });

    // Create token valid for 10 minutes
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    user.resetToken = resetToken;
    user.resetTokenExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;

    const message = `
      <p>You requested for password reset</p>
      <p>Click the link below to reset your password. This link expires in 10 minutes:</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `;

    await sendEmail.sendPasswordResetEmail(user, resetToken);
    //   email: user.email,
    //   subject: "Password Reset Request",
    //   html: message,
    // });

    res.json({ status: 200, message: "Password reset link sent to email" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};



exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) return res.status(400).json({ message: "Invalid token" });

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      _id: decoded.id,
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ message: "Token expired or invalid" });

    // Hash new password
    // const hashed = await bcrypt.hash(password, 10);
    user.password = password;

    // Clear reset data
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;

    await user.save();

    res.json({ status: 200, message: "Password updated successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};


// @desc    Get current user data (for frontend /api/getData endpoint)
// @route   GET /api/auth/me or /api/getData
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return data in the format your frontend expects
    res.json({
      success: true,
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      profileImage: user.profileImage,
      balance: user.balance,
      taxId: user.taxId,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      vehicleInfo: user.vehicleInfo,
      kyc: user.kyc,
      transaction: user.transaction,
      settings: user.settings,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password'
      });
    }

    const user = await User.findById(req.userId);

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};