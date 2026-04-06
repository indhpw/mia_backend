const { Device } = require('../models');

const registerDevice = async (req, res) => {
  try {
    console.log('Permintaan ke /register-device');
    const device = await Device.create({
      created_at: new Date(),
    });
    res.status(201).json({
      message: 'Perangkat berhasil didaftarkan',
      device_id: device.device_id,
    });
  } catch (error) {
    console.error('Error di registerDevice:', error.message, error.stack);
    res.status(500).json({ error: 'Kesalahan server internal', details: error.message });
  }
};

module.exports = { registerDevice };