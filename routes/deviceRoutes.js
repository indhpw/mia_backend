const express = require('express');
const router = express.Router();
const { Device } = require('../models');

// POST /api/devices/register
router.post('/register', async (req, res) => {
  try {
    const { fcmToken } = req.body;  

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
    console.error('Error registering device:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/devices/:device_id/fcm_token
router.put('/:device_id/fcm_token', async (req, res) => {
  const { device_id } = req.params;
  const { fcm_token } = req.body;

  if (!fcm_token) {
    return res.status(400).json({ error: 'fcm_token wajib dikirim' });
  }

  try {
    const device = await Device.findByPk(device_id);
    if (!device) {
      return res.status(404).json({ error: 'Device tidak ditemukan' });
    }

    await device.update({ fcm_token });

    res.status(200).json({
      success: true,
      message: 'FCM token berhasil disimpan'
    });
    
  } catch (error) {
    console.error('Error update FCM token:', error);
    res.status(500).json({ error: 'Gagal simpan token' });
  }
});

module.exports = router;