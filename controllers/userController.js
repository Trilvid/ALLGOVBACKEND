const User = require('../models/User');
const { uploadFile } = require('../utils/fileUpload');
const bcrypt = require('bcryptjs');
const EmailService = require('./../services/emailService')

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      middleName,
      phone,
      dateOfBirth,
      address
    } = req.body;

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (middleName) user.middleName = middleName;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (address) user.address = { ...user.address, ...address };

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update vehicle information
// @route   PUT /api/user/vehicle-info
// @access  Private
exports.updateVehicleInfo = async (req, res) => {
  try {
    const {
      plateNumber,
      chassisNumber,
      vehicleType,
      vehicleCategory,
      vehicleBrand,
      vehicleModel,
      stickerId,
      cardId
    } = req.body;

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update vehicle info
    user.vehicleInfo = {
      ...user.vehicleInfo,
      plateNumber: plateNumber || user.vehicleInfo?.plateNumber,
      chassisNumber: chassisNumber || user.vehicleInfo?.chassisNumber,
      vehicleType: vehicleType || user.vehicleInfo?.vehicleType,
      vehicleCategory: vehicleCategory || user.vehicleInfo?.vehicleCategory,
      vehicleBrand: vehicleBrand || user.vehicleInfo?.vehicleBrand,
      vehicleModel: vehicleModel || user.vehicleInfo?.vehicleModel,
      stickerId: stickerId || user.vehicleInfo?.stickerId,
      cardId: cardId || user.vehicleInfo?.cardId
    };

    await user.save();

    res.json({
      success: true,
      message: 'Vehicle information updated successfully',
      data: user.vehicleInfo
    });
  } catch (error) {
    console.error('Update vehicle info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Upload profile image
// @route   POST /api/user/upload-profile-image
// @access  Private
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Upload file (you'll implement this based on your storage choice)
    const imageUrl = await uploadFile(req.file);
    
    user.profileImage = imageUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      imageUrl
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update settings
// @route   PUT /api/user/settings
// @access  Private
exports.updateSettings = async (req, res) => {
  try {
    const { notifications, twoFactorAuth, language, currency, emailNotification, smsAlert, autoRenewal, reminderBeforeExpiry } = req.body;

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update settings
    if (notifications) {
      user.settings.notifications = {
        ...user.settings.notifications,
        ...notifications
      };
    }
    
    if (twoFactorAuth !== undefined) {
      user.settings.twoFactorAuth = twoFactorAuth;
    }
    
    if (language) user.settings.language = language;
    if (currency) user.settings.currency = currency;

    if (emailNotification !== undefined) user.settings.emailNotification = emailNotification;
    if (smsAlert !== undefined) user.settings.smsAlert = smsAlert;
    if (autoRenewal !== undefined) user.settings.autoRenewal = autoRenewal;
    if (reminderBeforeExpiry !== undefined) user.settings.reminderBeforeExpiry = reminderBeforeExpiry;

    await user.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: user.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// Request PIN change code
exports.requestPinChangeCode = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with expiry (10 minutes)
    user.pinChangeCode = code;
    user.pinChangeCodeExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    // // Send email with code
    await EmailService.sendEmail({
      to: user.email,
      email: user.email,
      subject: 'Transaction PIN Change Verification',
      html: `Your verification code is: ${code}. Valid for 10 minutes.`
    });

    // Mask email for response
    const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

    // console.log({code, maskedEmail})

    res.json({ 
      code,
      email: maskedEmail,
      message: 'Verification code sent to your email' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Change transaction PIN
exports.changeTransactionPin = async (req, res) => {
  try {
    const { newPin } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    // Hash and save new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);
    user.transactionPin = hashedPin;
    
    // Clear verification code
    user.pinChangeCode = undefined;
    user.pinChangeCodeExpiry = undefined;
    
    await user.save();

    res.json({ message: 'Transaction PIN changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Change transaction PIN
exports.verifyCode = async (req, res) => {
  try {
    const { verificationCode } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify code
    if (!user.pinChangeCode || user.pinChangeCode !== verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Check code expiry
    if (Date.now() > user.pinChangeCodeExpiry) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    res.json({ message: 'Verification code is valid' });    
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify transaction PIN for sensitive actions
exports.verifyTransactionPin = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid 4-digit PIN' 
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check if user has set a transaction PIN
    if (!user.transactionPin) {
      return res.status(400).json({ 
        success: false,
        message: 'Please set up your transaction PIN first' 
      });
    }

    // Verify PIN
    const bcrypt = require('bcryptjs');
    const isValidPin = await bcrypt.compare(pin, user.transactionPin);

    if (!isValidPin) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid transaction PIN' 
      });
    }

    res.json({ 
      success: true,
      message: 'PIN verified successfully' 
    });
  } catch (error) {
    console.error('Verify PIN error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};


// @desc    Submit KYC documents
// @route   POST /api/users/kyc
// @access  Private
exports.submitKYC = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Parse KYC data from form
    const kycData = req.body.kycData ? JSON.parse(req.body.kycData) : {};

    // Handle passport photo upload
    let passportPhotoUrl = null;
    if (req.files && req.files.length > 0) {
      const passportFile = req.files[0];
      passportPhotoUrl = await uploadFile(passportFile);
    }

    // Update KYC information
    user.kyc.personalInfo = {
      email: kycData.personalInfo?.email || user.email,
      phone: kycData.personalInfo?.phone || user.phone,
      passportPhoto: passportPhotoUrl || user.kyc.personalInfo?.passportPhoto
    };

    user.kyc.identityVerification = {
      tin: kycData.identityVerification?.tin || user.kyc.identityVerification?.tin,
      bvn: kycData.identityVerification?.bvn || user.kyc.identityVerification?.bvn,
      nin: kycData.identityVerification?.nin || user.kyc.identityVerification?.nin
    };

    user.kyc.originDetails = {
      stateOfOrigin: kycData.originDetails?.stateOfOrigin || user.kyc.originDetails?.stateOfOrigin,
      lgaOfOrigin: kycData.originDetails?.lgaOfOrigin || user.kyc.originDetails?.lgaOfOrigin,
      townOfOrigin: kycData.originDetails?.townOfOrigin || user.kyc.originDetails?.townOfOrigin
    };

    user.kyc.residentialDetails = {
      stateOfResidence: kycData.residentialDetails?.stateOfResidence || user.kyc.residentialDetails?.stateOfResidence,
      lgaOfResidence: kycData.residentialDetails?.lgaOfResidence || user.kyc.residentialDetails?.lgaOfResidence,
      townOfResidence: kycData.residentialDetails?.townOfResidence || user.kyc.residentialDetails?.townOfResidence,
      residentialAddress: kycData.residentialDetails?.residentialAddress || user.kyc.residentialDetails?.residentialAddress
    };

    user.kyc.businessInfo = {
      businessType: kycData.businessInfo?.businessType || user.kyc.businessInfo?.businessType,
      stateOfBusiness: kycData.businessInfo?.stateOfBusiness || user.kyc.businessInfo?.stateOfBusiness,
      placeOfBusiness: kycData.businessInfo?.placeOfBusiness || user.kyc.businessInfo?.placeOfBusiness
    };

    user.kyc.taxVehicleInfo = {
      plateNumber: kycData.vehicleInfo?.plateNumber || user.kyc.taxVehicleInfo?.plateNumber,
      chassisNumber: kycData.vehicleInfo?.chassisNumber || user.kyc.taxVehicleInfo?.chassisNumber,
      vehicleType: kycData.vehicleInfo?.vehicleType || user.kyc.taxVehicleInfo?.vehicleType,
      vehicleBrand: kycData.vehicleInfo?.vehicleBrand || user.kyc.taxVehicleInfo?.vehicleBrand,
      vehicleModel: kycData.vehicleInfo?.vehicleModel || user.kyc.taxVehicleInfo?.vehicleModel
    };

    // Calculate completion percentage
    const completionPercentage = calculateKYCCompletion(user.kyc);
    user.kyc.completionPercentage = completionPercentage;
    user.kyc.submittedAt = new Date();
    
    // If all required fields are filled, set status to pending review
    if (completionPercentage >= 80) {
      user.kyc.status = 'pending';
    }

    await user.save();

    res.json({
      success: true,
      message: 'KYC information submitted successfully',
      data: {
        kyc: user.kyc,
        completionPercentage
      }
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to calculate KYC completion percentage
function calculateKYCCompletion(kyc) {
  let totalFields = 0;
  let filledFields = 0;

  // Personal Info (3 fields)
  totalFields += 3;
  if (kyc.personalInfo?.email) filledFields++;
  if (kyc.personalInfo?.phone) filledFields++;
  if (kyc.personalInfo?.passportPhoto) filledFields++;

  // Identity Verification (2 required: BVN, NIN)
  totalFields += 2;
  if (kyc.identityVerification?.bvn) filledFields++;
  if (kyc.identityVerification?.nin) filledFields++;

  // Origin Details (2 required fields)
  totalFields += 2;
  if (kyc.originDetails?.stateOfOrigin) filledFields++;
  if (kyc.originDetails?.townOfOrigin) filledFields++;

  // Residential Details (3 required fields)
  totalFields += 3;
  if (kyc.residentialDetails?.stateOfResidence) filledFields++;
  if (kyc.residentialDetails?.townOfResidence) filledFields++;
  if (kyc.residentialDetails?.residentialAddress) filledFields++;

  // Business Info (optional, but count if provided)
  // Vehicle Info (optional, but count if provided)

  return Math.round((filledFields / totalFields) * 100);
}


/**
 * @desc    Lookup user by Tax ID
 * @route   GET /api/users/lookup-taxid/:taxId
 * @access  Private
 */
exports.lookupByTaxId = async (req, res) => {
  try {
    const { taxId } = req.params;

    // Validate Tax ID format
    if (!taxId || taxId.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Tax ID format'
      });
    }

    // Find user by Tax ID
    const user = await User.findOne({ taxId: taxId })
      .select('taxId username firstName lastName email phone accountStatus');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this Tax ID'
      });
    }

    // Check if account is active
    if (user.accountStatus !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This account is not active'
      });
    }

    // Return basic user information
    res.json({
      success: true,
      message: 'User found',
      user: {
        taxId: user.taxId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      }
    });

  } catch (error) {
    console.log(error)
    console.error('Lookup Tax ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during lookup',
      error: error.message
    });
  }
};


// @desc    Get user notifications
// @route   GET /api/user/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    // This is a simplified version. In production, you'd have a separate Notification model
    const notifications = [
      {
        id: 1,
        title: '2 factor authentication was successfully set-up',
        time: '2m ago',
        read: false
      },
      {
        id: 2,
        title: 'Please complete your KYC',
        time: '2m ago',
        read: false
      },
      {
        id: 3,
        title: 'Payment Successful - Your tax payment for [Tax Type] was successful',
        time: '2m ago',
        read: false
      },
      {
        id: 4,
        title: 'Payment Failed - Your payment attempt failed. Please try again.',
        time: '3m ago',
        read: false
      },
      {
        id: 5,
        title: 'Upcoming Tax Due Date - Your [Monthly Transportation Tax] will expire in 3 days',
        time: '5m ago',
        read: false
      }
    ];

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete account
// @route   DELETE /api/user/account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your password'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check for active subscriptions
    const { TaxSubscription } = require('../models/TaxPayment');
    const activeSubscriptions = await TaxSubscription.find({
      userId: user._id,
      status: 'Active'
    });

    if (activeSubscriptions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please cancel all active subscriptions before deleting account'
      });
    }

    // Soft delete or hard delete based on your preference
    user.accountStatus = 'suspended';
    await user.save();
    
    // Or hard delete:
    // await User.findByIdAndDelete(req.userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};