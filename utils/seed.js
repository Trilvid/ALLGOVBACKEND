require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { TaxPayment, TaxSubscription } = require('../models/TaxPayment');
const Notification = require('../models/Notification');

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Sample data
const users = [
  {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '08012345678',
    balance: 50000,
    emailVerified: true,
    accountStatus: 'active',
    vehicleInfo: {
      plateNumber: 'ABC-123-XY',
      chassisNumber: 'CH1234567890',
      vehicleType: 'Car',
      vehicleCategory: 'Private',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Camry',
      stickerId: 'STK001',
      cardId: 'CRD001'
    },
    kyc: {
      status: 'verified',
      verificationDate: new Date()
    }
  },
  {
    username: 'janedoe',
    email: 'jane@example.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '08087654321',
    balance: 25000,
    emailVerified: true,
    accountStatus: 'active',
    vehicleInfo: {
      plateNumber: 'XYZ-456-AB',
      chassisNumber: 'CH0987654321',
      vehicleType: 'Bus',
      vehicleCategory: 'Commercial',
      vehicleBrand: 'Mercedes',
      vehicleModel: 'Sprinter',
      stickerId: 'STK002',
      cardId: 'CRD002'
    },
    kyc: {
      status: 'pending'
    }
  }
];

// Import data
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await TaxPayment.deleteMany();
    await TaxSubscription.deleteMany();
    await Notification.deleteMany();

    console.log('Data cleared...');

    // Create users
    const createdUsers = await User.insertMany(users);
    console.log(`${createdUsers.length} users created...`);

    // Create sample tax payments
    const taxPayments = [];
    for (const user of createdUsers) {
      // Generate tax ID
      user.generateTaxId();
      await user.save();

      // Add sample transactions
      const transactions = [
        {
          amount: 5000,
          type: 'Deposit',
          status: 'completed',
          reference: `REF-${Date.now()}-1`,
          description: 'Wallet funding via Paystack',
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleDateString()
        },
        {
          amount: 3000,
          type: 'Tax Payment',
          status: 'completed',
          reference: `REF-${Date.now()}-2`,
          description: 'Transportation tax payment',
          date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toLocaleDateString()
        },
        {
          amount: 10000,
          type: 'Deposit',
          status: 'completed',
          reference: `REF-${Date.now()}-3`,
          description: 'Wallet funding via Paystack',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString()
        },
        {
          amount: 2000,
          type: 'withdrawal',
          status: 'pending',
          reference: `REF-${Date.now()}-4`,
          description: 'Withdrawal request',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      ];

      user.transaction = transactions;
      await user.save();

      // Create tax payment
      const taxPayment = await TaxPayment.create({
        userId: user._id,
        taxType: 'Transportation',
        paymentPlan: 'Monthly',
        payFor: 'Self',
        amount: 3000,
        status: 'completed',
        reference: `REF-${Date.now()}-TAX-${user._id}`,
        paidDate: new Date(),
        metadata: {
          vehicleInfo: user.vehicleInfo
        }
      });

      taxPayments.push(taxPayment);

      // Create subscription
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      await TaxSubscription.create({
        userId: user._id,
        name: 'Monthly Transportation Tax',
        taxType: 'Transportation',
        amount: 3000,
        frequency: 'Monthly',
        status: 'Active',
        startDate: new Date(),
        expiryDate: expiryDate,
        autoRenew: true
      });

      // Create notifications
      await Notification.create([
        {
          userId: user._id,
          title: 'Welcome to Tax Payment System',
          message: 'Your account has been successfully created!',
          type: 'success',
          category: 'system',
          read: false
        },
        {
          userId: user._id,
          title: 'Payment Successful',
          message: 'Your tax payment was successful',
          type: 'success',
          category: 'payment',
          read: false
        },
        {
          userId: user._id,
          title: 'Wallet Funded',
          message: '₦10,000 has been added to your wallet',
          type: 'success',
          category: 'payment',
          read: true
        }
      ]);
    }

    console.log(`${taxPayments.length} tax payments created...`);
    console.log('Sample notifications created...');
    console.log('Data imported successfully!');
    process.exit();
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await TaxPayment.deleteMany();
    await TaxSubscription.deleteMany();
    await Notification.deleteMany();

    console.log('Data destroyed!');
    process.exit();
  } catch (error) {
    console.error('Error destroying data:', error);
    process.exit(1);
  }
};

// Run based on command
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Please use: npm run seed -i (import) or npm run seed -d (delete)');
  process.exit();
}