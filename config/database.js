require('dotenv').config({ 
  path: process.env.NODE_ENV === 'test' ? '.env.test' : ',env' 
});

const { Sequelize } = require("sequelize");

const dbUrl = process.env.DATABASE_URL;

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
  logging: false 
});

module.exports = sequelize;