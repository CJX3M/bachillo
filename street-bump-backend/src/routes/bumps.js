const express = require('express');
const router = express.Router();
const { getVerifiedBumps, createBump, getNearbyBumps } = require('../controllers/bumpController');

router.get('/', getVerifiedBumps);
router.get('/nearby', getNearbyBumps);
router.post('/', createBump);

module.exports = router;