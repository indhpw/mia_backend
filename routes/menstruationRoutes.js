const express = require('express');
const router = express.Router();
const menstruationController = require('../controllers/menstruationController');

// Log untuk debugging impor controller
console.log('updateMenstruationRecord:', menstruationController.updateMenstruationRecord);
console.log('createMenstruationRecord:', menstruationController.createMenstruationRecord);
console.log('predictNextCycle:', menstruationController.predictNextCycle);

// Rute untuk manajemen record menstruasi
router.post(
  '/records',
  ...(menstruationController.validateCreateMenstruationRecord || []),
  menstruationController.createMenstruationRecord
);
router.get('/records', menstruationController.getMenstruationRecords);
router.put('/records/:record_id',
     ...(menstruationController.validateUpdateMenstruationRecord ||[]),
    menstruationController.updateMenstruationRecord
);
router.get('/predict', menstruationController.predictNextCycle);
router.get('/countdown/:device_id', menstruationController.getNextCycleCountdown);
router.get('/records/latest', menstruationController.getLatestMenstruationRecord);

module.exports = router; 