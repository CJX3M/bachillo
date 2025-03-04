const express = require('express');
const router = express.Router();
const { 
    getVerifiedBumps, 
    createBump
} = require('../controllers/bumpController');

// Public routes
router.get('/', getVerifiedBumps);
router.post('/', createBump);

module.exports = router;