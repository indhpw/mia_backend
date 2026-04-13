// middleware/validators.js
const { param, body } = require('express-validator');

const validatePayment = [
    param('debt_id').isInt().withMessage('debt_id must be an integer'),
    body('device_id').isInt().withMessage('device_id must be an integer'),
    body('payment_date').isISO8601().withMessage('payment_date must be a valid date (YYYY-MM-DD)'),
    body('amount').isInt({ min: 1 }).withMessage('amount must be a positive integer')
];

const validateUpdateDebt = [
    param('debt_id').isInt().withMessage('debt_id must be an integer'),
    body('paid_days').isInt({ min: 0 }).withMessage('paid_days must be a non-negative integer'),
body('status').optional().isIn(['lunas', 'belum_lunas']).withMessage('status must be lunas or belum_lunas'),
    body('paid_dates').optional().isArray().withMessage('paid_dates must be an array')
];

module.exports = { validatePayment, validateUpdateDebt };