const express = require('express');
const { param, body, validationResult } = require('express-validator');
const router = express.Router();

const fastingController = require('../controllers/fastingController');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

//  VALIDASI PAYMENT 
const validatePayment = [
    param('debt_id').isInt().withMessage('debt_id must be integer'),
    body('payment_date').isISO8601().withMessage('Invalid date'),
    body('amount').isInt({ min: 1 }).withMessage('amount must be positive')
];

// VALIDASI PARAM
const validateDebtId = [
    param('debt_id')
    .isInt()
    .withMessage('debt_id must be integer'),
];

const validateDeviceId = [
    param('device_id')
    .isInt({ min: 1 })
    .withMessage('device_id must be integer')
    .toInt(),
];

//UPDATE DEBT
const validateDebtUpdate = [
    param('debt_id').isInt(),
    body('status').optional().isIn(['lunas', 'belum_lunas'])
];


//  GET debt by ID
router.get('/debts/:debt_id', 
    validateDebtId,
    validate,
    fastingController.getFastingDebtById
);

//  GET debts by device 
router.get('/debts/device/:device_id',
    validateDeviceId,
    validate,
    fastingController.getFastingDebts
);

//  CREATE debt
router.post('/debts',
    fastingController.createFastingDebt
);

//  PAY debt
router.post('/debts/:debt_id/pay',
    validatePayment,
    validate,
    fastingController.createFastingPayment
);

//  GET payments
router.get('/payments/:device_id',
    validateDeviceId,
    validate,
    fastingController.getPayments
);

module.exports = router;