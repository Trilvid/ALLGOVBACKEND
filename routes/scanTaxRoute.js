// ==========================================
// ALTERNATIVE: If you want separate route file
// ==========================================

const express = require('express');
const router = express.Router();
const { TaxSubscription, TaxPayment } = require('../models/TaxPayment');
const mongoose = require("mongoose");

router.get('/:taxId', async (req, res) => {
    try {
        const { taxId } = req.params;

        console.log(`Verifying tax payment: ${taxId}`);

        const query = {
            $or: [
                { taxPaymentId: taxId },
                { referenceNumber: taxId }
            ]
        };

        // Only add _id search if ID is valid ObjectId
        if (mongoose.Types.ObjectId.isValid(taxId)) {
            query.$or.push({ _id: taxId });
        }

        const payment = await TaxSubscription.findOne(query)
            .populate('userId', 'firstName lastName email taxId phone')
            .lean() || await TaxPayment.findOne(query)
                .populate('userId', 'firstName lastName email taxId phone')
                .lean();

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                ...payment,
                user: payment.userId
            }
        });


    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message
        });
    }
});

module.exports = router;