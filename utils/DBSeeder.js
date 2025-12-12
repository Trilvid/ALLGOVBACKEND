// ✅ DATABASE SEEDER - Populate test data for revenue dashboard

const mongoose = require('mongoose');
const User = require('./models/User');
const TaxPayment = require('./models/TaxPayment');

// Nigerian States with their LGAs
const statesWithLGAs = {
  'Lagos': ['Ikeja', 'Lekki', 'Surulere', 'Alimosho', 'Ikorodu', 'Oshodi', 'Agege', 'Mushin', 'Ojo', 'Epe', 'Badagry', 'Apapa', 'Lagos Island', 'Lagos Mainland', 'Kosofe', 'Somolu', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ajeromi-Ifelodun', 'Amuwo-Odofin'],
  'Rivers': ['Port Harcourt', 'Obio-Akpor', 'Eleme', 'Ikwerre', 'Emohua', 'Oyigbo', 'Okrika', 'Degema', 'Bonny', 'Opobo', 'Andoni', 'Khana', 'Gokana', 'Tai', 'Abua', 'Ahoada East', 'Ahoada West', 'Ogba', 'Omuma', 'Etche'],
  'Kano': ['Kano Municipal', 'Gwale', 'Dala', 'Tarauni', 'Nassarawa', 'Fagge', 'Kumbotso', 'Ungogo', 'Dawakin Tofa', 'Gwarzo', 'Kiru', 'Bichi', 'Rano', 'Tudun Wada', 'Doguwa', 'Gezawa', 'Gabasawa', 'Garko', 'Gaya', 'Ajingi'],
  'Oyo': ['Ibadan North', 'Ibadan South', 'Ibadan North-East', 'Ibadan South-East', 'Ibadan North-West', 'Ibadan South-West', 'Ogbomosho North', 'Ogbomosho South', 'Oyo East', 'Oyo West', 'Akinyele', 'Afijio', 'Atiba', 'Egbeda', 'Iseyin', 'Itesiwaju', 'Kajola', 'Lagelu', 'Ogo Oluwa', 'Oluyole'],
  'Kaduna': ['Kaduna North', 'Kaduna South', 'Chikun', 'Igabi', 'Zaria', 'Sabon Gari', 'Kachia', 'Soba', 'Giwa', 'Ikara', 'Kagarko', 'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sanga', 'Zangon Kataf', 'Jaba', 'Jema\'a'],
  'Abuja': ['AMAC', 'Bwari', 'Gwagwalada', 'Kuje', 'Abaji', 'Kwali']
};

const taxTypes = ['Transportation', 'Property', 'Business', 'Income', 'Vehicle'];
const paymentPlans = ['annual', 'quarterly', 'monthly'];

// Generate Nigerian names
const firstNames = [
  'Chukwuemeka', 'Oluwaseun', 'Adebayo', 'Chioma', 'Ngozi', 'Ibrahim',
  'Fatima', 'Aisha', 'Mohammed', 'Blessing', 'Emmanuel', 'Grace',
  'Kingsley', 'Precious', 'Tunde', 'Kemi', 'Uche', 'Amaka', 'Bola', 'Yemi',
  'Emeka', 'Nneka', 'Chidi', 'Ifeoma', 'Obiora', 'Chinwe', 'Ikenna', 'Ada',
  'Musa', 'Zainab', 'Usman', 'Hauwa', 'Sani', 'Jummai', 'Kabir', 'Hafsat',
  'John', 'Mary', 'David', 'Sarah', 'Peter', 'Jane', 'Paul', 'Ruth',
  'Victor', 'Elizabeth', 'Samuel', 'Deborah', 'Daniel', 'Esther'
];

const lastNames = [
  'Okonkwo', 'Adeyemi', 'Okoro', 'Ibrahim', 'Bello', 'Okafor',
  'Abubakar', 'Eze', 'Nwosu', 'Mohammed', 'Uzoma', 'Adamu',
  'Okoli', 'Yusuf', 'Chukwu', 'Hassan', 'Nnadi', 'Lawal',
  'Obinna', 'Suleiman', 'Emeka', 'Ahmad', 'Chinedu', 'Umar',
  'Williams', 'Johnson', 'Brown', 'Taylor', 'Anderson', 'Thomas'
];

// Helper function to generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper function to get random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper function to generate random amount based on tax type
const getAmountByTaxType = (taxType) => {
  const ranges = {
    'Transportation': { min: 5000, max: 50000 },
    'Property': { min: 20000, max: 500000 },
    'Business': { min: 10000, max: 200000 },
    'Income': { min: 15000, max: 300000 },
    'Vehicle': { min: 8000, max: 100000 }
  };

  const range = ranges[taxType];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
};

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/allgove', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    // Only clear users and payments, keep admin accounts
    await User.deleteMany({ role: { $nin: ['admin', 'superadmin'] } });
    await TaxPayment.deleteMany({});
    console.log('✅ Cleared existing data');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
};

// Create users across different states
const createUsers = async () => {
  const users = [];
  const states = Object.keys(statesWithLGAs);

  console.log('Creating users...');

  // Create 50 users distributed across states
  for (let i = 0; i < 50; i++) {
    const state = randomItem(states);
    const lgas = statesWithLGAs[state];
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);

    const user = new User({
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      password: 'password123', // Will be hashed by pre-save hook
      phone: `080${Math.floor(10000000 + Math.random() * 90000000)}`,
      dateOfBirth: randomDate(new Date(1970, 0, 1), new Date(2000, 11, 31)),
      taxId: `TAX${state.substring(0, 3).toUpperCase()}${String(i).padStart(6, '0')}`,
      role: 'user',
      accountStatus: Math.random() > 0.1 ? 'active' : 'suspended', // 90% active
      walletBalance: Math.floor(Math.random() * 500000),
      kyc: {
        status: ['verified', 'pending', 'rejected', 'none'][Math.floor(Math.random() * 4)],
        submittedAt: Math.random() > 0.5 ? randomDate(new Date(2024, 0, 1), new Date()) : undefined
      }
    });

    users.push(user);
  }

  await User.insertMany(users);
  console.log(`✅ Created ${users.length} users`);
  return users;
};

// Create state admins for top 6 states
const createStateAdmins = async () => {
  const stateAdmins = [];
  const topStates = ['Lagos', 'Rivers', 'Kano', 'Oyo', 'Kaduna', 'Abuja'];

  console.log('Creating state admins...');

  for (let i = 0; i < topStates.length; i++) {
    const state = topStates[i];
    const stateAdmin = new User({
      firstName: `${state} State`,
      lastName: 'Admin',
      email: `admin.${state.toLowerCase()}@allgove.com`,
      password: 'admin123',
      phone: `081${Math.floor(10000000 + Math.random() * 90000000)}`,
      taxId: `ADMIN${state.substring(0, 3).toUpperCase()}${i}`,
      role: 'state-admin',
      assignedState: state,
      accountStatus: 'active',
      walletBalance: 0,
      kyc: {
        status: 'verified',
        submittedAt: new Date()
      }
    });

    stateAdmins.push(stateAdmin);
  }

  await User.insertMany(stateAdmins);
  console.log(`✅ Created ${stateAdmins.length} state admins`);
  return stateAdmins;
};

// Create tax payments
const createPayments = async (users) => {
  const payments = [];
  const states = Object.keys(statesWithLGAs);
  const startDate = new Date(2024, 0, 1); // January 1, 2024
  const endDate = new Date(); // Today

  console.log('Creating tax payments...');

  // Create 500 payments distributed across states
  for (let i = 0; i < 500; i++) {
    const user = randomItem(users);
    const state = randomItem(states);
    const lgas = statesWithLGAs[state];
    const lga = randomItem(lgas);
    const taxType = randomItem(taxTypes);
    const amount = getAmountByTaxType(taxType);
    const paymentPlan = randomItem(paymentPlans);
    const paidDate = randomDate(startDate, endDate);

    // Calculate next due date based on plan
    let nextDueDate = new Date(paidDate);
    if (paymentPlan === 'annual') {
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    } else if (paymentPlan === 'quarterly') {
      nextDueDate.setMonth(nextDueDate.getMonth() + 3);
    } else {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    const payment = new TaxPayment({
      user: user._id,
      taxPaymentId: `TXP${Date.now()}${i}`,
      taxType,
      amount,
      paymentPlan,
      status: Math.random() > 0.05 ? 'completed' : (Math.random() > 0.5 ? 'pending' : 'failed'), // 95% completed
      paymentMethod: randomItem(['wallet', 'card', 'bank_transfer']),
      transactionReference: `REF${Date.now()}${Math.random().toString(36).substring(7)}`,
      paidDate: paidDate,
      location: {
        country: 'Nigeria',
        state: state,
        lga: lga
      },
      autoRenew: Math.random() > 0.3, // 70% have auto-renew enabled
      nextDueDate: nextDueDate,
      reminderSent: false,
      createdAt: paidDate,
      updatedAt: paidDate
    });

    payments.push(payment);
  }

  await TaxPayment.insertMany(payments);
  console.log(`✅ Created ${payments.length} tax payments`);

  // Show distribution
  console.log('\n📊 Payment Distribution:');
  states.forEach(state => {
    const count = payments.filter(p => p.location.state === state).length;
    const revenue = payments
      .filter(p => p.location.state === state && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    console.log(`${state}: ${count} payments, ₦${revenue.toLocaleString()} revenue`);
  });

  return payments;
};

// Create some expiring subscriptions for auto-renewal testing
const createExpiringSubscriptions = async (users) => {
  const payments = [];

  console.log('Creating expiring subscriptions for auto-renewal testing...');

  // Create 10 subscriptions expiring in the next 7 days
  for (let i = 0; i < 10; i++) {
    const user = randomItem(users);
    const state = randomItem(Object.keys(statesWithLGAs));
    const lgas = statesWithLGAs[state];
    const lga = randomItem(lgas);
    const taxType = randomItem(taxTypes);
    const amount = getAmountByTaxType(taxType);

    // Set next due date within next 7 days
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + Math.floor(Math.random() * 7));

    const payment = new TaxPayment({
      user: user._id,
      taxPaymentId: `TXP${Date.now()}${i}EXP`,
      taxType,
      amount,
      paymentPlan: 'monthly',
      status: 'completed',
      paymentMethod: 'wallet',
      transactionReference: `REF${Date.now()}${i}`,
      paidDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      location: {
        country: 'Nigeria',
        state: state,
        lga: lga
      },
      autoRenew: true, // All have auto-renew enabled
      nextDueDate: nextDueDate,
      reminderSent: false
    });

    payments.push(payment);

    // Make sure user has enough balance for renewal
    user.walletBalance = Math.max(user.walletBalance, amount * 2);
    await user.save();
  }

  await TaxPayment.insertMany(payments);
  console.log(`✅ Created ${payments.length} expiring subscriptions`);
  console.log('   These will be picked up by auto-renewal system');

  return payments;
};

// Main seeder function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to database
    await connectDB();

    // Clear existing data
    await clearData();

    // Create data
    const users = await createUsers();
    const stateAdmins = await createStateAdmins();
    const payments = await createPayments(users);
    const expiringPayments = await createExpiringSubscriptions(users);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   State Admins: ${stateAdmins.length}`);
    console.log(`   Tax Payments: ${payments.length}`);
    console.log(`   Expiring Subscriptions: ${expiringPayments.length}`);

    console.log('\n🔐 Test Credentials:');
    console.log('   State Admins:');
    stateAdmins.forEach(admin => {
      console.log(`   - ${admin.email} / admin123 (${admin.assignedState})`);
    });

    console.log('\n   Regular Users:');
    users.slice(0, 5).forEach(user => {
      console.log(`   - ${user.email} / password123`);
    });

    console.log('\n🎯 You can now:');
    console.log('   1. Login as state admin to see state-specific data');
    console.log('   2. View revenue by state dashboard');
    console.log('   3. Test auto-renewal system (run renewal cron job)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };