const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const corsMiddleware = require('./src/config/cors');
const bumpRoutes = require('./src/routes/bumps');
const adminRoutes = require('./src/routes/admin');

const app = express();

app.use(corsMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

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