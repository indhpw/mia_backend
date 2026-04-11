const express = require('express');
const { param, body, validationResult } = require('express-validator');
const router = express.Router();

const fastingController = require('../controllers/fastingController');

// ================= VALIDATION =================

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const validatePayment = [
    body('debt_id').isInt(),
    body('payment_date').isISO8601(),
    body('amount').isInt({ min: 1 }),
];

const validateDebtId = [
    param('debt_id').isInt().withMessage('debt_id must be integer'),
];

const validateDeviceId = [
    param('device_id').isInt().withMessage('device_id must be integer'),
];

const validateDebtUpdate = [
    param('debt_id').isInt(),
    body('paid_days').optional().isInt(),
    body('status').optional().isIn(['lunas', 'belum_lunas']),
    body('paid_dates').optional().isArray(),
];

// ================= ROUTES =================

// 🔹 GET debt by ID
router.get('/debts/:debt_id', 
    validateDebtId,
    validate,
    fastingController.getFastingDebtById
);

// 🔹 GET debts by device
router.get('/debts/device/:device_id',
    validateDeviceId,
    validate,
    fastingController.getFastingDebts
);

// 🔹 CREATE debt
router.post('/debts',
    fastingController.createFastingDebt
);

// 🔹 UPDATE debt
router.put('/debts/:debt_id',
    validateDebtUpdate,
    validate,
    fastingController.updateFastingDebt
);

// 🔹 PAY debt
router.post('/debts/:debt_id/pay',
    validatePayment,
    validate,
    fastingController.createFastingPayment
);

// 🔹 GET payments
router.get('/payments/:device_id',
    validateDeviceId,
    validate,
    fastingController.getPayments
);

// 🔹 CREATE payment (optional)
router.post('/payments',
    validatePayment,
    validate,
    fastingController.createFastingPayment
);

module.exports = router;