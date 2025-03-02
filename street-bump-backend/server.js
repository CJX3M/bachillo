const functions = require('firebase-functions');
const express = require('express');
const corsMiddleware = require('./src/config/cors');
const bumpRoutes = require('./src/routes/bumps');
const adminRoutes = require('./src/routes/admin');

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/bumps', bumpRoutes);
app.use('/api/admin', adminRoutes);

exports.api = functions.runWith({
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(app);