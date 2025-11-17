const { body, validationResult } = require('express-validator');

// Validation middleware
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors)
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Register validation
exports.registerValidation = [
  body('firstname')
    .trim()
    .notEmpty()
    .withMessage('Firstname is required')
    .isLength({ min: 3 })
    .withMessage('Firstname must be at least 1 word'),

  body('lastname')
    .trim()
    .notEmpty()
    .withMessage('Lastname is required')
    .isLength({ min: 3 })
    .withMessage('Lastname must be at least 1 word'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

// Login validation
exports.loginValidation = [
  body('taxId')
    .trim()
    .notEmpty()
    .withMessage('taxId is required')
    // .istaxId()
    // .normalizetaxId()
    .withMessage('Please provide a valid taxId'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Update profile validation
exports.updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty'),
  
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty'),
  
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

// Tax payment validation
exports.taxPaymentValidation = [
  body('taxType')
    .notEmpty()
    .withMessage('Tax type is required')
    .isIn(['Transportation', 'Property', 'Business', 'Income', 'Vehicle', 'Other'])
    .withMessage('Invalid tax type'),
  
  body('paymentPlan')
    .notEmpty()
    .withMessage('Payment plan is required')
    .isIn(['One-time', 'Monthly', 'Quarterly', 'Annually'])
    .withMessage('Invalid payment plan'),
  
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  
  body('payFor')
    .optional()
    .isIn(['Self', 'Others'])
    .withMessage('Invalid pay for option')
];

// Subscription validation
exports.subscriptionValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Subscription name is required'),
  
  body('taxType')
    .notEmpty()
    .withMessage('Tax type is required'),
  
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  
  body('frequency')
    .notEmpty()
    .withMessage('Frequency is required')
    .isIn(['Monthly', 'Quarterly', 'Annually'])
    .withMessage('Invalid frequency')
];

// Change password validation
exports.changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];