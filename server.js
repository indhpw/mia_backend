// backend/server.js
'use strict';
require("dotenv").config();

const express = require('express');
const app = express();
const sequelize = require('./config/database');
const db = require('./models');
const admin = require('firebase-admin');

console.log('Starting server...');

// Middleware
app.use(express.json());

// Log requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} Body:`, req.body);
    next();
});

// Inisialisasi Firebase
let serviceAccount;

if (process.env.FIREBASE_CONFIG) {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("Firebase initialized");
} else {
  console.log("FIREBASE_CONFIG tidak ditemukan, skip Firebase");
}

// Routes
app.use('/api/devices', require('./routes/deviceRoutes'));
app.use('/api/fasting', require('./routes/fastingRoutes'));
app.use('/api/menstruation', require('./routes/menstruationRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

console.log('All routes registered:', {
    devices: '/api/devices',
    fasting: '/api/fasting (debts, debts/:debt_id, debts/:debt_id/pay, payments)',
    menstruation: '/api/menstruation',
    notifications: '/api/notifications (test-weekly, test-ayyamul-bidh, test-cycle, test-payment)',
});

// Test endpoint
app.get('/api/test', (req, res) => {
    console.log('Hit /api/test');
    res.json({ message: 'Server is running' });
});

// Handle not found
app.use((req, res) => {
    console.log('Not found:', req.originalUrl);
    res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// Handle errors
app.use((err, req, res, next) => {
    console.error('Global error:', err.message, err.stack);
    res.status(500).json({ error: 'Kesalahan server internal', details: err.message });
});

// Sync database sequentially
async function syncDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        await db.Device.sync({ alter: false });
        await db.MenstruationRecord.sync({ alter: false });
        await db.FastingDebt.sync({ alter: false });
        await db.FastingPayment.sync({ alter: false });

        console.log('Database synchronized');
        console.log('Loading NotificationService...');
        require('./services/notificationService');
        console.log('NotificationService loaded');

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to sync database:', err);
    }
}

console.log("ENV:", process.env.DATABASE_URL);
console.log("DATABASE_URL:", process.env.DATABASE_URL);

syncDatabase();