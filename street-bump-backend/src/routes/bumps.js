const express = require('express');
const router = express.Router();
const { getVerifiedBumps, createBump, getNearbyBumps } = require('../controllers/bumpController');
const { createFixedController } = require('../controllers/fixedController');
const { createRateLimit } = require('../middleware/rateLimit');
const { db } = require('../config/firebase');

const { getBump, markFixed } = createFixedController({ db });
const markFixedLimit = createRateLimit({ limit: 10, windowMs: 60 * 60 * 1000 });

router.get('/', getVerifiedBumps);
router.get('/nearby', getNearbyBumps);
router.post('/', createBump);
// Keep the :id routes after /nearby so it is not read as an id.
router.get('/:id', getBump);
router.post('/:id/fixed', markFixedLimit, markFixed);

module.exports = router;