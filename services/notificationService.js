'use strict';

const admin = require('firebase-admin');
const cron = require('node-cron');
const momentHijri = require('moment-hijri');
const { Sequelize, Op } = require('sequelize');
const { Device, FastingDebt } = require('../models');
require('dotenv').config();

// Inisialisasi Firebase Admin (hanya sekali)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      require('../config/appmia-e39ce-firebase-adminsdk-fbsvc-f8cebe06cb.json')
    ),
  });
}

const messaging = admin.messaging();

/**
 * Hapus token FCM yang tidak valid
 */
const removeInvalidTokens = async (invalidTokens) => {
  try {
    if (invalidTokens.length === 0) return;

    await Device.update(
      { fcm_token: null },
      { where: { fcm_token: { [Op.in]: invalidTokens } } }
    );

    console.log(`Menghapus ${invalidTokens.length} token FCM tidak valid`);
  } catch (error) {
    console.error('Error removing invalid tokens:', error.stack);
  }
};

/**
 * Ambil semua user yang memiliki hutang puasa
 */
const getUsersWithHutang = async () => {
  try {

    // Hitung total missed & paid
    const debts = await FastingDebt.findAll({
      attributes: [
        'device_id',
        [Sequelize.fn('SUM', Sequelize.col('missed_days')), 'totalMissed'],
        [Sequelize.fn('SUM', Sequelize.col('paid_days')), 'totalPaid']
      ],
      group: ['device_id']
    });

    // Ambil semua device yang memiliki FCM token
    const devices = await Device.findAll({
      where: {
        fcm_token: { [Op.ne]: null }
      },
      attributes: ['device_id', 'fcm_token']
    });

    const deviceMap = new Map();

    devices.forEach(d => {
      deviceMap.set(d.device_id, d.fcm_token);
    });

    const result = [];

    for (const debt of debts) {

      const missed = Number(debt.get('totalMissed') || 0);
      const paid = Number(debt.get('totalPaid') || 0);
      const hutang = missed - paid;

      if (hutang > 0 && deviceMap.has(debt.device_id)) {
        result.push({
          device_id: debt.device_id,
          fcm_token: deviceMap.get(debt.device_id),
          hutang
        });
      }
    }

    return result;

  } catch (error) {
    console.error('Error fetching users with hutang:', error.stack);
    return [];
  }
};

/**
 * Kirim notifikasi ke banyak user sekaligus
 */
const sendBulkNotification = async (users, title, bodyGenerator) => {

  try {

    if (users.length === 0) {
      console.log('Tidak ada user yang perlu dikirim notifikasi');
      return;
    }

    const tokens = users.map(u => u.fcm_token);

    const message = {
      tokens: tokens,
      notification: {
        title: title,
        body: bodyGenerator(users[0]) // body contoh
      },
      data: {
        type: 'reminder_hutang_puasa'
      }
    };

    const response = await messaging.sendEachForMulticast(message);

    console.log(`Notifikasi terkirim: ${response.successCount} sukses`);
    console.log(`Notifikasi gagal: ${response.failureCount}`);

    const invalidTokens = [];

    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        const errorCode = resp.error.code;

        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(tokens[index]);
        }
      }
    });

    await removeInvalidTokens(invalidTokens);

  } catch (error) {
    console.error('Error sending bulk notification:', error.stack);
  }
};

/**
 * Test kirim notifikasi manual ke satu device
 */
async function sendTestNotification(fcmToken) {

  try {

    const message = {
      token: fcmToken,
      notification: {
        title: "Test Notifikasi",
        body: "Jika kamu melihat ini, berarti FCM berhasil 🎉"
      },
      data: {
        type: "test_notification"
      }
    };

    const response = await messaging.send(message);

    console.log("Test notification sent:", response);

    return {
      success: true,
      message: "Notifikasi test berhasil dikirim"
    };

  } catch (error) {

    console.error("Error sending test notification:", error);

    return {
      success: false,
      message: error.message
    };

  }
}



/**
 * ================================
 * CRON 1 - Minggu & Rabu
 * ================================
 * Pengingat bayar hutang puasa
 */
cron.schedule('0 8 * * 0,3', async () => {

  console.log('Cron Minggu & Rabu dijalankan');

  const users = await getUsersWithHutang();

  if (users.length === 0) {
    console.log('Tidak ada user dengan hutang puasa');
    return;
  }

  for (const user of users) {

    const message = `Kamu masih memiliki ${user.hutang} hari utang puasa. Yuk segera lunasi!`;

    await messaging.send({
      token: user.fcm_token,
      notification: {
        title: 'Pengingat Utang Puasa',
        body: message
      },
      data: {
        type: 'reminder_hutang_puasa'
      }
    });

  }

  console.log(`Pengingat Minggu/Rabu selesai untuk ${users.length} user`);

}, {
  timezone: 'Asia/Jakarta'
});

/**
 * ================================
 * CRON 2 - Tanggal 12,13,14 Hijriah
 * ================================
 * Pengingat khusus Ayyamul Bidh
 */
cron.schedule('0 7 * * *', async () => {

  const todayHijri = momentHijri();
  const hijriDay = todayHijri.iDate();

  if (hijriDay >= 12 && hijriDay <= 14) {

    console.log(`Tanggal ${hijriDay} Hijriah - Kirim pengingat khusus`);

    const users = await getUsersWithHutang();

    if (users.length === 0) {
      console.log('Tidak ada user dengan hutang puasa');
      return;
    }

    for (const user of users) {

      const message =
        `Hari ini tanggal ${hijriDay} Hijriah. Kamu masih memiliki ${user.hutang} hari utang puasa. Jangan lupa dibayar ya!`;

      await messaging.send({
        token: user.fcm_token,
        notification: {
          title: 'Pengingat Khusus Ayyamul Bidh',
          body: message
        },
        data: {
          type: 'reminder_hutang_puasa',
          hijri_day: hijriDay.toString()
        }
      });

    }

    console.log(`Pengingat ${hijriDay} Hijriah selesai untuk ${users.length} user`);
  }

}, {
  timezone: 'Asia/Jakarta'
});

/**
 * Export jika ingin digunakan di file lain
 */
module.exports = {
  getUsersWithHutang,
  sendTestNotification
};