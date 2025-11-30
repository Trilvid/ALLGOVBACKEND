const mongoose = require('mongoose');

// Tax Payment Schema
const taxPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taxType: {
    type: String,
    enum: ['Transportation', 'Property', 'Business', 'Income', 'Vehicle', 'Other','transportation', 'property', 'business', 'income', 'vehicle', 'other'],

    required: true
  },
  paymentPlan: {
    type: String,
    enum: ['One-time', 'Monthly', 'Quarterly', 'Annually', 'one-time', 'monthly', 'quarterly', 'annually'],
    required: true
  },
  payFor: {
    type: String,
    enum: ['Self', 'Others'],
    default: 'Self'
  },
  beneficiaryInfo: {
    name: String,
    taxId: String,
    phone: String
  },
  amount: {
    type: Number,
    required: true
  },
  taxPaymentId: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'processing', 'refunded'],
    default: 'pending'
  },
  reference: {
    type: String,
    unique: true
  },
  receiptUrl: String,
  qrCodeUrl: String,
  dueDate: Date,
  paidDate: Date,
  description: String,
  metadata: {
    vehicleInfo: {
      plateNumber: String,
      chassisNumber: String,
      vehicleType: String,
      vehicleCategory: String,
      vehicleBrand: String,
      vehicleModel: String,
      stickerId: String,
      cardId: String
    }
  }
}, {
  timestamps: true
});

// Tax Subscription Schema
const taxSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  taxType: {
    type: String,
    enum: ['Transportation', 'Property', 'Business', 'Income', 'Vehicle', 'Other','transportation', 'property', 'business', 'income', 'vehicle', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  frequency: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Annually', 'monthly', 'quarterly', 'annually'],
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Cancelled', 'Paused'],
    default: 'Active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  nextPaymentDate: Date,
  autoRenew: {
    type: Boolean,
    default: false
  },
  lastPaymentDate: Date,
  totalPaid: {
    type: Number,
    default: 0
  },
  paymentHistory: [{
    amount: Number,
    date: Date,
    status: String,
    reference: String
  }]
}, {
  timestamps: true
});

// Generate Tax Payment ID
taxPaymentSchema.pre('save', function(next) {
  if (!this.taxPaymentId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.taxPaymentId = `TXP-${this.taxType.substring(0, 3).toUpperCase()}-${random}-${timestamp}`;
  }
  next();
});

// Check if subscription is expired
taxSubscriptionSchema.methods.isExpired = function() {
  return new Date() > this.expiryDate;
};

// Calculate next payment date
taxSubscriptionSchema.methods.calculateNextPayment = function() {
  const current = this.nextPaymentDate || new Date();
  
  switch(this.frequency) {
    case 'Monthly':
      this.nextPaymentDate = new Date(current.setMonth(current.getMonth() + 1));
      break;
    case 'Quarterly':
      this.nextPaymentDate = new Date(current.setMonth(current.getMonth() + 3));
      break;
    case 'Annually':
      this.nextPaymentDate = new Date(current.setFullYear(current.getFullYear() + 1));
      break;
  }
  
  return this.nextPaymentDate;
};

const TaxPayment = mongoose.model('TaxPayment', taxPaymentSchema);
const TaxSubscription = mongoose.model('TaxSubscription', taxSubscriptionSchema);

module.exports = { TaxPayment, TaxSubscription };