// backend/server.js
'use strict';
require('dotenv').config();

const app = require('./app');
const sequelize = require('./config/database');
const db = require('./models');


 const PORT = process.env.PORT || 8080;

 async function startServer() {
    try {
        await sequelize.authenticate();

        await db.Device.sync({ alter: false });
        await db.MenstruationRecord.sync({ alter: false });
        await db.FastingDebt.sync({ alter: false });
        await db.FastingPayment.sync({ alter: false });
        console.log('Database connected');

        //start server 
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);            
    });

    } catch (err){
        console.error('Startup error:', err);
    }
}
   startServer(); 