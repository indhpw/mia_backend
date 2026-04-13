const { Device } = require('../models');

const registerDevice = async (req, res) => {
  try {
    console.log('Permintaan ke /register-device');
    const device = await Device.create({
      device_id,
      fcm_token,
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

exports.updateFcmToken = async (req, res) => {
    try {
        const { device_id, fcm_token } = req.body;

        const device = await Device.findByPk(device_id);

        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        device.fcm_token = fcm_token;
        await device.save();

        res.json({ message: 'FCM token updated' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { registerDevice };