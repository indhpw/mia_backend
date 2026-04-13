const fs = require('fs');
const path = require('path');
const momentHijri = require('moment-hijri');
const moment = require('moment');

const getOverride = () => {
  try {
    const filePath = path.join(__dirname, '../data/kemenag_hijri.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data).overrides;
  } catch (e) {
    console.error("Gagal baca hijri_override.json:", e.message);
    return [];
  }
};

const convertToHijri = (date) => {
  try {
    const m = momentHijri(date);

    return {
      day: m.iDate(),
      month: m.iMonth() + 1,
      year: m.iYear(),
      formatted: m.format('iDD-iMM-iYYYY')
    };

  } catch (error) {
    console.error('Error converting to Hijri:', error.message);
    return null;
  }
};

const isRamadan = (gregorianDate) => {
  const hijri = convertToHijri(gregorianDate);
  return hijri?.month === 9;
};

const getHijriDateRange = (startDate, endDate) => {
  const hijriStart = convertToHijri(startDate);
  const hijriEnd = endDate ? convertToHijri(endDate) : null;

  return {
    hijri_start_date: hijriStart?.formatted || null,
    hijri_end_date: hijriEnd?.formatted || null,
    is_ramadan: isRamadan(startDate),
  };
};

const getHijriWithOverride = (date = new Date()) => {
  const overrides = getOverride();

  const gregorian = date.toISOString().split('T')[0];

  const found = overrides.find(o => o.gregorian === gregorian);

  if (found) {
    const [day, month, year] = found.hijri.split('-').map(Number);
    return { day, month, year };
  }

  const m = momentHijri(date);
  return {
    day: m.iDate(),
    month: m.iMonth() + 1,
    year: m.iYear()
  };
};

const getTomorrowHijri = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getHijriWithOverride(tomorrow);
};

module.exports = { 
  convertToHijri, 
  isRamadan, 
  getHijriDateRange, 
  getHijriWithOverride,
  getTomorrowHijri,
};