const moment = require('moment-hijri');

const convertToHijri = (date) => {
  try {
    const hijriDate = moment(date).format('iDD-iMM-iYYYY');
    return hijriDate;
  } catch (error) {
    console.error('Error converting to Hijri:', error.message);
    return null; // Atau format default
  }
};

const isRamadan = (gregorianDate) => {
  const hijri = convertToHijri(gregorianDate);
  return hijri.month === 9; // Ramadan adalah bulan ke-9
};

const getHijriDateRange = (startDate, endDate) => {
  const hijriStart = convertToHijri(startDate);
  const hijriEnd = endDate ? convertToHijri(endDate) : null;
  return {
    hijri_start_date: hijriStart.formatted,
    hijri_end_date: hijriEnd ? hijriEnd.formatted : null,
    is_ramadan: isRamadan(startDate),
  };
};

module.exports = { convertToHijri, isRamadan, getHijriDateRange };