const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const corsMiddleware = require('./src/config/cors');
const bumpRoutes = require('./src/routes/bumps');
const adminRoutes = require('./src/routes/admin');
const { createReportHandler } = require('./src/controllers/reportController');
const { createReverseGeocoder } = require('./src/services/serverGeocoding');
const { db, bucket } = require('./src/config/firebase');

const app = express();

app.use(corsMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Public page with the bumps approved yesterday (Hosting rewrites /bachesNuevos here)
app.get('/bachesNuevos', createReportHandler({
  db,
  reverseGeocode: createReverseGeocoder({ apiKey: process.env.LOCATIONIQ_SERVER_KEY }),
  baseUrl: process.env.PUBLIC_BASE_URL || 'https://bachillo-v1.web.app',
  bucketName: bucket.name,
}));

// Routes
app.use('/bumps', bumpRoutes);
app.use('/admin', adminRoutes);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Export only v2 function
exports.api = onRequest({
  memory: '1GiB',
  timeoutSeconds: 300,
  minInstances: 0,
  concurrency: 80,
  cors: true
}, app);