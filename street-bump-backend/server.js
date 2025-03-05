const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const corsMiddleware = require('./src/config/cors');
const bumpRoutes = require('./src/routes/bumps');
const adminRoutes = require('./src/routes/admin');

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {  // Remove /api prefix
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Routes - Remove /api prefix as Firebase Functions adds it automatically
app.use('/bumps', bumpRoutes);
app.use('/admin', adminRoutes);

exports.api = onRequest({
  memory: '1GiB',
  timeoutSeconds: 300
}, app);