const express = require('express');
const router = express.Router();
const { 
    getUnverifiedBumps,
    verifyBump,
    deleteBump 
} = require('../controllers/bumpController');
const { verifyAdminToken } = require('../middleware/auth');

// Apply admin authentication middleware to all routes
router.use(verifyAdminToken);

// Admin routes for bumps
router.get('/bumps/unverified', getUnverifiedBumps);
router.patch('/bumps/:id/verify', verifyBump);
router.delete('/bumps/:id', deleteBump);

module.exports = router;