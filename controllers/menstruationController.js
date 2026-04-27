const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const models = require('../models');
const FastingDebt = models.FastingDebt;
const MenstruationRecord = models.MenstruationRecord;
const Device = models.Device;
const FastingPayment = models.FastingPayment;
const moment = require('moment');
const momentHijri = require('moment-hijri');


// atur ke bahasa Inggris untuk tanggal kalender gregorian
moment.locale('en');

// validasi middleware untuk create
const validateCreateMenstruationRecord = [
  body('device_id')
    .isInt({ min: 1 }).withMessage('device_id must be a positive integer')
    .toInt(),
  body('start_date')
    .isISO8601().toDate().withMessage('start_date must be a valid date (YYYY-MM-DD)')
    .notEmpty().withMessage('start_date is required'),
  body('end_date')
    .optional({ nullable: true, checkFalsy: false })
    .custom((value, { req }) => {
      if (value === null || value === undefined) return true;
      if (!moment(value, 'YYYY-MM-DD', true).isValid()) {
        throw new Error('end_date must be a valid date (YYYY-MM-DD)');
      }
      if (req.body.start_date && new Date(value) <= new Date(req.body.start_date)) {
        throw new Error('end_date must be after start_date');
      }
      return true;
    })
    .toDate(),
];

// validasi middleware untuk update
const validateUpdateMenstruationRecord = [
  body('device_id')
  .optional()
    .isInt({ min: 1 }).withMessage('device_id must be a positive integer')
    .toInt(),
  body('start_date')
  .optional()
    .isISO8601().toDate().withMessage('start_date must be a valid date (YYYY-MM-DD)')
    .notEmpty().withMessage('start_date is required'),
  body('end_date')
    .optional({ nullable: true, checkFalsy: false })
    .custom((value, { req }) => {
      if (value === null || value === undefined) return true;
      if (!moment(value, 'YYYY-MM-DD', true).isValid()) {
        throw new Error('end_date must be a valid date (YYYY-MM-DD)');
      }
      if (req.body.start_date && new Date(value) <= new Date(req.body.start_date)) {
        throw new Error('end_date must be after start_date');
      }
      return true;
    })
    .toDate(),
];

// fungsi utility untuk convert tanggal gregorian ke hijriah
const convertToHijri = (gregorianDate) => {
  if (!gregorianDate || !moment(gregorianDate).isValid()) {
    return momentHijri().format('iD-iM-iYYYY'); // Fallback to current Hijri date
  }
  try {
    return momentHijri(gregorianDate).format('iD-iM-iYYYY'); // Format: ٥-١٢-١٤٤٦
  } catch (error) {
    console.error('Error converting to Hijri:', { error: error.message, gregorianDate });
    return momentHijri().format('iD-iM-iYYYY'); // Fallback
  }
};

// fungsi utility untuk mengecek apakah ramadan
const isRamadan = (gregorianDate) => {
  if (!gregorianDate || !moment(gregorianDate).isValid()) return false;
  try {
    return momentHijri(gregorianDate).iMonth() + 1 === 9; // Ramadan is the 9th month
  } catch (error) {
    console.error('Error checking Ramadan:', { error: error.message, gregorianDate });
    return false;
  }
};

// fungsi utility unruk menghitung period length
const calculatePeriodLength = (startMoment, endMoment) => {
  if (startMoment && endMoment && endMoment.isValid() && startMoment.isValid()) {
    return endMoment.diff(startMoment, 'days') + 1;
  }
  return 8;
};

// fungsi utility untuk menghitung cycle length
const calculateCycleLength = async (device_id, start_date) => {
  try {
    const previousRecord = await MenstruationRecord.findOne({
      where: { 
        device_id,
      start_date: { [Op.lt]: start_date}
     },
      order: [['start_date', 'DESC']],
      attributes: ['start_date'],
    });
    if (previousRecord && start_date && moment(start_date).isValid()) {
      const currentStart = moment(start_date).startOf('day');
      const previousStart = moment(previousRecord.start_date).startOf('day');
      if (currentStart.isValid() && previousStart.isValid()) {
        const diff = currentStart.diff(previousStart, 'days');
        return diff > 0 ? diff : 28; 
      }
    }
    return 28; 
  } catch (error) {
    console.error('Error calculating cycle length:', { error: error.message, device_id, start_date });
    return 28;
  }
};

// fungsi utility untuk GET device_record_number berikutnya
const getNextDeviceRecordNumber = async (device_id) => {
  try {
    const count = await MenstruationRecord.count({ where: { device_id } });
    return count + 1;
  } catch (error) {
    console.error('Error getting device_record_number:', { error: error.message });
    return 1; 
  }
};

// fungsi utility untuk menghitung hutang puasa ramadan
const calculateMissedDaysInRamadan = (startMoment, endMoment) => {
  if (!startMoment || !endMoment || !endMoment.isValid() || !startMoment.isValid()) {
    return 0;  
  }

  let missedDays = 0;
  let current = startMoment.clone();

  while (current.isSameOrBefore(endMoment, 'day')) {
    if (isRamadan(current)) {
      missedDays++;
    }
    current.add(1, 'day');
  }

  return missedDays;  
};

// POST: Create a menstruation record
const createMenstruationRecord = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { device_id, start_date, end_date } = req.body;

    // Validatsi device_id
    const device = await Device.findByPk(device_id);
    if (!device) {
      return res.status(404).json({ error: 'Invalid device_id' });
    }

    // Format dates
    const startMoment = moment(start_date).startOf('day');
    const endMoment = end_date ? moment(end_date).startOf('day') : null;

    // hitung period and cycle lengths
    const period_length = calculatePeriodLength(startMoment, endMoment);
    const cycle_length = await calculateCycleLength(device_id, start_date);

    // Convert ke Hijri and check Ramadan
    const hijri_start_date = convertToHijri(start_date);
    const hijri_end_date = end_date ? convertToHijri(end_date) : convertToHijri(start_date);
    const is_ramadan = endMoment 
      ? calculateMissedDaysInRamadan(startMoment, endMoment) > 0
      : isRamadan(start_date);

    // Get device_record_number
    const device_record_number = await getNextDeviceRecordNumber(device_id);

    // simpan record
    const record = await MenstruationRecord.create({
      device_id,
      device_record_number,
      start_date: startMoment.format('YYYY-MM-DD'),
      end_date: endMoment ? endMoment.format('YYYY-MM-DD') : null,
      hijri_start_date,
      hijri_end_date,
      is_ramadan,
      cycle_length,
      period_length,
      created_at: new Date(),
    });

  //catat hutang puasa jika  sedang dalam bulan ramadan
// Hitung jumlah hari haid yang jatuh di bulan Ramadan
  if (endMoment) {
    let ramadanHaulDays = 0;
    let currentDate = startMoment.clone();

  while (currentDate.isSameOrBefore(endMoment, 'day')) {
    // Cek apakah hari ini termasuk Ramadan (bulan Hijriah ke-9)
      if (isRamadan(currentDate)) {
        ramadanHaulDays++;
      }
      currentDate.add(1, 'day');
    }

  // Jika ada hari haid di Ramadan → buat hutang puasa
    if (ramadanHaulDays > 0) {
      await FastingDebt.create({
        device_id,
        record_id: record.record_id,
        missed_days: ramadanHaulDays,  
        status: 'belum_lunas',
        created_at: new Date()
      });

    console.log(`Created FastingDebt: ${ramadanHaulDays} hari haid di Ramadan`);
    }
  }

    console.log('Menstruation Record created:', record.toJSON());
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating menstruation record:', { error: error.message, stack: error.stack, input: req.body });
    next(error);
  }
};

// GET: Fetch menstruation records
const getMenstruationRecords = async (req, res, next) => {
  try {
    const { device_id } = req.query;
    if (!device_id || !Number.isInteger(parseInt(device_id)) || parseInt(device_id) < 1) {
      return res.status(400).json({ error: 'device_id must be a positive integer' });
    }
    const records = await MenstruationRecord.findAll({
      where: { device_id: parseInt(device_id) },
      order: [['start_date', 'DESC']],
    });
    const formattedRecords = records.map(record => ({
      ...record.toJSON(),
      start_date: moment(record.start_date).format('YYYY-MM-DD'),
      end_date: record.end_date ? moment(record.end_date).format('YYYY-MM-DD') : null,
    }));
    res.status(200).json(formattedRecords);
  } catch (error) {
    console.error('Error fetching menstruation records:', { error: error.message, stack: error.stack, input: req.query });
    next(error);
  }
};

// PUT: Update menstruation record
const updateMenstruationRecord = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { record_id } = req.params;
    const { end_date, period_length, cycle_length } = req.body;

    const record = await MenstruationRecord.findByPk(record_id);
    if (!record) {
      console.log(`Record not found for record_id: ${record_id}`);
      return res.status(404).json({ error: 'Record not found' });
    }

    const startMoment = moment(record.start_date).startOf('day');
    const endMoment = end_date ? moment(end_date).startOf('day') : null;

    if (end_date && endMoment.isSameOrBefore(startMoment, 'day')) {
      return res.status(400).json({ error: 'end_date must be after start_date' });
    }

    const updateData = {};
    if (end_date !== undefined) {
      updateData.end_date = endMoment ? endMoment.format('YYYY-MM-DD') : null;
      updateData.hijri_end_date = end_date ? convertToHijri(end_date) : record.hijri_end_date;
      updateData.is_ramadan = isRamadan(record.start_date) || (end_date && isRamadan(end_date));
    }
    if (period_length !== undefined) updateData.period_length = period_length;
    if (cycle_length !== undefined) updateData.cycle_length = cycle_length;


    await record.update(updateData);

    if(end_date !== undefined && updateData.is_ramadan){
      const missedDays = calculateMissedDaysInRamadan(startMoment, endMoment)?? 0;

    
      let debt = await FastingDebt.findOne({ where: { record_id: record.record_id } });

      if (debt) {
        const totalPaid = await FastingPayment.sum('amount', {
          where: { debt_id: debt.debt_id }
        }) || 0 ;
        let newStatus = 'belum_lunas';

        if (totalPaid >= missedDays && missedDays > 0) {
          newStatus = 'lunas';
        }
        await debt.update({
          missed_days: missedDays,
          status: missedDays === 0 ? 'lunas' : newStatus,
          updated_at: new Date()
        });
        console.log(`Updated debt_id ${debt.debt_id} to missed_days=${missedDays}`);
      } else if (missedDays > 0) {
        debt = await FastingDebt.create({
          device_id: record.device_id,
          record_id: record.record_id,
          missed_days: missedDays,
          status: 'belum_lunas',
          created_at: new Date()
        });
        console.log(`Created debt_id ${debt.debt_id} for ${missedDays} days`);
      } else {
            console.log(`No debt needed for record_id ${record.record_id} (missedDays=0)`);
      }
    } else{
      if (!updateData.is_ramadan) {
        await FastingDebt.update(
          { status: 'lunas' },
          { where : { record_id: record.record_id}}
        );
      }
  console.log(`Debt dinonaktifkan untuk record_id ${record.record_id}`);
    }

    res.status(200).json(record.toJSON());
  } catch (error) {
    console.error('Error updating menstruation record:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// GET: Predict next cycle
const predictNextCycle = async (req, res, next) => {
  try {
    const { device_id } = req.query;
    if (!device_id || !Number.isInteger(parseInt(device_id)) || parseInt(device_id) < 1) {
      return res.status(400).json({ error: 'device_id must be a positive integer' });
    }

    const records = await MenstruationRecord.findAll({
      where: { device_id: parseInt(device_id) },
      order: [['start_date', 'DESC']],
      limit: 3,
    });

    if (!records.length) {
      return res.status(404).json({ error: 'No records found for this device' });
    }

    const cycleLengths = records.map(record => record.cycle_length || 28).filter(len => len);
    const avgCycleLength = cycleLengths.length ? Math.round(cycleLengths.reduce((sum, len) => sum + len, 0) / cycleLengths.length) : 28;
    const periodLengths = records.map(record => record.period_length || 5).filter(len => len);
    const avgPeriodLength = periodLengths.length ? Math.round(periodLengths.reduce((sum, len) => sum + len, 0) / periodLengths.length) : 5;

    const lastRecord = records[0];
    const lastStartDate = moment(lastRecord.start_date).startOf('day');
    const predictedStartDate = lastStartDate.add(avgCycleLength, 'days').format('YYYY-MM-DD');
    const predictedEndDate = moment(predictedStartDate).add(avgPeriodLength - 1, 'days').format('YYYY-MM-DD');

    const predicted_hijri_start_date = convertToHijri(predictedStartDate);
    const predicted_hijri_end_date = convertToHijri(predictedEndDate);
    const predicted_is_ramadan = isRamadan(predictedStartDate) || isRamadan(predictedEndDate);

    console.log('Next cycle predicted:', { device_id, predictedStartDate });
    res.status(200).json({
      predicted_start_date: predictedStartDate,
      predicted_end_date: predictedEndDate,
      predicted_hijri_start_date,
      predicted_hijri_end_date,
      predicted_is_ramadan,
      estimated_cycle_length: avgCycleLength,
      estimated_period_length: avgPeriodLength,
    });
  } catch (error) {
    console.error('Error predicting next cycle:', { error: error.message, stack: error.stack, input: req.query });
    next(error);
  }
};

// GET: Get countdown to next cycle
const getNextCycleCountdown = async (req, res, next) => {
  try {
    const { device_id } = req.params;
    if (!device_id || !Number.isInteger(parseInt(device_id)) || parseInt(device_id) < 1) {
      return res.status(400).json({ error: 'device_id must be a positive integer' });
    }

    const records = await MenstruationRecord.findAll({
      where: { device_id: parseInt(device_id) },
      order: [['start_date', 'DESC']],
      limit: 3,
      attributes: ['start_date', 'cycle_length'],
    });

    if (!records.length) {
      return res.status(200).json({
        message: 'No records found, using default cycle length',
        next_cycle_date: moment().add(28, 'days').format('YYYY-MM-DD'),
        days_until_next_cycle: 28,
      });
    }

    const cycleLengths = records.map(record => record.cycle_length || 28).filter(len => len);
    const avgCycleLength = cycleLengths.length ? Math.round(cycleLengths.reduce((sum, len) => sum + len, 0) / cycleLengths.length) : 28;

    const lastStartDate = moment(records[0].start_date).startOf('day');
    const nextStartDate = lastStartDate.add(avgCycleLength, 'days').toDate();
    const currentDate = moment().startOf('day').toDate();

    const daysUntilNextCycle = Math.ceil((nextStartDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000));

    console.log('Countdown calculated:', { device_id, nextStartDate, daysUntilNextCycle });
    res.status(200).json({
      message: 'Countdown data retrieved successfully',
      next_cycle_date: moment(nextStartDate).format('YYYY-MM-DD'),
      days_until_next_cycle: daysUntilNextCycle,
    });
  } catch (error) {
    console.error('Error in getNextCycleCountdown:', { error: error.message, stack: error.stack, input: req.params });
    next(error);
  }
};

// GET: Latest menstruation record
const getLatestMenstruationRecord = async (req, res) => {
  try {
    const { device_id } = req.query;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const record = await MenstruationRecord.findOne({
      where: { device_id: parseInt(device_id) },
      order: [['start_date', 'DESC']],
    });

    if (!record) {
      return res.status(404).json({ error: 'No record found' });
    }

    res.status(200).json(record);
  } catch (error) {
    console.error('Error fetching latest record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  validateCreateMenstruationRecord,
  validateUpdateMenstruationRecord,
  createMenstruationRecord,
  getMenstruationRecords,
  updateMenstruationRecord,
  predictNextCycle,
  getNextCycleCountdown,
  getLatestMenstruationRecord
};