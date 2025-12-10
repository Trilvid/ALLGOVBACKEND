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

// Sample users with complete data
const users = [
  {
    username: 'promise_onyeka',
    email: 'promise@example.com',
    password: 'password123',
    firstName: 'Promise',
    lastName: 'Onyeka',
    middleName: 'Chimdi',
    phone: '08012345678',
    dateOfBirth: new Date('1990-05-15'),
    balance: 253543.78,
    emailVerified: true,
    accountStatus: 'active',
    address: {
      street: '123 Aba Road',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      zipCode: '500001'
    },
    vehicleInfo: {
      plateNumber: 'ABC-123-XY',
      chassisNumber: 'CH1234567890ABC',
      vehicleType: 'Car',
      vehicleCategory: 'Private',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Camry 2020',
      stickerId: 'STK-001-2024',
      cardId: 'CRD-001-2024'
    },
    kyc: {
      status: 'verified',
      verificationDate: new Date(),
      bvn: '12345678901',
      nin: '12345678901234'
    },
    settings: {
      notifications: {
        email: true,
        sms: true,
        push: true
      },
      twoFactorAuth: false,
      language: 'en',
      currency: 'NGN'
    }
  },
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Michael',
    phone: '08098765432',
    dateOfBirth: new Date('1985-08-20'),
    balance: 125000.00,
    emailVerified: true,
    accountStatus: 'active',
    address: {
      street: '45 Victoria Island',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      zipCode: '101001'
    },
    vehicleInfo: {
      plateNumber: 'LAG-456-ZX',
      chassisNumber: 'CH9876543210XYZ',
      vehicleType: 'Bus',
      vehicleCategory: 'Commercial',
      vehicleBrand: 'Mercedes',
      vehicleModel: 'Sprinter 2021',
      stickerId: 'STK-002-2024',
      cardId: 'CRD-002-2024'
    },
    kyc: {
      status: 'verified',
      verificationDate: new Date(),
      bvn: '98765432109',
      nin: '98765432109876'
    }
  },
  {
    username: 'sarah_williams',
    email: 'sarah@example.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Williams',
    middleName: 'Jane',
    phone: '08123456789',
    dateOfBirth: new Date('1992-03-10'),
    balance: 87500.50,
    emailVerified: true,
    accountStatus: 'active',
    address: {
      street: '12 Independence Layout',
      city: 'Enugu',
      state: 'Enugu',
      country: 'Nigeria',
      zipCode: '400001'
    },
    vehicleInfo: {
      plateNumber: 'ENU-789-AB',
      chassisNumber: 'CH1122334455BCD',
      vehicleType: 'Car',
      vehicleCategory: 'Private',
      vehicleBrand: 'Honda',
      vehicleModel: 'Accord 2019',
      stickerId: 'STK-003-2024',
      cardId: 'CRD-003-2024'
    },
    kyc: {
      status: 'pending'
    }
  },
  {
    username: 'ahmed_bello',
    email: 'ahmed@example.com',
    password: 'password123',
    firstName: 'Ahmed',
    lastName: 'Bello',
    middleName: 'Musa',
    phone: '08156789012',
    dateOfBirth: new Date('1988-11-25'),
    balance: 456789.25,
    emailVerified: true,
    accountStatus: 'active',
    address: {
      street: '67 Ahmadu Bello Way',
      city: 'Abuja',
      state: 'FCT',
      country: 'Nigeria',
      zipCode: '900001'
    },
    vehicleInfo: {
      plateNumber: 'ABJ-321-CD',
      chassisNumber: 'CH6677889900DEF',
      vehicleType: 'SUV',
      vehicleCategory: 'Private',
      vehicleBrand: 'Range Rover',
      vehicleModel: 'Evoque 2022',
      stickerId: 'STK-004-2024',
      cardId: 'CRD-004-2024'
    },
    kyc: {
      status: 'verified',
      verificationDate: new Date(),
      bvn: '55544433322',
      nin: '55544433322111'
    }
  },
  {
    username: 'chioma_nwankwo',
    email: 'chioma@example.com',
    password: 'password123',
    firstName: 'Chioma',
    lastName: 'Nwankwo',
    middleName: 'Grace',
    phone: '08134567890',
    dateOfBirth: new Date('1995-07-18'),
    balance: 34500.00,
    emailVerified: true,
    accountStatus: 'active',
    address: {
      street: '89 Old Aba Road',
      city: 'Owerri',
      state: 'Imo',
      country: 'Nigeria',
      zipCode: '460001'
    },
    vehicleInfo: {
      plateNumber: 'IMO-654-EF',
      chassisNumber: 'CH9988776655GHI',
      vehicleType: 'Car',
      vehicleCategory: 'Uber',
      vehicleBrand: 'Hyundai',
      vehicleModel: 'Elantra 2020',
      stickerId: 'STK-005-2024',
      cardId: 'CRD-005-2024'
    },
    kyc: {
      status: 'verified',
      verificationDate: new Date(),
      bvn: '11122233344',
      nin: '11122233344555'
    }
  }
];

// Helper function to generate random transactions
const generateTransactions = (count) => {
  const types = ['deposit', 'tax payment', 'withdrawal'];
  const statuses = ['completed', 'pending', 'failed'];
  const transactions = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amount = Math.floor(Math.random() * 50000) + 1000;
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    transactions.push({
      amount: amount,
      type: type,
      status: status,
      reference: `REF-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
      description: type === 'deposit' ? 'Wallet funding via Paystack' :
        type === 'tax payment' ? 'Transportation tax payment' :
          'Withdrawal request',
      date: date.toLocaleDateString('en-GB'),
      timestamp: date
    });
  }

  return transactions;
};

// Import data
const importData = async () => {
  try {
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany();
    await TaxPayment.deleteMany();
    await TaxSubscription.deleteMany();
    await Notification.deleteMany();
    console.log('✅ Data cleared');

    console.log('👥 Creating users...');
    const createdUsers = [];

    for (const userData of users) {
      const user = new User(userData);

      // Generate tax ID
      user.generateTaxId();

      // Add transactions
      user.transaction = generateTransactions(15);

      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.username}`);
    }

    console.log('\n💰 Creating tax payments...');
    for (const user of createdUsers) {
      // Create 3-5 tax payments per user
      const paymentCount = Math.floor(Math.random() * 3) + 3;

      for (let i = 0; i < paymentCount; i++) {
        const taxTypes = ['Transportation', 'Property', 'Business', 'Vehicle'];
        const taxType = taxTypes[Math.floor(Math.random() * taxTypes.length)];
        const amount = Math.floor(Math.random() * 15000) + 3000;
        const daysAgo = Math.floor(Math.random() * 60);
        const paidDate = new Date();
        paidDate.setDate(paidDate.getDate() - daysAgo);

        await TaxPayment.create({
          taxPaymentId: `TPAY-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          userId: user._id,
          taxType: taxType,
          paymentPlan: 'Monthly',
          payFor: 'Self',
          amount: amount,
          status: 'completed',
          reference: `TAX-REF-${Date.now()}-${i}`,
          paidDate: paidDate,
          metadata: {
            vehicleInfo: user.vehicleInfo
          }
        });
      }
      console.log(`✅ Created tax payments for: ${user.username}`);
    }

    console.log('\n📅 Creating subscriptions...');
    for (const user of createdUsers) {
      // Create 2-4 subscriptions per user
      const subCount = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < subCount; i++) {
        const frequencies = ['monthly', 'quarterly', 'annually'];
        const taxTypes = ['transportation', 'property', 'business', 'vehicle'];
        const frequency = frequencies[Math.floor(Math.random() * frequencies.length)];
        const taxType = taxTypes[Math.floor(Math.random() * taxTypes.length)];
        const amount = Math.floor(Math.random() * 10000) + 2000;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));

        const expiryDate = new Date(startDate);
        switch (frequency) {
          case 'monthly':
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            break;
          case 'quarterly':
            expiryDate.setMonth(expiryDate.getMonth() + 3);
            break;
          case 'annually':
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            break;
        }

        // Make some subscriptions expiring soon
        const isExpiringSoon = i === 0; // First subscription expires soon
        if (isExpiringSoon) {
          const today = new Date();
          expiryDate.setDate(today.getDate() + Math.floor(Math.random() * 7) + 1); // 1-7 days
        }

        const subscription = new TaxSubscription({
          userId: user._id,
          name: `${frequency} ${taxType} Tax`,
          taxType: taxType,
          amount: amount,
          frequency: frequency,
          status: 'Active',
          startDate: startDate,
          expiryDate: expiryDate,
          autoRenew: Math.random() > 0.5
        });

        subscription.calculateNextPayment();
        await subscription.save();
      }
      console.log(`✅ Created subscriptions for: ${user.username}`);
    }

    console.log('\n🔔 Creating notifications...');
    for (const user of createdUsers) {
      const notifications = [
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
          message: `Your tax payment of ₦${Math.floor(Math.random() * 10000) + 3000} was successful`,
          type: 'success',
          category: 'payment',
          read: false
        },
        {
          userId: user._id,
          title: 'Wallet Funded',
          message: `₦${Math.floor(Math.random() * 50000) + 10000} has been added to your wallet`,
          type: 'success',
          category: 'payment',
          read: true
        },
        {
          userId: user._id,
          title: 'Subscription Expiring Soon',
          message: 'Your Monthly Transportation Tax will expire in 3 days',
          type: 'warning',
          category: 'subscription',
          read: false
        },
        {
          userId: user._id,
          title: 'KYC Verification',
          message: user.kyc.status === 'verified' ?
            'Your KYC verification was successful!' :
            'Please complete your KYC verification',
          type: user.kyc.status === 'verified' ? 'success' : 'warning',
          category: 'kyc',
          read: user.kyc.status === 'verified'
        }
      ];

      await Notification.insertMany(notifications);
      console.log(`✅ Created notifications for: ${user.username}`);
    }

    console.log('\n✨ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${createdUsers.length} users created`);
    console.log(`   - Each user has:`);
    console.log(`     • 15 transactions`);
    console.log(`     • 3-5 tax payments`);
    console.log(`     • 2-4 subscriptions`);
    console.log(`     • 5 notifications`);
    console.log(`     • Complete profile data`);
    console.log(`     • Vehicle information`);
    console.log(`     • KYC verification`);

    console.log('\n🔑 Test Login Credentials:');
    console.log('   Email: promise@example.com');
    console.log('   Password: password123');
    console.log('\n   Other test users:');
    console.log('   - john@example.com');
    console.log('   - sarah@example.com');
    console.log('   - ahmed@example.com');
    console.log('   - chioma@example.com');
    console.log('   (All use password: password123)');

    process.exit();
  } catch (error) {
    console.error('❌ Error importing data:', error);
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

    console.log('✅ All data destroyed!');
    process.exit();
  } catch (error) {
    console.error('❌ Error destroying data:', error);
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