const express = require('express');
const { param, body, validationResult } = require('express-validator');
const router = express.Router();

const fastingController = require('../controllers/fastingController');

console.log('Controller check:', fastingController);
console.log('createFastingDebt:', fastingController.createFastingDebt);
console.log('createFastingPayment:', fastingController.createFastingPayment);

console.log('fastingRoutes.js loaded');

// middleware validasi
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// ✅ VALIDATOR PAYMENT (INI YANG KAMU KURANGIN TADI)
const validatePayment = [
    body('debt_id').isInt().withMessage('debt_id must be an integer'),
    body('payment_date').isISO8601().withMessage('payment_date must be valid'),
    body('amount').isInt({ min: 1 }).withMessage('amount must be >= 1'),
];

// VALIDATOR DEBT UPDATE
const validateDebtUpdate = [
    param('debt_id').isInt().withMessage('debt_id must be integer'),
    body('paid_days').optional().isInt(),
    body('status').optional().isIn(['lunas', 'belum_lunas']),
];

// VALIDATOR GET
const validateGetDebts = [
    param('device_id').isInt().withMessage('device_id must be integer'),
];

// ================= ROUTES =================

// fasting payments
router.post('/fasting_payments', validatePayment, validate, fastingController.createFastingPayment);
router.get('/fasting_payments/:device_id', fastingController.getPayments);
router.post('/fasting/debts/:debt_id/pay', validatePayment, validate, fastingController.createFastingPayment);

// fasting debts
router.get('/fasting_debts/:device_id', validateGetDebts, validate, fastingController.getFastingDebts);
router.post('/fasting_debts', validate, fastingController.createFastingDebt);

// OPTIONAL (kalau nanti kamu buat function-nya)
/// router.put('/fasting_debts/:debt_id', validateDebtUpdate, validate, fastingController.updateFastingDebt);

module.exports = router;