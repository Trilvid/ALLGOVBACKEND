
// const express = require('express');
// const router = express.Router();
// const { isAdmin, getAllListings, getStats, getAllUsers, getApproveListing, rejectListing, deleteListing, deleteUser, blockUnblockListing, getUserWithListings } = require('../controllers/userController');
// const jwtAuth = require('./../middleware/auth')

// router.use(jwtAuth, isAdmin);
// router.get('/stats', getStats);
// router.get('/users', getAllUsers);
// router.get('/listings', getAllListings);
// router.patch('/listings/:id/approve', getApproveListing);
// router.patch('/listings/:id/reject', rejectListing);
// router.delete('/listings/:id', deleteListing);
// router.patch('/users/:id/block', blockUnblockListing);
// router.delete('/users/:id', deleteUser);
// router.get('/users/:id', getUserWithListings);


// module.exports = router;

const express = require('express');
const router = express.Router();
const { 
    isAdmin, 
    getAllListings, 
    getStats, 
    getAllUsers, 
    getApproveListing, 
    rejectListing, 
    deleteListing, 
    deleteUser, 
    blockUnblockListing, 
    getUserWithListings,
    getPendingPayments,
    approvePayment,
    rejectPayment,
    getAccountDetails,
    saveAccountDetails,
    getAllNews,
    createNews,
    updateNews,
    deleteNews
} = require('../controllers/userController');
const jwtAuth = require('./../middleware/auth');

// Account Details
router.get('/account-details', jwtAuth, getAccountDetails);

// Apply authentication and admin check to all routes
router.use(jwtAuth, isAdmin);

// Dashboard Stats
router.get('/stats', getStats);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserWithListings);
router.patch('/users/:id/block', blockUnblockListing);
router.delete('/users/:id', deleteUser);

// Listing Management
router.get('/listings', getAllListings);
router.patch('/listings/:id/approve', getApproveListing);
router.patch('/listings/:id/reject', rejectListing);
router.delete('/listings/:id', deleteListing);

// Payment Management
router.get('/pending-payments', getPendingPayments);
router.patch('/payments/:id/approve', approvePayment);
router.patch('/payments/:id/reject', rejectPayment);

// Account Details
router.post('/account-details', saveAccountDetails);

// News/Blog Management
router.get('/news', getAllNews);
router.post('/news', createNews);
router.patch('/news/:id', updateNews);
router.delete('/news/:id', deleteNews);

module.exports = router;