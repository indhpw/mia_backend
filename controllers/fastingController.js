const { body, param, validationResult } = require('express-validator');
const { Op, where } = require('sequelize');
const db = require('../models');
const { messaging } = require('firebase-admin');
const FastingDebt = db.FastingDebt;
const FastingPayment = db.FastingPayment;
const MenstruationRecord = db. MenstruationRecord;
const momentHijri = require('moment-hijri');

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

            // //test saat ramadan
            // const isTestRamadan = true;
            // const m = momentHijri();
            // const hijriMonth = isTestRamadan ? 8 : m.iMonth();

            //cek apakah Ramadan
            const m = momentHijri();
            const hijriMonth = m.iMonth() + 1;  //dari 0, Ramadan di 8

            const isRamadan = hijriMonth === 9;

            console.log("HIJRI MONTH: ", hijriMonth);
            console.log("MODE:", hijriMonth === 8 ? "RAMADAN" : "NON-RAMADAN");

            //kalo Ramadan
            if (isRamadan) {

                if (!record_id) {
                    return res.status(404).json({
                        error: "Saat Ramadan, hutang puasa harus berasal dari data menstruasi"
                    });
                }

                const record = await MenstruationRecord.findOne({
                    where: {record_id, device_id }
                });

                if (!record) {
                    return res.status(404).json({
                        error: 'Menstruation record not found'
                    })
                }
            }
            else {
            if (record_id) {
                const record = await MenstruationRecord.findOne({
                    where: { record_id, device_id }
                });
                if (!record) {
                    return res.status(404).json({ 
                    error: 'Menstruation record not found' });
                    }
                }
            }

            //create debt
            const debt = await FastingDebt.create({
                device_id,
                record_id: record_id || null,
                missed_days,
                status: 'belum_lunas',
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
        const debtId = parseInt(req.params.debt_id);
        const { payment_date, amount } = req.body;

        const debt = await FastingDebt.findByPk(debtId);

        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }

        const payment = await FastingPayment.create({
            debt_id: debtId,
            device_id: debt.device_id, 
            payment_date,
            amount
        });

        // hitung total payment
        const totalPaid = await FastingPayment.sum('amount', {
            where: { debt_id : debtId }
        });

            if (totalPaid >= debt.missed_days) {
                debt.status = 'lunas';
            } else {
                debt.status = 'belum_lunas';
            }

            debt.updated_at = new Date();

            await debt.save({ fields: ['status', 'updated_at'] });

        res.status(201).json(payment);
        
        console.log("TOTAL PAID:", totalPaid);
        console.log("MISSED DAYS:", debt.missed_days);
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

        res.status(200).json(debts);
    } catch (error) {
        console.error('Error fetching fasting debts:', error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

exports.updateFastingDebt = async (req, res) => {
    try {
        const { debt_id } = req.params;
        const { status } = req.body;

        const debt = await FastingDebt.findByPk(debt_id);
        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        if (status !== undefined) debt.status = status;

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