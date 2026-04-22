// routes/notificationRoutes.js
'use strict';
const express = require('express');
const router = express.Router();
const { 
    sendWeeklyReminder, 
    sendAyyamulBidhReminder, 
    sendCycleReminder, 
    sendPaymentConfirmation,
    getUsersWithHutang
} = require('../services/notificationService'); 
const { Device } = require('../models');  

console.log('notificationRoutes.js loaded');

// Endpoint test reminder senin kamis
router.post('/test-weekly', async (req, res) => {
    try {
        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ error: 'fcmToken diperlukan' });
        }

        const result = await sendWeeklyReminder(fcmToken, true); 

        res.status(200).json(result);

    } catch (error) {
        console.error('Error testing weekly reminder:', error);
        res.status(500).json({ error: error.message });
    }
});

//endpoint reminder untuk puasa senin kamis
router.post('/weekly', async (req, res) => {
    try {
        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ error: 'fcmToken diperlukan' });
        }

        const result = await sendWeeklyReminder(fcmToken, false);

        res.status(200).json(result);

    } catch (error) {
        console.error('Error weekly reminder:', error);
        res.status(500).json({ error: error.message });
    }
});

//endpoint test reminder puasa ayyamul bidh
router.post('/test-ayyamul-bidh', async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ error: 'fcmToken diperlukan' });
        }
        const result = await sendAyyamulBidhReminder(fcmToken);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error testing Ayyamul Bidh reminder:', error.stack);
        res.status(500).json({ error: 'Kesalahan server internal', details: error.message });
    }
});

//endpoint reminder puasa ayyamul bidh
router.post('/ayyamul-bidh', async (req, res) => {
    try {
        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ error: 'fcmToken diperlukan' });
        }

        const result = await sendAyyamulBidhReminder(fcmToken);

        res.status(200).json(result);

    } catch (error) {
        console.error('Error ayyamul bidh reminder:', error);
        res.status(500).json({ error: error.message });
    }
});


router.post('/test-payment', async (req, res) => {
    try {
        const { fcmToken, debtId, paymentDate } = req.body;
        if (!fcmToken || !debtId || !paymentDate) {
            return res.status(400).json({ error: 'fcmToken, debtId, dan paymentDate diperlukan' });
        }
        const result = await sendPaymentConfirmation(fcmToken, debtId, paymentDate);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error testing payment confirmation:', error.stack);
        res.status(500).json({ error: 'Kesalahan server internal', details: error.message });
    }
});

// Endpoint utama untuk menyimpan/update FCM token (sudah ada, tapi diperbaiki)
router.post('/save-token', async (req, res) => {
    try {
        const { device_id, token } = req.body;
        if (!device_id || !token) {
            return res.status(400).json({ error: 'device_id dan token diperlukan' });
        }

        const [updated] = await Device.update(
            { fcm_token: token },
            { where: { device_id } }  
        );

        if (updated === 0) {
            return res.status(404).json({ error: 'Device tidak ditemukan' });
        }

        console.log(`FCM token updated for device_id ${device_id}: ${token}`);
        res.status(200).json({ message: 'FCM token saved successfully' });
    } catch (error) {
        console.error('Error saving FCM token:', error.stack);
        res.status(500).json({ error: 'Kesalahan server internal', details: error.message });
    }
});

router.post('/test', async (req, res) => {

  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({
      error: "fcmToken wajib diisi"
    });
  }

const { sendTestNotification } = require('../services/notificationService');
const result = await sendTestNotification(fcmToken);

  res.json(result);

});

router.post('/register', async (req, res) => {
    try {
        const { fcmToken } = req.body || {};  

        const device = await Device.create({
            fcm_token: fcmToken || null,
            created_at: new Date(),
        });

        console.log('Device created:', device.toJSON());

        res.status(201).json({
            success: true,
            device_id: device.device_id,
            message: 'Device berhasil didaftarkan'
        });
    } catch (error) {
        console.error('Error registering device:', error.stack);
        res.status(500).json({ error: 'Kesalahan server internal', details: error.message });
    }
});

 //buat tes aja
router.get('/test-hutang', async (req, res) => {
  try {
    const data = await getUsersWithHutang();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;