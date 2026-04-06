'use strict';
const db = require('../models');

const syncDebt = async (debtId) => {
    try {
        const payments = await db.FastingPayment.findAll({ where: { debt_id: debtId } });
        const paidDays = payments.reduce((total, p) => total + (p.amount || 1), 0); // jika pakai amount
        const paidDates = payments.map((p) => p.payment_date);

        const debt = await db.FastingDebt.findByPk(debtId);

        if (!debt) {
            console.warn(`Debt with ID ${debtId} not found`);
            return;
        }

        // Pastikan paid_dates tersimpan sebagai array
        const currentPaidDates = Array.isArray(debt.paid_dates)
            ? debt.paid_dates
            : typeof debt.paid_dates === 'string'
                ? JSON.parse(debt.paid_dates || '[]')
                : [];

        await debt.update({
            paid_days: paidDays,
            paid_dates: paidDates,
            status: paidDays >= debt.missed_days ? 'lunas' : 'belum_lunas',
        });

        console.log(`Debt ${debtId} synchronized: paid_days=${paidDays}, paid_dates=[${paidDates.join(', ')}]`);
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
