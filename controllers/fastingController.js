const { body, param, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const db = require('../models');
const { messaging } = require('firebase-admin');
const FastingDebt = db.FastingDebt;
const FastingPayment = db.FastingPayment;
const MenstruationRecord = db. MenstruationRecord;

exports.createFastingDebt = [
    body('record_id').optional().isInt().withMessage('Record ID must be an integer'),
    body('missed_days').isInt({ min: 1 }).withMessage('Missed days must be a positive integer'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const { device_id, record_id, missed_days } = req.body;

            if (record_id) {
                const record = await MenstruationRecord.findOne({
                    where: { record_id, device_id }
                });
                if (!record) {
                    return res.status(404).json({ error: 'Menstruation record not found' });
                }
            }

            const debt = await FastingDebt.create({
                device_id,
                record_id: record_id || null,
                missed_days,
                paid_days: 0,
                status: 'belum_lunas',
                paid_dates: JSON.stringify([]),
                created_at: new Date()
            });
            console.log('Fasting debt created:', debt.toJSON());
            res.status(201).json(debt);
        } catch (error) {
console.error('FULL ERROR:', error);
console.error('SQL MESSAGE:', error.parent?.sqlMessage);
console.error('SQL:', error.parent?.sql);
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    }
];

exports.createFastingPayment = async (req, res) => {
    try {
        const { debt_id } = req.params;
        const { payment_date, amount } = req.body;

        const debt = await FastingDebt.findByPk(debt_id);

        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }

        const payment = await FastingPayment.create({
            debt_id,
            device_id: debt.device_id, // ✅ ambil dari debt
            payment_date,
            amount
        });

        res.status(201).json(payment);
    } catch (error) {
        console.error('FULL ERROR:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getPayments = async (req, res) => {
    try {
        const { device_id } = req.params;
        const payments = await FastingPayment.findAll({
            where: { device_id: parseInt(device_id) }
        });
        res.status(200).json(payments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getFastingDebts = async (req, res) => {
    try {
        const { device_id } = req.query;
        const debts = await FastingDebt.findAll({
            where: device_id ? { device_id: parseInt(device_id) } : {},
            include: [
                { model: FastingPayment, as: 'payments' },
                { model: MenstruationRecord, as: 'menstruationRecord' }
            ]
        });
        const normalizedDebts = debts.map(debt => ({
            ...debt.toJSON(),
            paid_dates: Array.isArray(debt.paid_dates)
                ? debt.paid_dates
                : JSON.parse(debt.paid_dates || '[]')
        }));
        res.status(200).json(normalizedDebts);
    } catch (error) {
        console.error('Error fetching fasting debts:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

exports.updateFastingDebt = async (req, res) => {
    try {
        const { debt_id } = req.params;
        const { paid_days, status, paid_dates } = req.body;

        const debt = await FastingDebt.findByPk(debt_id);
        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        if (paid_days !== undefined) debt.paid_days = paid_days;
        if (status !== undefined) debt.status = status;
        if (paid_dates !== undefined) debt.paid_dates = JSON.stringify(paid_dates);

        await debt.save();

        res.status(200).json({ message: 'Debt updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

exports.getFastingDebtById = async (req, res) => {
    try {
        const { debt_id } = req.params;

        const debt = await FastingDebt.findByPk(debt_id);

        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }

        res.json(debt);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteFastingDebt = [
    param('debt_id').isInt().withMessage('Debt ID must be an integer'),
    async (req, res) => {
        try {
            const { debt_id } = req.params;
            const debt = await FastingDebt.findByPk(debt_id);
            if (!debt) {
                console.log('Debt not found for debt_id:', debt_id);
                return res.status(404).json({ error: 'Debt not found' });
            }
            await FastingPayment.destroy({ where: { debt_id } });
            await debt.destroy();
            console.log('Fasting debt deleted:', debt_id);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting fasting debt:', error.stack);
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    }
];