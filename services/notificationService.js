'use strict';

const admin = require('firebase-admin');
const cron = require('node-cron');
const momentHijri = require('moment-hijri');
const { Sequelize, Op, where } = require('sequelize');
const { Device, MenstruationRecord, FastingDebt, FastingPayment } = require('../models');
const { getTomorrowHijri, getHijriWithOverride } = require('../utils/hijriUtils');
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

//ambil semua user yang punya hutang puasa
const getUsersWithHutang = async () => {

  try {

      console.log("CHECK FastingPayment:", FastingPayment);


    // Hitung total missed & paid
  const debts = await FastingDebt.findAll({
    include: [
      {
        model: FastingPayment,
        as: 'payments',
        attributes: ['amount']
      }
    ]
  });

    // ambil semua device yang memiliki FCM token
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

const userMap = new Map();

for (const debt of debts) {

  const sedangHaid = isUserMenstrating(debt.deviceId);

  if(sedangHaid) {
    console.log('Skip notif device ${debt.device_id} karena sedang haid');
    continue;
  }

  const totalPaid = (debt.payments || []). reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const hutang = debt.missed_days - totalPaid;

  if (hutang > 0 && deviceMap.has(debt.device_id)) {

    if (!userMap.has(debt.device_id)) {
      userMap.set(debt.device_id, {
        device_id: debt.device_id,
        fcm_token: deviceMap.get(debt.device_id),
        hutang: 0
      });
    }

    userMap.get(debt.device_id).hutang += hutang;
  }
}

return Array.from(userMap.values());

  } catch (error) {
    console.error('Error fetching users with hutang:', error.stack);
    return [];
  }

};

//cek user apakah sedang haid atau tidak
const isUserMenstrating = async (device_id) => {
  const latestRecord = await MenstruationRecord.findOne({
    where: { device_id: deviceId },
    order: [['start_date', 'DESC']]
  });

  if(!latestRecord) return false;
  
  const start_date = new Date(latestRecord.period.length);
  
  const periodLength = 
  latestRecord.period_length && latestRecord.period_length > 0
    ? latestRecord.period_length
    : 5;

    const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + periodLength - 1);

  const today = new Date();

  return today >= startDate && today <= endDate;
  

//kirim notifikasi ke banyak user sekaligus
const sendBulkNotification = async (users, title, bodyGenerator) => {

  try {

    if (users.length === 0) {
      console.log('Tidak ada user yang perlu dikirim notifikasi');
      return;
    }

    const tokens = users.map(u => u.fcm_token);

    const message = {
      tokens: tokens,
      data: {
        title: title,
        body: bodyGenerator(users[0]),
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

// Test kirim notifikasi manual ke satu device
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

function startCronJobs() {
//CRON untuk notifikasi senin kamis dan ayyamul bidh

//buat testing, 1 menit sekali ada notif (annoying euy)
//cron.schedule('*/1 * * * *', async () => {
  
//notifikasi akan muncul pada pukul 7 malam
cron.schedule('0 19 * * *', async () => {

  const today = new Date().getDay();

  const todayHijri = getHijriWithOverride();
  const besokHijri = getTomorrowHijri();

  console.log("Hari ini Hijri:", todayHijri);
  console.log("Besok Hijri:", besokHijri);

  // MATIKAN SAAT RAMADAN
  if (todayHijri.month === 9) {
    console.log("Ramadhan - semua notif puasa sunnah dimatikan");
    return;
  }

  const users = await getUsersWithHutang();

  // AYYAMUL BIDH (notif H-1)
  if (besokHijri.day >= 13 && besokHijri.day <= 15) {

    await sendBulkNotification(
      users,
      "Pengingat Puasa Senin Kamis",
      (u) => `Kamu masih punya utang ${u.hutang} hari, apakah mau bayar besok?`
    );
  }

  // SENIN & KAMIS (notif H-1)
  if (today === 0 || today === 3) {

    const targetDay = today === 0 ? "Senin" : "Kamis";

    await sendBulkNotification(
      users,
      "Pengingat Puasa Senin Kamis",
      (u) => `Kamu masih punya utang ${u.hutang} hari, apakah mau bayar besok?`
    );
  }

}, {
  timezone: 'Asia/Jakarta'
});
}

if (process.env.NODE_ENV !== 'test'){
  startCronJobs();
}

//notifikasi ayyamul bidh
async function sendAyyamulBidhReminder(fcmToken, isTest = false) {
  try {

    const besokHijri = getTomorrowHijri();

    if (!isTest && (besokHijri.day < 13 || besokHijri.day > 15)) {
      return {
        success: false,
        message: "Besok bukan Ayyamul Bidh"
      };
    }

    const message = {
      token: fcmToken,
      data: {
        title: "Pengingat Ayyamul Bidh",
        body: `Besok ${besokHijri.day}  Hijriah dan kamu masih ada utang puasa. Apakah mau bayar besok?`,
        type: 'ayyamul_bidh'
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

//notifikasi senin kamis
async function sendWeeklyReminder(fcmToken, isTest = false) {
  
  const today = new Date().getDay();
  const m = momentHijri();
  const hijriMonth = m.iMonth() + 1;

  const isRamadan = hijriMonth === 9;

  console.log("TODAY:", today);
  console.log("IS TEST:", isTest);
  console.log("HIJRI MONTH: ", hijriMonth);

  if (!isTest) {

    if (isRamadan){
      return {
        success: false,
        message: "Ramadan - notifikasi dimatikan"
      };
    }

    if (today !== 0 && today !== 3) {
      return {
        success: false,
        message: "Besok bukan Senin/Kamis"
      };
    }
  }

  let targetDay = "Puasa Sunnah";
  if (today === 0) targetDay = "Senin";
  else if (today === 3) targetDay = "Kamis";


  await messaging.send({
    token: fcmToken,
    data: {
      title: "Pengingat Puasa Senin Kamis",
      body: `Besok hari ${targetDay} dan kamu masih ada utang puasa, apakah mau bayar besok?`,
      type: 'weekly'
    }
  });

  return { success: true };
}


module.exports = {
  getUsersWithHutang,
  sendTestNotification,
  sendWeeklyReminder,
  sendAyyamulBidhReminder
};

console.log("DEBUG weekly:", sendWeeklyReminder);
console.log("DEBUG ayyamul:", sendAyyamulBidhReminder);
console.log("DEBUG test notif", sendTestNotification);