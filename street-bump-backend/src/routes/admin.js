const express = require('express');
const router = express.Router();
const { 
    getUnverifiedBumps,
    verifyBump,
    deleteBump 
} = require('../controllers/bumpController');
const { verifyAdminToken } = require('../middleware/auth');
const { createFixedController } = require('../controllers/fixedController');
const { db } = require('../config/firebase');

const { listFixed, reopen } = createFixedController({ db });

// Apply admin authentication middleware to all routes
router.use(verifyAdminToken);

// Admin routes for bumps
router.get('/bumps/unverified', getUnverifiedBumps);
router.patch('/bumps/:id/verify', verifyBump);
router.delete('/bumps/:id', deleteBump);
router.get('/bumps/fixed', listFixed);
router.patch('/bumps/:id/reopen', reopen);

module.exports = router;