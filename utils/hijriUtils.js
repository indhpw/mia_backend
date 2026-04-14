const fs = require('fs');
const path = require('path');
const momentHijri = require('moment-hijri');
const moment = require('moment');

const overridePath = path.join(__dirname, '../data/kemenag_hijri.json');

let overrides = [];

try {
  const raw = fs.readFileSync(overridePath);
  overrides = JSON.parse(raw).overrides;
} catch(err) {
  console.error("Gagal baca hijri_override.json:", err.message);
}

const convertMonthNameToNumber = (monthName) => {
  const months = {
    "Muharram": 1,
    "Safar": 2,
    "Rabiul Awal": 3,
    "Rabiul Akhir": 4,
    "Jumadil Awal": 5,
    "Jumadil Akhir": 6,
    "Rajab": 7,
    "Syaban": 8,
    "Ramadan": 9,
    "Syawal": 10,
    "Zulkaidah": 11,
    "Zulhijjah": 12
  };

  return months[monthName] || 0;
};

const getHijriWithOverride = (date = new Date()) => {
  const gregorian = moment(date).format('YYYY-MM-DD');

  const found = overrides.find(o => o.gregorian === gregorian);

console.log("Tanggal:", gregorian);
console.log("Override ketemu:", found);

  // kalau data override ADA
  if (found && found.hijri) {

    let day, month, year;

    if (found.hijri.includes("-")) {
      // format: 1-9-1447
      [day, month, year] = found.hijri.split("-").map(Number);
    } else {
      // format: 1 Ramadan 1447
      const parts = found.hijri.split(" ");
      day = parseInt(parts[0]);
      month = convertMonthNameToNumber(parts[1]);
      year = parseInt(parts[2]);
    }

    return { day, month, year };
  }

  // fallback kalau tidak ada override
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
  const hijri = getHijriWithOverride(gregorianDate);
  return hijri?.month === 9;
};

const getHijriDateRange = (startDate, endDate) => {
  const hijriStart = getHijriWithOverride(startDate);
  const hijriEnd = endDate ? getHijriWithOverride(endDate) : null;

  return {
    hijri_start_date: hijriStart?.formatted || null,
    hijri_end_date: hijriEnd?.formatted || null,
    is_ramadan: isRamadan(startDate),
  };
};

module.exports = { 
  convertToHijri, 
  isRamadan, 
  getHijriDateRange, 
  getHijriWithOverride,
  getTomorrowHijri,
};

console.log("Override loaded:", overrides.length);