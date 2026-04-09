const { Sequelize } = require("sequelize");

const dbUrl = process.env.DATABASE_URL;

// 🚨 WAJIB: pastikan env kebaca
if (!dbUrl) {
  throw new Error("DATABASE_URL tidak ditemukan di environment!");
}

// 🔍 Debug (penting banget buat Railway log)
console.log("DATABASE_URL:", dbUrl);

const sequelize = new Sequelize(dbUrl, {
  dialect: "mysql",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false // biar log gak spam
});

module.exports = sequelize;