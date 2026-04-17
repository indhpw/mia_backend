'use strict';
const db = require('../models');

const syncDebt = async (debtId) => {
    try {
        // Ambil semua payment
        const payments = await db.FastingPayment.findAll({
            where: { debt_id: debtId }
        });

        // Hitung total pembayaran
        const totalPaid = payments.reduce((total, p) => total + (p.amount || 0), 0);

        const debt = await db.FastingDebt.findByPk(debtId);

        if (!debt) {
            console.warn(`Debt with ID ${debtId} not found`);
            return;
        }

        // Tentukan status baru
        let newStatus = 'belum_lunas';

        if (debt.missed_days === 0) {
            newStatus = 'tidak_berlaku';
        } else if (totalPaid >= debt.missed_days) {
            newStatus = 'lunas';
        }

        await debt.update({
            status: newStatus,
            updated_at: new Date()
        });

        console.log(
            `Debt ${debtId} synced: totalPaid=${totalPaid}, missed=${debt.missed_days}, status=${newStatus}`
        );

    } catch (error) {
        console.error(`Error syncing debt ${debtId}:`, error.stack || error.message);
    }
};

(async () => {
    try {
        const debts = await db.FastingDebt.findAll();

        for (const debt of debts) {
            await syncDebt(debt.debt_id);
        }

        console.log('All debts synchronized');
        process.exit(0);

    } catch (err) {
        console.error('Failed to synchronize debts:', err.stack || err.message);
        process.exit(1);
    }
})();