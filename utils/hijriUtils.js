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
  const target = moment(date);

  // cari override TERDEKAT sebelumnya
  const sorted = overrides.sort(
    (a, b) => new Date(a.gregorian) - new Date(b.gregorian)
  );

  let anchor = null;

  for (const o of sorted) {
    if (moment(o.gregorian).isSameOrBefore(target)) {
      anchor = o;
    }
  }

  if (anchor) {
    const anchorDate = moment(anchor.gregorian);
    const diffDays = target.diff(anchorDate, 'days');

    return {
      day: anchor.hijri_day + diffDays,
      month: anchor.hijri_month,
      year: anchor.hijri_year
    };
  }

  // fallback kalau tidak ada anchor sama sekali
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

console.log("Hari ini Hijri:", getHijriWithOverride());
console.log("Besok Hijri:", getTomorrowHijri());