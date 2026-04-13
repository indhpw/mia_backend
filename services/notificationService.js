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
        body: "ciee udah bisa aowkwkwk 🎉"
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

//CRON untuk notifikasi senin kamis dan ayyamul bidh
cron.schedule('0 7 * * *', async () => {

  const today = new Date().getDay();

  const m = momentHijri();
  const todayHijri = m.iDate();
  const besokHijri = m.clone().add(1, 'day').iDate();
  const hijriMonth = m.iMonth();

  // 🚫 MATIKAN SAAT RAMADAN
  if (hijriMonth === 8) {
    console.log("Ramadhan - semua notif puasa sunnah dimatikan");
    return;
  }

  const users = await getUsersWithHutang();

  // ✅ AYYAMUL BIDH (notif H-1)
  if (besokHijri >= 13 && besokHijri <= 15) {

    for (const user of users) {
      await messaging.send({
        token: user.fcm_token,
        notification: {
          title: 'Pengingat Ayyamul Bidh',
          body: `Besok tanggal ${besokHijri} Hijriah. Kamu masih punya utang puasa, mau sekalian dibayar?`
        }
      });
    }
  }

  // ✅ SENIN & KAMIS (notif H-1)
  if (today === 0 || today === 3) {

    const targetDay = today === 0 ? "Senin" : "Kamis";

    for (const user of users) {
      await messaging.send({
        token: user.fcm_token,
        notification: {
          title: 'Pengingat Puasa Sunnah',
          body: `Besok hari ${targetDay}. Kamu masih punya utang puasa, mau dibayar?`
        }
      });
    }
  }

}, {
  timezone: 'Asia/Jakarta'
});


async function sendAyyamulBidhReminder(fcmToken) {
  try {

    const m = momentHijri();
    const hijriDay = m.iDate();
    const besokHijri = m.clone().add(1, 'day'.iDate);

    const message = {
      token: fcmToken,
      notification: {
        title: "Pengingat Ayyamul Bidh",
        body: `Besok ${besokHijri} Hijriah dan kamu masih ada utang puasa. Apakah mau membayar utang puasa besok?`
      },
      data: {
        type: "ayyamul_bidh"
      }
    };

    await messaging.send(message);

    return {
      success: true,
      message: "Notifikasi Ayyamul Bidh berhasil dikirim"
    };

  } catch (error) {
    console.error("Error sendAyyamulBidhReminder:", error);
    return {
      success: false,
      message: error.message
    };
  }
}

async function sendWeeklyReminder(fcmToken, isTest = false) {

  const today = new Date().getDay();
  const m = momentHijri();
  const hijriMonth = m.iMonth();

    if (hijriMonth === 8){
    console.log("Ramadhan - semua notif puasa sunnah dimatikan");
    return;
  }

    if (today !== 0 && today !== 3) {
      return{
        success: false,
        message: " besok gaada puasa sunnah"
      };
    }

  const targetDay = today === 0 ? "Senin" : "Kamis";

  await messaging.send({
    token: fcmToken,
    notification: {
      title: "Pengingat Puasa Sunnah",
      body: `Besok hari ${targetDay} dan kamu masih ada utang puasa. Apakah mau membayar utang puasa besok?`
    }
  });

  return { success: true };
}

async function sendCycleReminder(fcmToken, startDate) {
    return {
    success: true,
    mes: "Cycle reminder dummy"
  };
}

async function sendPaymentConfirmation(fcmToken, debtId, paymentDate) {
 return {
    success: true,
    mes: "Payment confirmation dummy"
  };}

/**
 * Export jika ingin digunakan di file lain
 */
module.exports = {
  getUsersWithHutang,
  sendTestNotification,
  sendWeeklyReminder,
  sendAyyamulBidhReminder,
  sendCycleReminder
};

console.log("BESOK HIJRI:", besokHijri);
console.log("DEBUG weekly:", sendWeeklyReminder);
console.log("DEBUG ayyamul:", sendAyyamulBidhReminder);
console.log("DEBUG test notif", sendTestNotification);