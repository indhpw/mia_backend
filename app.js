'use strict';

const express = require('express');
const admin = require('firebase-admin');

const app = express();

//middleware
app.use(express.json());

//logging
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// firebase
try {
  if (process.env.FIREBASE_CONFIG && !admin.apps.length) {
    let serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

    serviceAccount.private_key =
      serviceAccount.private_key.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (err) {
  console.error('Firebase error:', err.message);
}

// Routes
app.use('/api/devices', require('./routes/deviceRoutes'));
app.use('/api/fasting', require('./routes/fastingRoutes'));
app.use('/api/menstruation', require('./routes/menstruationRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

//tes endpoint
app.get('/', (req, res) => {
  res.send('OK');
});

//404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Kesalahan server internal' });
});

module.exports = app;