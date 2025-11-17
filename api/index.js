// This file will serve as the single entry point for Vercel
require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Ensure cors is imported
const mongoose = require('mongoose');
const path = require('path');
const app = express();

console.log('--- VERCEL API FUNCTION INVOKED ---');

// --- Database Connection Logic ---
const connectToDb = async () => {
    if (mongoose.connection.readyState === 0) {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            console.log("MongoDB connected successfully");
        } catch (err) {
            console.error('Mongo connection error:', err);
        }
    }
};
connectToDb();

// --- Other Middleware (ensure these are AFTER CORS) ---
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('Express middleware configured after CORS');

// --- ROUTE IMPORTS (UNCOMMENT THESE!) ---
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const adminRoutes = require('./../routes/adminRoutes')
const paymentRoutes = require('../routes/paymentRoutes');
const taxRoutes = require('../routes/taxRoutes');

// --- ROUTES MOUNTING (UNCOMMENT THESE!) ---
app.use('/api/auth', authRoutes); 
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/tax', taxRoutes);

const authController = require('./controllers/authController');
const { protect } = require('./middleware/auth');
app.get('/api/users/getData', protect, authController.getMe);

// API info endpoint
app.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'Tax Payment System API',
    version: '1.0.0',
    documentation: process.env.API_DOCS_URL || 'Coming soon',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        changePassword: 'PUT /api/auth/change-password',
        logout: 'POST /api/auth/logout'
      },
      user: {
        profile: 'GET /api/users/profile',
        updateProfile: 'PUT /api/users/profile',
        vehicleInfo: 'PUT /api/users/vehicle-info',
        uploadImage: 'POST /api/users/upload-profile-image',
        settings: 'PUT /api/users/settings',
        kyc: 'POST /api/users/kyc',
        notifications: 'GET /api/users/notifications',
        deleteAccount: 'DELETE /api/users/account'
      },
      payment: {
        initialize: 'POST /api/payment/initialize',
        verify: 'GET /api/payment/verify/:reference',
        transactions: 'GET /api/payment/transactions',
        withdraw: 'POST /api/payment/withdraw',
        webhook: 'POST /api/payment/webhook'
      },
      tax: {
        pay: 'POST /api/tax/pay',
        verify: 'GET /api/tax/verify/:reference',
        payments: 'GET /api/tax/payments',
        payment: 'GET /api/tax/payment/:id',
        createSubscription: 'POST /api/tax/subscription',
        subscriptions: 'GET /api/tax/subscriptions',
        updateSubscription: 'PUT /api/tax/subscription/:id',
        dashboardStats: 'GET /api/tax/dashboard/stats'
      }
    }
  });
});



// --- Default route (optional, but good for testing root /) ---
app.get('/', (req, res) => {
    res.send('Backend API is running.');
});

module.exports = app;