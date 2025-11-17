const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const transactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'tax payment'],
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'pending'
  },
  reference: {
    type: String,
    unique: true
  },
  description: String,
  date: {
    type: String,
    default: () => new Date().toLocaleDateString()
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    default: 'tax user'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    trim: true,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  // Tax Information - Transportation
  vehicleInfo: {
    plateNumber: String,
    chassisNumber: String,
    vehicleType: String,
    vehicleCategory: String,
    vehicleBrand: String,
    vehicleModel: String,
    stickerId: String,
    cardId: String,
    vehicleImage: String
  },
  // KYC Information
  kyc: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    // Personal Information
    personalInfo: {
      email: String,
      phone: String,
      passportPhoto: String
    },
    // Identity Verification
    identityVerification: {
      tin: String,
      bvn: String,
      nin: String
    },
    // Origin Details
    originDetails: {
      stateOfOrigin: String,
      lgaOfOrigin: String,
      townOfOrigin: String
    },
    // Residential Details
    residentialDetails: {
      stateOfResidence: String,
      lgaOfResidence: String,
      townOfResidence: String,
      residentialAddress: String
    },
    // Business Information
    businessInfo: {
      businessType: String,
      stateOfBusiness: String,
      placeOfBusiness: String
    },
    // Vehicle Information (for tax purposes)
    taxVehicleInfo: {
      plateNumber: String,
      chassisNumber: String,
      vehicleType: String,
      vehicleBrand: String,
      vehicleModel: String
    },
    documents: [{
      type: String,
      url: String,
      uploadDate: Date
    }],
    verificationDate: Date,
    submittedAt: Date,
    completionPercentage: {
      type: Number,
      default: 0
    }
  },
  profileImage: {
    type: String,
    default: null
  },
  balance: {
    type: Number,
    default: 0
  },
  taxId: {
    type: String,
    unique: true,
    sparse: true
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  transaction: [transactionSchema],
  transactionPin: String,
  pinChangeCode: String,
  pinChangeCodeExpiry: Date,
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    twoFactorAuth: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'NGN' },
    emailNotification: { type: Boolean, default: true },
    smsAlert: { type: Boolean, default: true },
    autoRenewal: { type: Boolean, default: false },
    reminderBeforeExpiry: { type: Boolean, default: true }
  },
  resetToken: String,
  resetTokenExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate tax ID
userSchema.methods.generateTaxId = function() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  this.taxId = `tax${random}${timestamp}`;
  // this.taxId = `tax${random}${timestamp}`;
  return this.taxId;
};

// Add transaction method
userSchema.methods.addTransaction = function(transactionData) {
  this.transaction.push(transactionData);
  return this.save();
};

// Update balance method
userSchema.methods.updateBalance = function(amount, type) {
  if (type === 'deposit') {
    this.balance += amount;
  } else if (type === 'withdrawal' || type === 'tax payment') {
    this.balance -= amount;
  }
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;