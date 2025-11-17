// middleware/blockCheck.js
const User = require('./../models/User')

const checkIfBlocked = async (req, res, next) => {
    try {
        // req.user should be set by the auth middleware
        if (!req.user || !req.user.id) {
            return res.status(401).json({ 
                status: 'error', 
                error: 'Authentication required' 
            });
        }

        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                status: 'error', 
                error: 'User not found' 
            });
        }

        // Check if user is blocked
        if (user.isblocked) {
            return res.status(403).json({ 
                status: 'error', 
                error: 'Your account has been blocked. Please contact support.',
                isBlocked: true
            });
        }

        // Check if user's plan has expired
        if (user.plans && user.plans.length > 0) {
            const latestPlan = user.plans[user.plans.length - 1];
            if (latestPlan.endsin && new Date(latestPlan.endsin) < new Date()) {
                // Plan has expired - you can choose to block certain actions
                req.planExpired = true;

                return res.status(403).json({ 
                    status: 'error', 
                    message: 'Your Plan has Expired. Please renew plan.'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Block check error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Server error during authentication' 
        });
    }
};

module.exports = checkIfBlocked;