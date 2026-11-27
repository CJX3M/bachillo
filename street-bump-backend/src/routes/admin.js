const express = require('express');
const router = express.Router();
const { 
    getUnverifiedBumps,
    verifyBump,
    deleteBump 
} = require('../controllers/bumpController');
const { verifyAdminToken } = require('../middleware/auth');
const { createFixedController } = require('../controllers/fixedController');
const { createXPostHandler } = require('../controllers/reportController');
const { db, bucket } = require('../config/firebase');

const { listFixed, reopen } = createFixedController({ db, bucketName: bucket.name });

// Apply admin authentication middleware to all routes
router.use(verifyAdminToken);

// Admin routes for bumps
router.get('/bumps/unverified', getUnverifiedBumps);
router.patch('/bumps/:id/verify', verifyBump);
router.delete('/bumps/:id', deleteBump);
router.get('/bumps/fixed', listFixed);
router.patch('/bumps/:id/reopen', reopen);
router.get('/report/yesterday', createXPostHandler({
    db,
    baseUrl: process.env.PUBLIC_BASE_URL || 'https://bachillo.web.app',
    handle: process.env.GOV_X_HANDLE,
}));

module.exports = router;